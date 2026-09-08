# VACUUM & Autovacuum

[MVCC](./mvcc) không xóa dữ liệu ngay: `DELETE` chỉ đánh dấu, `UPDATE` để lại
bản cũ. Những dòng chết đó gọi là **dead tuple**, và VACUUM là thứ đi dọn.

Không hiểu VACUUM là nguyên nhân số một của bảng phình to và query chậm dần theo
thời gian trên PostgreSQL.

## VACUUM làm gì

1. Đánh dấu không gian của dead tuple là **tái sử dụng được**
2. Cập nhật **visibility map** (cho phép index-only scan)
3. **Freeze** dòng cũ để chống [XID wraparound](./mvcc#transaction-id-wraparound)
4. Cập nhật statistics cho [planner](./explain-analyze) (khi kèm `ANALYZE`)

Điểm quan trọng nhất và hay bị hiểu sai:

> `VACUUM` **không** trả dung lượng lại cho hệ điều hành. Nó chỉ đánh dấu chỗ
> trống để PostgreSQL dùng lại. File trên đĩa không nhỏ đi.

## VACUUM vs VACUUM FULL

| | `VACUUM` | `VACUUM FULL` |
|---|---|---|
| Lock | `SHARE UPDATE EXCLUSIVE` — vẫn đọc/ghi được | `ACCESS EXCLUSIVE` — **chặn mọi thứ** |
| Trả đĩa cho OS | Không | Có |
| Cách làm | Đánh dấu tại chỗ | Viết lại toàn bộ bảng |
| Cần chỗ trống | Không | **Gấp đôi cỡ bảng** |

`VACUUM FULL` gần như không bao giờ nên chạy trên production. Muốn thu hồi đĩa
mà không downtime, dùng
[`pg_repack`](https://github.com/reorg/pg_repack) — nó viết lại bảng nhưng chỉ
cần lock ngắn ở cuối.

## Autovacuum

Chạy tự động, mặc định bật. Ngưỡng kích hoạt cho mỗi bảng:

```
threshold = autovacuum_vacuum_threshold
          + autovacuum_vacuum_scale_factor × số_dòng
```

Mặc định: `50 + 0.2 × n_live_tup` → **bảng phải có 20% dòng chết** mới được
vacuum. Với bảng 100 triệu dòng, nghĩa là đợi tới 20 triệu dead tuple — quá
muộn. Bảng lớn cần hạ scale factor riêng:

```sql
ALTER TABLE big_table SET (
  autovacuum_vacuum_scale_factor = 0.01,   -- 1%
  autovacuum_analyze_scale_factor = 0.005
);
```

### Tăng tốc autovacuum

Mặc định autovacuum bị cố tình làm chậm (cost-based delay) để không tranh I/O.
Trên SSD thì quá bảo thủ:

```ini
autovacuum_max_workers = 6
autovacuum_naptime = 15s
autovacuum_vacuum_cost_delay = 2ms     # mặc định 2ms từ PG 12; cũ hơn là 20ms
autovacuum_vacuum_cost_limit = 2000    # tăng để vacuum nhanh hơn
maintenance_work_mem = 1GB             # càng lớn càng ít vòng quét index
```

`maintenance_work_mem` là tham số đáng tăng nhất: nó quyết định vacuum phải quét
lại index bao nhiêu lần.

## Chẩn đoán

### Bảng nào nhiều dead tuple

```sql
SELECT relname,
       n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
```

`dead_pct` cao + `last_autovacuum` cũ hoặc `NULL` → autovacuum không theo kịp.

### Autovacuum đang chạy gì

```sql
SELECT pid, relid::regclass, phase,
       heap_blks_scanned, heap_blks_total,
       round(100.0 * heap_blks_scanned / NULLIF(heap_blks_total,0), 1) AS pct
FROM pg_stat_progress_vacuum;
```

### Cỡ bảng thật

```sql
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid))       AS heap,
       pg_size_pretty(pg_indexes_size(relid))        AS indexes
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

## Vì sao VACUUM "không làm gì cả"

Câu hỏi hay gặp: chạy `VACUUM` mà `n_dead_tup` không giảm. Nguyên nhân gần như
luôn là **có gì đó đang giữ snapshot cũ** — VACUUM không được phép dọn dòng mà
một transaction nào đó còn có thể thấy. Ba thủ phạm:

1. Transaction chạy dài / `idle in transaction`
2. Replication slot chưa được đọc tới (kể cả slot chết)
3. `hot_standby_feedback` từ replica đang giữ xmin

Kiểm tra cả ba:

```sql
-- 1. Transaction cũ nhất
SELECT pid, state, age(clock_timestamp(), xact_start) AS age, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL ORDER BY xact_start LIMIT 5;

-- 2. Slot đang giữ xmin
SELECT slot_name, active, xmin, catalog_xmin FROM pg_replication_slots;

-- 3. Replica đang giữ xmin
SELECT client_addr, backend_xmin FROM pg_stat_replication;
```

Đây là lý do `idle_in_transaction_session_timeout` (xem [Locking](./locking))
gián tiếp giúp giữ bảng gọn.

## Freeze & wraparound — trường hợp khẩn cấp

```sql
SELECT c.relname, age(c.relfrozenxid) AS xid_age
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','m') AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY xid_age DESC LIMIT 20;
```

Khi `xid_age` chạm `autovacuum_freeze_max_age` (200 triệu), PostgreSQL bắt buộc
chạy **anti-wraparound vacuum** — không thể hủy được và không nhường ai. Chạm
tiếp ngưỡng ~2 tỷ thì database **từ chối ghi** để tự bảo vệ. Đừng để tới đó:
theo dõi `xid_age` như một metric thường trực.

## Chạy tay

```sql
VACUUM (VERBOSE, ANALYZE) users;   -- xem chi tiết
VACUUM (ANALYZE) users;            -- vacuum + cập nhật statistics
VACUUM (FREEZE) users;             -- ép freeze
ANALYZE users;                     -- chỉ statistics, rất nhanh
VACUUM (PARALLEL 4) big_table;     -- PG 13+, song song quét index
```

Sau khi import lượng lớn dữ liệu, luôn chạy `ANALYZE` — không có statistics thì
planner đoán sai và chọn plan tệ.

## Liên quan

- [MVCC](./mvcc) — nguồn gốc của dead tuple
- [Index Maintenance](./index-maintenance) — index cũng bị bloat
- [Storage](./storage) — HOT update giảm tải cho vacuum
