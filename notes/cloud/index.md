# Cloud / AWS

Ghi chú theo lộ trình AWS Solutions Architect — Associate. Mỗi trang gồm phần lý
thuyết và mục **Lab** ở cuối để tự thực hành.

> **Nguồn tham khảo cấu trúc:** danh mục chủ đề tham khảo từ
> [tuanthanh.name.vn](https://www.tuanthanh.name.vn/cloud/) (phần đó hiện chưa
> có nội dung). Nội dung các trang này do mình tự viết.

## Cảnh báo chi phí

Gần như mọi lab ở đây đều có thể phát sinh tiền. Trước khi bắt đầu:

- Bật **Billing alert** (Budgets → alert ở $1) ngay từ đầu
- Dùng `t3.micro` / `t2.micro` trong hạn mức free tier
- **Xoá tài nguyên sau mỗi lab** — NAT Gateway, Elastic IP không gắn, EBS volume
  mồ côi và ALB là bốn thứ âm thầm tốn tiền nhất
- Dùng một region cố định (`ap-southeast-1` Singapore) để không bỏ quên tài
  nguyên ở region khác

## Nền tảng

| Chủ đề | Nội dung |
|---|---|
| [IAM](./iam) | User, group, role, policy, least privilege |
| [EC2 — Cơ bản](./ec2-basic) | Instance type, AMI, security group, user data |
| [EC2 — Nâng cao](./ec2-associate) | Purchasing options, placement group, ENI |
| [EC2 — Instance Storage](./ec2-instance-storage) | EBS, snapshot, EFS, instance store |
| [EC2 — HA & Scalability](./ec2-high-availability) | ELB, ASG, health check, scaling policy |

## Lưu trữ

| Chủ đề | Nội dung |
|---|---|
| [S3 — Giới thiệu](./s3-introduction) | Bucket, object, storage class, versioning |
| [S3 — Nâng cao](./s3-advanced) | Lifecycle, replication, multipart, S3 Select |
| [S3 — Bảo mật](./s3-security) | Bucket policy, encryption, block public access |
| [CloudFront & Global Accelerator](./cloudfront) | CDN, OAC, cache behavior |
| [Storage Extras](./storage-extras) | Snow Family, Storage Gateway, FSx, DataSync |

## Database & Network

| Chủ đề | Nội dung |
|---|---|
| [RDS, Aurora & ElastiCache](./rds-aurora-elasticache) | Multi-AZ, read replica, caching |
| [Databases in AWS](./databases-in-aws) | Chọn database nào cho bài toán nào |
| [Route 53](./route53) | Routing policy, health check, alias record |

## Kiến trúc & Tích hợp

| Chủ đề | Nội dung |
|---|---|
| [Classic Solutions Architecture](./classic-architecture) | Ghép các service thành hệ thống |
| [Integration & Messaging](./integration-messaging) | SQS, SNS, EventBridge, Kinesis |
| [Containers on AWS](./containers) | ECS, Fargate, EKS, ECR |

## Serverless

| Chủ đề | Nội dung |
|---|---|
| [Lambda](./serverless-lambda) | Runtime, cold start, concurrency, layer |
| [DynamoDB](./serverless-dynamodb) | Partition key, GSI, single-table design |
| [API Gateway & Cognito](./serverless-api-gateway-cognito) | REST vs HTTP API, authorizer |
| [Serverless Architectures](./serverless-architectures) | Các mẫu kiến trúc thường gặp |

## Data & ML

| Chủ đề | Nội dung |
|---|---|
| [Data & Analytics](./data-analytics) | Athena, Glue, Redshift, EMR, QuickSight |
| [Machine Learning](./machine-learning) | SageMaker và các service ML sẵn dùng |

## Chuẩn bị môi trường

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
aws --version

# Cấu hình — dùng IAM user có MFA, KHÔNG dùng root
aws configure
aws sts get-caller-identity     # xác nhận đang là ai
```

Đặt region mặc định để không phải gõ lại:

```bash
aws configure set region ap-southeast-1
```
