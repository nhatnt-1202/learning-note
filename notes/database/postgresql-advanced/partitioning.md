# Partitioning

Chia một bảng logic thành nhiều bảng vật lý con. Bảng cha không chứa dữ liệu,
chỉ định nghĩa cấu trúc và cách chia.

Điểm cần hiểu trước: partitioning **không** làm query nhanh hơn một cách tổng
quát. Nó giúp ở ba việc cụ thể — bỏ qua bớt dữ liệu khi quét
(partition pruning), xoá dữ liệu cũ tức thì (`DROP` partition thay vì
`DELETE`), và làm [VACUUM](./vacuum)/`REINDEX` chạy trên từng phần nhỏ. Nếu bài
toán không phải ba cái đó, index thường đủ.

## Khi nào nên partition

| Nên | Không nên |
|---|---|
| Bảng > ~100GB hoặc tăng nhanh | Bảng vài triệu dòng — index là đủ |
| Có nhu cầu xoá dữ liệu cũ theo lô | Xoá rải rác không theo khoá phân vùng |
| Query luôn lọc theo một khoá rõ ràng (thường là thời gian) | Query lọc theo nhiều cột khác nhau |
| `VACUUM` bảng lớn quá lâu | |

## Ba kiểu partition

### RANGE — theo khoảng (phổ biến nhất)

```sql
CREATE TABLE events (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  user_id    bigint NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

Biên là **nửa mở**: `FROM` bao gồm, `TO` không bao gồm — nên không bị hở hay
chồng lấn khi viết liên tiếp.

### LIST — theo danh sách giá trị

```sql
CREATE TABLE orders (
  id bigint, region text NOT NULL, total numeric
) PARTITION BY LIST (region);

CREATE TABLE orders_north PARTITION OF orders FOR VALUES IN ('HN','HP');
CREATE TABLE orders_south PARTITION OF orders FOR VALUES IN ('HCM','CT');
```

### HASH — chia đều

```sql
CREATE TABLE sessions (
  id bigint, user_id bigint NOT NULL
) PARTITION BY HASH (user_id);

CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

HASH dùng khi muốn chia tải đều mà không có khoá tự nhiên theo khoảng. Nhược
điểm: không xoá được "dữ liệu cũ" theo partition, và đổi số partition rất đau.

## DEFAULT partition — lưới an toàn

Không có partition khớp thì `INSERT` **lỗi**. Thêm partition mặc định để hứng:

```sql
CREATE TABLE events_default PARTITION OF events DEFAULT;
```

Nhưng cẩn thận: khi đã có dữ liệu trong `DEFAULT`, việc `ATTACH` một partition
mới chồng khoảng với dữ liệu đó sẽ **phải quét toàn bộ** `DEFAULT` dưới lock
nặng. Thực tế nên coi `DEFAULT` là báo động chứ không phải chỗ chứa lâu dài —
theo dõi nó và luôn tạo partition trước hạn.

## Partition pruning

Đây là lợi ích chính. Planner loại bỏ partition không liên quan:

```sql
EXPLAIN (ANALYZE)
SELECT * FROM events WHERE created_at >= '2026-02-01' AND created_at < '2026-02-15';
-- chỉ thấy events_2026_02 trong plan
```

Điều kiện để pruning hoạt động: **query phải lọc theo khoá phân vùng**. Không có
điều kiện đó thì mọi partition đều bị quét — chậm hơn bảng thường vì thêm
overhead. Đó là lý do chọn khoá phân vùng quyết định thành bại.

Pruning ở hai thời điểm:

```ini
enable_partition_pruning = on     # mặc định
```

- **Lúc lập plan** — với hằng số
- **Lúc chạy** (runtime pruning) — với tham số `$1`, subquery, prepared statement

Nên tham số hoá vẫn được pruning, khác với
[partial index](./partial-expression-index).

## Index trên bảng partition

```sql
-- Tạo trên cha → tự áp cho mọi partition hiện có và tương lai
CREATE INDEX ON events (user_id);
```

Ràng buộc quan trọng: **UNIQUE / PRIMARY KEY phải chứa khoá phân vùng**.

```sql
-- Lỗi: không có created_at
ALTER TABLE events ADD PRIMARY KEY (id);

-- Được
ALTER TABLE events ADD PRIMARY KEY (id, created_at);
```

Hệ quả thực tế: không thể đảm bảo `id` unique toàn cục bằng constraint. Cách
thường dùng là để `id` là `bigint identity` (sequence toàn cục nên vẫn không
trùng trên thực tế), và chấp nhận PK ghép.

Cũng vì lý do này, **foreign key trỏ *tới* bảng partition** cần khoá ghép — hay
gây vướng khi thiết kế. FK trỏ *từ* bảng partition ra ngoài thì bình thường.

## Vòng đời: thêm và xoá partition

Đây là lợi ích lớn thứ hai. Xoá 1 tháng dữ liệu:

```sql
-- Tức thì, không sinh dead tuple
DROP TABLE events_2025_01;

-- Hoặc tách ra giữ lại (lock ngắn)
ALTER TABLE events DETACH PARTITION events_2025_01 CONCURRENTLY;
```

So với `DELETE FROM events WHERE created_at < '2025-02-01'` — cái đó ghi WAL
khổng lồ, sinh dead tuple đầy bảng, rồi cần [VACUUM](./vacuum) dọn hàng giờ.

`DETACH ... CONCURRENTLY` (PG 14+) tránh được `ACCESS EXCLUSIVE` dài — đáng
dùng trên production.

### Gắn bảng có sẵn vào

```sql
-- Thêm CHECK khớp biên TRƯỚC khi attach → attach không cần quét bảng
ALTER TABLE events_2026_03
  ADD CONSTRAINT ck CHECK (created_at >= '2026-03-01' AND created_at < '2026-04-01');

ALTER TABLE events ATTACH PARTITION events_2026_03
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

ALTER TABLE events_2026_03 DROP CONSTRAINT ck;
```

Mẹo `CHECK` trước khi `ATTACH` là điểm quan trọng: không có nó, PostgreSQL phải
quét toàn bộ bảng để xác minh, giữ lock suốt thời gian đó.

## Tự động tạo partition

PostgreSQL **không** tự tạo partition. Phải có job. Cách gọn nhất là `pg_cron`:

```sql
CREATE EXTENSION pg_cron;

CREATE FUNCTION create_next_month_partition() RETURNS void AS $$
DECLARE
  start_date date := date_trunc('month', now() + interval '1 month')::date;
  end_date   date := date_trunc('month', now() + interval '2 month')::date;
  part_name  text := 'events_' || to_char(start_date, 'YYYY_MM');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('create-partition', '0 0 1 * *', 'SELECT create_next_month_partition()');
```

Luôn tạo **trước** ít nhất một kỳ. Partition thiếu = `INSERT` lỗi lúc nửa đêm.

Công cụ thay thế: [`pg_partman`](https://github.com/pgpartman/pg_partman) lo cả
việc tạo trước và retention tự động — nên dùng nếu quản nhiều bảng partition.

## Theo dõi

```sql
-- Liệt kê partition + cỡ
SELECT
  c.relname AS partition,
  pg_get_expr(c.relpartbound, c.oid) AS bounds,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_inherits i ON i.inhrelid = c.oid
WHERE i.inhparent = 'events'::regclass
ORDER BY c.relname;

-- DEFAULT có dữ liệu không (dấu hiệu thiếu partition)
SELECT count(*) FROM events_default;
```

## Giới hạn cần biết

- Quá nhiều partition làm **planning time** tăng. Vài trăm thì ổn, vài nghìn thì
  bắt đầu đau — cân nhắc chia thô hơn (tháng thay vì ngày)
- `UPDATE` làm dòng đổi partition thì được (PG 11+) nhưng đắt: nó thành
  `DELETE` + `INSERT` chéo bảng
- Không đổi được khoá phân vùng sau khi tạo — phải làm bảng mới và migrate

## Liên quan

- [Time-series patterns](./time-series) — ứng dụng chính của partitioning
- [VACUUM](./vacuum) — lý do partition giúp bảo trì
- [Zero-downtime migration](./zero-downtime-migration) — chuyển bảng thường sang partition
