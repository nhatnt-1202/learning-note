# DynamoDB

NoSQL key-value/document, latency vài ms ở mọi quy mô. Đổi lại: phải thiết kế
theo **access pattern**, không theo quan hệ dữ liệu.

## Khác biệt cốt lõi so với SQL

| | SQL | DynamoDB |
|---|---|---|
| Thiết kế theo | Chuẩn hoá dữ liệu | **Access pattern** |
| JOIN | Có | **Không** |
| Query linh hoạt | Có | Chỉ theo key hoặc index |
| Schema | Cố định | Chỉ key là bắt buộc |
| Scale | Dọc, rồi sharding | Tự động, không giới hạn |

Câu hỏi đầu tiên khi dùng DynamoDB **không phải** "dữ liệu có những thực thể
gì" mà là "ứng dụng sẽ truy vấn những gì". Không trả lời được câu đó thì chưa
thiết kế được table.

## Primary key

Hai dạng:

```
1. Partition key (PK)             → mỗi item một giá trị duy nhất
2. Partition key + Sort key (SK)  → nhiều item cùng PK, sắp xếp theo SK
```

**Partition key quyết định dữ liệu nằm ở partition nào** — nó phải phân bố đều.
Key lệch tạo "hot partition" và bị throttle dù capacity tổng còn dư.

Sort key cho phép query theo khoảng:

```bash
aws dynamodb query --table-name orders \
  --key-condition-expression "userId = :u AND createdAt BETWEEN :a AND :b" \
  --expression-attribute-values '{
    ":u":{"S":"user-42"},":a":{"S":"2026-01-01"},":b":{"S":"2026-06-30"}}'
```

## Query vs Scan

```bash
# Query — dùng key, hiệu quả
aws dynamodb query --table-name orders \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values '{":u":{"S":"user-42"}}'

# Scan — đọc CẢ BẢNG rồi filter. Tránh
aws dynamodb scan --table-name orders \
  --filter-expression "status = :s" \
  --expression-attribute-values '{":s":{"S":"pending"}}'
```

Điểm quan trọng về `FilterExpression`: nó áp dụng **sau khi đọc**, nên bạn **trả
tiền cho toàn bộ dữ liệu đã đọc**, không chỉ phần trả về. Scan trên bảng lớn vừa
chậm vừa đắt.

Cần query theo thuộc tính khác key → tạo **GSI**, đừng dùng Scan.

## Index

| | GSI | LSI |
|---|---|---|
| Partition key | **Khác được** | Phải giống bảng |
| Tạo sau khi có bảng | **Được** | Không — chỉ lúc tạo bảng |
| Consistency | **Chỉ eventual** | Strong được |
| Capacity | Riêng | Dùng chung với bảng |
| Giới hạn | 20 | 5 |

Thực tế dùng **GSI** gần như mọi lúc. LSI bị ràng buộc phải tạo cùng bảng nên
rất kém linh hoạt.

```bash
aws dynamodb update-table --table-name orders \
  --attribute-definitions AttributeName=status,AttributeType=S \
                          AttributeName=createdAt,AttributeType=S \
  --global-secondary-index-updates '[{
    "Create":{
      "IndexName":"status-index",
      "KeySchema":[{"AttributeName":"status","KeyType":"HASH"},
                   {"AttributeName":"createdAt","KeyType":"RANGE"}],
      "Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["total","userId"]}
    }}]'
```

`ProjectionType` ảnh hưởng chi phí trực tiếp:

- `KEYS_ONLY` — nhỏ nhất, nhưng phải đọc bảng gốc để lấy thuộc tính khác
- `INCLUDE` — chọn đúng thuộc tính cần. **Thường là lựa chọn tốt nhất**
- `ALL` — tiện nhưng nhân đôi dung lượng lưu trữ

Vì GSI chỉ eventual consistent, đừng đọc GSI ngay sau khi ghi rồi kỳ vọng thấy
dữ liệu mới.

## Capacity mode

| | On-Demand | Provisioned |
|---|---|---|
| Tính tiền | Theo request | Theo capacity đặt trước |
| Tải bất định | **Tốt** | Bị throttle |
| Tải đều, biết trước | Đắt hơn ~5–7× | **Rẻ hơn nhiều** |
| Auto scaling | Tự động | Cấu hình được |

Chiến lược thường đúng: bắt đầu **On-Demand** (không phải đoán), theo dõi vài
tuần, rồi chuyển sang **Provisioned + auto scaling** nếu tải đều.

```bash
aws dynamodb update-table --table-name orders \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5
```

Đơn vị capacity:

```
1 RCU = 1 strongly consistent read/s cho item ≤ 4KB
      = 2 eventually consistent read/s
1 WCU = 1 write/s cho item ≤ 1KB
```

Đọc eventual consistent rẻ **một nửa** — dùng nó ở mọi nơi không cần dữ liệu
tức thời.

## Single-table design

Mẫu đặc trưng của DynamoDB: mọi thực thể trong **một** bảng, dùng key chung
chung.

```
PK              SK                    Thuộc tính
USER#42         PROFILE               name, email
USER#42         ORDER#2026-01-15#001  total, status
USER#42         ORDER#2026-02-20#002  total, status
ORDER#001       ITEM#1                sku, qty
```

Lợi ích: một `Query` trên `PK = USER#42` lấy được cả profile lẫn danh sách order
— tương đương JOIN nhưng chỉ một request.

```bash
# Lấy hết dữ liệu của user
aws dynamodb query --table-name app \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#42"}}'

# Chỉ order trong 2026
aws dynamodb query --table-name app \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"USER#42"},":sk":{"S":"ORDER#2026"}}'
```

Đánh đổi thật: khó đọc, khó thay đổi khi access pattern mới xuất hiện, và cần
kỷ luật đặt tên. Với ứng dụng nhỏ hoặc pattern chưa rõ, nhiều bảng đơn giản có
thể hợp lý hơn.

## Ghi có điều kiện và atomic counter

```bash
# Chỉ ghi nếu chưa tồn tại — chống ghi đè
aws dynamodb put-item --table-name orders \
  --item '{"orderId":{"S":"001"},"total":{"N":"100"}}' \
  --condition-expression "attribute_not_exists(orderId)"

# Optimistic locking bằng version
aws dynamodb update-item --table-name orders \
  --key '{"orderId":{"S":"001"}}' \
  --update-expression "SET #s = :new, version = version + :one" \
  --condition-expression "version = :cur" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":new":{"S":"paid"},":cur":{"N":"1"},":one":{"N":"1"}}'
```

`ConditionExpression` là cách DynamoDB đảm bảo tính đúng đắn khi không có
transaction — nên dùng thường xuyên.

Transaction thật (tới 100 item, all-or-nothing) có nhưng tốn **2× capacity**:

```bash
aws dynamodb transact-write-items --transact-items file://tx.json
```

## TTL — xoá tự động miễn phí

```bash
aws dynamodb update-time-to-live --table-name sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt"
```

`expiresAt` là Unix epoch **giây**. Xoá **không tốn WCU** — cách tiết kiệm nhất
để dọn session, cache, log.

Lưu ý: xoá có thể trễ tới 48 giờ. Cần chính xác thì phải filter thêm ở query.

## DynamoDB Streams

```bash
aws dynamodb update-table --table-name orders \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

Ghi lại mọi thay đổi (24 giờ), trigger được [Lambda](./serverless-lambda). Dùng
cho: đồng bộ sang OpenSearch, audit log, cập nhật aggregate, gửi notification.

`NEW_AND_OLD_IMAGES` cho cả trước và sau — cần thiết nếu muốn biết cái gì đã đổi.

## DAX

Cache in-memory cho DynamoDB, giảm latency từ ms xuống **micro giây**. Không cần
sửa code (API tương thích). Chỉ đáng dùng khi đọc rất nhiều và lặp lại; với ghi
nhiều thì không giúp gì.

## Lab

### Lab 1 — Bảng single-table

```bash
aws dynamodb create-table --table-name lab-app \
  --attribute-definitions AttributeName=PK,AttributeType=S \
                          AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
               AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

aws dynamodb wait table-exists --table-name lab-app

# Profile + orders cho cùng user
aws dynamodb put-item --table-name lab-app --item '{
  "PK":{"S":"USER#42"},"SK":{"S":"PROFILE"},
  "name":{"S":"Nhat"},"email":{"S":"nhat@example.com"}}'

for d in 2026-01-15 2026-02-20 2025-12-01; do
  aws dynamodb put-item --table-name lab-app --item '{
    "PK":{"S":"USER#42"},"SK":{"S":"ORDER#'$d'"},
    "total":{"N":"'$((RANDOM % 500))'"},"status":{"S":"paid"}}'
done
```

Query một lần lấy tất cả:

```bash
aws dynamodb query --table-name lab-app \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#42"}}' \
  --query 'Items[].[SK.S,total.N]' --output table
```

Chỉ order 2026:

```bash
aws dynamodb query --table-name lab-app \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"USER#42"},":sk":{"S":"ORDER#2026"}}' \
  --query 'Items[].SK.S'
```

### Lab 2 — Scan đắt hơn Query

```bash
# Nạp 200 item
for i in $(seq 1 200); do
  aws dynamodb put-item --table-name lab-app --item '{
    "PK":{"S":"USER#'$i'"},"SK":{"S":"PROFILE"},"n":{"N":"'$i'"}}' &
  [ $((i % 20)) -eq 0 ] && wait
done; wait

# Query — chỉ tốn cho 1 item
aws dynamodb query --table-name lab-app \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#42"}}' \
  --return-consumed-capacity TOTAL --query ConsumedCapacity

# Scan + filter — tốn cho CẢ BẢNG
aws dynamodb scan --table-name lab-app \
  --filter-expression "n = :n" --expression-attribute-values '{":n":{"N":"42"}}' \
  --return-consumed-capacity TOTAL --query '[ConsumedCapacity,ScannedCount,Count]'
```

So `ScannedCount` với `Count` — đó chính là phần tiền trả cho dữ liệu không dùng.

### Lab 3 — Conditional write

```bash
aws dynamodb put-item --table-name lab-app \
  --item '{"PK":{"S":"ORDER#1"},"SK":{"S":"META"},"version":{"N":"1"}}' \
  --condition-expression "attribute_not_exists(PK)"

# Lần hai → ConditionalCheckFailedException
aws dynamodb put-item --table-name lab-app \
  --item '{"PK":{"S":"ORDER#1"},"SK":{"S":"META"},"version":{"N":"1"}}' \
  --condition-expression "attribute_not_exists(PK)"
```

### Lab 4 — TTL

```bash
aws dynamodb update-time-to-live --table-name lab-app \
  --time-to-live-specification "Enabled=true,AttributeName=ttl"

aws dynamodb put-item --table-name lab-app --item '{
  "PK":{"S":"SESSION#x"},"SK":{"S":"DATA"},
  "ttl":{"N":"'$(( $(date +%s) + 120 ))'"}}'
```

Kiểm tra lại sau vài giờ — item tự mất, không tốn WCU.

### Lab 5 — Streams + Lambda

Bật stream, tạo Lambda in ra event, gắn event source mapping:

```bash
aws lambda create-event-source-mapping \
  --function-name lab-fn \
  --event-source-arn $(aws dynamodb describe-table --table-name lab-app \
    --query 'Table.LatestStreamArn' --output text) \
  --starting-position LATEST

aws dynamodb put-item --table-name lab-app --item '{
  "PK":{"S":"USER#99"},"SK":{"S":"PROFILE"},"name":{"S":"test"}}'

sleep 10 && aws logs tail /aws/lambda/lab-fn --since 2m
```

### Dọn dẹp

```bash
aws dynamodb delete-table --table-name lab-app
```

## Liên quan

- [Lambda](./serverless-lambda)
- [Databases in AWS](./databases-in-aws) — khi nào DynamoDB, khi nào RDS
- [Serverless Architectures](./serverless-architectures)
