# S3 — Nâng cao

Lifecycle, replication, và các tính năng xử lý dữ liệu ngay tại S3.

## Lifecycle rules

Tự động chuyển tầng và xoá theo tuổi object. Đây là công cụ tiết kiệm chi phí
quan trọng nhất của S3.

```json
{
  "Rules": [
    {
      "ID": "log-lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30,  "StorageClass": "STANDARD_IA" },
        { "Days": 90,  "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 2555 }
    },
    {
      "ID": "clean-old-versions",
      "Status": "Enabled",
      "Filter": {},
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket --lifecycle-configuration file://lifecycle.json
```

Hai rule cuối đáng có trên **mọi** bucket:

- `NoncurrentVersionExpiration` — không có nó, versioning làm hoá đơn tăng mãi
- `AbortIncompleteMultipartUpload` — phần upload dở dang **vẫn bị tính tiền** và
  không hiện trong `aws s3 ls`. Đây là khoản phí ẩn kinh điển

Kiểm tra upload dở đang tồn:

```bash
aws s3api list-multipart-uploads --bucket my-bucket
```

Lưu ý về minimum duration (xem
[S3 giới thiệu](./s3-introduction#storage-class)): chuyển sang IA rồi xoá trước
30 ngày vẫn bị tính đủ 30 ngày. Với object đời ngắn, đừng chuyển tầng sớm.

## Replication

```bash
aws s3api put-bucket-replication --bucket source-bucket \
  --replication-configuration file://replication.json
```

```json
{
  "Role": "arn:aws:iam::111122223333:role/s3-replication",
  "Rules": [{
    "ID": "to-dr-region",
    "Status": "Enabled",
    "Priority": 1,
    "Filter": {},
    "DeleteMarkerReplication": { "Status": "Enabled" },
    "Destination": {
      "Bucket": "arn:aws:s3:::dr-bucket",
      "StorageClass": "STANDARD_IA"
    }
  }]
}
```

Điều kiện và giới hạn:

- **Versioning phải bật ở cả hai bucket**
- Chỉ nhân bản object **tạo sau khi** bật rule. Object cũ cần
  **S3 Batch Replication** để copy
- Không nhân bản chuỗi (A→B, B→C thì object từ A **không** tới C) — trừ khi bật
  replica modification sync
- Xoá theo version cụ thể **không** được nhân bản (chống xoá lan)

CRR (cross-region) cho DR và giảm latency; SRR (same-region) cho gộp log hoặc
tách môi trường prod/test.

Cần cam kết thời gian thì bật **RTC** (Replication Time Control) — 99.99% object
trong 15 phút, có tính phí thêm.

## Multipart upload

Bắt buộc với file > 5GB, nên dùng từ ~100MB.

CLI tự làm điều này. Tinh chỉnh:

```bash
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB
aws configure set default.s3.max_concurrent_requests 20
```

Tăng `max_concurrent_requests` là cách nhanh nhất để tăng tốc upload file lớn
trên đường truyền tốt.

## Transfer Acceleration

Upload qua CloudFront edge rồi đi mạng nội bộ AWS:

```bash
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket --accelerate-configuration Status=Enabled

aws s3 cp big.zip s3://my-bucket/ --endpoint-url \
  https://my-bucket.s3-accelerate.amazonaws.com
```

Chỉ đáng dùng khi client **ở xa region**. Cùng region thì không nhanh hơn mà vẫn
tốn phí. Đo trước bằng
[công cụ so sánh của AWS](https://s3-accelerate-speedtest.s3-accelerate.amazonaws.com/en/accelerate-speed-comparsion.html).

## S3 Select

Query SQL trực tiếp trên object, chỉ trả về phần cần — tiết kiệm băng thông:

```bash
aws s3api select-object-content \
  --bucket my-bucket --key data.csv \
  --expression "SELECT s._1, s._3 FROM S3Object s WHERE s._2 > '100'" \
  --expression-type SQL \
  --input-serialization '{"CSV":{"FileHeaderInfo":"NONE"},"CompressionType":"GZIP"}' \
  --output-serialization '{"CSV":{}}' \
  out.csv
```

Chỉ query **một object mỗi lần**. Cần query cả tập dữ liệu thì dùng
[Athena](./data-analytics).

## Event notification

```bash
aws s3api put-bucket-notification-configuration --bucket my-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:ap-southeast-1:111122223333:function:process",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {"Key":{"FilterRules":[{"Name":"suffix","Value":".jpg"}]}}
    }]
  }'
```

Đích có thể là Lambda, SQS, SNS, hoặc EventBridge. Chọn **EventBridge** nếu cần
nhiều đích hoặc filter phức tạp — nó linh hoạt hơn nhiều.

Cảnh báo vòng lặp: Lambda đọc ảnh từ bucket rồi ghi thumbnail **vào cùng
bucket** sẽ tự kích hoạt lại chính nó. Luôn ghi sang bucket/prefix khác, hoặc
filter theo prefix chặt chẽ.

## Object Lock và MFA Delete

Chống xoá cho dữ liệu tuân thủ:

```bash
aws s3api put-object-lock-configuration --bucket my-bucket \
  --object-lock-configuration '{
    "ObjectLockEnabled":"Enabled",
    "Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":30}}
  }'
```

| Mode | Ai xoá được |
|---|---|
| **GOVERNANCE** | User có quyền đặc biệt vẫn bỏ được lock |
| **COMPLIANCE** | **Không ai**, kể cả root, cho tới hết hạn |

`COMPLIANCE` là không thể hoàn tác — đặt sai thời hạn thì phải trả tiền lưu cho
tới hết hạn. Thử trên bucket rác trước.

Object Lock **phải bật khi tạo bucket** (cùng versioning), không thêm sau được.

## S3 Batch Operations

Chạy một thao tác trên hàng triệu object: copy, đổi storage class, gắn tag,
gọi Lambda.

```bash
# Cần manifest (CSV hoặc S3 Inventory report)
aws s3control create-job --account-id 111122223333 \
  --operation '{"S3PutObjectCopy":{"TargetResource":"arn:aws:s3:::dest-bucket"}}' \
  --manifest file://manifest.json \
  --report file://report.json \
  --priority 10 --role-arn arn:aws:iam::111122223333:role/batch-role
```

Đây là cách đúng để xử lý "copy 10 triệu object" — không phải vòng lặp `aws s3
cp` trên máy mình.

## S3 Inventory

Báo cáo định kỳ (hàng ngày/tuần) liệt kê mọi object + metadata, dạng
CSV/ORC/Parquet. Rẻ hơn `ListObjects` rất nhiều với bucket lớn, và query được
bằng [Athena](./data-analytics).

```bash
aws s3api put-bucket-inventory-configuration --bucket my-bucket --id daily \
  --inventory-configuration file://inventory.json
```

## Lab

### Lab 1 — Lifecycle

```bash
B=lab-s3-adv-$(date +%s)
aws s3 mb s3://$B
aws s3api put-bucket-versioning --bucket $B \
  --versioning-configuration Status=Enabled

cat > lc.json <<'JSON'
{"Rules":[
 {"ID":"tier","Status":"Enabled","Filter":{"Prefix":"logs/"},
  "Transitions":[{"Days":30,"StorageClass":"STANDARD_IA"}],
  "Expiration":{"Days":365}},
 {"ID":"cleanup","Status":"Enabled","Filter":{},
  "NoncurrentVersionExpiration":{"NoncurrentDays":7},
  "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}
]}
JSON

aws s3api put-bucket-lifecycle-configuration --bucket $B \
  --lifecycle-configuration file://lc.json

aws s3api get-bucket-lifecycle-configuration --bucket $B
```

Lifecycle chạy mỗi ngày một lần nên không thấy hiệu ứng ngay — xác nhận cấu
hình đúng là đủ.

### Lab 2 — S3 Select

```bash
cat > data.csv <<'CSV'
id,name,score
1,alice,95
2,bob,72
3,carol,88
CSV
aws s3 cp data.csv s3://$B/data.csv

aws s3api select-object-content --bucket $B --key data.csv \
  --expression "SELECT s.name FROM S3Object s WHERE CAST(s.score AS INT) > 80" \
  --expression-type SQL \
  --input-serialization '{"CSV":{"FileHeaderInfo":"USE"}}' \
  --output-serialization '{"CSV":{}}' /dev/stdout
```

### Lab 3 — Multipart dở dang tốn tiền

```bash
dd if=/dev/urandom of=big bs=1M count=200

# Bắt đầu upload rồi Ctrl-C giữa đường
aws s3 cp big s3://$B/big &
sleep 3 && kill %1

# Phần dở dang vẫn tồn tại và bị tính tiền
aws s3api list-multipart-uploads --bucket $B
aws s3 ls s3://$B/     # KHÔNG thấy gì

# Dọn tay
UP=$(aws s3api list-multipart-uploads --bucket $B --query 'Uploads[0].UploadId' --output text)
aws s3api abort-multipart-upload --bucket $B --key big --upload-id $UP
```

### Lab 4 — Replication

```bash
D=lab-s3-dr-$(date +%s)
aws s3 mb s3://$D --region us-east-1
aws s3api put-bucket-versioning --bucket $D \
  --versioning-configuration Status=Enabled
```

Tạo role cho replication, đặt rule, rồi upload file mới vào bucket nguồn và
kiểm tra nó xuất hiện ở đích sau vài giây. Thử upload **trước** khi bật rule để
xác nhận object cũ không được nhân bản.

### Dọn dẹp

Dùng script xoá version ở [S3 giới thiệu](./s3-introduction#dọn-dẹp).

## Liên quan

- [S3 — Giới thiệu](./s3-introduction)
- [S3 — Bảo mật](./s3-security)
- [Data & Analytics](./data-analytics) — Athena trên dữ liệu S3
