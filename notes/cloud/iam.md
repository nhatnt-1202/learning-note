# IAM — Identity and Access Management

IAM quản lý **ai** được làm **gì** trên tài nguyên nào. Service toàn cầu (không
theo region) và miễn phí.

## Bốn khái niệm

| | Là gì |
|---|---|
| **User** | Một người/ứng dụng cụ thể, có credential lâu dài |
| **Group** | Tập hợp user, để gán policy chung. **Không** lồng group được |
| **Role** | Danh tính *tạm thời* — được "assume", nhận credential hết hạn |
| **Policy** | Tài liệu JSON định nghĩa quyền |

Điểm quan trọng nhất: **role > user cho mọi thứ chạy tự động**. Ứng dụng trên
EC2, Lambda, container — tất cả nên dùng role. Access key dán vào code là nguyên
nhân rò rỉ phổ biến nhất trên AWS.

## Root account

Tài khoản tạo bằng email khi mở AWS. Có quyền tuyệt đối, **không giới hạn được
bằng policy**.

Việc cần làm ngay:

1. Bật MFA cho root
2. Xoá mọi access key của root nếu có
3. Tạo IAM user riêng cho công việc hàng ngày
4. Không dùng root nữa (trừ vài việc bắt buộc: đóng account, đổi
   billing plan, đổi tên account)

## Policy — cấu trúc

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOwnBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "IpAddress": { "aws:SourceIp": "203.0.113.0/24" }
      }
    }
  ]
}
```

`"Version": "2012-10-17"` là số phiên bản **ngôn ngữ policy**, không phải ngày
— luôn dùng đúng chuỗi này.

Chú ý hai `Resource` cho S3: `arn:...:my-bucket` là *bucket* (cho `ListBucket`),
`arn:...:my-bucket/*` là *object* (cho `GetObject`). Thiếu một trong hai là lỗi
hay gặp.

## Cách quyền được quyết định

Thứ tự đánh giá:

1. **Explicit Deny** → từ chối. Thắng mọi thứ, không gì ghi đè được
2. **Explicit Allow** → cho phép
3. Không có gì → **từ chối** (mặc định deny)

Hệ quả: thêm `Allow` không bao giờ vượt được một `Deny` ở bất kỳ đâu — kể cả
`Deny` trong SCP của Organizations hay trong permission boundary.

## Ba loại policy hay lẫn

| Loại | Gắn vào | Dùng khi |
|---|---|---|
| **Identity-based** | User, group, role | Phổ biến nhất |
| **Resource-based** | Chính tài nguyên (S3 bucket, SQS queue) | Cho phép truy cập chéo account |
| **Permission boundary** | User/role | Đặt **trần** quyền, không tự cấp quyền |

Cross-account cần **cả hai phía**: resource policy bên tài nguyên cho phép, và
identity policy bên gọi cũng cho phép.

## Role và trust policy

Role có hai phần: **trust policy** (ai được assume) và **permission policy**
(assume rồi làm được gì).

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

Cross-account, nên thêm `ExternalId` để chống confused deputy:

```json
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "sts:AssumeRole",
  "Condition": { "StringEquals": { "sts:ExternalId": "unique-secret" } }
}
```

## Least privilege trong thực tế

Đừng bắt đầu bằng cách đoán quyền. Cách hiệu quả:

1. Cấp rộng trong môi trường dev
2. Dùng **IAM Access Analyzer** sinh policy từ log CloudTrail thực tế
3. Thu hẹp dần theo policy sinh ra

```bash
# Xem quyền nào thực sự được dùng
aws iam get-service-last-accessed-details --job-id <id>
```

Tránh `"Action": "*"` và `"Resource": "*"` cùng lúc — đó là admin.

## Công cụ kiểm tra

- **IAM Policy Simulator** — thử một action trước khi deploy
- **Access Analyzer** — tìm tài nguyên đang public hoặc chia sẻ ra ngoài
- **Credential report** — liệt kê user, MFA, tuổi access key

```bash
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d
```

## Lab

### Lab 1 — Dựng nền an toàn

```bash
# Kiểm tra đang là ai
aws sts get-caller-identity
```

1. Bật MFA cho root, xoá access key của root
2. Tạo group `Developers`, gắn `ReadOnlyAccess`
3. Tạo user `dev1` vào group đó, bật MFA
4. Đăng nhập bằng `dev1`, thử tạo một S3 bucket → phải bị từ chối

### Lab 2 — Role cho EC2

```bash
# Trust policy
cat > trust.json <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON

aws iam create-role --role-name EC2S3ReadOnly \
  --assume-role-policy-document file://trust.json

aws iam attach-role-policy --role-name EC2S3ReadOnly \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam create-instance-profile --instance-profile-name EC2S3ReadOnly
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2S3ReadOnly --role-name EC2S3ReadOnly
```

Gắn vào EC2 rồi SSH vào và chạy `aws s3 ls` — chạy được **mà không có access
key nào trên máy**. Đó là điểm của role.

Xem credential tạm mà instance đang dùng (IMDSv2):

```bash
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

### Lab 3 — Deny thắng Allow

Gắn cho `dev1` cả `AmazonS3FullAccess` và policy sau:

```json
{"Version":"2012-10-17","Statement":[{
  "Effect":"Deny","Action":"s3:DeleteObject","Resource":"*"}]}
```

Thử `aws s3 rm` → bị từ chối, dù có FullAccess. Xác nhận explicit deny thắng.

### Dọn dẹp

```bash
aws iam remove-role-from-instance-profile \
  --instance-profile-name EC2S3ReadOnly --role-name EC2S3ReadOnly
aws iam delete-instance-profile --instance-profile-name EC2S3ReadOnly
aws iam detach-role-policy --role-name EC2S3ReadOnly \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
aws iam delete-role --role-name EC2S3ReadOnly
```

## Liên quan

- [EC2 — Cơ bản](./ec2-basic) — gắn instance profile
- [S3 — Bảo mật](./s3-security) — bucket policy
