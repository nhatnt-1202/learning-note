# API Gateway & Cognito

API Gateway đứng trước backend lo routing, auth, throttling. Cognito lo danh
tính người dùng.

## REST API vs HTTP API

| | REST API | HTTP API |
|---|---|---|
| Giá | ~$3.50/triệu request | **~$1.00/triệu** |
| Latency | Cao hơn | **Thấp hơn** |
| Request/response transform | **Có** | Không |
| API key, usage plan | **Có** | Không |
| WAF | **Có** | Không |
| Caching | **Có** | Không |
| JWT authorizer sẵn | Không (phải viết Lambda) | **Có** |
| Private API trong VPC | **Có** | Không |

Chọn **HTTP API** trừ khi cần một trong: transform, API key/usage plan, WAF,
caching, private endpoint. Nó rẻ hơn 3.5 lần và nhanh hơn.

Loại thứ ba là **WebSocket API** cho kết nối hai chiều (chat, realtime).

## Tạo HTTP API

```bash
API=$(aws apigatewayv2 create-api --name lab-api --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:111122223333:function:lab-fn \
  --query ApiId --output text)

# Cho API Gateway gọi Lambda
aws lambda add-permission --function-name lab-fn \
  --statement-id apigw --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-1:111122223333:$API/*"

aws apigatewayv2 get-api --api-id $API --query ApiEndpoint --output text
```

`--target` là cách nhanh: nó tự tạo integration + route `$default` + stage.

## Integration types

| Loại | Nối tới |
|---|---|
| **Lambda proxy** | Lambda, truyền nguyên event. Phổ biến nhất |
| HTTP proxy | Backend HTTP bất kỳ (ALB, service ngoài) |
| **AWS service** | Gọi thẳng SQS/DynamoDB/SNS — **không cần Lambda** |
| Mock | Trả response cố định, để test |

Integration trực tiếp tới service đáng chú ý: API nhận request rồi đẩy vào SQS
mà không viết dòng code nào — bớt một Lambda phải bảo trì và bớt cold start.

## Lambda proxy — định dạng response

Lambda **phải** trả đúng cấu trúc, không thì client nhận 502:

```python
import json

def lambda_handler(event, context):
    # event chứa: rawPath, requestContext, headers, body, queryStringParameters
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True})       # body PHẢI là string
    }
```

Lỗi hay gặp nhất: trả `body` là dict thay vì string đã `json.dumps`.

## Authorizer

### JWT (HTTP API) — đơn giản nhất

```bash
aws apigatewayv2 create-authorizer --api-id $API \
  --name cognito-jwt --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --jwt-configuration 'Audience=<client-id>,Issuer=https://cognito-idp.ap-southeast-1.amazonaws.com/<pool-id>'
```

API Gateway tự verify token, không cần code.

### Lambda authorizer — khi logic phức tạp

```python
def lambda_handler(event, context):
    token = event['headers'].get('authorization', '')
    if not valid(token):
        return {'isAuthorized': False}
    return {
        'isAuthorized': True,
        'context': {'userId': '42', 'role': 'admin'}   # xuống được backend
    }
```

Bật cache authorizer (`AuthorizerResultTtlInSeconds`) để không gọi lại mỗi
request.

## Throttling và usage plan

```bash
# Mức account/stage
aws apigatewayv2 update-stage --api-id $API --stage-name '$default' \
  --default-route-settings 'ThrottlingBurstLimit=200,ThrottlingRateLimit=100'
```

Mặc định account là 10,000 req/s và burst 5,000 — **dùng chung cho mọi API trong
region**. Một API bị tấn công có thể làm cạn quota của các API khác, nên đặt
throttle riêng cho từng stage.

API key + usage plan (chỉ REST API) để phân hạn mức theo khách hàng:

```bash
aws apigateway create-usage-plan --name basic \
  --throttle burstLimit=50,rateLimit=20 \
  --quota limit=10000,period=MONTH
```

API key **không phải cơ chế xác thực** — nó để đo và giới hạn, không để bảo mật.

## CORS

```bash
aws apigatewayv2 update-api --api-id $API \
  --cors-configuration 'AllowOrigins=https://example.com,
    AllowMethods=GET,POST,OPTIONS,AllowHeaders=content-type,authorization,
    MaxAge=300'
```

Với HTTP API, cấu hình CORS ở đây là đủ — **đừng** thêm header CORS trong Lambda
nữa, hai chỗ cùng set sẽ tạo header trùng và browser từ chối.

## Cognito

Hai thành phần khác nhau, hay bị lẫn:

| | User Pool | Identity Pool |
|---|---|---|
| Làm gì | **Xác thực** — đăng ký, đăng nhập, MFA | **Cấp credential AWS tạm** |
| Trả về | JWT (ID, access, refresh token) | Access key tạm của IAM role |
| Dùng để | Bảo vệ API | Cho client gọi thẳng S3/DynamoDB |

Bảo vệ API → **User Pool** + JWT authorizer. Cho app mobile upload thẳng lên S3
→ thêm **Identity Pool**.

```bash
POOL=$(aws cognito-idp create-user-pool --pool-name lab-pool \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,
    "RequireNumbers":true,"RequireSymbols":false}}' \
  --auto-verified-attributes email \
  --query 'UserPool.Id' --output text)

CLIENT=$(aws cognito-idp create-user-pool-client --user-pool-id $POOL \
  --client-name lab-client --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query 'UserPoolClient.ClientId' --output text)
```

`--no-generate-secret` cho client public (SPA, mobile) — app không giữ được
secret an toàn. Backend thì nên có secret.

### Ba loại token

| Token | Chứa gì | Dùng để |
|---|---|---|
| **ID token** | Thông tin user (email, name) | Hiển thị trên UI |
| **Access token** | Scope, quyền | **Gọi API** |
| **Refresh token** | — | Lấy token mới, hạn dài |

Gọi API nên dùng **access token**. Dùng ID token để authorize là sai thực hành,
dù nhiều tutorial làm vậy.

## Lab

### Lab 1 — HTTP API + Lambda

Dùng `lab-fn` từ [Lambda](./serverless-lambda#lab), nhưng sửa cho đúng format:

```bash
cat > lambda_function.py <<'PY'
import json
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'path': event.get('rawPath'),
            'method': event.get('requestContext', {}).get('http', {}).get('method'),
            'query': event.get('queryStringParameters'),
        })
    }
PY
zip -f fn.zip lambda_function.py
aws lambda update-function-code --function-name lab-fn --zip-file fileb://fn.zip
```

Tạo API như trên, rồi:

```bash
EP=$(aws apigatewayv2 get-api --api-id $API --query ApiEndpoint --output text)
curl "$EP/hello?name=nhat"
```

### Lab 2 — Cognito và lấy token

```bash
aws cognito-idp admin-create-user --user-pool-id $POOL \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password --user-pool-id $POOL \
  --username test@example.com --password 'Passw0rd!' --permanent

TOKENS=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH --client-id $CLIENT \
  --auth-parameters USERNAME=test@example.com,PASSWORD='Passw0rd!')

echo "$TOKENS" | python3 -m json.tool
ACCESS=$(echo "$TOKENS" | python3 -c 'import sys,json; print(json.load(sys.stdin)["AuthenticationResult"]["AccessToken"])')
```

Xem trong token có gì (JWT là base64, không mã hoá):

```bash
echo $ACCESS | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

### Lab 3 — Bảo vệ API bằng JWT

```bash
AUTH=$(aws apigatewayv2 create-authorizer --api-id $API \
  --name cognito-jwt --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --jwt-configuration Audience=$CLIENT,Issuer=https://cognito-idp.ap-southeast-1.amazonaws.com/$POOL \
  --query AuthorizerId --output text)

# Gắn vào route
ROUTE=$(aws apigatewayv2 get-routes --api-id $API --query 'Items[0].RouteId' --output text)
aws apigatewayv2 update-route --api-id $API --route-id $ROUTE \
  --authorization-type JWT --authorizer-id $AUTH
```

Kiểm chứng:

```bash
curl -i "$EP/hello"                                    # 401
curl -i "$EP/hello" -H "Authorization: Bearer $ACCESS"  # 200
```

### Lab 4 — Throttle

```bash
aws apigatewayv2 update-stage --api-id $API --stage-name '$default' \
  --default-route-settings 'ThrottlingBurstLimit=2,ThrottlingRateLimit=1'

for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " "$EP/hello" -H "Authorization: Bearer $ACCESS"
done; echo
```

Sẽ thấy `429` xuất hiện.

### Lab 5 — Integration trực tiếp tới SQS (không Lambda)

Tạo route `POST /enqueue` với integration `AWS_PROXY` tới SQS `SendMessage`.
Không có Lambda nào trong đường đi — ít latency, ít chi phí, ít thứ phải bảo trì.

### Dọn dẹp

```bash
aws apigatewayv2 delete-api --api-id $API
aws cognito-idp delete-user-pool --user-pool-id $POOL
```

## Liên quan

- [Lambda](./serverless-lambda)
- [Serverless Architectures](./serverless-architectures)
- [IAM](./iam)
