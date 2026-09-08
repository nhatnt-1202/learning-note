# Config Tuning

Cấu hình mặc định của PostgreSQL rất bảo thủ — nó phải chạy được trên máy nhỏ.
Trên server thật, vài tham số bộ nhớ và I/O tạo khác biệt lớn nhất.

## Cách sửa cấu hình

```sql
-- Xem giá trị và nguồn
SHOW shared_buffers;
SELECT name, setting, unit, source, pending_restart
FROM pg_settings WHERE name = 'shared_buffers';

-- Sửa (ghi vào postgresql.auto.conf)
ALTER SYSTEM SET work_mem = '32MB';
SELECT pg_reload_conf();       -- đủ cho tham số không cần restart
```

Kiểm tra tham số nào đang chờ restart:

```sql
SELECT name, setting FROM pg_settings WHERE pending_restart;
```

Cần restart: `shared_buffers`, `max_connections`, `wal_level`,
`shared_preload_libraries`. Còn lại phần lớn chỉ cần reload.

## Bộ nhớ — bốn tham số quan trọng nhất

Giả sử server **16GB RAM** dành riêng cho PostgreSQL:

```ini
shared_buffers = 4GB                  # 25% RAM
effective_cache_size = 12GB           # 50–75% RAM (chỉ là gợi ý cho planner)
work_mem = 32MB                       # MỖI node sort/hash, MỖI connection
maintenance_work_mem = 1GB            # VACUUM, CREATE INDEX
```

### shared_buffers

Cache page của PostgreSQL. Quy tắc 25% RAM là điểm khởi đầu tốt; tăng lên 40%
đôi khi giúp, nhưng hiếm khi hơn thế — vì OS page cache cũng đang cache, và
double buffering không có lợi.

Đo hit ratio để biết có thiếu không:

```sql
SELECT
  round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2) AS hit_pct
FROM pg_stat_database;
```

Trên 99% là tốt. Dưới 90% thì hoặc thiếu `shared_buffers`, hoặc working set
đơn giản là lớn hơn RAM.

### effective_cache_size

Tham số **không cấp bộ nhớ nào** — nó chỉ nói cho
[planner](./explain-analyze) biết "hệ thống có khoảng bấy nhiêu cache". Đặt
thấp làm planner tưởng đọc đĩa đắt và ngại dùng index scan.

Đặt 50–75% RAM. Đây là tham số dễ sửa nhất và hay bị bỏ quên nhất.

### work_mem — nhân lên rất nhanh

Đây là tham số **dễ gây sự cố nhất**, vì nó được cấp cho **mỗi node** sort/hash
của **mỗi connection**:

```
Tệ nhất ≈ work_mem × số node × max_connections
32MB × 3 × 100 = 9.6GB
```

Nên đặt `work_mem` toàn cục ở mức khiêm tốn rồi nâng theo session cho query
nặng:

```sql
SET work_mem = '256MB';     -- chỉ session này
-- query phân tích lớn
RESET work_mem;
```

Hoặc theo user dành cho báo cáo:

```sql
ALTER ROLE analytics SET work_mem = '512MB';
```

Biết khi nào cần tăng: thấy `external merge Disk:` trong
[EXPLAIN](./explain-analyze#sort-tràn-đĩa).

### maintenance_work_mem

Chỉ dùng bởi `VACUUM`, `CREATE INDEX`, `ALTER TABLE` — và chỉ vài process chạy
cùng lúc, nên đặt cao thoải mái (512MB–2GB). Nó giảm số vòng quét index của
[VACUUM](./vacuum) rất rõ.

## I/O và planner cost

```ini
random_page_cost = 1.1        # SSD. Mặc định 4.0 là cho ĐĨA CƠ
effective_io_concurrency = 200 # SSD/NVMe
seq_page_cost = 1.0
```

`random_page_cost = 4.0` giả định đọc ngẫu nhiên đắt gấp 4 lần đọc tuần tự —
đúng với đĩa cơ, sai hoàn toàn với SSD. Để mặc định trên SSD làm planner
**ngại dùng index** và thiên về seq scan.

Đây thường là thay đổi một dòng có tác dụng lớn nhất trên server SSD.

## WAL và checkpoint

```ini
wal_compression = on
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
```

Xem [WAL & Checkpoint](./wal#dấu-hiệu-checkpoint-sai-cấu-hình) để biết cách
kiểm tra `max_wal_size` có đủ chưa.

## Parallel query

```ini
max_worker_processes = 8              # ≈ số core
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
parallel_setup_cost = 1000
min_parallel_table_scan_size = 8MB
```

`max_parallel_workers_per_gather = 0` tắt hẳn parallel — đôi khi hợp cho hệ OLTP
nhiều connection nhỏ, vì parallel worker cũng chiếm slot process.

## Autovacuum

Mặc định quá bảo thủ cho bảng lớn (xem
[VACUUM](./vacuum#autovacuum)):

```ini
autovacuum_max_workers = 6
autovacuum_naptime = 15s
autovacuum_vacuum_cost_limit = 2000
autovacuum_vacuum_scale_factor = 0.05     # 5% thay vì 20%
autovacuum_analyze_scale_factor = 0.02
```

Bảng rất lớn thì đặt riêng cho từng bảng, đừng hạ toàn cục quá thấp.

## Logging — bật đủ để chẩn đoán được

```ini
log_min_duration_statement = 1000     # log query > 1s
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0                    # log mọi temp file (dấu hiệu thiếu work_mem)
log_autovacuum_min_duration = 0
log_connections = on
log_disconnections = on

log_line_prefix = '%m [%p] %q%u@%d app=%a '
```

`log_lock_waits` và `log_temp_files` là hai cái đáng bật nhất mà thường bị bỏ
qua — chúng cho biết vấn đề *trước khi* người dùng phàn nàn.

## Timeout — lưới an toàn

```ini
statement_timeout = 60s                       # cân nhắc theo workload
lock_timeout = 10s
idle_in_transaction_session_timeout = 60s
```

Đặt `statement_timeout` toàn cục cần cẩn thận: nó sẽ giết cả job bảo trì. Cách
an toàn hơn là đặt theo role:

```sql
ALTER ROLE app_user SET statement_timeout = '30s';
ALTER ROLE migration_user SET statement_timeout = 0;
```

## Extension nên bật sẵn

```ini
shared_preload_libraries = 'pg_stat_statements,auto_explain'

pg_stat_statements.max = 10000
pg_stat_statements.track = all

auto_explain.log_min_duration = '3s'
auto_explain.log_analyze = on
auto_explain.log_buffers = on
auto_explain.log_nested_statements = on
```

`pg_stat_statements` là thứ đầu tiên nên bật trên mọi môi trường — không có nó
thì việc tìm query chậm chỉ là phỏng đoán.

## Cấu hình mẫu — server 16GB, 8 core, SSD, OLTP

```ini
# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 1GB

# Connections (kèm PgBouncer)
max_connections = 100

# I/O
random_page_cost = 1.1
effective_io_concurrency = 200

# WAL
wal_compression = on
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9

# Parallel
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 4

# Autovacuum
autovacuum_max_workers = 4
autovacuum_naptime = 15s
autovacuum_vacuum_cost_limit = 2000
autovacuum_vacuum_scale_factor = 0.05

# Timeouts
lock_timeout = 10s
idle_in_transaction_session_timeout = 60s

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
log_line_prefix = '%m [%p] %q%u@%d app=%a '

# Extensions
shared_preload_libraries = 'pg_stat_statements,auto_explain'
auto_explain.log_min_duration = '3s'
```

## Công cụ gợi ý cấu hình

- [pgtune](https://pgtune.leopard.in.ua/) — nhập RAM/core/workload, ra config
- [PGConfig](https://pgconfig.org/)

Coi output của chúng là điểm khởi đầu, không phải kết luận: chúng không biết
workload thật của bạn.

## Nguyên tắc

1. Đo **trước** khi sửa — `pg_stat_statements` + [EXPLAIN](./explain-analyze)
2. Sửa **một** tham số mỗi lần, đo lại
3. Phần lớn vấn đề hiệu năng là **query/index sai**, không phải config. Tuning
   config không cứu được một query thiếu index
4. `shared_buffers`, `effective_cache_size`, `random_page_cost`, `work_mem` là
   nhóm cho hiệu quả cao nhất trên mỗi phút bỏ ra

## Liên quan

- [EXPLAIN ANALYZE](./explain-analyze) — biết cần tuning gì
- [Connection Pooling](./connection-pooling) — `work_mem` nhân theo connection
- [WAL](./wal), [VACUUM](./vacuum)
