# pg_trgm — Tìm kiếm gần đúng

`pg_trgm` giải quyết hai bài toán mà [B-tree](./btree) bó tay: tăng tốc
`LIKE '%abc%'` và tìm chuỗi **gần giống** (sai chính tả, thiếu dấu).

```sql
CREATE EXTENSION pg_trgm;
```

## Trigram là gì

Chuỗi được cắt thành các nhóm 3 ký tự liên tiếp, có đệm khoảng trắng ở đầu/cuối:

```sql
SELECT show_trgm('hello');
-- {"  h"," he",ell,hel,llo,"lo "}
```

Hai chuỗi giống nhau thì chia sẻ nhiều trigram. Độ tương đồng = số trigram
chung / tổng trigram:

```sql
SELECT similarity('postgresql', 'postgres');   -- 0.7
SELECT similarity('nguyen', 'nguyeen');        -- 0.6
```

Vì trigram là các *phần tử* của giá trị, chúng index được bằng
[GIN](./index-types) — và đó là cả mẹo ở đây.

## Tăng tốc LIKE '%...%'

Đây là lý do thực dụng nhất để dùng `pg_trgm`.

```sql
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);

-- Giờ query này dùng được index
SELECT * FROM users WHERE name LIKE '%nguyen%';
SELECT * FROM users WHERE name ILIKE '%NGUYEN%';
```

Index này cũng phục vụ regex (`~`, `~*`). Yêu cầu: mẫu tìm phải có **ít nhất 3
ký tự liên tiếp** — `LIKE '%ab%'` không tận dụng được trigram nào.

## Tìm gần đúng

Toán tử `%` trả về true khi `similarity` vượt ngưỡng:

```sql
SET pg_trgm.similarity_threshold = 0.3;   -- mặc định 0.3

SELECT name, similarity(name, 'nguyen van a') AS sim
FROM users
WHERE name % 'nguyen van a'
ORDER BY sim DESC
LIMIT 10;
```

Cách viết tốt hơn cho autocomplete — dùng toán tử khoảng cách `<->`
(= `1 - similarity`), cho phép index phục vụ luôn `ORDER BY`:

```sql
SELECT name FROM users
ORDER BY name <-> 'nguyen van a'
LIMIT 10;
```

Với `<->` thì **GiST** thường tốt hơn GIN, vì GiST hỗ trợ nearest-neighbour
thực sự:

```sql
CREATE INDEX ON users USING gist (name gist_trgm_ops);
```

## GIN hay GiST

| | GIN | GiST |
|---|---|---|
| Tốc độ tìm chính xác (`LIKE`) | **Nhanh hơn** | Chậm hơn |
| `ORDER BY <->` (KNN) | Không index được | **Có** |
| Cỡ index | Lớn hơn | Nhỏ hơn |
| Tốc độ ghi | Chậm hơn | Nhanh hơn |

Quy tắc: lọc `LIKE`/`ILIKE` → **GIN**. Autocomplete xếp theo độ giống →
**GiST**. Cần cả hai thì tạo cả hai và để planner chọn.

## Tiếng Việt — bỏ dấu

`similarity('Nguyễn', 'Nguyen')` khá thấp vì dấu làm đổi trigram. Cách xử lý là
index bản đã bỏ dấu bằng `unaccent`:

```sql
CREATE EXTENSION unaccent;
```

`unaccent()` mặc định là `STABLE`, không `IMMUTABLE`, nên không dùng trực tiếp
trong index được (xem
[Expression Index](./partial-expression-index#yêu-cầu-hàm-phải-immutable)).
Bọc lại:

```sql
CREATE FUNCTION immutable_unaccent(text) RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

CREATE INDEX idx_users_name_unaccent ON users
  USING gin (immutable_unaccent(name) gin_trgm_ops);
```

Query phải dùng **đúng biểu thức đó**:

```sql
SELECT * FROM users
WHERE immutable_unaccent(name) ILIKE '%' || immutable_unaccent('nguyễn') || '%';
```

Chỉ định thẳng `'unaccent'` (tên dictionary) là phần quan trọng: nó khiến hàm
không còn phụ thuộc `search_path`, nên khai `IMMUTABLE` mới là đúng.

## pg_trgm hay full-text search

Chọn sai cái này là chuyện thường gặp:

| Nhu cầu | Dùng |
|---|---|
| Tìm khớp một phần từ, sai chính tả, autocomplete tên | **pg_trgm** |
| Tìm theo từ, gốc từ, xếp hạng liên quan, cụm từ | **[tsvector + GIN](./index-types#full-text-search)** |
| Cả hai | Cả hai, kết hợp bằng `OR` |

Trực giác: `pg_trgm` làm việc trên **ký tự**, full-text làm việc trên **từ**.
Với tiếng Việt (không có dictionary stemming sẵn), `pg_trgm` thường thực dụng
hơn.

## Tinh chỉnh

```sql
-- Ngưỡng cho toán tử %
SET pg_trgm.similarity_threshold = 0.25;   -- thấp hơn = kết quả rộng hơn

-- Xem trigram của một chuỗi (để debug vì sao không khớp)
SELECT show_trgm('nguyễn');
```

Nếu tìm kiếm trả về quá nhiều rác, tăng ngưỡng; bỏ sót thì hạ xuống. Với dữ liệu
tên người, 0.25–0.35 thường hợp lý.

## Liên quan

- [GIN / GiST](./index-types) — hai loại index đứng sau
- [Expression Index](./partial-expression-index) — bẫy IMMUTABLE
