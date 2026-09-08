# Integration & Messaging

Nối các thành phần mà không để chúng phụ thuộc trực tiếp vào nhau. Bốn service,
mỗi cái cho một mô hình khác nhau.

## Chọn cái nào

| | SQS | SNS | EventBridge | Kinesis |
|---|---|---|---|---|
| Mô hình | Queue 1-1 | Pub/sub fan-out | Event bus có routing | Stream |
| Người nhận | **Một** consumer lấy mỗi message | Nhiều subscriber | Nhiều target theo rule | Nhiều, đọc lại được |
| Thứ tự | FIFO queue có | Không | Không | **Có, trong shard** |
| Đọc lại | Không (xoá sau khi xử lý) | Không | Archive + replay | **Có, tới 365 ngày** |
| Dùng cho | Decouple, worker | Thông báo, fan-out | Kiến trúc event-driven | Analytics, log, IoT |

Trực giác nhanh:

- **SQS** — "làm việc này giúp tôi, lúc nào cũng được"
- **SNS** — "thông báo cho tất cả những ai quan tâm"
- **EventBridge** — "chuyện này xảy ra, ai cần thì tự đăng ký"
- **Kinesis** — "dòng dữ liệu liên tục, cần xử lý theo thứ tự và đọc lại được"

## SQS

```bash
Q=$(aws sqs create-queue --queue-name lab-q \
  --attributes '{"VisibilityTimeout":"60","MessageRetentionPeriod":"345600"}' \
  --query QueueUrl --output text)

aws sqs send-message --queue-url $Q --message-body '{"task":"resize","id":42}'
aws sqs receive-message --queue-url $Q --wait-time-seconds 20
aws sqs delete-message --queue-url $Q --receipt-handle <handle>
```

### Visibility timeout — khái niệm quan trọng nhất

Khi consumer nhận message, message **không bị xoá** — nó chỉ bị *ẩn* trong
`VisibilityTimeout` giây. Consumer xử lý xong phải gọi `delete-message`. Không
xoá (vì crash, vì chậm) → message hiện lại và người khác lấy.

Hệ quả: **xử lý phải idempotent**. SQS Standard đảm bảo "at-least-once", nên
message có thể được xử lý hai lần.

Đặt `VisibilityTimeout` ≥ thời gian xử lý dài nhất. Chưa xong mà cần thêm thời
gian:

```bash
aws sqs change-message-visibility --queue-url $Q \
  --receipt-handle <handle> --visibility-timeout 300
```

### Long polling

```bash
aws sqs receive-message --queue-url $Q --wait-time-seconds 20
```

`WaitTimeSeconds > 0` là **long polling**: chờ tới khi có message thay vì trả về
rỗng ngay. Giảm số request (giảm tiền) và giảm latency. Luôn dùng — short
polling gần như không có lý do gì để chọn.

### Dead Letter Queue

Message lỗi mãi sẽ quay vòng vô hạn. DLQ hứng chúng sau N lần:

```bash
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

aws sqs set-queue-attributes --queue-url $Q --attributes '{
  "RedrivePolicy":"{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"3\"}"
}'
```

DLQ nên có trên **mọi** queue production, và cần alarm khi nó có message — DLQ
im lặng đầy lên là sự cố không ai biết.

### Standard vs FIFO

| | Standard | FIFO |
|---|---|---|
| Throughput | Không giới hạn | 300 msg/s (3000 với batching) |
| Thứ tự | Best-effort | **Đảm bảo trong MessageGroupId** |
| Trùng lặp | Có thể | **Exactly-once** (trong 5 phút dedup) |
| Tên queue | bất kỳ | phải kết thúc `.fifo` |

FIFO cần `MessageGroupId` — thứ tự chỉ đảm bảo *trong cùng group*. Chọn group
theo thực thể (ví dụ `order_id`) để các order khác nhau vẫn xử lý song song.

## SNS

```bash
T=$(aws sns create-topic --name lab-topic --query TopicArn --output text)

aws sns subscribe --topic-arn $T --protocol email --notification-endpoint me@example.com
aws sns subscribe --topic-arn $T --protocol sqs --notification-endpoint $Q_ARN

aws sns publish --topic-arn $T --message "hello" --subject "test"
```

### Fan-out pattern

Mẫu kết hợp phổ biến nhất: **SNS + nhiều SQS**.

```
S3 event → SNS topic → SQS (resize ảnh)  → Lambda
                     → SQS (ghi metadata) → Lambda
                     → SQS (đánh index)   → Lambda
```

Vì sao không cho SNS gọi Lambda trực tiếp? Vì SQS ở giữa cho **retry và DLQ**.
Lambda lỗi thì message còn trong queue; không có queue thì message mất.

Filter policy để mỗi subscriber chỉ nhận cái nó cần:

```bash
aws sns set-subscription-attributes --subscription-arn <arn> \
  --attribute-name FilterPolicy \
  --attribute-value '{"event_type":["order_created"]}'
```

## EventBridge

Event bus có routing theo nội dung. Điểm khác SNS: **rule khớp theo pattern JSON**
chứ không chỉ theo topic.

```bash
aws events put-rule --name lab-rule \
  --event-pattern '{
    "source":["myapp.orders"],
    "detail-type":["OrderCreated"],
    "detail":{"total":[{"numeric":[">",1000]}]}
  }'

aws events put-targets --rule lab-rule \
  --targets "Id=1,Arn=arn:aws:lambda:...:function:process-big-order"
```

Ba thứ EventBridge làm mà SNS không:

1. **Nhận event từ chính AWS** (EC2 state change, S3, CodePipeline…) và từ
   SaaS bên thứ ba
2. **Schedule** — thay thế CloudWatch Events cron
3. **Archive & Replay** — lưu event rồi phát lại, rất hữu ích khi debug

```bash
# Cron
aws events put-rule --name nightly --schedule-expression "cron(0 17 * * ? *)"
```

Với hệ thống event-driven mới, EventBridge thường là lựa chọn đúng hơn SNS.

## Kinesis

| Service | Cho |
|---|---|
| **Data Streams** | Stream thật, tự quản shard, đọc lại được |
| **Data Firehose** | Nạp thẳng vào S3/Redshift/OpenSearch, không cần code |
| **Managed Service for Flink** | Xử lý SQL/Java trên stream |

```bash
aws kinesis create-stream --stream-name lab-stream --shard-count 1

aws kinesis put-record --stream-name lab-stream \
  --partition-key user-42 --data "$(echo -n '{"event":"click"}' | base64)"
```

Mỗi shard: 1MB/s hoặc 1000 record/s vào, 2MB/s ra. **Partition key** quyết định
record vào shard nào — key lệch tạo "hot shard".

Thứ tự đảm bảo **trong một shard**, nên chọn partition key theo thực thể cần thứ
tự (user_id, device_id).

Khác SQS quan trọng nhất: Kinesis **giữ dữ liệu** (24 giờ đến 365 ngày) và nhiều
consumer đọc độc lập được. SQS thì message bị xoá sau khi xử lý.

Cần nạp dữ liệu vào S3 mà không muốn viết consumer → dùng **Firehose**, nó lo
buffer, nén, phân vùng.

## Lab

### Lab 1 — SQS với visibility timeout

```bash
Q=$(aws sqs create-queue --queue-name lab-q \
  --attributes VisibilityTimeout=30 --query QueueUrl --output text)

aws sqs send-message --queue-url $Q --message-body "job-1"

# Nhận nhưng KHÔNG xoá
aws sqs receive-message --queue-url $Q --wait-time-seconds 5

# Ngay sau đó: rỗng (message đang ẩn)
aws sqs receive-message --queue-url $Q --wait-time-seconds 5

# Sau 30s: message quay lại
sleep 31
aws sqs receive-message --queue-url $Q --wait-time-seconds 5
```

Đây là bài lab quan trọng nhất về SQS — nó cho thấy vì sao xử lý phải idempotent.

### Lab 2 — DLQ

```bash
DLQ=$(aws sqs create-queue --queue-name lab-dlq --query QueueUrl --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

aws sqs set-queue-attributes --queue-url $Q --attributes '{
  "RedrivePolicy":"{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"2\"}"}'

aws sqs send-message --queue-url $Q --message-body "will-fail"

# Nhận 3 lần mà không xoá
for i in 1 2 3; do
  aws sqs receive-message --queue-url $Q --visibility-timeout 1 >/dev/null
  sleep 2
done

# Message đã sang DLQ
aws sqs receive-message --queue-url $DLQ
```

### Lab 3 — Fan-out SNS → 2 SQS

```bash
T=$(aws sns create-topic --name lab-fanout --query TopicArn --output text)
for n in a b; do
  Qn=$(aws sqs create-queue --queue-name lab-sub-$n --query QueueUrl --output text)
  ARN=$(aws sqs get-queue-attributes --queue-url $Qn \
    --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  aws sqs set-queue-attributes --queue-url $Qn --attributes '{
    "Policy":"{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",
      \"Principal\":{\"Service\":\"sns.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",
      \"Resource\":\"'$ARN'\"}]}"}'
  aws sns subscribe --topic-arn $T --protocol sqs --notification-endpoint $ARN
done

aws sns publish --topic-arn $T --message "broadcast"

aws sqs receive-message --queue-url $(aws sqs get-queue-url --queue-name lab-sub-a --query QueueUrl --output text)
aws sqs receive-message --queue-url $(aws sqs get-queue-url --queue-name lab-sub-b --query QueueUrl --output text)
```

Cả hai queue đều nhận được — đó là fan-out. Chú ý queue policy: thiếu nó thì SNS
không gửi được vào SQS.

### Lab 4 — Kinesis đọc lại được

```bash
aws kinesis create-stream --stream-name lab-stream --shard-count 1
aws kinesis wait stream-exists --stream-name lab-stream

for i in $(seq 1 5); do
  aws kinesis put-record --stream-name lab-stream \
    --partition-key k1 --data "$(echo -n "event-$i" | base64)"
done

# Đọc từ đầu
IT=$(aws kinesis get-shard-iterator --stream-name lab-stream \
  --shard-id shardId-000000000000 --shard-iterator-type TRIM_HORIZON \
  --query ShardIterator --output text)
aws kinesis get-records --shard-iterator $IT \
  --query 'Records[].Data' --output text | while read d; do echo $d | base64 -d; echo; done
```

Đọc lại lần nữa với `TRIM_HORIZON` → **vẫn thấy đủ 5 record**. Đây là khác biệt
cốt lõi so với SQS.

### Dọn dẹp

```bash
aws sqs delete-queue --queue-url $Q
aws sqs delete-queue --queue-url $DLQ
aws sns delete-topic --topic-arn $T
aws kinesis delete-stream --stream-name lab-stream
```

Kinesis tính tiền **theo shard-giờ** kể cả không có dữ liệu — nhớ xoá.

## Liên quan

- [Serverless — Lambda](./serverless-lambda) — consumer của SQS/Kinesis
- [Serverless Architectures](./serverless-architectures)
- [Classic Solutions Architecture](./classic-architecture)
