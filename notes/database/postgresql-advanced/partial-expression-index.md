# Partial & Expression Index

Hai kỹ thuật làm index **nhỏ hơn** và **đúng việc hơn**, đều dựa trên
[B-tree](./btree) (hoặc loại khác) nhưng thu hẹp phạm vi.

## Partial index — chỉ index một phần bảng

Thêm `WHERE` vào lúc tạo index:

```sql
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';
```

Lợi ích khi dữ liệu lệch: nếu 99% đơn đã `completed` và query chỉ quan tâm
`pending`, index này nhỏ hơn cả trăm lần index đầy đủ — nhanh hơn, ít bloat hơn,
và ít làm chậm `INSERT` hơn.

Điều kiện để planner dùng được: mệnh đề `WHERE` của query phải **hàm ý** được
`WHERE` của index.

```sql
-- Dùng được
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at;

-- Không dùng được (planner không chứng minh được)
SELECT * FROM orders WHERE status = $1 ORDER BY created_at;
```

Chỗ này hay làm người ta bối rối: **truyền status qua tham số thì mất index**,
vì lúc lập plan planner chưa biết `$1` là gì. Với prepared statement hoặc ORM,
cần viết hằng số thẳng vào query.

### Các dùng phổ biến

```sql
-- Bỏ NULL khỏi index (thường chiếm phần lớn bảng)
CREATE INDEX ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Soft delete: chỉ index dòng còn sống
CREATE INDEX ON users(email) WHERE deleted_at IS NULL;

-- Unique có điều kiện — email chỉ unique trong các user chưa xóa
CREATE UNIQUE INDEX ON users(email) WHERE deleted_at IS NULL;

-- Bảng job queue
CREATE INDEX ON jobs(priority, created_at) WHERE status = 'queued';
```

Mẫu `CREATE UNIQUE INDEX ... WHERE` là cách chuẩn để làm unique một phần —
`UNIQUE` constraint bình thường không có tùy chọn này.

## Expression index — index trên kết quả biểu thức

Khi query lọc theo *hàm* của cột chứ không phải cột, index thường bị bỏ qua:

```sql
-- Index trên email KHÔNG được dùng
SELECT * FROM users WHERE lower(email) = 'a@b.com';

-- Phải index chính biểu thức đó
CREATE INDEX ON users (lower(email));
```

Biểu thức trong query phải **khớp chính xác** với biểu thức đã index.

### Các dùng phổ biến

```sql
-- Case-insensitive
CREATE INDEX ON users (lower(email));
CREATE UNIQUE INDEX ON users (lower(email));   -- unique không phân biệt hoa thường

-- Trích khóa từ jsonb (rẻ hơn GIN nếu chỉ cần 1 khóa)
CREATE INDEX ON events ((data->>'user_id'));

-- Theo ngày, bỏ giờ
CREATE INDEX ON orders (date(created_at));

-- Cột text quá dài cho B-tree (giới hạn ~2704 bytes)
CREATE INDEX ON docs (md5(content));

-- Sắp xếp theo độ dài
CREATE INDEX ON files ((length(name)));
```

### Yêu cầu: hàm phải IMMUTABLE

Hàm dùng trong expression index phải `IMMUTABLE` — cùng input luôn cho cùng
output. Đây là lý do lỗi này rất hay gặp:

```sql
CREATE INDEX ON orders (date(created_at));
-- ERROR: functions in index expression must be marked IMMUTABLE
```

Nguyên nhân: `created_at` là `timestamptz`, và đổi nó sang ngày phụ thuộc
`TimeZone` của session → không immutable. Cách xử lý là chỉ định timezone cố
định:

```sql
CREATE INDEX ON orders ((created_at AT TIME ZONE 'UTC')::date);
```

Với hàm tự viết, chỉ đánh `IMMUTABLE` khi nó **thật sự** như vậy — khai sai
dẫn đến index sai lặng lẽ, rất khó phát hiện.

## Kết hợp cả hai

```sql
CREATE INDEX idx_active_lower_email ON users (lower(email))
WHERE deleted_at IS NULL;
```

## Statistics cho expression index

PostgreSQL thu thập statistics riêng cho expression index sau khi
[`ANALYZE`](./vacuum) — nên tạo index xong nhớ chạy:

```sql
ANALYZE users;
```

Không có statistics thì planner đoán selectivity sai và có thể bỏ qua index vừa
tạo. Đây là lý do phổ biến của tình huống "tạo index rồi mà query vẫn chậm".

## Liên quan

- [B-tree](./btree) — nền tảng
- [EXPLAIN ANALYZE](./explain-analyze) — kiểm chứng index được dùng
- [Index Maintenance](./index-maintenance) — tìm index thừa
