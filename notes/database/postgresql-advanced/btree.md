# B-tree Index

B-tree là loại index mặc định của PostgreSQL — `CREATE INDEX` không nói gì thì
là B-tree. Nó phục vụ được `=`, `<`, `>`, `BETWEEN`, `IN`, `IS NULL`, và cả
`ORDER BY`.

## Cấu trúc

Cây cân bằng, các node là page 8KB:

```
            [ Root ]
           /    |    \
      [Int]   [Int]   [Int]         ← internal pages: khoảng giá trị
      /  \     /  \     /  \
   [Leaf][Leaf]...              ← leaf pages: giá trị + ctid, nối đôi
```

Hai đặc điểm quyết định hành vi:

- **Độ sâu rất thấp** — bảng tỷ dòng thường chỉ 4–5 tầng, nên tra cứu tốn vài
  lần đọc page
- **Leaf được nối đôi** — nên quét khoảng (`BETWEEN`) và `ORDER BY` đi tuần tự
  không cần quay lại root

Xem độ sâu thực tế:

```sql
CREATE EXTENSION pageinspect;
SELECT level, index_size FROM bt_metap('idx_users_email');
```

## Composite index — thứ tự cột là tất cả

Đây là chỗ sai nhiều nhất khi làm index.

```sql
CREATE INDEX idx_orders ON orders(user_id, status, created_at);
```

Index này dùng được cho:

| Query | Dùng index? |
|---|---|
| `WHERE user_id = 1` | Có |
| `WHERE user_id = 1 AND status = 'paid'` | Có |
| `WHERE user_id = 1 AND status = 'paid' AND created_at > ...` | Có (tối ưu) |
| `WHERE status = 'paid'` | **Gần như không** |
| `WHERE created_at > ...` | **Không** |

Quy tắc **leftmost prefix**: index chỉ hữu ích khi query dùng các cột từ
*bên trái liên tục*. Bỏ qua cột đầu là mất index.

> PostgreSQL vẫn có thể chọn "index scan với filter" khi thiếu cột đầu, nhưng
> lúc đó nó phải quét gần hết index — thường không hơn seq scan.

### Xếp thứ tự cột thế nào

1. Cột dùng với `=` đặt trước
2. Cột dùng với khoảng (`>`, `<`, `BETWEEN`) đặt **sau cùng**
3. Trong nhóm `=`, cột **lọc mạnh hơn** (nhiều giá trị khác nhau) đặt trước

Lý do (2): sau khi gặp điều kiện khoảng, các cột phía sau không còn lọc được nữa
mà chỉ đi kèm.

```sql
-- Query: WHERE tenant_id = ? AND status = ? AND created_at > ?
CREATE INDEX ON orders(tenant_id, status, created_at);  -- đúng thứ tự
```

## ORDER BY và index

B-tree lưu dữ liệu đã sắp xếp, nên có thể bỏ hẳn bước sort:

```sql
-- Index này phục vụ cả WHERE lẫn ORDER BY
CREATE INDEX idx_posts ON posts(user_id, created_at DESC);

SELECT * FROM posts WHERE user_id = 1 ORDER BY created_at DESC LIMIT 20;
```

Nếu thấy `Sort` trong [EXPLAIN](./explain-analyze) kèm phân trang, đây là cách
xử lý. Chú ý hướng sắp xếp phải khớp — hoặc ngược hoàn toàn (PostgreSQL quét
index ngược được), nhưng trộn `ASC`/`DESC` giữa các cột thì cần index khai báo
đúng như vậy:

```sql
CREATE INDEX ON events(user_id ASC, created_at DESC);
```

## NULL

```sql
CREATE INDEX ON t(col NULLS FIRST);   -- mặc định là NULLS LAST cho ASC
```

B-tree **có** index NULL, nên `WHERE col IS NULL` dùng được index — khác với
một số database khác.

## Index-only scan

Nếu index chứa **mọi cột** query cần, PostgreSQL đọc xong index là trả kết quả,
không cần chạm bảng:

```sql
CREATE INDEX ON orders(user_id, total);
SELECT user_id, total FROM orders WHERE user_id = 1;   -- Index Only Scan
```

Điều kiện thêm: page phải "all-visible" trong visibility map, tức là bảng đã
được [VACUUM](./vacuum) gần đây. Đây là lý do một query đang nhanh tự chậm đi
sau đợt ghi lớn.

### INCLUDE — cột đi kèm không tham gia sắp xếp

```sql
CREATE INDEX idx_orders ON orders(user_id) INCLUDE (total, created_at);
```

`INCLUDE` (PG 11+) nhét cột vào leaf để phục vụ index-only scan mà không làm
index phình như khi thêm vào khóa. Dùng khi cột đó chỉ cần *đọc ra*, không cần
lọc hay sắp xếp theo nó.

Với `UNIQUE`, đây là cách duy nhất đúng:

```sql
-- unique trên email, nhưng vẫn đọc được name mà không chạm bảng
CREATE UNIQUE INDEX ON users(email) INCLUDE (name);
```

## Tạo index không chặn ghi

`CREATE INDEX` thường lấy lock `SHARE` — chặn mọi `INSERT`/`UPDATE`/`DELETE`.
Trên production luôn dùng:

```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
DROP INDEX CONCURRENTLY idx_users_email;
```

Đánh đổi: chậm hơn (quét bảng 2 lần), **không chạy được trong transaction**, và
nếu thất bại sẽ để lại index `INVALID` phải dọn tay:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY <tên_index_invalid>;
```

## Giới hạn

- Khóa index tối đa ~2704 bytes (1/3 page). Index cột `text` dài sẽ lỗi → dùng
  index trên `md5(col)` hoặc [pg_trgm](./pg-trgm)
- Không phục vụ `LIKE '%abc'` (mở đầu bằng wildcard) → [pg_trgm](./pg-trgm)
- Không phục vụ tìm kiếm trong `jsonb`/mảng → [GIN](./index-types)

## Liên quan

- [Các loại index khác](./index-types) — khi B-tree không phù hợp
- [Partial & Expression Index](./partial-expression-index) — B-tree nhưng hẹp hơn
- [EXPLAIN ANALYZE](./explain-analyze) — kiểm chứng index có được dùng
