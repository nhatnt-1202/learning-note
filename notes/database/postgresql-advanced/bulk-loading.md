# Bulk Loading

Nạp hàng triệu dòng bằng `INSERT` từng dòng có thể chậm hơn cách đúng cả **hai
bậc độ lớn**. Chênh lệch đến từ ba chỗ: số lần round-trip mạng, số lần
[fsync WAL](./wal), và công cập nhật index.

## Thang tốc độ

Từ chậm đến nhanh, cho cùng một tập dữ liệu:

| Cách | Tương đối |
|---|---|
| `INSERT` từng dòng, mỗi dòng một transaction | 1× (chậm nhất) |
| `INSERT` từng dòng trong một transaction | ~10× |
| `INSERT` nhiều dòng một câu (multi-row) | ~50× |
| `COPY` | ~100× |
| `COPY` + bỏ index, nạp xong tạo lại | ~200× |

Con số chỉ để so sánh tương đối, không phải cam kết — nhưng thứ tự thì đúng
trên gần như mọi hệ thống.

## COPY — công cụ chính

```sql
-- Từ file trên server (cần quyền superuser / pg_read_server_files)
COPY events (user_id, payload, created_at)
FROM '/data/events.csv' WITH (FORMAT csv, HEADER true);

-- Từ máy client — dùng cái này khi không có quyền trên server
\copy events (user_id, payload, created_at) FROM 'events.csv' WITH (FORMAT csv, HEADER true)
```

Phân biệt quan trọng: `COPY` là câu lệnh SQL đọc file **trên server**;
`\copy` là lệnh của psql, đọc file **trên máy bạn** rồi stream lên. Lẫn hai cái
này là lỗi hay gặp.

Từ shell:

```bash
psql -c "\copy events FROM 'events.csv' WITH (FORMAT csv, HEADER true)"

# Từ stdin — ghép được với pipe
zcat events.csv.gz | psql -c "\copy events FROM STDIN WITH (FORMAT csv, HEADER true)"
```

### Xử lý dòng lỗi

Mặc định một dòng sai làm cả `COPY` rollback. PG 17+ cho bỏ qua:

```sql
COPY events FROM '/data/events.csv'
  WITH (FORMAT csv, HEADER true, ON_ERROR ignore, LOG_VERBOSITY verbose);
```

Bản cũ hơn: nạp vào bảng tạm toàn cột `text` rồi validate bằng SQL.

## Bỏ index trước khi nạp

Với lần nạp lớn vào bảng đã có dữ liệu, cập nhật index tốn hơn cả ghi dữ liệu:

```sql
-- Lưu lại định nghĩa index trước khi xoá
SELECT indexdef FROM pg_indexes WHERE tablename = 'events';

DROP INDEX idx_events_user_id;
DROP INDEX idx_events_created_at;

-- COPY ...

CREATE INDEX CONCURRENTLY idx_events_user_id   ON events(user_id);
CREATE INDEX CONCURRENTLY idx_events_created_at ON events(created_at);
ANALYZE events;
```

Đừng bỏ `ANALYZE` ở cuối — không có statistics thì
[planner](./explain-analyze) đoán sai ngay sau khi nạp.

Với bảng **trống hoàn toàn**, tạo index sau khi nạp còn nhanh hơn nữa vì
PostgreSQL build index bằng sort thay vì insert từng khoá.

## Tăng tốc bằng cấu hình phiên

Đặt ở mức session, không phải global:

```sql
SET maintenance_work_mem = '2GB';   -- tăng tốc CREATE INDEX
SET synchronous_commit = off;       -- bớt fsync, xem lưu ý dưới
SET work_mem = '256MB';
```

Ở mức server, cho cửa sổ nạp dữ liệu lớn:

```ini
max_wal_size = 32GB          # tránh checkpoint dồn dập
checkpoint_timeout = 30min
autovacuum = off             # CHỈ tạm thời, và phải bật lại
```

`synchronous_commit = off` an toàn về mặt toàn vẹn (xem
[WAL](./wal#synchronous-commit--đánh-đổi-durability-lấy-tốc-độ)) — mất điện chỉ
mất giao dịch cuối, không hỏng dữ liệu. Với việc nạp lại được thì hoàn toàn hợp
lý.

Tắt `autovacuum` thì **phải** nhớ bật lại và chạy `VACUUM ANALYZE` — quên là
bảng bloat âm thầm.

## Bỏ WAL hoàn toàn cho bảng nạp lại được

Hai cách, tuỳ mục đích:

```sql
-- 1. UNLOGGED: nhanh nhất, nhưng MẤT DỮ LIỆU khi crash và không replicate
CREATE UNLOGGED TABLE staging (LIKE events INCLUDING ALL);
-- COPY vào staging ...
ALTER TABLE staging SET LOGGED;   -- viết lại bảng, có WAL trở lại
```

`UNLOGGED` phù hợp cho bảng staging/ETL trung gian. Không dùng cho dữ liệu thật.

```sql
-- 2. Trong cùng transaction với CREATE TABLE: PostgreSQL tự bỏ WAL
BEGIN;
CREATE TABLE events_new (LIKE events INCLUDING ALL);
COPY events_new FROM '/data/events.csv' WITH (FORMAT csv);
COMMIT;
```

Cách (2) chỉ có tác dụng khi `wal_level = minimal` — với `replica` (mặc định)
thì WAL vẫn phải ghi.

## Multi-row INSERT khi không dùng được COPY

Từ tầng ứng dụng, gộp nhiều dòng vào một câu:

```sql
INSERT INTO events (user_id, payload) VALUES
  (1, '{}'), (2, '{}'), (3, '{}'), ...;   -- 500–1000 dòng mỗi lô
```

Lô quá lớn (>vài nghìn) bắt đầu phản tác dụng: câu lệnh dài, tốn parse, và giữ
lock lâu. 500–1000 là khoảng hợp lý.

Nhiều driver có API `COPY` trực tiếp — nên ưu tiên:

- Node: `pg-copy-streams`
- Python: `cursor.copy()` của psycopg 3
- Go: `pgx.CopyFrom`

## UPSERT lô lớn

`ON CONFLICT` từng dòng chậm. Cách nhanh: `COPY` vào bảng tạm rồi merge một lần:

```sql
CREATE TEMP TABLE tmp_events (LIKE events INCLUDING DEFAULTS);

\copy tmp_events FROM 'events.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO events AS e (id, user_id, payload)
SELECT id, user_id, payload FROM tmp_events
ON CONFLICT (id) DO UPDATE
  SET payload = EXCLUDED.payload
WHERE e.payload IS DISTINCT FROM EXCLUDED.payload;   -- bỏ update vô nghĩa
```

Mệnh đề `WHERE` cuối đáng chú ý: nó tránh việc `UPDATE` những dòng không thay
đổi gì, mà mỗi `UPDATE` như vậy vẫn sinh một dead tuple (xem
[MVCC](./mvcc#xmin--xmax--hai-cột-ẩn)).

Nếu bảng tạm lớn, `ANALYZE tmp_events` trước khi merge để planner chọn đúng
join.

## Xuất dữ liệu

`COPY` chạy được cả hai chiều:

```sql
\copy (SELECT * FROM events WHERE created_at >= '2026-01-01') TO 'out.csv' WITH (FORMAT csv, HEADER true)
```

```bash
# Nén luôn
psql -c "\copy (SELECT * FROM events) TO STDOUT WITH (FORMAT csv)" | gzip > events.csv.gz
```

## Theo dõi tiến độ

```sql
SELECT pid, relid::regclass, command, bytes_processed, bytes_total, tuples_processed
FROM pg_stat_progress_copy;
```

`pg_stat_progress_copy` có từ PG 14 — rất hữu ích khi nạp file lớn và muốn biết
còn bao lâu.

## Checklist nạp lớn

1. Tăng `max_wal_size`, `maintenance_work_mem`
2. `SET synchronous_commit = off` cho session
3. Bỏ index phụ (giữ PK nếu cần khử trùng)
4. `COPY` (chia lô nếu file quá lớn)
5. Tạo lại index bằng `CREATE INDEX` (bảng trống) hoặc `CONCURRENTLY`
6. `VACUUM ANALYZE`
7. Bật lại autovacuum nếu đã tắt

## Liên quan

- [WAL](./wal) — vì sao fsync là cổ chai
- [Partitioning](./partitioning) — nạp vào partition riêng rồi attach
- [Index Maintenance](./index-maintenance)
