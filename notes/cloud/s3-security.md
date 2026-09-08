# S3 — Bảo mật

S3 rò rỉ dữ liệu là loại sự cố phổ biến nhất trên AWS, và gần như luôn do cấu
hình chứ không do lỗ hổng. Trang này là những gì cần đặt đúng.

## Block Public Access — bật trước mọi thứ khác

```bash
aws s3api put-public-access-block --bucket my-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Bật ở mức **account** để không phải nhớ cho từng bucket:

```bash
aws s3control put-public-access-block --account-id 111122223333 \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

AWS bật mặc định cho bucket mới từ 2023, nhưng bucket cũ thì phải kiểm tra:

```bash
for b in $(aws s3api list-buckets --query 'Buckets[].Name' --output text); do
  echo -n "$b: "
  aws s3api get-public-access-block --bucket $b \
    --query 'PublicAccessBlockConfiguration.BlockPublicPolicy' --output text 2>/dev/null \
    || echo "KHÔNG CÓ CẤU HÌNH"
done
```

## Bốn cơ chế kiểm soát truy cập

| Cơ chế | Dùng khi | Ghi chú |
|---|---|---|
| **IAM policy** | Cấp quyền cho user/role trong account | Phổ biến nhất |
| **Bucket policy** | Cross-account, hoặc rule theo bucket | Resource-based |
| **ACL** | — | **Đời cũ, nên tắt hẳn** |
| **Access Point** | Nhiều ứng dụng dùng chung bucket lớn | Mỗi app một policy riêng |

Tắt ACL (khuyến nghị của AWS):

```bash
aws s3api put-bucket-ownership-controls --bucket my-bucket \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

`BucketOwnerEnforced` làm ACL vô hiệu hoàn toàn — bỏ được một nguồn nhầm lẫn
lớn, và object do account khác upload vẫn thuộc quyền sở hữu của bạn.

## Bucket policy

Chỉ cho phép qua HTTPS và bắt buộc mã hoá:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
      }
    }
  ]
}
```

Hai `Deny` này nên có trên mọi bucket chứa dữ liệu thật. `Deny` thắng mọi
`Allow` (xem [IAM](./iam#cách-quyền-được-quyết-định)), nên chúng là lưới an toàn
thật sự — kể cả khi ai đó cấp quyền quá rộng ở chỗ khác.

Chỉ cho phép từ VPC endpoint cụ thể:

```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-xxxxx" } }
}
```

## Mã hoá

| Loại | Khoá quản lý bởi | Dùng khi |
|---|---|---|
| **SSE-S3** | AWS, tự động | Mặc định, miễn phí, đủ cho phần lớn |
| **SSE-KMS** | KMS của bạn | Cần audit trail, cần kiểm soát khoá |
| SSE-C | Bạn cung cấp mỗi request | Ít dùng |
| Client-side | Bạn, mã hoá trước khi upload | Zero-trust với AWS |

S3 mã hoá **mặc định bằng SSE-S3** cho mọi object từ 2023 — không còn object
nào không mã hoá.

Đặt SSE-KMS làm mặc định:

```bash
aws s3api put-bucket-encryption --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules":[{
      "ApplyServerSideEncryptionByDefault":{
        "SSEAlgorithm":"aws:kms",
        "KMSMasterKeyID":"arn:aws:kms:ap-southeast-1:111122223333:key/xxx"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

`BucketKeyEnabled: true` **quan trọng về chi phí**: nó giảm số lần gọi KMS tới
99%. Không bật, bucket ghi nhiều sẽ tốn tiền KMS đáng kể.

Đánh đổi của SSE-KMS: mỗi lần đọc/ghi gọi KMS, nên có giới hạn request và ảnh
hưởng throughput ở quy mô rất lớn.

## VPC Endpoint

Cho EC2 truy cập S3 **không qua Internet**:

```bash
# Gateway endpoint — miễn phí, chỉ dùng trong VPC
aws ec2 create-vpc-endpoint --vpc-id vpc-xxx \
  --service-name com.amazonaws.ap-southeast-1.s3 \
  --route-table-ids rtb-xxx
```

Lợi ích kép: bảo mật (không ra Internet) **và** chi phí (không qua NAT Gateway —
NAT tính tiền theo GB, thường là khoản lớn bất ngờ trong hoá đơn).

Gateway endpoint miễn phí; Interface endpoint (PrivateLink) tính tiền theo giờ
nhưng dùng được từ on-premise.

## Access log và audit

```bash
# Server access log
aws s3api put-bucket-logging --bucket my-bucket \
  --bucket-logging-status '{
    "LoggingEnabled":{"TargetBucket":"my-log-bucket","TargetPrefix":"access/"}
  }'
```

Hoặc CloudTrail data event (chi tiết hơn, tốn tiền hơn):

```bash
aws cloudtrail put-event-selectors --trail-name my-trail \
  --event-selectors '[{"ReadWriteType":"All","IncludeManagementEvents":false,
    "DataResources":[{"Type":"AWS::S3::Object","Values":["arn:aws:s3:::my-bucket/"]}]}]'
```

Log bucket phải **khác** bucket được log — không thì sinh vòng lặp.

## Tìm bucket đang public

```bash
# Access Analyzer — cách đúng
aws accessanalyzer create-analyzer --analyzer-name account-analyzer --type ACCOUNT
aws accessanalyzer list-findings --analyzer-arn <arn> \
  --filter '{"resourceType":{"eq":["AWS::S3::Bucket"]}}'
```

**Macie** thì quét nội dung để tìm dữ liệu nhạy cảm (PII, thẻ tín dụng) — đắt
hơn, dùng khi cần tuân thủ.

## Checklist cho bucket production

- [ ] Block Public Access bật (cả mức account)
- [ ] `BucketOwnerEnforced` — ACL tắt
- [ ] Bucket policy có `Deny` cho `aws:SecureTransport = false`
- [ ] Mã hoá mặc định, có `BucketKeyEnabled` nếu dùng KMS
- [ ] Versioning bật + lifecycle xoá version cũ
- [ ] Access log hoặc CloudTrail data event
- [ ] VPC endpoint nếu truy cập từ trong VPC
- [ ] `AbortIncompleteMultipartUpload` trong lifecycle
- [ ] Access Analyzer bật ở mức account

## Lab

### Lab 1 — Chứng minh Block Public Access hoạt động

```bash
B=lab-sec-$(date +%s)
aws s3 mb s3://$B
echo secret > s.txt && aws s3 cp s.txt s3://$B/s.txt

# Thử mở public → bị chặn
aws s3api put-bucket-policy --bucket $B --policy '{
 "Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*",
 "Action":"s3:GetObject","Resource":"arn:aws:s3:::'$B'/*"}]}'
# AccessDenied vì BlockPublicPolicy đang bật
```

Tắt tạm để thấy khác biệt, rồi **bật lại ngay**:

```bash
aws s3api put-public-access-block --bucket $B \
  --public-access-block-configuration "BlockPublicPolicy=false,RestrictPublicBuckets=false"
# đặt policy lại → thành công, file thành public
curl https://$B.s3.ap-southeast-1.amazonaws.com/s.txt

# BẬT LẠI
aws s3api put-public-access-block --bucket $B \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
curl https://$B.s3.ap-southeast-1.amazonaws.com/s.txt   # AccessDenied
```

### Lab 2 — Bắt buộc HTTPS

Đặt policy `DenyInsecureTransport` ở trên, rồi:

```bash
aws s3 cp s3://$B/s.txt - --no-verify-ssl --endpoint-url http://s3.ap-southeast-1.amazonaws.com
# bị Deny
```

### Lab 3 — Mã hoá KMS

```bash
KEY=$(aws kms create-key --description "lab s3" --query KeyMetadata.KeyId --output text)

aws s3api put-bucket-encryption --bucket $B \
  --server-side-encryption-configuration '{"Rules":[{
    "ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms","KMSMasterKeyID":"'$KEY'"},
    "BucketKeyEnabled":true}]}'

aws s3 cp s.txt s3://$B/enc.txt
aws s3api head-object --bucket $B --key enc.txt \
  --query '[ServerSideEncryption,SSEKMSKeyId]'
```

### Dọn dẹp

```bash
aws s3 rm s3://$B --recursive && aws s3 rb s3://$B
aws kms schedule-key-deletion --key-id $KEY --pending-window-in-days 7
```

KMS key không xoá ngay được — tối thiểu 7 ngày, và **vẫn tính phí** trong thời
gian chờ.

## Liên quan

- [IAM](./iam) — nền tảng policy
- [S3 — Nâng cao](./s3-advanced) — Object Lock
- [CloudFront](./cloudfront) — OAC thay cho public bucket
