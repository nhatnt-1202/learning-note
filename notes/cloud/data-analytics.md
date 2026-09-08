# Data & Analytics

Từ dữ liệu thô trên S3 tới biểu đồ. Các service ghép thành một chuỗi khá cố
định.

## Chuỗi điển hình

```
Nguồn → Kinesis/DMS → S3 (data lake) → Glue (ETL + catalog)
                                     → Athena (query SQL)
                                     → Redshift (warehouse)
                                     → QuickSight (dashboard)
```

Với phần lớn nhu cầu, **S3 + Glue Catalog + Athena** là đủ và rẻ nhất — không
cần cluster nào chạy 24/7.

## Athena

Query SQL trực tiếp trên S3, serverless, tính tiền theo **lượng dữ liệu quét**
(~$5/TB).

```sql
CREATE EXTERNAL TABLE logs (
  ts string, level string, msg string
)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://my-bucket/logs/';

MSCK REPAIR TABLE logs;    -- nạp partition có sẵn

SELECT level, count(*) FROM logs
WHERE dt BETWEEN '2026-09-01' AND '2026-09-07'
GROUP BY level;
```

### Ba cách giảm tiền Athena

Vì tính theo dữ liệu quét, tối ưu ở đây là tối ưu chi phí trực tiếp:

**1. Dùng Parquet/ORC thay CSV/JSON.** Định dạng cột nên chỉ đọc cột cần —
thường giảm 90%+ dữ liệu quét.

**2. Partition theo cột hay lọc** (thường là ngày):

```
s3://bucket/logs/dt=2026-09-01/part-0.parquet
s3://bucket/logs/dt=2026-09-02/part-0.parquet
```

Query có `WHERE dt = '2026-09-01'` chỉ đọc thư mục đó. Không partition thì mỗi
query quét cả bucket.

**3. Nén** (Snappy cho Parquet, gzip cho text).

Kiểm tra lượng quét sau mỗi query:

```bash
aws athena get-query-execution --query-execution-id <id> \
  --query 'QueryExecution.Statistics.[DataScannedInBytes,EngineExecutionTimeInMillis]'
```

Đừng bao giờ chạy `SELECT *` trên bảng lớn — nó đọc mọi cột.

## Glue

Ba phần khác nhau, hay bị gộp làm một:

| Thành phần | Làm gì |
|---|---|
| **Data Catalog** | Metadata (schema, partition). Athena/Redshift/EMR đều dùng chung |
| **Crawler** | Quét S3, tự suy schema, tạo/cập nhật bảng trong Catalog |
| **ETL Job** | Spark job (Python/Scala) để transform |

```bash
aws glue create-crawler --name lab-crawler \
  --role AWSGlueServiceRole-lab \
  --database-name lab_db \
  --targets '{"S3Targets":[{"Path":"s3://my-bucket/raw/"}]}'

aws glue start-crawler --name lab-crawler
```

Crawler tiện nhưng hay suy sai kiểu (số thành string). Với schema ổn định, khai
bảng bằng DDL trong Athena thì kiểm soát tốt hơn.

**Glue Job bookmark** đáng nhớ: nó nhớ dữ liệu nào đã xử lý, nên job chạy lại
không xử lý trùng.

## Kinesis Data Firehose

Nạp stream vào S3/Redshift/OpenSearch **không cần viết consumer**:

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name lab-firehose \
  --s3-destination-configuration '{
    "RoleARN":"arn:aws:iam::...:role/firehose",
    "BucketARN":"arn:aws:s3:::my-bucket",
    "Prefix":"raw/dt=!{timestamp:yyyy-MM-dd}/",
    "ErrorOutputPrefix":"errors/",
    "BufferingHints":{"SizeInMBs":128,"IntervalInSeconds":300},
    "CompressionFormat":"GZIP"
  }'
```

Firehose tự buffer, nén, và **phân vùng theo ngày** — đúng cấu trúc Athena cần.
Nó còn convert được sang Parquet nếu có Glue table.

So với [Kinesis Data Streams](./integration-messaging#kinesis): Firehose đơn
giản hơn nhiều nhưng không đọc lại được và có độ trễ (buffer).

## EMR

Hadoop/Spark quản lý. Dùng khi:

- Xử lý dữ liệu quá lớn/phức tạp cho Glue
- Cần thư viện Spark cụ thể hoặc Hive/HBase/Presto
- Cần kiểm soát cluster (instance type, tuning)

Chạy trên **Spot** cho task node giảm chi phí rất nhiều — task node mất không
làm hỏng job.

**EMR Serverless** bỏ được việc quản cluster, hợp cho job không đều.

## QuickSight

BI dashboard. Điểm đáng nhớ là **SPICE** — engine in-memory: nạp dữ liệu vào
SPICE thì dashboard nhanh và không query lại nguồn (không tốn tiền Athena mỗi
lần xem).

Tính tiền theo user (author/reader), nên với nhiều người xem thì cân nhắc so với
Grafana/Metabase tự host.

## Lake Formation

Quản lý quyền trên data lake ở mức **bảng, cột, dòng** — thay vì phải viết
[bucket policy](./s3-security) phức tạp cho từng prefix.

Đáng dùng khi nhiều team dùng chung một data lake và cần phân quyền chi tiết
(ví dụ: team marketing xem được mọi cột trừ cột PII).

## Lab

### Lab 1 — Data lake tối thiểu

```bash
B=lab-lake-$(date +%s)
aws s3 mb s3://$B

# Dữ liệu mẫu, phân vùng theo ngày
for d in 2026-09-01 2026-09-02 2026-09-03; do
  for i in $(seq 1 100); do
    L=$(shuf -n1 -e INFO WARN ERROR)
    echo "{\"ts\":\"${d}T10:00:00Z\",\"level\":\"$L\",\"msg\":\"m$i\"}"
  done | aws s3 cp - s3://$B/logs/dt=$d/data.json
done

aws s3 ls s3://$B/logs/ --recursive
```

### Lab 2 — Athena

```bash
aws athena start-query-execution \
  --query-string "CREATE DATABASE IF NOT EXISTS lab_db" \
  --result-configuration OutputLocation=s3://$B/athena-results/
```

```sql
CREATE EXTERNAL TABLE lab_db.logs (
  ts string, level string, msg string
)
PARTITIONED BY (dt string)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://<bucket>/logs/';

MSCK REPAIR TABLE lab_db.logs;

SELECT level, count(*) AS n FROM lab_db.logs GROUP BY level;
```

So chi phí có và không có partition:

```sql
-- Quét CẢ BẢNG
SELECT count(*) FROM lab_db.logs WHERE msg = 'm1';

-- Chỉ quét 1 partition
SELECT count(*) FROM lab_db.logs WHERE dt = '2026-09-01' AND msg = 'm1';
```

```bash
aws athena list-query-executions --max-results 2 \
  --query 'QueryExecutionIds' --output text | tr '\t' '\n' | while read id; do
  aws athena get-query-execution --query-execution-id $id \
    --query 'QueryExecution.[Query,Statistics.DataScannedInBytes]' --output text
done
```

Chênh lệch `DataScannedInBytes` chính là chênh lệch tiền.

### Lab 3 — JSON vs Parquet

Chuyển sang Parquet bằng Athena CTAS:

```sql
CREATE TABLE lab_db.logs_parquet
WITH (format = 'PARQUET', partitioned_by = ARRAY['dt'],
      external_location = 's3://<bucket>/logs-parquet/')
AS SELECT ts, level, msg, dt FROM lab_db.logs;
```

Chạy cùng một query trên hai bảng, so `DataScannedInBytes`.

### Lab 4 — Glue Crawler

```bash
aws glue create-crawler --name lab-crawler \
  --role AWSGlueServiceRole-lab --database-name lab_db \
  --targets '{"S3Targets":[{"Path":"s3://'$B'/logs/"}]}'

aws glue start-crawler --name lab-crawler
sleep 90
aws glue get-table --database-name lab_db --name logs \
  --query 'Table.StorageDescriptor.Columns'
```

So schema crawler suy ra với schema bạn khai tay.

### Dọn dẹp

```bash
aws glue delete-crawler --name lab-crawler
aws glue delete-database --name lab_db
aws s3 rb s3://$B --force
```

## Liên quan

- [S3 — Nâng cao](./s3-advanced) — lifecycle cho data lake
- [Integration & Messaging](./integration-messaging) — Kinesis
- [Databases in AWS](./databases-in-aws) — Redshift vs Athena
