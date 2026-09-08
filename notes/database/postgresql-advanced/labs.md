# Labs — Bài tập thực hành

Các bài tập chạy được trên database thật để kiểm chứng lý thuyết. Nên làm trên
database rác, không phải production.

## Chuẩn bị

```bash
docker run -d --name pg-lab \
  -e POSTGRES_PASSWORD=lab \
  -p 5433:5432 \
  postgres:17

docker exec -it pg-lab psql -U postgres
```

```sql
CREATE DATABASE lab;
\c lab
CREATE EXTENSION pg_stat_statements;   -- cần shared_preload_libraries
CREATE EXTENSION pageinspect;
CREATE EXTENSION pgstattuple;
CREATE EXTENSION pg_trgm;
```

Tạo bảng mẫu 1 triệu dòng:

```sql
CREATE TABLE orders (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL,
  status     text   NOT NULL,
  total      numeric(12,2) NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO orders (user_id, status, total, note, created_at)
SELECT
  (random() * 10000)::bigint,
  (ARRAY['pending','paid','shipped','cancelled'])[1 + (random()*3)::int],
  (random() * 1000)::numeric(12,2),
  md5(random()::text),
  now() - (random() * interval '365 days')
FROM generate_series(1, 1000000);

ANALYZE orders;
```

## Lab 1 — MVCC: xem dòng chết sinh ra

Mở **hai** session psql.

```sql
-- Session A
SELECT xmin, xmax, ctid, total FROM orders WHERE id = 1;
UPDATE orders SET total = 999 WHERE id = 1;
SELECT xmin, xmax, ctid, total FROM orders WHERE id = 1;
```

Quan sát: `ctid` **đổi** — dòng mới ở vị trí vật lý khác. Đây là
[MVCC](./mvcc) tạo phiên bản mới thay vì ghi đè.

```sql
-- Session A (chưa commit)
BEGIN;
UPDATE orders SET total = 111 WHERE id = 2;

-- Session B: vẫn thấy giá trị cũ, KHÔNG bị block
SELECT total FROM orders WHERE id = 2;

-- Session A
ROLLBACK;
```

**Câu hỏi:** sau `ROLLBACK`, dòng mà session A đã tạo đi đâu?
*Trả lời: vẫn nằm trên đĩa như dead tuple, đợi [VACUUM](./vacuum) dọn.*

## Lab 2 — VACUUM và bloat

```sql
-- Cỡ ban đầu
SELECT pg_size_pretty(pg_relation_size('orders'));

-- Update toàn bộ → nhân đôi số dòng vật lý
UPDATE orders SET total = total + 1;

SELECT pg_size_pretty(pg_relation_size('orders'));   -- to gần gấp đôi
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname='orders';

-- VACUUM thường: KHÔNG trả đĩa cho OS
VACUUM (VERBOSE, ANALYZE) orders;
SELECT pg_size_pretty(pg_relation_size('orders'));   -- vẫn to!

-- VACUUM FULL: trả đĩa, nhưng lock cả bảng
VACUUM FULL orders;
SELECT pg_size_pretty(pg_relation_size('orders'));   -- nhỏ lại
```

**Điểm cần rút ra:** `VACUUM` đánh dấu chỗ trống để tái sử dụng, không thu hồi
đĩa. Xem [VACUUM](./vacuum).

## Lab 3 — Transaction dài chặn VACUUM

```sql
-- Session A
BEGIN;
SELECT 1;          -- mở snapshot rồi để đó

-- Session B
UPDATE orders SET total = total + 1 WHERE id < 1000;
VACUUM orders;
SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname='orders';
-- dead tuple KHÔNG giảm về 0

-- Session A
COMMIT;

-- Session B
VACUUM orders;     -- giờ mới dọn được
```

Đây là nguyên nhân thật của rất nhiều ca "bảng phình mãi không dừng".

## Lab 4 — Index: leftmost prefix

```sql
CREATE INDEX idx_orders_multi ON orders(user_id, status, created_at);

EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 100;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 100 AND status = 'paid';
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE status = 'paid';   -- ?
```

**Câu hỏi:** query thứ ba dùng index không? Vì sao?
*Gợi ý: [leftmost prefix](./btree#composite-index--thứ-tự-cột-là-tất-cả).*

## Lab 5 — Index-only scan

```sql
CREATE INDEX idx_orders_uid_total ON orders(user_id, total);

EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, total FROM orders WHERE user_id = 100;
-- → Index Only Scan

EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, total, status FROM orders WHERE user_id = 100;
-- → Index Scan (thêm 1 cột là phải chạm heap)

-- Thử lại sau khi ghi nhiều
UPDATE orders SET total = total + 1 WHERE user_id < 50;
EXPLAIN (ANALYZE, BUFFERS) SELECT user_id, total FROM orders WHERE user_id = 100;
-- Heap Fetches > 0: visibility map đã cũ

VACUUM orders;
-- chạy lại: Heap Fetches về 0
```

## Lab 6 — Partial index

```sql
SELECT status, count(*) FROM orders GROUP BY status;

CREATE INDEX idx_pending ON orders(created_at) WHERE status = 'pending';

SELECT pg_size_pretty(pg_relation_size('idx_pending')),
       pg_size_pretty(pg_relation_size('idx_orders_multi'));

EXPLAIN (ANALYZE) SELECT * FROM orders
WHERE status = 'pending' ORDER BY created_at LIMIT 10;

-- Với tham số thì sao?
PREPARE p1(text) AS SELECT * FROM orders WHERE status = $1 ORDER BY created_at LIMIT 10;
EXPLAIN (ANALYZE) EXECUTE p1('pending');    -- ?
```

**Câu hỏi:** vì sao bản `PREPARE` không dùng được `idx_pending`?
*Xem [Partial index](./partial-expression-index#partial-index--chỉ-index-một-phần-bảng).*

## Lab 7 — Ước lượng lệch và statistics đa biến

```sql
CREATE TABLE addresses AS
SELECT
  (random()*1000)::int AS id,
  CASE WHEN random() < 0.5 THEN 'Hà Nội' ELSE 'Hồ Chí Minh' END AS city,
  CASE WHEN random() < 0.5 THEN 'Cầu Giấy' ELSE 'Quận 1' END     AS district
FROM generate_series(1, 500000);

ANALYZE addresses;

-- Hai cột này tương quan (Cầu Giấy chỉ ở Hà Nội) nhưng planner không biết
EXPLAIN (ANALYZE) SELECT * FROM addresses
WHERE city = 'Hà Nội' AND district = 'Cầu Giấy';
-- So rows ước lượng vs actual rows → lệch

CREATE STATISTICS stat_addr (dependencies, ndistinct) ON city, district FROM addresses;
ANALYZE addresses;

EXPLAIN (ANALYZE) SELECT * FROM addresses
WHERE city = 'Hà Nội' AND district = 'Cầu Giấy';
-- ước lượng sát hơn nhiều
```

Xem [EXPLAIN ANALYZE](./explain-analyze#việc-cần-làm-đầu-tiên-so-rows-ước-lượng-với-rows-thật).

## Lab 8 — pg_trgm

```sql
EXPLAIN (ANALYZE) SELECT * FROM orders WHERE note LIKE '%abc%';   -- Seq Scan

CREATE INDEX idx_note_trgm ON orders USING gin (note gin_trgm_ops);

EXPLAIN (ANALYZE) SELECT * FROM orders WHERE note LIKE '%abc%';   -- Bitmap Index Scan

-- Mẫu dưới 3 ký tự thì sao?
EXPLAIN (ANALYZE) SELECT * FROM orders WHERE note LIKE '%ab%';    -- ?
```

## Lab 9 — Sort tràn đĩa

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders ORDER BY note;
-- Sort Method: external merge  Disk: ...

SET work_mem = '256MB';
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders ORDER BY note;
-- Sort Method: quicksort  Memory: ...
RESET work_mem;
```

## Lab 10 — Lock queue: ALTER TABLE làm sập service

```sql
-- Session A
BEGIN;
SELECT count(*) FROM orders;   -- giữ ACCESS SHARE, chưa commit

-- Session B
ALTER TABLE orders ADD COLUMN test_col int;   -- treo, đợi ACCESS EXCLUSIVE

-- Session C
SELECT 1 FROM orders LIMIT 1;   -- CŨNG treo, dù A không hề chặn C!

-- Session D: xem ai chặn ai
SELECT blocked.pid, blocking.pid AS blocked_by, blocked.query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- Session A
COMMIT;   -- mọi thứ thông
```

Đây là lý do luôn `SET lock_timeout` trước DDL — xem
[Locking](./locking#bẫy-lớn-nhất-alter-table-và-lock-queue).

## Lab 11 — Tìm index thừa

```sql
-- idx_orders_multi(user_id, status, created_at) đã có
CREATE INDEX idx_redundant ON orders(user_id);   -- thừa: là prefix của cái trên

SELECT indexrelid::regclass AS index, indkey
FROM pg_index WHERE indrelid = 'orders'::regclass;

SELECT indexrelname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE relname = 'orders' ORDER BY idx_scan;

DROP INDEX CONCURRENTLY idx_redundant;
```

## Dọn dẹp

```bash
docker rm -f pg-lab
```

## Liên quan

- [Roadmap](./) — quay lại mục lục
