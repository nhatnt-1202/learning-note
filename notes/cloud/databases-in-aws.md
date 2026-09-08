# Databases in AWS

Chọn database nào cho bài toán nào. AWS có hơn 10 loại — trang này là cây quyết
định.

## Cây quyết định

```
Dữ liệu có quan hệ, cần JOIN, cần transaction ACID?
├── Có → cần scale cực lớn / serverless?
│        ├── Có  → Aurora Serverless v2
│        └── Không → RDS (PostgreSQL/MySQL) hoặc Aurora
└── Không → truy cập theo key là chính?
            ├── Có → cần latency micro giây?
            │        ├── Có → ElastiCache / DAX
            │        └── Không → DynamoDB
            └── Không → dữ liệu dạng gì?
                        ├── Document/tìm kiếm → OpenSearch
                        ├── Đồ thị, quan hệ nhiều bậc → Neptune
                        ├── Time-series → Timestream
                        ├── Sổ cái không sửa được → QLDB
                        └── Phân tích, cột, TB–PB → Redshift
```

## Bảng đối chiếu

| Service | Loại | Dùng cho |
|---|---|---|
| **RDS** | Quan hệ | App truyền thống, cần SQL đầy đủ |
| **Aurora** | Quan hệ | Như RDS nhưng cần scale/HA tốt hơn |
| **DynamoDB** | Key-value | Scale lớn, latency ổn định, serverless |
| **ElastiCache** | In-memory | Cache, session, leaderboard |
| **DocumentDB** | Document | Tương thích MongoDB |
| **Neptune** | Graph | Mạng xã hội, gợi ý, phát hiện gian lận |
| **Timestream** | Time-series | IoT, metric |
| **OpenSearch** | Search | Full-text, log analytics |
| **Redshift** | Data warehouse | BI, phân tích trên TB–PB |
| **Keyspaces** | Wide-column | Tương thích Cassandra |

## RDS hay DynamoDB — câu hỏi thật sự gặp

| Yếu tố | Nghiêng về RDS | Nghiêng về DynamoDB |
|---|---|---|
| Access pattern | **Chưa rõ, hay đổi** | Rõ ràng, ổn định |
| JOIN, aggregate phức tạp | Cần | Không cần |
| Transaction nhiều bảng | Cần | Hiếm |
| Quy mô | < vài TB | Không giới hạn |
| Traffic | Đều | Đột biến mạnh |
| Đội ngũ | Quen SQL | Sẵn sàng học |

Lời khuyên thực dụng: **chưa chắc thì chọn PostgreSQL**. Nó xử lý được cả JSON
([jsonb](../database/postgresql-advanced/index-types#jsonb)), full-text,
geospatial (PostGIS), và time-series
([partition + BRIN](../database/postgresql-advanced/time-series)). Đổi từ
PostgreSQL sang DynamoDB sau này dễ hơn nhiều so với chiều ngược lại — vì
DynamoDB buộc bạn cố định access pattern từ đầu.

## Aurora vs RDS

Chọn **Aurora** khi:

- Cần > 5 read replica, hoặc replica lag phải thấp
- Cần failover nhanh (< 30s)
- Cần clone môi trường test từ prod (copy-on-write, gần như tức thì)
- Dữ liệu lớn (tự mở rộng tới 128TB)

Chọn **RDS** khi:

- Cần engine Aurora không có (Oracle, SQL Server, MariaDB, Db2)
- Cần version PostgreSQL/MySQL mới nhất (Aurora thường chậm hơn vài tháng)
- Chi phí quan trọng và workload nhỏ (`db.t4g.micro` rẻ hơn Aurora tối thiểu)

## OpenSearch

Cho full-text search và log analytics. Thường **không phải nguồn dữ liệu chính**
mà là bản sao được đánh index:

```
DynamoDB → Streams → Lambda → OpenSearch
RDS      → DMS     →         → OpenSearch
```

Lý do: OpenSearch không đảm bảo durability như database quan hệ, và reindex là
việc bình thường. Giữ source of truth ở nơi khác.

Serverless mode có sẵn nếu không muốn quản cluster.

## Redshift

Data warehouse dạng cột, cho query phân tích trên TB–PB.

Khác biệt với RDS: lưu **theo cột** nên `SUM(revenue)` trên tỷ dòng rất nhanh,
nhưng `SELECT * WHERE id = 1` thì chậm hơn RDS. Không dùng Redshift làm database
cho ứng dụng.

```sql
-- Query thẳng dữ liệu S3 mà không nạp vào
CREATE EXTERNAL SCHEMA spectrum FROM DATA CATALOG
  DATABASE 'mydb' IAM_ROLE 'arn:aws:iam::...:role/redshift';
```

**Redshift Serverless** phù hợp khi query không đều — không phải trả tiền cluster
24/7.

Với dữ liệu vừa (< vài TB) và query thưa, [Athena](./data-analytics) trên S3
thường rẻ hơn nhiều so với Redshift.

## Migration — DMS

```bash
aws dms create-replication-task \
  --replication-task-identifier pg-to-aurora \
  --source-endpoint-arn <src> --target-endpoint-arn <tgt> \
  --replication-instance-arn <inst> \
  --migration-type full-load-and-cdc \
  --table-mappings file://mappings.json
```

`full-load-and-cdc` là chế độ quan trọng: copy dữ liệu hiện có **rồi** tiếp tục
đồng bộ thay đổi — cho phép cutover với downtime vài giây.

**SCT** (Schema Conversion Tool) đi kèm khi đổi engine (Oracle → PostgreSQL).

Với PostgreSQL → PostgreSQL, [logical replication
](../database/postgresql-advanced/replication#logical-replication) thường đơn
giản và rẻ hơn DMS.

## Lab

### Lab 1 — So chi phí RDS vs DynamoDB

Cho workload: 1 triệu read + 200k write mỗi ngày, 50GB dữ liệu.

```bash
python3 - <<'PY'
# DynamoDB On-Demand (giá tham khảo us-east-1, kiểm tra lại giá hiện hành)
reads, writes, gb = 1_000_000, 200_000, 50
ddb = reads/1e6*0.25 + writes/1e6*1.25 + gb*0.25/30
print(f"DynamoDB: ~${ddb*30:.2f}/tháng")

# RDS db.t4g.medium Multi-AZ
rds = 0.128*2*24*30 + gb*0.115*2
print(f"RDS Multi-AZ: ~${rds:.2f}/tháng")
PY
```

Rồi thử lại với 10× traffic — quan sát đường cong khác nhau thế nào.

### Lab 2 — PostgreSQL làm được nhiều thứ

Trên [RDS PostgreSQL](./rds-aurora-elasticache#lab), thử các trường hợp thường
bị cho là "phải dùng database chuyên dụng":

```sql
-- Document store
CREATE TABLE docs (id bigserial PRIMARY KEY, data jsonb);
CREATE INDEX ON docs USING gin (data jsonb_path_ops);
INSERT INTO docs (data) VALUES ('{"type":"user","tags":["a","b"]}');
SELECT * FROM docs WHERE data @> '{"type":"user"}';

-- Full-text
ALTER TABLE docs ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', data->>'title')) STORED;
CREATE INDEX ON docs USING gin (tsv);

-- Key-value
CREATE UNLOGGED TABLE kv (k text PRIMARY KEY, v jsonb, expires timestamptz);
```

Xem [GIN / GiST](../database/postgresql-advanced/index-types).

### Lab 3 — DynamoDB không JOIN được

Tạo 2 "bảng" logic (users, orders) trong DynamoDB, thử trả lời "tổng tiền order
của mỗi user trong tháng 1". Sẽ thấy phải làm ở tầng ứng dụng hoặc thiết kế lại
key ngay từ đầu — đó chính là điểm khác biệt cốt lõi so với SQL.

## Liên quan

- [RDS, Aurora & ElastiCache](./rds-aurora-elasticache)
- [DynamoDB](./serverless-dynamodb)
- [Data & Analytics](./data-analytics)
- [PostgreSQL Advanced](../database/postgresql-advanced/)
