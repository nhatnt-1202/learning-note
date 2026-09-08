# Locking & Concurrency

[MVCC](./mvcc) lo phần đọc/ghi không chặn nhau, nhưng hai transaction cùng ghi
một dòng thì vẫn phải có ai đợi ai. Đó là việc của lock.

## Hai tầng lock

PostgreSQL có lock ở nhiều tầng; thực tế cần nắm hai tầng:

- **Row-level lock** — chỉ ảnh hưởng dòng cụ thể, sinh ra khi `UPDATE`/`DELETE`
  hoặc `SELECT ... FOR UPDATE`
- **Table-level lock** — ảnh hưởng cả bảng, sinh ra bởi DDL (`ALTER TABLE`),
  `VACUUM FULL`, `CREATE INDEX`

Điểm dễ bị bỏ qua: **row lock không được lưu trong bộ nhớ**, nó được ghi vào
`xmax` của chính dòng đó. Nên PostgreSQL khóa được hàng triệu dòng mà không tốn
RAM — khác với các engine có lock table và bị "lock escalation".

## Table-level lock modes

8 mode, nhưng quy tắc thực dụng là biết cái nào xung đột với `SELECT`:

| Mode | Sinh ra bởi | Chặn `SELECT`? |
|---|---|---|
| `ACCESS SHARE` | `SELECT` | Không |
| `ROW SHARE` | `SELECT FOR UPDATE` | Không |
| `ROW EXCLUSIVE` | `INSERT`, `UPDATE`, `DELETE` | Không |
| `SHARE UPDATE EXCLUSIVE` | `VACUUM`, `CREATE INDEX CONCURRENTLY` | Không |
| `SHARE` | `CREATE INDEX` (thường) | Không |
| `SHARE ROW EXCLUSIVE` | `CREATE TRIGGER` | Không |
| `EXCLUSIVE` | ít dùng | **Có** |
| `ACCESS EXCLUSIVE` | `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL` | **Có** |

Kết luận vận hành: `ACCESS EXCLUSIVE` là mode duy nhất bạn phải sợ trên
production — nó chặn cả `SELECT`, tức là chặn mọi thứ.

## Bẫy lớn nhất: ALTER TABLE và lock queue

`ALTER TABLE` cần `ACCESS EXCLUSIVE`. Nếu có một transaction dài đang chạy,
`ALTER` phải đợi — **và mọi query mới xếp hàng sau nó**, kể cả `SELECT`. Một
`ALTER TABLE` tưởng là tức thời có thể làm sập cả service:

```
T1: SELECT chạy 10 phút        (ACCESS SHARE — đang giữ)
T2: ALTER TABLE ADD COLUMN     (đợi ACCESS EXCLUSIVE)
T3: SELECT bình thường          (đợi sau T2 — dù T1 không hề chặn nó!)
```

Cách phòng: luôn đặt timeout trước khi làm DDL, để `ALTER` tự bỏ chứ không
ngồi giữ hàng đợi.

```sql
SET lock_timeout = '3s';
ALTER TABLE users ADD COLUMN phone text;
```

Thất bại nhanh rồi thử lại tốt hơn nhiều so với việc treo cả database.

## Các loại row lock khi SELECT

```sql
-- Khóa mạnh: chặn cả đọc-khóa lẫn ghi
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- Khóa nhẹ: chỉ đảm bảo dòng không bị xóa/đổi khóa
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- Bỏ qua dòng đang bị khóa — pattern làm job queue
SELECT * FROM jobs WHERE status = 'pending'
LIMIT 1 FOR UPDATE SKIP LOCKED;

-- Không đợi, lỗi ngay nếu bị khóa
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
```

`SKIP LOCKED` đáng nhớ riêng: nó cho phép nhiều worker cùng rút việc từ một
bảng queue mà không tranh nhau và không cần Redis.

## Deadlock

Xảy ra khi hai transaction khóa chéo nhau. PostgreSQL tự phát hiện (sau
`deadlock_timeout`, mặc định 1s) và **hủy một bên**:

```
ERROR: deadlock detected
DETAIL: Process 123 waits for ShareLock on transaction 456; blocked by process 789.
```

Kịch bản kinh điển — hai transaction update cùng 2 dòng theo thứ tự trái nhau:

```sql
-- T1
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
UPDATE accounts SET balance = balance + 10 WHERE id = 2;

-- T2 (ngược thứ tự → deadlock)
UPDATE accounts SET balance = balance - 10 WHERE id = 2;
UPDATE accounts SET balance = balance + 10 WHERE id = 1;
```

Cách phòng hiệu quả nhất: **luôn khóa theo cùng một thứ tự** (ví dụ sắp xếp
theo `id` tăng dần) trong mọi code path.

## Chẩn đoán: ai đang chặn ai

Query quan trọng nhất khi database "đứng":

```sql
SELECT
  blocked.pid          AS blocked_pid,
  blocked.query        AS blocked_query,
  blocking.pid         AS blocking_pid,
  blocking.query       AS blocking_query,
  blocking.state       AS blocking_state,
  age(clock_timestamp(), blocking.xact_start) AS blocking_duration
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;
```

`pg_blocking_pids()` là cách gọn nhất — không cần tự join `pg_locks`.

Xem toàn bộ lock đang bị đợi:

```sql
SELECT locktype, relation::regclass, mode, granted, pid
FROM pg_locks WHERE NOT granted;
```

Giải quyết khi cần gấp:

```sql
SELECT pg_cancel_backend(pid);      -- hủy query, nhẹ tay hơn
SELECT pg_terminate_backend(pid);   -- ngắt cả connection
```

Luôn thử `pg_cancel_backend` trước.

## Advisory lock

Lock do ứng dụng tự định nghĩa, không gắn với dòng nào — dùng để đảm bảo chỉ
một tiến trình chạy một job:

```sql
SELECT pg_try_advisory_lock(12345);   -- true nếu giành được
SELECT pg_advisory_unlock(12345);
```

## Cấu hình liên quan

```sql
SET lock_timeout = '5s';               -- tối đa đợi lock
SET statement_timeout = '30s';         -- tối đa chạy 1 câu lệnh
SET idle_in_transaction_session_timeout = '60s';  -- diệt transaction bỏ quên
SET deadlock_timeout = '1s';           -- sau bao lâu mới đi tìm deadlock
```

`idle_in_transaction_session_timeout` nên bật trên mọi production — nó chặn
được cả lớp sự cố do ứng dụng quên commit.

## Liên quan

- [MVCC](./mvcc) — vì sao đọc không cần lock
- [VACUUM](./vacuum) — transaction dài chặn việc dọn dẹp
