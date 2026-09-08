# Zero-downtime Migration

Đổi schema trên bảng đang chạy production. Nguyên tắc chi phối mọi thứ ở đây:
`ALTER TABLE` cần `ACCESS EXCLUSIVE` — mode duy nhất chặn cả `SELECT` (xem
[Locking](./locking#bẫy-lớn-nhất-alter-table-và-lock-queue)).

## Hai luật bất biến

**Luật 1 — luôn đặt `lock_timeout` trước DDL.**

```sql
SET lock_timeout = '3s';
ALTER TABLE users ADD COLUMN phone text;
```

Không có nó, `ALTER` gặp một transaction dài sẽ xếp hàng và **kéo cả database
xuống theo**, vì mọi query mới xếp sau nó. Thất bại nhanh rồi thử lại tốt hơn
nhiều.

**Luật 2 — migration phải tương thích cả hai chiều.**

Trong lúc deploy, code cũ và code mới **chạy cùng lúc**. Mọi thay đổi schema
phải làm code cũ vẫn hoạt động. Đây là lý do mọi thứ dưới đây chia thành nhiều
bước.

## Bảng tra: thao tác nào an toàn

| Thao tác | Lock | Quét bảng | An toàn? |
|---|---|---|---|
| `ADD COLUMN` (không default) | ACCESS EXCL, tức thì | Không | An toàn |
| `ADD COLUMN ... DEFAULT <hằng>` | ACCESS EXCL, tức thì | Không (PG 11+) | An toàn |
| `ADD COLUMN ... DEFAULT now()` | ACCESS EXCL, **lâu** | **Có** | **Nguy hiểm** |
| `DROP COLUMN` | ACCESS EXCL, tức thì | Không | An toàn |
| `RENAME COLUMN` | ACCESS EXCL, tức thì | Không | An toàn *về lock* |
| `SET NOT NULL` | ACCESS EXCL, **lâu** | **Có** | Dùng cách 3 bước |
| `ADD CHECK` | ACCESS EXCL, **lâu** | **Có** | Dùng `NOT VALID` |
| `ADD FOREIGN KEY` | ACCESS EXCL, **lâu** | **Có** | Dùng `NOT VALID` |
| `ALTER TYPE` | ACCESS EXCL, **rất lâu** | Viết lại bảng | Cần cột mới |
| `CREATE INDEX` | SHARE (chặn ghi) | Có | Dùng `CONCURRENTLY` |
| `ADD PRIMARY KEY` | ACCESS EXCL, lâu | Có | Build index trước |

`RENAME COLUMN` an toàn về lock nhưng **phá code cũ ngay lập tức** — nên thực tế
gần như không bao giờ rename trực tiếp.

## Thêm cột

```sql
-- An toàn: chỉ đổi metadata
ALTER TABLE users ADD COLUMN phone text;
ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;
```

Từ PG 11, `DEFAULT` hằng số không viết lại bảng — PostgreSQL lưu giá trị đó
trong catalog và trả về cho các dòng cũ.

Nhưng `DEFAULT` là hàm biến đổi thì **vẫn viết lại toàn bộ**:

```sql
-- Nguy hiểm trên bảng lớn
ALTER TABLE users ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- An toàn: 2 bước
ALTER TABLE users ADD COLUMN created_at timestamptz;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
-- rồi backfill theo lô nếu cần
```

## Thêm NOT NULL — ba bước

```sql
-- 1. CHECK NOT VALID: lock ngắn, không quét bảng
SET lock_timeout = '3s';
ALTER TABLE users ADD CONSTRAINT users_phone_nn CHECK (phone IS NOT NULL) NOT VALID;

-- 2. VALIDATE: quét bảng nhưng chỉ lock nhẹ, không chặn đọc/ghi
ALTER TABLE users VALIDATE CONSTRAINT users_phone_nn;

-- 3. SET NOT NULL giờ nhanh (PG 12+ dùng CHECK làm bằng chứng)
SET lock_timeout = '3s';
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_phone_nn;
```

Mẫu `NOT VALID` → `VALIDATE` là kỹ thuật quan trọng nhất trong trang này. Nó
tách "lấy lock" khỏi "quét bảng", nên không bao giờ giữ lock nặng lâu.

## Thêm foreign key

```sql
SET lock_timeout = '3s';
ALTER TABLE orders ADD CONSTRAINT orders_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT orders_user_fk;
```

Đừng quên index phía con — không có nó, `DELETE` trên `users` sẽ seq scan
`orders`:

```sql
CREATE INDEX CONCURRENTLY ON orders(user_id);
```

## Backfill theo lô

Một `UPDATE` toàn bảng giữ lock hàng loạt, ghi WAL khổng lồ, và sinh dead tuple
đầy bảng. Chia lô:

```sql
DO $$
DECLARE
  rows_updated int;
BEGIN
  LOOP
    UPDATE users SET phone = normalize_phone(phone_raw)
    WHERE id IN (
      SELECT id FROM users WHERE phone IS NULL AND phone_raw IS NOT NULL
      ORDER BY id LIMIT 5000
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;                      -- cần PG 11+ để COMMIT trong DO
    PERFORM pg_sleep(0.1);       -- nhường I/O cho autovacuum
  END LOOP;
END $$;
```

Ba chi tiết quan trọng: `COMMIT` mỗi lô (không giữ transaction dài chặn
[VACUUM](./vacuum)), `SKIP LOCKED` (không tranh với traffic thật), và
`pg_sleep` (cho autovacuum kịp dọn).

## Đổi kiểu cột — expand/contract

`ALTER TYPE` viết lại bảng và giữ `ACCESS EXCLUSIVE` suốt thời gian đó. Với bảng
lớn phải làm qua cột mới:

```sql
-- 1. Expand: thêm cột mới
ALTER TABLE orders ADD COLUMN total_new numeric(14,2);

-- 2. Trigger đồng bộ cho ghi mới
CREATE FUNCTION sync_total() RETURNS trigger AS $$
BEGIN
  NEW.total_new := NEW.total;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER orders_sync_total BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_total();

-- 3. Backfill theo lô (như trên)

-- 4. Deploy code đọc/ghi total_new
-- 5. Contract: xoá cột cũ
DROP TRIGGER orders_sync_total ON orders;
ALTER TABLE orders DROP COLUMN total;
ALTER TABLE orders RENAME COLUMN total_new TO total;
```

## Đổi tên cột — không rename

Rename trực tiếp phá code cũ ngay. Dùng cùng mẫu expand/contract: thêm cột mới,
đồng bộ hai chiều bằng trigger, chuyển code, rồi xoá cột cũ.

Nếu chỉ cần đổi tên mà giữ tương thích, một `VIEW` trung gian cũng là cách:

```sql
ALTER TABLE users RENAME TO users_real;
CREATE VIEW users AS SELECT *, phone AS phone_number FROM users_real;
```

## Xoá cột an toàn

Xoá cột mà code cũ còn `SELECT *` sẽ lỗi. Trình tự:

1. Deploy code **không** dùng cột đó nữa (kể cả bỏ `SELECT *`)
2. Đợi qua hết các instance cũ
3. `ALTER TABLE ... DROP COLUMN`

`DROP COLUMN` bản thân là tức thì (chỉ đánh dấu trong catalog, không thu hồi
đĩa — cần [`VACUUM FULL`](./vacuum#vacuum-vs-vacuum-full) hoặc `pg_repack` để
lấy lại chỗ).

## Tạo index

```sql
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);
```

Không chạy được trong transaction — nên với công cụ migration cần tắt transaction
cho bước này:

```ruby
# Rails
disable_ddl_transaction!
```

```python
# Django
atomic = False
```

Thất bại thì để lại index `INVALID`, phải dọn trước khi thử lại:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY idx_users_phone;
```

## Chuyển bảng thường sang partition

```sql
-- 1. Bảng cha mới
CREATE TABLE events_new (LIKE events INCLUDING ALL) PARTITION BY RANGE (created_at);

-- 2. Gắn bảng cũ làm một partition (cần CHECK khớp trước để không phải quét)
ALTER TABLE events ADD CONSTRAINT ck_old CHECK (created_at < '2026-10-01');
ALTER TABLE events_new ATTACH PARTITION events
  FOR VALUES FROM (MINVALUE) TO ('2026-10-01');

-- 3. Partition cho dữ liệu mới
CREATE TABLE events_2026_10 PARTITION OF events_new
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- 4. Đổi tên (lock rất ngắn)
BEGIN;
ALTER TABLE events RENAME TO events_legacy;
ALTER TABLE events_new RENAME TO events;
COMMIT;
```

Xem [Partitioning](./partitioning) cho chi tiết.

## Đổi cả database — logical replication

Chuyển server, nâng major version, hay đổi provider:

1. Dựng đích, copy schema (`pg_dump -s`)
2. Tạo publication/subscription, đợi lag về 0
3. Dừng ghi vài giây
4. **Đồng bộ sequence bằng tay** — bước hay bị quên nhất:
   ```sql
   SELECT setval('users_id_seq', (SELECT max(id) FROM users));
   ```
5. Đổi connection string, xoá subscription

Xem [Replication](./replication#nâng-cấp-major-version-không-downtime).

## Checklist trước mỗi migration

- [ ] Đã `SET lock_timeout`
- [ ] Có quét bảng không? Nếu có → tách `NOT VALID` / backfill lô
- [ ] Code cũ còn chạy được với schema mới? (tương thích hai chiều)
- [ ] `CREATE INDEX` có `CONCURRENTLY`, có tắt DDL transaction
- [ ] Đã thử trên bản copy dữ liệu thật cỡ tương đương
- [ ] Có cách rollback không cần restore backup
- [ ] Chạy ngoài giờ cao điểm, có người theo dõi
      [`pg_stat_activity`](./locking#chẩn-đoán-ai-đang-chặn-ai)

## Công cụ

- [`pg_repack`](https://github.com/reorg/pg_repack) — thu hồi đĩa không downtime
- [`pgroll`](https://github.com/xataio/pgroll) — migration expand/contract tự động
- [`pg-osc`](https://github.com/shayonj/pg-osc) — đổi schema kiểu online
- [strong_migrations](https://github.com/ankane/strong_migrations) — chặn
  migration nguy hiểm ngay trong CI (Rails)

## Liên quan

- [Locking](./locking) — nền tảng của mọi thứ ở đây
- [Schema Design](./schema) — thiết kế đúng từ đầu để đỡ phải migrate
- [Replication](./replication), [Partitioning](./partitioning)
