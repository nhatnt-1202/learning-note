# Index Maintenance

Index không phải "tạo rồi xong". Chúng bloat, chúng trùng nhau, và index thừa
làm chậm mọi `INSERT`/`UPDATE` mà không giúp gì cho `SELECT`.

## Chi phí thật của một index

Mỗi index thêm vào là:

- Ghi thêm mỗi lần `INSERT`/`DELETE`, và mỗi `UPDATE` chạm cột được index
- Phá [HOT update](./storage#hot-update) — điểm bị bỏ qua nhiều nhất
- Thêm dung lượng, thêm thời gian [VACUUM](./vacuum) và backup

Nên câu hỏi đúng không phải "index này có giúp gì không" mà "nó giúp đủ để bù
chi phí ghi không".

## Tìm index không ai dùng

```sql
SELECT
  s.relname AS table,
  s.indexrelname AS index,
  s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique          -- giữ unique: chúng là ràng buộc
  AND NOT i.indisprimary
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

Ba điều phải kiểm trước khi xóa:

1. **Statistics đã đủ lâu chưa** — `idx_scan = 0` không có ý nghĩa nếu vừa
   reset. Xem `stats_reset`:
   ```sql
   SELECT stats_reset FROM pg_stat_database WHERE datname = current_database();
   ```
2. **Đã qua hết chu kỳ nghiệp vụ chưa** — index chỉ dùng cho báo cáo cuối tháng
   sẽ trông như "không dùng" trong 29 ngày
3. **Trên replica thì sao** — `pg_stat_user_indexes` là số liệu *cục bộ*. Index
   có thể chỉ được dùng bởi query analytics chạy trên standby

Xóa an toàn: đánh dấu invisible không có trong PostgreSQL, nên cách thực dụng là
`DROP INDEX CONCURRENTLY` và giữ sẵn câu `CREATE` để hoàn tác.

```sql
DROP INDEX CONCURRENTLY idx_unused;
```

## Tìm index trùng nhau

Index `(a)` là **thừa** nếu đã có `(a, b)` — leftmost prefix của composite index
phục vụ được luôn.

```sql
SELECT
  indrelid::regclass AS table,
  array_agg(indexrelid::regclass) AS indexes,
  pg_get_indexdef(min(indexrelid)) AS definition
FROM pg_index
GROUP BY indrelid, indkey, indclass, indpred, indexprs IS NULL
HAVING count(*) > 1;
```

Query này bắt các index **định nghĩa giống hệt nhau**. Trùng dạng prefix thì cần
đọc tay — liệt kê rồi so:

```sql
SELECT indexrelid::regclass AS index, indkey
FROM pg_index WHERE indrelid = 'orders'::regclass;
```

Nếu thấy `indkey` là `1` và `1 2` → index `(1)` gần như chắc chắn xóa được.

## Index bloat

Index B-tree bị phân mảnh khi dòng bị xóa/cập nhật nhiều: page rỗng một phần
nhưng vẫn nằm trong cây. Đo chính xác cần `pgstattuple`:

```sql
CREATE EXTENSION pgstattuple;

SELECT
  indexrelname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  round((pgstatindex(indexrelid::regclass)).avg_leaf_density, 1) AS leaf_density
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

`avg_leaf_density` là % lấp đầy của leaf page. Index mới khoảng 90%; **xuống
dưới ~50% là đáng reindex**.

Lưu ý `pgstatindex` phải quét cả index nên chậm — đừng chạy vô tư trên bảng lớn
giờ cao điểm.

## REINDEX

```sql
-- Không chặn ghi (PG 12+) — luôn dùng cái này trên production
REINDEX INDEX CONCURRENTLY idx_users_email;
REINDEX TABLE CONCURRENTLY users;

-- Chặn ghi — chỉ khi có cửa sổ bảo trì
REINDEX INDEX idx_users_email;
```

`REINDEX CONCURRENTLY` cần chỗ trống bằng cỡ index (nó build bản mới rồi đổi
tên). Nếu bị hủy giữa đường sẽ để lại index `_ccnew` phải dọn:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
```

## Thiếu index — tìm bảng bị seq scan nhiều

```sql
SELECT relname,
       seq_scan, seq_tup_read,
       idx_scan,
       seq_tup_read / NULLIF(seq_scan, 0) AS avg_rows_per_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

`seq_scan` cao **và** `avg_rows_per_scan` lớn → bảng lớn bị quét toàn bộ liên
tục, ứng viên cần index. Ngược lại, bảng nhỏ bị seq scan nhiều là **bình
thường** — với vài trăm dòng, seq scan nhanh hơn index scan.

## Query chậm — pg_stat_statements

Extension quan trọng nhất cho tuning. Nên bật sẵn trên mọi môi trường:

```ini
shared_preload_libraries = 'pg_stat_statements'   # cần restart
```

```sql
CREATE EXTENSION pg_stat_statements;

SELECT
  round(total_exec_time::numeric, 0) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2)  AS mean_ms,
  rows,
  query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Sắp theo `total_exec_time` chứ không phải `mean_exec_time`: query 5ms chạy 1
triệu lần tốn nhiều tài nguyên hơn query 2 giây chạy 10 lần. Tối ưu theo tổng
mới đúng chỗ.

> Trên PG < 13, cột tên là `total_time` / `mean_time`.

Reset để đo một khoảng cụ thể:

```sql
SELECT pg_stat_statements_reset();
```

## Checklist định kỳ

- [ ] `idx_scan = 0` sau ≥1 chu kỳ nghiệp vụ → xem xét drop
- [ ] Index trùng định nghĩa hoặc trùng prefix → drop cái hẹp hơn
- [ ] `avg_leaf_density < 50%` → `REINDEX CONCURRENTLY`
- [ ] `pg_indexes_size` >> `pg_relation_size` → nghi có index thừa
- [ ] Top `total_exec_time` trong `pg_stat_statements` → đọc
      [EXPLAIN](./explain-analyze)

## Liên quan

- [VACUUM](./vacuum) — bloat ở tầng bảng
- [EXPLAIN ANALYZE](./explain-analyze) — xác minh trước khi sửa
