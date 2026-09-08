# Storage

Cách PostgreSQL lưu dữ liệu vật lý. Hiểu tầng này giải thích được nhiều thứ:
vì sao `UPDATE` đắt, vì sao cột `text` dài không làm chậm `SELECT` cột khác, vì
sao thứ tự cột ảnh hưởng dung lượng.

## Page 8KB

Đơn vị I/O của PostgreSQL là **page** (còn gọi block) cỡ **8KB**. Mọi thứ đọc
ghi đều theo page, không theo dòng.

Cấu trúc một page:

```
┌────────────────────────────┐
│ PageHeader (24 bytes)      │
├────────────────────────────┤
│ ItemId array →→→           │  con trỏ tới từng tuple (4 byte/cái)
├────────────────────────────┤
│      (không gian trống)    │
├────────────────────────────┤
│           ←←← Tuples       │  dữ liệu thật, lấp từ dưới lên
└────────────────────────────┘
```

Hệ quả: một dòng **không thể lớn hơn 8KB**. Cột dài được xử lý bằng TOAST.

## TOAST

**TOAST** (The Oversized-Attribute Storage Technique): khi dòng vượt ~2KB,
PostgreSQL nén và/hoặc đẩy các cột lớn sang một bảng phụ (`pg_toast.*`), chỉ để
lại con trỏ trong dòng gốc.

Điều này rất có lợi: cột `text` chứa 1MB JSON **không được đọc** nếu query không
`SELECT` cột đó. Nên `SELECT id, name` trên bảng có cột blob to vẫn nhanh — và
là một lý do nữa để không dùng `SELECT *`.

Chiến lược lưu trữ mỗi cột:

```sql
-- Xem
SELECT attname, attstorage FROM pg_attribute
WHERE attrelid = 'users'::regclass AND attnum > 0;

-- Đổi
ALTER TABLE docs ALTER COLUMN body SET STORAGE EXTERNAL;  -- không nén, đọc nhanh hơn
```

| Giá trị | Nghĩa |
|---|---|
| `p` (plain) | Không nén, không TOAST |
| `e` (external) | TOAST, **không** nén |
| `m` (main) | Nén, ưu tiên giữ trong dòng |
| `x` (extended) | Nén + TOAST — mặc định |

`EXTERNAL` hợp cho dữ liệu đã nén sẵn (ảnh, gzip) hoặc khi cần đọc một phần
substring nhanh.

## Thứ tự cột ảnh hưởng dung lượng

Mỗi cột phải align theo kích thước của nó, nên sắp xếp xen kẽ cột nhỏ/lớn tạo ra
byte đệm bỏ không:

```sql
-- Tốn hơn: 8 + (4+4 đệm) + 8 + (1+7 đệm) = 32 bytes
CREATE TABLE bad  (a int8, b int4, c int8, d bool);

-- Gọn hơn: xếp giảm dần theo cỡ = 24 bytes
CREATE TABLE good (a int8, c int8, b int4, d bool);
```

Quy tắc: **khai báo cột từ rộng đến hẹp** (`int8`/`timestamptz` → `int4` →
`int2` → `bool`). Trên bảng hàng trăm triệu dòng, tiết kiệm này là thật; trên
bảng nhỏ thì đừng bận tâm.

Mỗi dòng còn có header 23 bytes + padding, nên bảng nhiều cột nhỏ luôn có
overhead đáng kể.

## HOT update

Bình thường `UPDATE` tạo dòng mới và **phải cập nhật mọi index** trỏ tới nó.
**HOT** (Heap-Only Tuple) là tối ưu: nếu

1. không cột nào **được index** bị thay đổi, **và**
2. dòng mới vừa trong **cùng page**

thì PostgreSQL chỉ tạo dòng mới trong page đó và nối chuỗi con trỏ — **không
chạm index nào**. Rẻ hơn rất nhiều.

Kiểm tra tỉ lệ HOT:

```sql
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(100.0 * n_tup_hot_upd / NULLIF(n_tup_upd,0), 1) AS hot_pct
FROM pg_stat_user_tables
WHERE n_tup_upd > 0
ORDER BY n_tup_upd DESC LIMIT 20;
```

`hot_pct` thấp trên bảng update nhiều là tín hiệu tối ưu rõ ràng. Hai cách nâng:

- **Bỏ index không cần** trên các cột bị update thường xuyên
- **Chừa chỗ trong page** bằng `fillfactor`

## fillfactor

Mặc định `100` — lấp đầy page, không chừa chỗ. Bảng bị `UPDATE` nhiều nên chừa:

```sql
ALTER TABLE hot_table SET (fillfactor = 85);
VACUUM FULL hot_table;   -- hoặc pg_repack, để áp dụng cho dữ liệu cũ
```

Đánh đổi: tốn thêm ~15% đĩa, đổi lấy nhiều HOT update hơn và ít bloat hơn. Với
bảng chỉ `INSERT` (log, event) thì giữ `100`.

## Bảng chỉ chứa dữ liệu — không đâu khác

```sql
-- Cỡ từng phần
SELECT
  pg_size_pretty(pg_relation_size('users'))                    AS heap,
  pg_size_pretty(pg_indexes_size('users'))                     AS indexes,
  pg_size_pretty(pg_total_relation_size('users'))              AS total,
  pg_size_pretty(pg_total_relation_size('users')
               - pg_relation_size('users')
               - pg_indexes_size('users'))                     AS toast;

-- Đường dẫn file thật trên đĩa
SELECT pg_relation_filepath('users');
```

Khi `indexes` lớn hơn `heap` nhiều lần, thường là có index thừa — xem
[Index Maintenance](./index-maintenance).

## Kiểm tra chi tiết page

Extension `pageinspect` cho xem thẳng vào page — hữu ích khi học:

```sql
CREATE EXTENSION pageinspect;

SELECT lp, lp_off, lp_len, t_xmin, t_xmax
FROM heap_page_items(get_raw_page('users', 0));
```

Và `pgstattuple` để đo bloat chính xác (chậm, vì phải quét cả bảng):

```sql
CREATE EXTENSION pgstattuple;
SELECT * FROM pgstattuple('users');
```

## Liên quan

- [MVCC](./mvcc) — xmin/xmax nằm trong tuple header
- [VACUUM](./vacuum) — dọn không gian trong page
- [B-tree Index](./btree) — index cũng tổ chức theo page 8KB
