# Time-series Patterns

Dữ liệu theo thời gian (log, metric, event, IoT) có đặc thù rất riêng: **chỉ
append**, gần như không update, query hầu hết lọc theo khoảng thời gian, và dữ
liệu cũ mất giá trị dần. PostgreSQL xử lý tốt nếu thiết kế theo đúng đặc thù đó.

## Nền tảng: partition theo thời gian

```sql
CREATE TABLE metrics (
  device_id  bigint      NOT NULL,
  metric     text        NOT NULL,
  value      double precision NOT NULL,
  recorded_at timestamptz NOT NULL
) PARTITION BY RANGE (recorded_at);
```

Chọn độ mịn theo lượng ghi — mục tiêu là mỗi partition khoảng **vài GB**:

| Lượng dữ liệu | Partition theo |
|---|---|
| < 1GB/tháng | Tháng |
| ~1GB/ngày | Tuần hoặc ngày |
| > 10GB/ngày | Ngày hoặc giờ |

Đừng chia quá mịn: vài nghìn partition làm planning time tăng rõ rệt (xem
[Partitioning](./partitioning#giới-hạn-cần-biết)).

## BRIN thay vì B-tree cho cột thời gian

Dữ liệu append tự nhiên đã sắp xếp theo thời gian trên đĩa → đúng điều kiện của
[BRIN](./index-types#brin--block-range-index):

```sql
CREATE INDEX ON metrics USING brin (recorded_at) WITH (pages_per_range = 32);
```

Index nhỏ hơn B-tree cả trăm lần và gần như không làm chậm `INSERT`. Kiểm tra
tương quan trước:

```sql
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'metrics' AND attname = 'recorded_at';
-- gần 1 → BRIN hiệu quả
```

Vẫn cần B-tree cho các cột lọc khác:

```sql
CREATE INDEX ON metrics (device_id, recorded_at DESC);
```

## Retention — xoá dữ liệu cũ

Đây là nơi partitioning trả công rõ nhất:

```sql
-- Tức thì
DROP TABLE metrics_2025_01;
```

Tự động hoá:

```sql
CREATE FUNCTION drop_old_partitions(retain interval DEFAULT '90 days')
RETURNS void AS $$
DECLARE
  part record;
  cutoff date := (now() - retain)::date;
BEGIN
  FOR part IN
    SELECT c.oid::regclass AS name,
           pg_get_expr(c.relpartbound, c.oid) AS bounds
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    WHERE i.inhparent = 'metrics'::regclass
  LOOP
    -- Lấy biên trên từ định nghĩa partition
    IF (regexp_match(part.bounds, 'TO \(''([\d-]+)'''))[1]::date <= cutoff THEN
      EXECUTE format('DROP TABLE %s', part.name);
      RAISE NOTICE 'dropped %', part.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('retention', '0 3 * * *', 'SELECT drop_old_partitions()');
```

Chạy thử với `RAISE NOTICE` trước khi cho `DROP` thật — hàm này xoá dữ liệu
không hoàn tác được.

Với nhiều bảng, [`pg_partman`](https://github.com/pgpartman/pg_partman) làm sẵn
cả tạo trước và retention.

## Rollup — nén dữ liệu cũ

Dữ liệu thô sau vài ngày thường không cần chi tiết đến từng giây. Gộp lại:

```sql
CREATE TABLE metrics_hourly (
  device_id bigint NOT NULL,
  metric    text   NOT NULL,
  bucket    timestamptz NOT NULL,
  avg_value double precision,
  min_value double precision,
  max_value double precision,
  count     bigint,
  PRIMARY KEY (device_id, metric, bucket)
);

INSERT INTO metrics_hourly
SELECT device_id, metric,
       date_trunc('hour', recorded_at) AS bucket,
       avg(value), min(value), max(value), count(*)
FROM metrics
WHERE recorded_at >= '2026-09-01' AND recorded_at < '2026-09-02'
GROUP BY device_id, metric, bucket
ON CONFLICT (device_id, metric, bucket) DO UPDATE
  SET avg_value = EXCLUDED.avg_value,
      min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      count     = EXCLUDED.count;
```

Chiến lược thường dùng: giữ thô 7 ngày → hourly 90 ngày → daily vĩnh viễn.

Lưu ý về `avg`: không gộp được `avg` của `avg` cho đúng khi số lượng mỗi nhóm
khác nhau. Muốn rollup tiếp từ hourly sang daily thì phải giữ `count` và tính
`sum(avg_value * count) / sum(count)` — đó là lý do cột `count` có trong bảng
trên.

## Chia bucket thời gian

```sql
-- Theo mốc chuẩn
SELECT date_trunc('hour', recorded_at) AS bucket, avg(value)
FROM metrics GROUP BY bucket ORDER BY bucket;

-- Khoảng tuỳ ý (5 phút) — PG 14+
SELECT date_bin('5 minutes', recorded_at, '2026-01-01') AS bucket, avg(value)
FROM metrics GROUP BY bucket ORDER BY bucket;
```

`date_bin` là cách gọn cho khoảng không tròn giờ. Bản cũ hơn phải tự tính:

```sql
SELECT to_timestamp(floor(extract(epoch FROM recorded_at) / 300) * 300) AS bucket
FROM metrics;
```

## Lấp khoảng trống

Query gộp bỏ qua những bucket không có dữ liệu. Muốn chuỗi liên tục (cho biểu
đồ) thì `generate_series` rồi `LEFT JOIN`:

```sql
SELECT g.bucket, coalesce(avg(m.value), 0) AS avg_value
FROM generate_series(
       '2026-09-01'::timestamptz, '2026-09-02'::timestamptz, '1 hour'
     ) AS g(bucket)
LEFT JOIN metrics m
  ON m.recorded_at >= g.bucket
 AND m.recorded_at <  g.bucket + interval '1 hour'
GROUP BY g.bucket
ORDER BY g.bucket;
```

## Query "giá trị mới nhất mỗi thiết bị"

Bài toán kinh điển, và cách viết ảnh hưởng hiệu năng rất lớn.

```sql
-- Cách 1: DISTINCT ON — gọn, PostgreSQL-specific
SELECT DISTINCT ON (device_id) device_id, value, recorded_at
FROM metrics
ORDER BY device_id, recorded_at DESC;

-- Cách 2: LATERAL — nhanh hơn nhiều khi có bảng devices riêng
SELECT d.id, m.value, m.recorded_at
FROM devices d
CROSS JOIN LATERAL (
  SELECT value, recorded_at FROM metrics
  WHERE device_id = d.id
  ORDER BY recorded_at DESC LIMIT 1
) m;
```

Cách 2 thắng khi số thiết bị nhỏ so với số dòng metric: nó làm một index lookup
mỗi thiết bị thay vì quét toàn bộ rồi loại. Cần index
`(device_id, recorded_at DESC)`.

## Window function hay dùng

```sql
-- So với giá trị trước
SELECT recorded_at, value,
       value - lag(value) OVER (PARTITION BY device_id ORDER BY recorded_at) AS delta
FROM metrics;

-- Trung bình trượt 7 điểm
SELECT recorded_at, value,
       avg(value) OVER (
         PARTITION BY device_id ORDER BY recorded_at
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) AS moving_avg
FROM metrics;

-- Phần trăm thay đổi so với bucket trước
SELECT bucket, avg_value,
       round(100.0 * (avg_value - lag(avg_value) OVER (ORDER BY bucket))
             / NULLIF(lag(avg_value) OVER (ORDER BY bucket), 0), 2) AS pct_change
FROM metrics_hourly;
```

## Materialized view cho dashboard

```sql
CREATE MATERIALIZED VIEW daily_summary AS
SELECT device_id, date_trunc('day', recorded_at) AS day,
       avg(value) AS avg_value, count(*) AS samples
FROM metrics
GROUP BY device_id, day;

-- Cần index UNIQUE để refresh không chặn đọc
CREATE UNIQUE INDEX ON daily_summary (device_id, day);

REFRESH MATERIALIZED VIEW CONCURRENTLY daily_summary;
```

`CONCURRENTLY` **bắt buộc** có index unique, và nó chậm hơn refresh thường —
nhưng không chặn `SELECT`, nên là lựa chọn đúng cho dashboard đang chạy.

## Khi nào cần TimescaleDB

Extension chuyên cho time-series, thêm: nén cột (tiết kiệm 90%+), continuous
aggregate tự cập nhật, và chia partition tự động.

Nên cân nhắc khi: dữ liệu > vài TB, cần nén mạnh, hoặc muốn rollup tự động thay
vì tự viết cron. Còn ở mức vài trăm GB thì PostgreSQL thuần với partition + BRIN
+ rollup thủ công là đủ, và không thêm phụ thuộc.

## Liên quan

- [Partitioning](./partitioning) — nền tảng
- [BRIN](./index-types#brin--block-range-index)
- [Bulk Loading](./bulk-loading) — nạp metric bằng COPY
