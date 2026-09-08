# GIN / GiST / BRIN / Hash

[B-tree](./btree) giải quyết phần lớn nhu cầu, nhưng có những bài toán nó không
làm được: tìm trong `jsonb`, tìm theo khoảng cách địa lý, hay index một bảng
time-series hàng tỷ dòng mà không tốn cả trăm GB.

## Bảng chọn nhanh

| Loại | Dùng cho | Cỡ index | Ghi chậm hơn? |
|---|---|---|---|
| **B-tree** | `=`, khoảng, `ORDER BY` | Trung bình | Không |
| **GIN** | `jsonb`, mảng, full-text, [trigram](./pg-trgm) | **Lớn** | **Có, đáng kể** |
| **GiST** | Địa lý, range type, nearest-neighbour | Trung bình | Có |
| **BRIN** | Cột tương quan thứ tự vật lý (time-series) | **Cực nhỏ** | Gần như không |
| **Hash** | Chỉ `=` | Nhỏ hơn B-tree | Không |
| **SP-GiST** | Dữ liệu phân cấp, không cân bằng | Nhỏ | Có |

## GIN — Generalized Inverted Index

Index đảo: với mỗi *phần tử* bên trong giá trị, lưu danh sách dòng chứa nó. Đây
là lựa chọn cho **một giá trị chứa nhiều thành phần cần tìm**.

### jsonb

```sql
CREATE INDEX idx_data ON events USING gin (data);

-- Các toán tử được phục vụ: @> ? ?| ?&
SELECT * FROM events WHERE data @> '{"type": "click"}';
SELECT * FROM events WHERE data ? 'user_id';
```

Nếu chỉ cần toán tử chứa (`@>`), dùng `jsonb_path_ops` — nhỏ và nhanh hơn:

```sql
CREATE INDEX ON events USING gin (data jsonb_path_ops);
```

Còn nếu chỉ truy vấn **một khóa cố định**, B-tree trên expression rẻ hơn nhiều
so với GIN cả bảng:

```sql
CREATE INDEX ON events ((data->>'user_id'));
```

### Mảng

```sql
CREATE INDEX idx_tags ON posts USING gin (tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgres'];
SELECT * FROM posts WHERE tags && ARRAY['sql','db'];   -- giao nhau
```

### Full-text search

```sql
-- Cột sinh sẵn (PG 12+) — nên làm thế này thay vì index expression
ALTER TABLE posts ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || body)) STORED;

CREATE INDEX idx_posts_tsv ON posts USING gin (tsv);

SELECT * FROM posts WHERE tsv @@ websearch_to_tsquery('simple', 'postgres index');
```

Tiếng Việt không có dictionary sẵn trong PostgreSQL; dùng config `simple` (khớp
nguyên từ) hoặc [pg_trgm](./pg-trgm) cho tìm gần đúng.

### Đánh đổi của GIN

GIN **ghi chậm** vì mỗi lần insert phải cập nhật nhiều posting list. Giảm tải
bằng `fastupdate` (bật sẵn) — thay đổi được dồn vào danh sách chờ:

```sql
ALTER INDEX idx_data SET (fastupdate = on, gin_pending_list_limit = '4MB');
```

Đánh đổi tiếp: danh sách chờ càng lớn thì `SELECT` càng chậm (phải quét thêm),
và nó chỉ được dọn khi [VACUUM](./vacuum) chạy.

## GiST — cho dữ liệu hình học và khoảng

GiST là framework cho index "có thứ tự bộ phận" — mỗi node lưu một hình bao
chứa các con.

```sql
-- Range type: tìm khoảng thời gian chồng nhau
CREATE INDEX ON bookings USING gist (during);
SELECT * FROM bookings WHERE during && tstzrange(now(), now() + '1 day');

-- PostGIS
CREATE INDEX ON places USING gist (geom);
```

Khả năng riêng của GiST: **nearest-neighbour** với toán tử `<->`, sắp xếp theo
khoảng cách mà vẫn dùng index:

```sql
SELECT * FROM places ORDER BY geom <-> ST_Point(105.85, 21.03) LIMIT 10;
```

Kèm `btree_gist`, GiST làm được ràng buộc mà B-tree không làm nổi — ví dụ
"không cho hai booking cùng phòng trùng giờ":

```sql
CREATE EXTENSION btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (room_id WITH =, during WITH &&);
```

## BRIN — Block Range INdex

BRIN không lưu từng dòng, chỉ lưu **min/max cho mỗi nhóm page** (mặc định 128
page = 1MB). Vì thế index cực nhỏ: bảng 100GB có thể chỉ cần BRIN vài MB.

Điều kiện sống còn: **giá trị phải tương quan với thứ tự vật lý trên đĩa**. Đúng
cho `created_at` của bảng chỉ append; sai hoàn toàn cho cột ngẫu nhiên như UUID.

```sql
CREATE INDEX idx_logs_time ON logs USING brin (created_at);

-- Nhóm nhỏ hơn = chính xác hơn, index lớn hơn
CREATE INDEX ON logs USING brin (created_at) WITH (pages_per_range = 32);
```

Kiểm tra tương quan trước khi dùng — gần `1` hoặc `-1` là tốt, gần `0` là vô ích:

```sql
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'logs' AND attname = 'created_at';
```

## Hash

Chỉ phục vụ `=`, nhưng nhỏ hơn B-tree — hợp khi index cột giá trị dài mà chỉ
so sánh bằng. Từ PG 10 mới có WAL (trước đó không crash-safe).

```sql
CREATE INDEX ON sessions USING hash (token);
```

Thực tế B-tree gần như luôn là lựa chọn an toàn hơn vì linh hoạt hơn nhiều.

## Xem index đã tạo

```sql
SELECT indexname, indexdef, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes WHERE tablename = 'events';
```

## Liên quan

- [B-tree](./btree) — mặc định, nên thử trước
- [pg_trgm](./pg-trgm) — GIN/GiST cho `LIKE` và tìm gần đúng
- [Index Maintenance](./index-maintenance) — index nào đang thừa
