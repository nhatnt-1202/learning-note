# Connection Pooling

PostgreSQL dùng **một process cho mỗi connection**, không phải thread. Mỗi
process tốn vài MB RAM và một chỗ trong các cấu trúc dùng chung. Vì thế
PostgreSQL không chịu được hàng nghìn connection như MySQL — và pooling không
phải tối ưu tuỳ chọn mà là điều kiện để chạy production.

## Vì sao nhiều connection lại chậm hơn

Trực giác sai: thêm connection = xử lý được nhiều hơn. Thực tế qua một ngưỡng
thì throughput **giảm**:

- Mỗi process tốn RAM cơ bản + `work_mem` cho mỗi node sort/hash
- Context switch giữa hàng trăm process ăn CPU
- Các lock nội bộ (`ProcArrayLock`) trở thành cổ chai
- Snapshot của [MVCC](./mvcc) phải quét danh sách transaction đang chạy

Công thức khởi điểm hay dùng:

```
max_connections ≈ (số core × 2) + số đĩa hiệu dụng
```

Máy 8 core → khoảng 20–30 connection **thật sự làm việc** là đủ bão hoà. Ứng
dụng cần 500 connection thì giải pháp là pooler, không phải tăng
`max_connections`.

```sql
SHOW max_connections;
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

## Pool ở tầng ứng dụng

Mọi driver nghiêm túc đều có pool sẵn — dùng trước khi nghĩ đến PgBouncer:

```js
// Node: node-postgres
const pool = new Pool({
  max: 10,                      // TỔNG các instance phải < max_connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

Cái bẫy khi scale ngang: 20 instance × `max: 10` = 200 connection tới database.
Pool ứng dụng **không biết** về nhau. Đây chính là lúc cần pooler tập trung.

## PgBouncer

Pooler nhẹ, đứng giữa ứng dụng và PostgreSQL.

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction

max_client_conn = 2000        # client kết vào PgBouncer
default_pool_size = 25        # connection thật tới PostgreSQL
reserve_pool_size = 5
server_idle_timeout = 600
```

Ý nghĩa con số: 2000 client dùng chung 25 connection thật. Được vì phần lớn
client phần lớn thời gian đang idle.

### Ba pool mode

| Mode | Connection được trả về pool khi | Dùng khi |
|---|---|---|
| `session` | Client ngắt kết nối | Cần mọi tính năng, ít lợi ích |
| `transaction` | `COMMIT`/`ROLLBACK` | **Mặc định nên chọn** |
| `statement` | Hết mỗi câu lệnh | Chỉ khi không dùng transaction |

`transaction` là điểm cân bằng đúng, nhưng có giá của nó.

### Những gì mất khi dùng transaction mode

Vì connection thật bị luân chuyển giữa các client, mọi thứ **gắn với session**
đều vỡ:

- `SET`/`RESET` ở mức session (dùng `SET LOCAL` trong transaction thay thế)
- Prepared statement (`PREPARE`/`EXECUTE`)
- `LISTEN`/`NOTIFY`
- Advisory lock ở mức session
- Bảng `TEMP`
- Cursor giữ qua nhiều transaction (`WITH HOLD`)

Lỗi hay gặp nhất là prepared statement. Xử lý theo driver:

```
node-postgres      : không dùng prepared statement (mặc định đã vậy)
JDBC               : prepareThreshold=0
psycopg 3          : prepare_threshold=None
Npgsql             : No Reset On Close=true; Max Auto Prepare=0
Prisma / SQLAlchemy: tắt statement cache
```

PgBouncer 1.21+ có `max_prepared_statements` để hỗ trợ prepared statement trong
transaction mode — nếu dùng bản mới thì bật lên thay vì tắt ở client:

```ini
max_prepared_statements = 200
```

### Theo dõi PgBouncer

```bash
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
```

```sql
SHOW POOLS;      -- cl_active, cl_waiting, sv_active, sv_idle
SHOW STATS;      -- throughput, thời gian trung bình
SHOW CLIENTS;
SHOW SERVERS;
```

Chỉ số cần nhìn: **`cl_waiting`**. Lớn hơn 0 kéo dài nghĩa là
`default_pool_size` quá nhỏ — client đang xếp hàng chờ connection.

Ngược lại, `cl_waiting = 0` mà `sv_idle` luôn cao thì pool đang to hơn cần
thiết.

## Pooler khác

| | Đặc điểm |
|---|---|
| **PgBouncer** | Nhẹ, một process, ổn định. Lựa chọn mặc định |
| **Pgpool-II** | Thêm load balancing, query routing. Nặng và phức tạp hơn |
| **pgcat** | Viết bằng Rust, đa luồng, có load balancing + sharding |
| **Supavisor** | Erlang, thiết kế cho multi-tenant quy mô lớn |

Không có nhu cầu routing đặc biệt thì PgBouncer là đủ.

## Kiến trúc thường gặp

```
App instances → PgBouncer (transaction mode) → PostgreSQL primary
                                             ↘ PostgreSQL standby (read-only)
```

Chia tải đọc/ghi nên làm ở **tầng ứng dụng** (hai connection string) hơn là nhờ
pooler đoán — đoán sai sẽ gửi `SELECT` sau `INSERT` sang standby còn lag và đọc
ra dữ liệu cũ.

## Chẩn đoán vấn đề connection

```sql
-- Ai đang giữ connection mà không làm gì
SELECT pid, usename, state,
       age(clock_timestamp(), state_change) AS idle_for, query
FROM pg_stat_activity
WHERE state LIKE 'idle%'
ORDER BY state_change;

-- Đếm theo trạng thái và ứng dụng
SELECT application_name, state, count(*)
FROM pg_stat_activity GROUP BY 1, 2 ORDER BY 3 DESC;
```

`idle in transaction` là trạng thái tệ nhất: nó giữ cả connection **và** một
snapshot, chặn [VACUUM](./vacuum). Luôn đặt:

```ini
idle_in_transaction_session_timeout = 60s
```

## Khi hết connection

```
FATAL: sorry, too many clients already
```

Việc cần làm theo thứ tự — và **tăng `max_connections` là lựa chọn cuối cùng**,
không phải đầu tiên:

1. Xem có connection rác không (`idle in transaction` lâu)
2. Kiểm tra tổng pool size của tất cả instance ứng dụng
3. Thêm/điều chỉnh PgBouncer
4. Chỉ khi thật cần: tăng `max_connections` (cần restart, và tốn RAM)

PostgreSQL để sẵn `superuser_reserved_connections` (mặc định 3) để bạn còn vào
được mà xử lý khi đã hết chỗ.

## Liên quan

- [Config Tuning](./config-tuning) — `work_mem` nhân theo connection
- [Locking](./locking) — `idle in transaction` giữ lock
- [Replication](./replication) — standby cho tải đọc
