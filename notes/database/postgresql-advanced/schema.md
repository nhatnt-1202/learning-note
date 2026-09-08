# Schema Design

Chọn kiểu dữ liệu và ràng buộc đúng từ đầu rẻ hơn nhiều so với migrate bảng
hàng trăm triệu dòng sau này.

## Chọn kiểu dữ liệu

| Nên dùng | Thay vì | Lý do |
|---|---|---|
| `text` | `varchar(n)` | Hiệu năng như nhau; `text` không cần migrate khi đổi giới hạn. Cần giới hạn thì dùng `CHECK` |
| `timestamptz` | `timestamp` | `timestamp` **không** lưu timezone — gần như luôn là bug chờ nổ |
| `numeric` | `float` cho tiền | `float` là nhị phân, làm tròn sai |
| `bigint` | `int` cho khóa chính | 2.1 tỷ đến nhanh hơn bạn nghĩ; migrate sau rất đau |
| `jsonb` | `json` | `json` lưu nguyên văn, không index được |
| `boolean` | `smallint 0/1` | Rõ nghĩa hơn |
| `uuid` | `text` chứa UUID | 16 byte thay vì 36 |

Điểm về `varchar(n)` hay gây tranh luận: trong PostgreSQL, `varchar(n)` và `text`
dùng **cùng một** kiểu lưu trữ, `n` chỉ là một ràng buộc kiểm tra. Nó không
nhanh hơn và không tiết kiệm hơn.

## Khóa chính

```sql
-- PG 10+: chuẩn SQL, nên dùng
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ...
);

-- serial: cách cũ, vẫn chạy nhưng có vướng về quyền và ownership sequence
CREATE TABLE users (id bigserial PRIMARY KEY);
```

### UUID và vấn đề locality

`uuid` v4 là ngẫu nhiên → mỗi insert rơi vào một page [B-tree](./btree) khác
nhau, phá cache và làm index bloat nhanh. Nếu cần ID không đoán được, dùng UUID
v7 (có tiền tố thời gian, nên tăng dần):

```sql
-- PG 18+ có sẵn
SELECT uuidv7();

-- Bản cũ: pg_uuidv7 extension, hoặc sinh ở tầng ứng dụng
```

`bigint identity` vẫn là lựa chọn mặc định tốt nhất nếu không có yêu cầu bảo mật
buộc phải che ID.

## Ràng buộc — để database bảo vệ dữ liệu

```sql
CREATE TABLE orders (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      text   NOT NULL DEFAULT 'pending',
  total       numeric(12,2) NOT NULL CHECK (total >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT status_valid CHECK (status IN ('pending','paid','shipped','cancelled'))
);
```

`CHECK` + `text` thường tốt hơn `enum`: thêm giá trị vào `enum` được, nhưng
**xóa hoặc đổi tên thì rất khó**, và `ALTER TYPE` có hạn chế trong transaction.

Foreign key **cần index ở phía con** — PostgreSQL tự tạo index cho phía được
tham chiếu, nhưng không tạo cho cột FK:

```sql
CREATE INDEX ON orders(user_id);   -- thiếu cái này, DELETE user sẽ seq scan orders
```

Đây là một trong những index bị quên nhiều nhất.

## Thêm cột / ràng buộc không downtime

`ALTER TABLE` cần `ACCESS EXCLUSIVE` (xem [Locking](./locking)), nên luôn:

```sql
SET lock_timeout = '3s';
```

### Thêm cột

```sql
-- Nhanh (chỉ đổi metadata), kể cả có DEFAULT — từ PG 11
ALTER TABLE users ADD COLUMN phone text;
ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;
```

Từ PG 11, `DEFAULT` hằng số **không** viết lại bảng nữa. Nhưng `DEFAULT` dùng
hàm biến đổi (`now()`, `random()`) thì **vẫn** viết lại toàn bộ — cẩn thận.

### Thêm NOT NULL vào cột có sẵn

Cách một bước sẽ quét toàn bảng dưới lock nặng. Làm ba bước:

```sql
-- 1. CHECK NOT VALID: lấy lock ngắn, không quét bảng
ALTER TABLE users ADD CONSTRAINT users_phone_nn
  CHECK (phone IS NOT NULL) NOT VALID;

-- 2. Validate: quét bảng nhưng chỉ lock nhẹ, không chặn đọc/ghi
ALTER TABLE users VALIDATE CONSTRAINT users_phone_nn;

-- 3. (PG 12+) Giờ SET NOT NULL nhanh vì đã có CHECK chứng minh
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_phone_nn;
```

Mẫu `NOT VALID` → `VALIDATE` cũng áp dụng cho foreign key — đây là cách chuẩn
để thêm ràng buộc lên bảng lớn đang chạy.

### Đổi kiểu cột

Gần như luôn viết lại bảng và giữ lock. Với bảng lớn, cách an toàn là thêm cột
mới + backfill theo lô + đổi tên, hoặc dùng công cụ như `pg-osc`.

## Soft delete

```sql
ALTER TABLE users ADD COLUMN deleted_at timestamptz;

-- Chỉ index dòng còn sống
CREATE INDEX ON users(email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON users(email) WHERE deleted_at IS NULL;

-- View cho tiện
CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;
```

[Partial index](./partial-expression-index) là chỗ soft delete phối hợp rất tốt
với PostgreSQL.

## Cột sinh tự động

```sql
ALTER TABLE products ADD COLUMN price_with_vat numeric(12,2)
  GENERATED ALWAYS AS (price * 1.1) STORED;
```

PostgreSQL chỉ hỗ trợ `STORED` (tính khi ghi), chưa có `VIRTUAL`. Hữu ích cho
[tsvector](./index-types#full-text-search).

## Timestamp tự cập nhật

Không có `ON UPDATE` như MySQL; cần trigger:

```sql
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Naming convention

Không có chuẩn bắt buộc, nhưng nhất quán thì đỡ tra cứu:

```
bảng            users, order_items          (số nhiều, snake_case)
khóa chính      id
khóa ngoại      user_id
index           idx_<bảng>_<cột>
unique          uq_<bảng>_<cột>
check           ck_<bảng>_<mô tả>
```

PostgreSQL **hạ chữ thường** mọi identifier không có nháy kép, nên `createdAt`
thành `createdat`. Dùng `snake_case` để tránh phải viết `"createdAt"` mãi.

## Liên quan

- [Storage](./storage) — thứ tự cột ảnh hưởng dung lượng
- [Locking](./locking) — vì sao `ALTER TABLE` nguy hiểm
- [Partial & Expression Index](./partial-expression-index)
