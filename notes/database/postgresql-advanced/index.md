# PostgreSQL Advanced

Lộ trình học sâu về PostgreSQL: từ cơ chế nội bộ (internals) đến tuning ở
production. Khác với [PostgreSQL cơ bản](../postgresql) — phần đó là cheatsheet
cú pháp, phần này giải thích *tại sao* engine hoạt động như vậy.

> **Nguồn tham khảo lộ trình:** cấu trúc các phase dưới đây tham khảo từ
> [tuanthanh.name.vn](https://www.tuanthanh.name.vn/database/postgresql/).
> Nội dung trong các trang này do mình tự viết lại.

## Vì sao học internals trước?

Phần lớn vấn đề hiệu năng PostgreSQL không nằm ở chỗ "thiếu index". Chúng đến từ
việc không hiểu MVCC (bảng phình to vì dead tuples), không hiểu VACUUM (bloat,
transaction ID wraparound), hay không đọc được EXPLAIN (index có mà planner
không dùng). Học theo thứ tự internals → index → planner sẽ tránh được việc
"đoán" khi tuning.

## Phase 1 — Internals

Cơ chế lõi của engine.

| Chủ đề | Nội dung |
|---|---|
| [MVCC & Transactions](./mvcc) | Vì sao đọc không block ghi; snapshot, xmin/xmax, isolation levels |
| [Locking & Concurrency](./locking) | Row lock vs table lock, deadlock, `SELECT FOR UPDATE` |
| [WAL & Checkpoint](./wal) | Write-Ahead Log, durability, checkpoint tuning |
| [VACUUM & Autovacuum](./vacuum) | Dead tuples, bloat, freeze, XID wraparound |
| [Storage](./storage) | Page 8KB, heap, TOAST, fillfactor |

## Phase 2 — Indexing

Chọn đúng loại index cho đúng bài toán.

| Chủ đề | Nội dung |
|---|---|
| [B-tree Index](./btree) | Cấu trúc mặc định, composite index, thứ tự cột |
| [Các loại index khác](./index-types) | GIN (JSONB, full-text), GiST (geo), BRIN (time-series), Hash |
| [Partial & Expression Index](./partial-expression-index) | Index một phần bảng, index trên biểu thức |
| [Index Maintenance](./index-maintenance) | Bloat, `REINDEX CONCURRENTLY`, index không dùng |
| [pg_trgm](./pg-trgm) | Tìm kiếm gần đúng, tăng tốc `LIKE '%...%'` |

## Phase 3 — Query Planner

| Chủ đề | Nội dung |
|---|---|
| [EXPLAIN ANALYZE](./explain-analyze) | Đọc query plan, join strategies, vì sao planner bỏ qua index |

## Schema Design

| Chủ đề | Nội dung |
|---|---|
| [Schema Design](./schema) | Chọn kiểu dữ liệu, ràng buộc, `ALTER TABLE` không downtime |

## Phase 4 — Scale

Khi dữ liệu vượt quá mức một bảng thường xử lý gọn.

| Chủ đề | Nội dung |
|---|---|
| [Partitioning](./partitioning) | RANGE/LIST/HASH, pruning, vòng đời partition |
| [Bulk Loading](./bulk-loading) | `COPY`, bỏ index khi nạp, UPSERT lô lớn |
| [Time-series Patterns](./time-series) | Partition theo thời gian, BRIN, rollup, retention |

## Phase 5 — Operations

Chạy PostgreSQL trên production.

| Chủ đề | Nội dung |
|---|---|
| [Replication](./replication) | Physical vs logical, lag, failover, `pg_rewind` |
| [Connection Pooling](./connection-pooling) | Vì sao nhiều connection lại chậm, PgBouncer |
| [Config Tuning](./config-tuning) | Tham số bộ nhớ, I/O cost, config mẫu |
| [Sharding](./sharding) | Citus, shard key, virtual shard, khi nào KHÔNG nên shard |
| [Zero-downtime Migration](./zero-downtime-migration) | `NOT VALID`, expand/contract, backfill lô |

## Lab

- [Bài tập thực hành](./labs) — query để tự kiểm tra trên database thật
