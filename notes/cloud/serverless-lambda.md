# Lambda

Chạy code không quản server. Tính tiền theo **số lần gọi × thời gian × bộ nhớ**,
không chạy thì không tốn.

## Giới hạn cần nhớ

| | Giá trị |
|---|---|
| Timeout tối đa | **15 phút** |
| Memory | 128MB – 10,240MB |
| `/tmp` | 512MB – 10,240MB |
| Payload | 6MB (sync), 256KB (async) |
| Deployment package | 50MB (zip upload), 250MB (giải nén), **10GB (container image)** |
| Concurrency mặc định | 1000/region (tăng được) |
| Env vars | 4KB |

Việc > 15 phút thì không dùng Lambda — chuyển sang
[ECS/Fargate](./containers) hoặc Step Functions chia nhỏ.

## Memory quyết định cả CPU

Điểm hay bị bỏ qua: **CPU tỉ lệ với memory**. 1769MB ≈ 1 vCPU đầy đủ.

Hệ quả nghịch lý nhưng thật: tăng memory có thể **giảm** tiền, vì hàm chạy nhanh
hơn nhiều so với phần giá tăng thêm.

```
128MB  × 10s = 1280 MB-s
1024MB × 1s  = 1024 MB-s   ← rẻ hơn VÀ nhanh hơn 10 lần
```

Đừng đoán — đo bằng [Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning).

## Cold start

Lần gọi đầu (hoặc sau khi scale) phải khởi tạo môi trường:

```
Tải code → khởi tạo runtime → chạy code ngoài handler → chạy handler
└──────────── cold start ────────────────────────────┘
```

Ảnh hưởng theo runtime: Python/Node ~100–300ms; Java/.NET có thể vài giây.

Cách giảm:

1. **Code ngoài handler chỉ chạy một lần** — khởi tạo client ở đó, tận dụng cho
   các lần gọi sau
2. Giảm kích thước package (chỉ dependency cần thiết)
3. **Provisioned Concurrency** — giữ sẵn instance đã khởi tạo (tốn tiền cố định)
4. **SnapStart** cho Java — giảm cold start tới 90%
5. Tránh đặt Lambda trong VPC nếu không cần

```python
import boto3, os
# NGOÀI handler — tái dùng qua nhiều lần gọi
s3 = boto3.client('s3')
BUCKET = os.environ['BUCKET']

def handler(event, context):
    # trong này chạy mỗi lần
    return s3.get_object(Bucket=BUCKET, Key=event['key'])
```

Đặt client bên trong handler là lỗi hiệu năng phổ biến nhất khi viết Lambda.

## Concurrency

```
Concurrency = số request/giây × thời gian chạy (giây)
```

100 req/s × 0.5s = 50 concurrent. Vượt giới hạn → `TooManyRequestsException`
(throttle).

```bash
# Giới hạn để hàm này không ăn hết quota của cả region
aws lambda put-function-concurrency \
  --function-name my-fn --reserved-concurrent-executions 100

# Giữ sẵn instance nóng
aws lambda put-provisioned-concurrency-config \
  --function-name my-fn --qualifier prod --provisioned-concurrent-executions 10
```

**Reserved** vừa là trần vừa là phần dành riêng. Đặt `0` là **tắt hàm** — cách
nhanh để dừng một Lambda đang chạy sai.

Cẩn thận Lambda + RDS: 1000 concurrent Lambda mở 1000 connection sẽ giết
database. Dùng **RDS Proxy** hoặc giới hạn reserved concurrency (xem
[Connection Pooling](../database/postgresql-advanced/connection-pooling)).

## Event source — sync vs async

| Nguồn | Kiểu | Retry |
|---|---|---|
| API Gateway, ALB | **Sync** | Client tự retry |
| S3, SNS, EventBridge | **Async** | 2 lần, rồi DLQ |
| SQS, Kinesis, DynamoDB Streams | **Poll** | Theo cấu hình queue/stream |

Với async, cấu hình xử lý lỗi là bắt buộc:

```bash
aws lambda put-function-event-invoke-config \
  --function-name my-fn \
  --maximum-retry-attempts 2 \
  --maximum-event-age-in-seconds 3600 \
  --destination-config '{
    "OnFailure":{"Destination":"arn:aws:sqs:...:my-dlq"}
  }'
```

Không có DLQ thì event lỗi **mất im lặng** — sự cố khó phát hiện nhất.

### SQS trigger và partial failure

Lambda đọc SQS theo batch. Một message lỗi làm **cả batch** quay lại theo mặc
định. Bật partial batch response để chỉ trả lại message lỗi:

```python
def handler(event, context):
    failures = []
    for rec in event['Records']:
        try:
            process(rec)
        except Exception:
            failures.append({'itemIdentifier': rec['messageId']})
    return {'batchItemFailures': failures}
```

Cần đặt `FunctionResponseTypes=["ReportBatchItemFailures"]` trên event source
mapping.

## Layer

Chia sẻ dependency giữa nhiều hàm:

```bash
mkdir -p layer/python && pip install requests -t layer/python/
cd layer && zip -r ../layer.zip . && cd ..

aws lambda publish-layer-version --layer-name common-deps \
  --zip-file fileb://layer.zip --compatible-runtimes python3.12

aws lambda update-function-configuration --function-name my-fn \
  --layers arn:aws:lambda:ap-southeast-1:111122223333:layer:common-deps:1
```

Tối đa 5 layer/hàm; tổng giải nén vẫn ≤ 250MB.

## Version và alias

```bash
V=$(aws lambda publish-version --function-name my-fn --query Version --output text)

aws lambda create-alias --function-name my-fn --name prod --function-version $V

# Canary: 10% sang version mới
aws lambda update-alias --function-name my-fn --name prod \
  --function-version $V \
  --routing-config "AdditionalVersionWeights={$OLD=0.9}"
```

`$LATEST` thay đổi mỗi khi deploy — production nên trỏ vào **alias**, không phải
`$LATEST`.

## Lambda trong VPC

Cần khi truy cập RDS/ElastiCache trong private subnet:

```bash
aws lambda update-function-configuration --function-name my-fn \
  --vpc-config 'SubnetIds=subnet-a,subnet-b,SecurityGroupIds=sg-lambda'
```

Lưu ý: Lambda trong VPC **không có Internet** trừ khi subnet có NAT Gateway. Cần
gọi API ngoài thì phải có NAT, hoặc dùng VPC endpoint.

Cold start do VPC đã được AWS cải thiện nhiều (không còn tạo ENI mỗi lần), nên
không còn là lý do lớn để tránh VPC như trước.

## Lab

### Lab 1 — Hàm đầu tiên

```bash
mkdir lab-fn && cd lab-fn
cat > lambda_function.py <<'PY'
import json, os
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': json.dumps({
            'msg': 'hello',
            'memory': context.memory_limit_in_mb,
            'remaining_ms': context.get_remaining_time_in_millis(),
            'request_id': context.aws_request_id,
        })
    }
PY
zip fn.zip lambda_function.py

# Role
cat > trust.json <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON
aws iam create-role --role-name lab-lambda-role \
  --assume-role-policy-document file://trust.json
aws iam attach-role-policy --role-name lab-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
sleep 10

ACCT=$(aws sts get-caller-identity --query Account --output text)
aws lambda create-function --function-name lab-fn \
  --runtime python3.12 --handler lambda_function.lambda_handler \
  --role arn:aws:iam::$ACCT:role/lab-lambda-role \
  --zip-file fileb://fn.zip --timeout 10 --memory-size 256

aws lambda invoke --function-name lab-fn out.json && cat out.json
```

### Lab 2 — Đo cold start

```bash
for i in 1 2 3 4 5; do
  aws lambda invoke --function-name lab-fn /dev/null \
    --log-type Tail --query LogResult --output text | base64 -d | grep -E "Duration|Init"
done
```

Lần đầu có `Init Duration` (cold start), các lần sau không. Đợi ~15 phút rồi gọi
lại → cold start quay lại.

### Lab 3 — Memory ảnh hưởng tốc độ

```bash
cat > lambda_function.py <<'PY'
def lambda_handler(event, context):
    s = sum(i*i for i in range(3_000_000))
    return {'sum': s}
PY
zip -f fn.zip lambda_function.py
aws lambda update-function-code --function-name lab-fn --zip-file fileb://fn.zip

for M in 128 512 1024 1769 3008; do
  aws lambda update-function-configuration --function-name lab-fn --memory-size $M >/dev/null
  aws lambda wait function-updated --function-name lab-fn
  echo -n "${M}MB: "
  aws lambda invoke --function-name lab-fn /dev/null --log-type Tail \
    --query LogResult --output text | base64 -d | grep "Billed Duration"
done
```

Tính `MB × giây` cho từng mức để thấy mức nào **rẻ nhất**, không phải nhanh nhất.

### Lab 4 — S3 trigger

```bash
B=lab-lambda-$(date +%s)
aws s3 mb s3://$B

aws lambda add-permission --function-name lab-fn \
  --statement-id s3-invoke --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn arn:aws:s3:::$B

aws s3api put-bucket-notification-configuration --bucket $B \
  --notification-configuration '{"LambdaFunctionConfigurations":[{
    "LambdaFunctionArn":"arn:aws:lambda:ap-southeast-1:'$ACCT':function:lab-fn",
    "Events":["s3:ObjectCreated:*"]}]}'

echo test | aws s3 cp - s3://$B/t.txt
sleep 5
aws logs tail /aws/lambda/lab-fn --since 2m
```

### Lab 5 — Throttle

```bash
aws lambda put-function-concurrency --function-name lab-fn \
  --reserved-concurrent-executions 1

for i in $(seq 1 20); do
  aws lambda invoke --function-name lab-fn /dev/null --invocation-type Event &
done; wait

aws cloudwatch get-metric-statistics --namespace AWS/Lambda \
  --metric-name Throttles --dimensions Name=FunctionName,Value=lab-fn \
  --start-time $(date -u -d '10 min ago' +%FT%TZ) --end-time $(date -u +%FT%TZ) \
  --period 300 --statistics Sum
```

### Dọn dẹp

```bash
aws lambda delete-function --function-name lab-fn
aws s3 rb s3://$B --force
aws iam detach-role-policy --role-name lab-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name lab-lambda-role
aws logs delete-log-group --log-group-name /aws/lambda/lab-fn
```

## Liên quan

- [API Gateway & Cognito](./serverless-api-gateway-cognito)
- [DynamoDB](./serverless-dynamodb)
- [Integration & Messaging](./integration-messaging)
