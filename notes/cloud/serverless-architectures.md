# Serverless Architectures

Các mẫu ghép service serverless lại thành hệ thống, và những chỗ chúng hay vỡ.

## REST API cơ bản

```
Client → API Gateway → Lambda → DynamoDB
                             ↘ S3
```

Mẫu phổ biến nhất. Điểm cần chú ý:

- Lambda phải trả đúng format proxy (xem
  [API Gateway](./serverless-api-gateway-cognito#lambda-proxy--định-dạng-response))
- Dùng [DynamoDB](./serverless-dynamodb) thay RDS để không có vấn đề connection
  pool
- Auth bằng [Cognito JWT authorizer](./serverless-api-gateway-cognito#authorizer)

Nếu **phải** dùng RDS thì thêm **RDS Proxy** — 1000 Lambda đồng thời sẽ mở 1000
connection và giết database (xem
[Connection Pooling](../database/postgresql-advanced/connection-pooling)).

## Static site + API

```
Route 53 → CloudFront → S3 (SPA build)
                     ↘ /api/* → API Gateway → Lambda
```

Một domain, một distribution, hai origin theo path. Không cần CORS vì cùng
origin — đó là lợi ích chính so với việc để API ở domain khác.

Xem [CloudFront](./cloudfront#cache-behavior) cho cấu hình cache: `/api/*` phải
là `CachingDisabled`.

## Xử lý file upload

```
Client → API Gateway → Lambda (sinh presigned URL)
Client → S3 (upload trực tiếp bằng URL đó)
S3 event → Lambda (xử lý) → S3 (kết quả)
```

Điểm quan trọng: **file không đi qua Lambda**. Lambda chỉ sinh
[presigned URL](./s3-introduction#presigned-url), client upload thẳng lên S3.
Tránh được giới hạn payload 6MB và không tốn thời gian chạy Lambda.

Hai bẫy:

1. **Vòng lặp vô hạn** — Lambda ghi kết quả vào cùng bucket sẽ tự trigger lại.
   Luôn ghi sang bucket/prefix khác
2. **Xử lý lâu** — video dài quá 15 phút thì Lambda không làm được, chuyển sang
   [Fargate](./containers) hoặc MediaConvert

## Fan-out bất đồng bộ

```
API Gateway → Lambda → SNS → SQS → Lambda (resize)
                          ↘ SQS → Lambda (index)
                          ↘ SQS → Lambda (notify)
```

Luôn có **SQS giữa SNS và Lambda**, không nối SNS → Lambda trực tiếp. Lý do:
queue cho retry và DLQ; không có queue thì Lambda lỗi là mất message (xem
[Integration & Messaging](./integration-messaging#fan-out-pattern)).

## Event-driven với EventBridge

```
Service A → EventBridge ──rule──→ Lambda A
                        ──rule──→ Step Functions
                        ──rule──→ SQS → ECS task
```

Ưu điểm so với gọi trực tiếp: producer **không biết** ai tiêu thụ. Thêm consumer
mới chỉ cần thêm rule, không sửa code producer.

Bật **Archive** để replay được khi debug — tính năng này rất hữu ích khi điều
tra sự cố production.

## Step Functions — điều phối workflow

Dùng khi có nhiều bước, cần retry riêng từng bước, cần rẽ nhánh, hoặc chạy quá
15 phút.

```json
{
  "Comment": "Xử lý đơn hàng",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:validate",
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2
      }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "CheckStock"
    },
    "CheckStock": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.inStock", "BooleanEquals": true, "Next": "Charge"
      }],
      "Default": "Backorder"
    },
    "Charge":     { "Type": "Task", "Resource": "arn:...:charge", "End": true },
    "Backorder":  { "Type": "Task", "Resource": "arn:...:backorder", "End": true },
    "NotifyFailure": { "Type": "Task", "Resource": "arn:...:notify", "End": true }
  }
}
```

Hai loại workflow:

| | Standard | Express |
|---|---|---|
| Thời gian | Tới 1 năm | Tới 5 phút |
| Tính tiền | Theo state transition | Theo thời gian + số lần |
| Lịch sử | Đầy đủ, xem được từng bước | Chỉ CloudWatch Logs |
| Dùng cho | Workflow dài, cần audit | Xử lý nhiều, ngắn |

Step Functions thay được "Lambda gọi Lambda" — mẫu đó khó debug và tốn tiền đôi
(cả hai hàm cùng chạy trong lúc chờ).

## Scheduled job

```
EventBridge Scheduler → Lambda
```

```bash
aws scheduler create-schedule --name nightly-report \
  --schedule-expression "cron(0 17 * * ? *)" \
  --schedule-expression-timezone "Asia/Ho_Chi_Minh" \
  --flexible-time-window Mode=OFF \
  --target '{"Arn":"arn:aws:lambda:...:function:report",
             "RoleArn":"arn:aws:iam::...:role/scheduler-role"}'
```

**EventBridge Scheduler** (mới) hơn EventBridge rule ở chỗ có timezone và
one-time schedule — không phải tự tính UTC.

## Những chỗ serverless hay vỡ

**1. Connection pool với RDS.** Đã nói ở trên — dùng DynamoDB hoặc RDS Proxy.

**2. Cold start ở đường quan trọng.** API người dùng chờ thì cần Provisioned
Concurrency, hoặc chọn runtime nhẹ.

**3. Không idempotent.** SQS là at-least-once, async invoke có retry — mọi
handler phải chịu được gọi hai lần. Dùng
[conditional write](./serverless-dynamodb#ghi-có-điều-kiện-và-atomic-counter)
hoặc bảng dedup.

**4. Thiếu DLQ.** Event async lỗi sẽ **mất im lặng**. Mọi Lambda async cần DLQ
và alarm trên đó.

**5. Vòng lặp tốn tiền.** S3 → Lambda → S3 cùng bucket. Hoặc DynamoDB Streams →
Lambda → ghi lại cùng bảng. Luôn kiểm tra vòng.

**6. Debug khó.** Bật X-Ray từ đầu:

```bash
aws lambda update-function-configuration --function-name my-fn \
  --tracing-config Mode=Active
```

**7. Quá nhiều hàm nhỏ.** "Nano-service" làm trace khó và latency cộng dồn. Một
Lambda xử lý vài route liên quan thường tốt hơn mỗi route một hàm.

## Chi phí — khi nào serverless đắt hơn

Serverless rẻ khi tải **không đều**. Với tải cao và đều, nó có thể đắt hơn
container.

Điểm hoà vốn thô: Lambda chạy liên tục ~24/7 ở mức concurrency cao thì
[Fargate](./containers) hoặc EC2 với Savings Plans rẻ hơn.

Ước lượng nhanh:

```
Lambda:  requests × (duration_s × GB × $0.0000166667 + $0.0000002)
Fargate: vCPU-giờ × $0.04048 + GB-giờ × $0.004445
```

Đừng quên tính cả API Gateway ($1–3.5/triệu request) — với API lượng lớn, đó có
thể là khoản lớn hơn cả Lambda. ALB + Fargate lúc đó rẻ hơn.

## Lab

### Lab 1 — API + DynamoDB đầy đủ

Ghép: [API Gateway](./serverless-api-gateway-cognito) →
[Lambda](./serverless-lambda) → [DynamoDB](./serverless-dynamodb).

```python
import json, os, boto3
ddb = boto3.resource('dynamodb')
table = ddb.Table(os.environ['TABLE'])

def lambda_handler(event, context):
    method = event['requestContext']['http']['method']
    if method == 'POST':
        item = json.loads(event['body'])
        table.put_item(Item=item)
        return {'statusCode': 201, 'body': json.dumps({'ok': True})}
    if method == 'GET':
        pk = (event.get('queryStringParameters') or {}).get('pk')
        r = table.get_item(Key={'PK': pk, 'SK': 'META'})
        return {'statusCode': 200, 'body': json.dumps(r.get('Item', {}), default=str)}
    return {'statusCode': 405, 'body': '{}'}
```

Test:

```bash
curl -X POST "$EP/items" -d '{"PK":"ITEM#1","SK":"META","name":"test"}'
curl "$EP/items?pk=ITEM%231"
```

### Lab 2 — Presigned upload + xử lý

Hai bucket (`upload` và `processed`), Lambda sinh presigned URL, Lambda thứ hai
trigger từ S3 event ghi sang bucket processed. Xác nhận không có vòng lặp.

### Lab 3 — Step Functions

Tạo state machine 3 bước với một bước cố tình lỗi, quan sát retry và `Catch`
trong giao diện graph:

```bash
aws stepfunctions start-execution --state-machine-arn <arn> \
  --input '{"orderId":"1","inStock":true}'

aws stepfunctions get-execution-history --execution-arn <arn> \
  --query 'events[].[type,stateEnteredEventDetails.name]' --output table
```

### Lab 4 — Chứng minh cần idempotent

Lambda tăng counter trong DynamoDB, trigger từ SQS. Gửi 1 message nhưng cho
Lambda lỗi sau khi tăng counter → message quay lại, counter tăng **hai lần**.
Sau đó sửa bằng conditional write và thử lại.

### Dọn dẹp

Xoá theo thứ tự ngược: API → Lambda → event source mapping → DynamoDB → S3 →
queue → role.

## Liên quan

- [Lambda](./serverless-lambda)
- [DynamoDB](./serverless-dynamodb)
- [API Gateway & Cognito](./serverless-api-gateway-cognito)
- [Integration & Messaging](./integration-messaging)
