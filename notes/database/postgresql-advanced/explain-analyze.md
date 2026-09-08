# EXPLAIN ANALYZE

Query planner của PostgreSQL dựa trên **chi phí ước lượng**: nó liệt kê các cách
thực thi, đoán chi phí từng cách, rồi chọn cách rẻ nhất. `EXPLAIN` cho xem kế
hoạch đó — và phần lớn việc tuning là so ước lượng với thực tế.

## Cách dùng đúng

```sql
-- Chỉ xem plan, không chạy
EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';

-- Chạy thật + số liệu thật ← dùng cái này
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Đầy đủ nhất
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, WAL) SELECT ...;
```

`BUFFERS` gần như luôn nên bật: nó cho biết bao nhiêu page đọc từ cache
(`shared hit`) và bao nhiêu từ đĩa (`read`) — thông tin quyết định khi phán query
chậm vì thiếu index hay vì cache lạnh.

> **Cẩn thận:** `ANALYZE` **thực sự chạy** query. Với `UPDATE`/`DELETE`/`INSERT`,
> bọc trong transaction rồi rollback:
> ```sql
> BEGIN;
> EXPLAIN (ANALYZE) DELETE FROM users WHERE id = 1;
> ROLLBACK;
> ```

## Đọc plan

```
Limit  (cost=0.42..8.45 rows=10 width=64) (actual time=0.02..0.15 rows=10 loops=1)
  ->  Index Scan using idx_posts_user on posts  (cost=0.42..812.30 rows=1000 width=64)
                                                (actual time=0.02..0.14 rows=10 loops=1)
        Index Cond: (user_id = 1)
        Buffers: shared hit=5
Planning Time: 0.15 ms
Execution Time: 0.18 ms
```

Đọc **từ trong ra ngoài, từ dưới lên**: node thụt sâu nhất chạy trước.

| Trường | Nghĩa |
|---|---|
| `cost=A..B` | A = chi phí tới dòng đầu, B = tới dòng cuối (đơn vị tương đối, không phải ms) |
| `rows` (trong `cost`) | **Ước lượng** của planner |
| `actual time` | Thời gian thật (ms), **cho mỗi loop** |
| `rows` (trong `actual`) | Số dòng thật, **trung bình mỗi loop** |
| `loops` | Node chạy bao nhiêu lần |

Hai điểm gây nhầm nhiều nhất:

1. **`actual time` là mỗi loop, không phải tổng.** Tổng thật =
   `actual time × loops`. Node ghi `actual time=0.5 rows=1 loops=10000` tốn
   5 giây, không phải 0.5ms.
2. **`cost` không có đơn vị thời gian.** Chỉ so sánh được giữa các plan, không
   quy ra ms.

## Việc cần làm đầu tiên: so rows ước lượng với rows thật

Đây là kỹ năng cốt lõi khi đọc plan.

```
rows=1000 (ước lượng)  vs  actual rows=2 (thật)      → ước lượng quá cao
rows=10   (ước lượng)  vs  actual rows=500000 (thật) → ước lượng quá thấp
```

Lệch nhiều (>10×) là **nguyên nhân gốc** của phần lớn plan tệ: planner tưởng ít
dòng nên chọn Nested Loop, thực tế nhiều dòng nên chạy hàng giờ. Sửa ước lượng
thường hiệu quả hơn sửa query.

### Cách sửa ước lượng lệch

```sql
-- 1. Statistics cũ → cập nhật
ANALYZE orders;

-- 2. Cột phân bố lệch → tăng số mẫu
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;  -- mặc định 100
ANALYZE orders;

-- 3. Các cột phụ thuộc nhau → statistics đa biến (PG 10+)
CREATE STATISTICS stat_city_district (dependencies, ndistinct)
  ON city, district FROM addresses;
ANALYZE addresses;
```

Trường hợp (3) rất hay gặp: planner giả định các cột **độc lập**, nên với
`WHERE city = 'Hà Nội' AND district = 'Cầu Giấy'` nó nhân hai selectivity với
nhau và ước lượng thấp hơn thực tế cả trăm lần. `CREATE STATISTICS` dạy cho nó
biết hai cột này tương quan.

## Các node hay gặp

### Quét bảng

| Node | Khi nào |
|---|---|
| `Seq Scan` | Quét cả bảng. **Bình thường** với bảng nhỏ hoặc khi cần phần lớn dòng |
| `Index Scan` | Đi index rồi lấy từng dòng từ heap. Tốt khi ít dòng |
| `Index Only Scan` | Chỉ đọc index, không chạm heap. Nhanh nhất — cần [visibility map](./vacuum) mới |
| `Bitmap Heap Scan` | Thu ctid từ index, sắp theo thứ tự vật lý rồi đọc heap một lượt. Tốt khi số dòng ở mức trung bình |

`Seq Scan` **không** tự động là xấu. Với bảng 500 dòng, hoặc query lấy 60% bảng,
seq scan là lựa chọn đúng.

### Join

| Node | Đặc điểm |
|---|---|
| `Nested Loop` | Tốt khi bên ngoài **rất ít** dòng. Thảm họa nếu ước lượng sai |
| `Hash Join` | Build hash table từ bảng nhỏ. Lựa chọn tốt cho join lớn |
| `Merge Join` | Cần cả hai bên đã sắp xếp. Tốt khi có index phù hợp |

Thấy `Nested Loop` với `loops` rất lớn → gần như chắc chắn là ước lượng lệch.

## Dấu hiệu cảnh báo

### Sort tràn đĩa

```
Sort Method: external merge  Disk: 51200kB
```

Đang sắp xếp trên đĩa vì thiếu RAM. Tăng `work_mem` **cho session đó**:

```sql
SET work_mem = '128MB';
```

Muốn thấy `quicksort Memory: ...` thay vì `external merge`. Đừng đặt `work_mem`
lớn ở mức global: nó được cấp **cho mỗi node sort/hash của mỗi connection**, nên
100 connection × vài node có thể ăn hết RAM máy.

### Hash tràn đĩa

```
Buckets: 1024  Batches: 32  Memory Usage: 4096kB
```

`Batches > 1` nghĩa là hash join phải chia lô ra đĩa → cũng là thiếu `work_mem`.

### Filter loại quá nhiều dòng

```
Seq Scan on orders  (actual rows=50 loops=1)
  Filter: (status = 'pending')
  Rows Removed by Filter: 4999950
```

Đọc 5 triệu dòng để lấy 50 → ứng viên rõ ràng cho
[partial index](./partial-expression-index).

### Lệch giữa các worker song song

```
Workers Planned: 4   Workers Launched: 2
```

Ít worker hơn dự kiến vì đã chạm `max_parallel_workers`.

## Vì sao có index mà planner không dùng

Theo thứ tự khả năng:

1. **Bảng nhỏ** — seq scan thật sự nhanh hơn. Đúng, không cần sửa.
2. **Query lấy quá nhiều dòng** — trên ~5–10% bảng thì seq scan thường thắng.
3. **Statistics cũ** → `ANALYZE`.
4. **Kiểu dữ liệu không khớp** — `WHERE int_col = '123'` ổn, nhưng
   `WHERE varchar_col = 123` có thể ép kiểu và mất index.
5. **Hàm bọc quanh cột** — `WHERE lower(email) = ...` cần
   [expression index](./partial-expression-index).
6. **Collation không khớp** — index tạo với collation khác thì `LIKE` không dùng
   được; cần `text_pattern_ops`:
   ```sql
   CREATE INDEX ON users(email text_pattern_ops);   -- cho LIKE 'abc%'
   ```
7. **Partial index không khớp điều kiện** — xem
   [Partial Index](./partial-expression-index#partial-index--chỉ-index-một-phần-bảng).

Kiểm chứng nghi vấn (1)/(2) bằng cách ép tạm — **chỉ để chẩn đoán**, không đưa
vào production:

```sql
SET enable_seqscan = off;
EXPLAIN (ANALYZE) SELECT ...;
SET enable_seqscan = on;
```

Nếu ép index mà chậm hơn thật, thì planner đã đúng.

## Đọc plan lớn

Plan vài trăm dòng thì đọc tay rất mệt. Xuất JSON rồi dán vào công cụ trực quan:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

- [explain.dalibo.com](https://explain.dalibo.com/) — highlight node tốn kém nhất
- [pev2](https://github.com/dalibo/pev2)

Bật `auto_explain` để tự log plan của query chậm trên production:

```ini
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = '3s'
auto_explain.log_analyze = on
auto_explain.log_buffers = on
```

## Quy trình tuning

1. Tìm query tốn nhiều nhất bằng
   [`pg_stat_statements`](./index-maintenance#query-chậm--pg-stat-statements)
   (sắp theo `total_exec_time`)
2. `EXPLAIN (ANALYZE, BUFFERS)` query đó
3. So `rows` ước lượng với thật → lệch thì sửa statistics **trước**
4. Tìm node tốn nhất (`actual time × loops`)
5. Sửa: thêm/đổi index, viết lại query, hoặc tăng `work_mem`
6. Đo lại — và xác nhận bằng số, đừng tin cảm giác

## Liên quan

- [B-tree](./btree) — thứ tự cột quyết định index có dùng được
- [Partial & Expression Index](./partial-expression-index)
- [VACUUM](./vacuum) — statistics đến từ `ANALYZE`
