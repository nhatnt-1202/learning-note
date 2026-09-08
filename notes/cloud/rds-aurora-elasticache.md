# RDS, Aurora & ElastiCache

Database quản lý: AWS lo patch, backup, failover. Đổi lại mất quyền
superuser và không SSH vào máy được.

## RDS — điểm cần biết

Engine hỗ trợ: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, Db2.

Những gì **không** làm được so với tự quản:

- Không có quyền `SUPERUSER` (PostgreSQL: chỉ `rds_superuser`)
- Không cài extension ngoài danh sách AWS cho phép
- Không đọc file system, không `COPY FROM '/path'` (phải dùng `\copy`)
- Không sửa `postgresql.conf` trực tiếp — dùng **parameter group**

```bash
aws rds create-db-parameter-group \
  --db-parameter-group-name pg17-tuned \
  --db-parameter-group-family postgres17 \
  --description "tuned"

aws rds modify-db-parameter-group \
  --db-parameter-group-name pg17-tuned \
  --parameters "ParameterName=work_mem,ParameterValue=32768,ApplyMethod=immediate"
```

`ApplyMethod=pending-reboot` cho tham số cần restart (xem
[Config Tuning](../database/postgresql-advanced/config-tuning)).

## Multi-AZ vs Read Replica — hay bị lẫn

| | Multi-AZ | Read Replica |
|---|---|---|
| Mục đích | **HA / failover** | **Chia tải đọc** |
| Đồng bộ | Synchronous | **Asynchronous** (có lag) |
| Đọc được từ standby | **Không** (Multi-AZ instance) | Có |
| Failover | Tự động, 60–120s | Phải promote tay |
| Region khác | Không | **Có** |

Điểm quan trọng: **Multi-AZ standby không phục vụ query**. Nó chỉ để failover.
Muốn chia tải đọc thì cần read replica — hai thứ khác nhau và thường dùng cùng
nhau.

**Multi-AZ DB Cluster** (mới hơn) là ngoại lệ: 2 standby *có* đọc được, và
failover nhanh hơn (~35s).

```bash
# Multi-AZ
aws rds create-db-instance \
  --db-instance-identifier lab-pg --engine postgres \
  --db-instance-class db.t4g.micro --allocated-storage 20 \
  --master-username postgres --master-user-password 'Secret123!' \
  --multi-az --storage-encrypted --backup-retention-period 7

# Read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier lab-pg-ro \
  --source-db-instance-identifier lab-pg
```

Read replica của PostgreSQL dùng
[physical replication](../database/postgresql-advanced/replication) bên dưới —
nên các lưu ý về lag và `hot_standby_feedback` đều áp dụng.

## Backup

| | Automated backup | Manual snapshot |
|---|---|---|
| Lịch | Hàng ngày + WAL liên tục | Khi bạn tạo |
| Giữ | 0–35 ngày | Đến khi xoá |
| Point-in-time restore | **Có** (đến từng giây) | Không |
| Khi xoá instance | **Bị xoá theo** | Còn lại |

`--backup-retention-period 0` **tắt** backup — đừng để giá trị này trên
production. Và luôn tạo snapshot tay trước khi xoá instance.

Restore **luôn tạo instance mới**, không ghi đè:

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier lab-pg \
  --target-db-instance-identifier lab-pg-restored \
  --restore-time 2026-09-08T10:00:00Z
```

## Aurora

Bản PostgreSQL/MySQL tương thích do AWS viết lại tầng storage.

Khác biệt kiến trúc quan trọng: **storage tách khỏi compute**. Dữ liệu nằm trên
lớp lưu trữ chia sẻ, nhân 6 bản qua 3 AZ, tự mở rộng tới 128TB.

Hệ quả thực tế:

- Thêm read replica **không** phải copy dữ liệu → nhanh (phút, không phải giờ)
- Tới 15 replica, lag thường < 100ms
- Failover < 30s
- **Cloning** gần như tức thì (copy-on-write) — rất tốt để tạo môi trường test
  từ dữ liệu prod

```bash
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier test-clone \
  --source-db-cluster-identifier prod-cluster \
  --restore-type copy-on-write --use-latest-restorable-time
```

### Endpoint của Aurora

| Endpoint | Trỏ tới |
|---|---|
| **Cluster** (writer) | Instance chính — dùng để ghi |
| **Reader** | Load balance qua các replica |
| **Custom** | Nhóm instance tự chọn (ví dụ: instance to cho báo cáo) |
| **Instance** | Một instance cụ thể |

Ứng dụng nên dùng **cluster endpoint để ghi** và **reader endpoint để đọc**. Sau
failover, cluster endpoint tự trỏ sang writer mới — không cần đổi config.

### Aurora Serverless v2

Tự co giãn theo ACU (0.5 → 256), tính tiền theo giây. Hợp cho tải bất định, dev,
hoặc workload có đỉnh thưa. Đắt hơn instance thường nếu tải đều.

## ElastiCache

| | Redis / Valkey | Memcached |
|---|---|---|
| Cấu trúc dữ liệu | Nhiều (list, set, sorted set, stream) | Chỉ key-value |
| Bền vững | Có (snapshot, AOF) | Không |
| Replication / HA | **Có** | Không |
| Multi-thread | Redis: không (Valkey/7+ có phần) | **Có** |
| Dùng cho | Cache, session, queue, leaderboard | Cache thuần đơn giản |

Gần như luôn chọn **Redis/Valkey** — trừ khi cần cache thuần và muốn scale bằng
đa luồng.

### Các mẫu caching

```
Cache-aside (lazy loading)
  đọc cache → miss → đọc DB → ghi cache
  + Chỉ cache dữ liệu thật sự được dùng
  - Lần miss đầu chậm; dữ liệu có thể cũ

Write-through
  ghi DB → ghi cache luôn
  + Cache luôn mới
  - Ghi chậm hơn; cache có dữ liệu không ai đọc
```

Thực tế phổ biến nhất là **cache-aside + TTL**. Luôn đặt TTL — cache không TTL
là nguồn bug dữ liệu cũ khó tìm.

Chống **thundering herd** (nhiều request cùng miss một key nóng): thêm jitter
vào TTL, hoặc dùng lock để chỉ một request đi xuống DB.

```python
import random
ttl = 300 + random.randint(-30, 30)   # jitter
```

## Lab

### Lab 1 — RDS PostgreSQL + kết nối

```bash
aws rds create-db-instance \
  --db-instance-identifier lab-pg --engine postgres \
  --engine-version 17.2 \
  --db-instance-class db.t4g.micro --allocated-storage 20 \
  --master-username postgres --master-user-password 'Secret123!' \
  --vpc-security-group-ids sg-db \
  --backup-retention-period 7 --storage-encrypted \
  --no-publicly-accessible

aws rds wait db-instance-available --db-instance-identifier lab-pg

EP=$(aws rds describe-db-instances --db-instance-identifier lab-pg \
  --query 'DBInstances[0].Endpoint.Address' --output text)
```

Từ một EC2 trong cùng VPC (SG database mở 5432 cho SG của EC2 — xem
[EC2 cơ bản](./ec2-basic#security-group--firewall-ở-tầng-instance)):

```bash
psql -h $EP -U postgres -d postgres
```

Xác nhận các giới hạn của RDS:

```sql
SELECT current_user, session_user;
\du                                  -- không có SUPERUSER thật
SHOW work_mem;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT * FROM pg_available_extensions ORDER BY name;
```

### Lab 2 — Read replica và lag

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier lab-pg-ro --source-db-instance-identifier lab-pg
aws rds wait db-instance-available --db-instance-identifier lab-pg-ro
```

Trên primary ghi dữ liệu, trên replica đọc:

```sql
-- replica
SELECT pg_is_in_recovery();          -- true
SELECT now() - pg_last_xact_replay_timestamp() AS lag;
INSERT INTO t VALUES (1);            -- lỗi: read-only
```

Xem lag qua CloudWatch:

```bash
aws cloudwatch get-metric-statistics --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=lab-pg-ro \
  --start-time $(date -u -d '1 hour ago' +%FT%TZ) \
  --end-time $(date -u +%FT%TZ) --period 60 --statistics Average
```

### Lab 3 — Point-in-time restore

Tạo bảng, ghi dữ liệu, ghi lại thời điểm, xoá bảng, rồi restore về trước đó.
Quan sát: restore ra **instance mới**, dữ liệu ở thời điểm đó còn nguyên.

### Lab 4 — ElastiCache cache-aside

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id lab-redis --engine redis \
  --cache-node-type cache.t4g.micro --num-cache-nodes 1
```

```python
import redis, time, psycopg
r = redis.Redis(host='<endpoint>', port=6379)

def get_user(uid):
    key = f"user:{uid}"
    if (c := r.get(key)):
        return c, "HIT"
    row = query_db(uid)          # chậm
    r.setex(key, 300, row)       # LUÔN có TTL
    return row, "MISS"
```

Gọi hai lần, so thời gian giữa MISS và HIT.

### Dọn dẹp

```bash
aws rds delete-db-instance --db-instance-identifier lab-pg-ro --skip-final-snapshot
aws rds delete-db-instance --db-instance-identifier lab-pg --skip-final-snapshot
aws elasticache delete-cache-cluster --cache-cluster-id lab-redis
```

RDS là service đắt nhất trong các lab ở đây — xoá ngay sau khi xong.

## Liên quan

- [Databases in AWS](./databases-in-aws) — chọn database nào
- [PostgreSQL Advanced](../database/postgresql-advanced/) — tuning bên trong
- [Classic Solutions Architecture](./classic-architecture)
