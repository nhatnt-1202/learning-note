# Classic Solutions Architecture

Ghép các service lại thành hệ thống. Phần này không giới thiệu service mới —
nó là cách suy nghĩ khi thiết kế.

## Tiến hoá của một web app

Cách hữu ích nhất để hiểu kiến trúc AWS là xem một hệ thống lớn dần.

### Bước 1 — Một instance

```
User → EC2 (app + database cùng máy) + Elastic IP
```

Vấn đề: instance chết là mất hết. Deploy phải downtime.

### Bước 2 — Tách database

```
User → EC2 (app) → RDS (Multi-AZ)
```

Được: database có backup, failover tự động. Vẫn còn: app là single point of
failure.

### Bước 3 — Nhiều instance + Load Balancer

```
User → ALB → EC2 ×N (nhiều AZ) → RDS Multi-AZ
```

Điều kiện bắt buộc để bước này hoạt động: **app phải stateless**. Session lưu
trên đĩa local sẽ vỡ ngay khi có 2 instance.

Chuyển session ra ngoài:

```
Session → ElastiCache (Redis)  ← nên dùng
       → DynamoDB
       → Sticky session ở ALB  ← giải pháp tạm, gây lệch tải
```

### Bước 4 — Auto Scaling + tách static

```
User → Route 53 → CloudFront → S3 (static)
                            ↘ ALB → ASG(EC2) → RDS + Read Replica
                                            ↘ ElastiCache
```

Đây là kiến trúc "kinh điển" mà phần lớn web app dừng lại ở đó — và nó đủ cho
rất nhiều hệ thống thật.

### Bước 5 — Bất đồng bộ

```
ALB → EC2 → SQS → Worker ASG → S3
                ↘ SNS → email/notification
```

Việc chậm (resize ảnh, gửi mail, xuất báo cáo) đẩy vào
[queue](./integration-messaging) thay vì làm trong request. Web tier chỉ nhận
việc rồi trả về ngay.

## Bốn nguyên tắc lặp lại

**1. Stateless ở tầng compute.** Mọi state ra ngoài (RDS, ElastiCache, S3,
DynamoDB). Đây là điều kiện của mọi thứ khác — không stateless thì không scale,
không self-heal, không deploy không downtime.

**2. Nhiều AZ cho mọi tầng.** ALB ≥ 2 subnet, ASG ≥ 2 AZ, RDS Multi-AZ. Một AZ
chết mà hệ thống vẫn chạy.

**3. Tách đọc/ghi.** Read replica cho đọc, cache cho đọc lặp. Ghi thì vẫn về
primary.

**4. Bất đồng bộ hoá việc chậm.** Nếu người dùng không cần đợi kết quả ngay, đưa
vào queue.

## Ba tầng và nơi đặt chúng

| Tầng | Subnet | Vào được từ |
|---|---|---|
| Load balancer | **Public** | Internet |
| App | **Private** | Chỉ từ ALB (qua SG) |
| Database | **Private** (không NAT) | Chỉ từ app (qua SG) |

Chỉ ALB ở public subnet. App và database ở private — chúng ra Internet (nếu cần)
qua NAT Gateway.

Security group tham chiếu nhau thay vì IP:

```
sg-alb: inbound 443 từ 0.0.0.0/0
sg-app: inbound 8080 từ sg-alb
sg-db:  inbound 5432 từ sg-app
```

Chuỗi này là mẫu nên dùng lại cho mọi hệ thống — nó tự đúng khi instance thay
đổi.

## NAT Gateway — khoản tiền hay bất ngờ

NAT Gateway tính **theo giờ + theo GB xử lý**. Với hệ thống tải dữ liệu từ S3
nhiều, tiền NAT có thể vượt tiền EC2.

Cách giảm:

- **VPC Gateway Endpoint** cho S3 và DynamoDB — **miễn phí**, bỏ hẳn NAT cho
  traffic tới hai service đó
- Interface Endpoint (PrivateLink) cho các service khác — tính giờ nhưng vẫn rẻ
  hơn NAT nếu lưu lượng lớn
- Chỉ 1 NAT Gateway cho dev (chấp nhận single AZ); production thì mỗi AZ một cái

Xem [S3 — Bảo mật](./s3-security#vpc-endpoint).

## Disaster recovery

Bốn chiến lược, từ rẻ đến đắt:

| Chiến lược | RTO / RPO | Cách làm |
|---|---|---|
| **Backup & Restore** | Giờ / Giờ | Snapshot copy sang region khác |
| **Pilot Light** | 10 phút / Phút | Database replica chạy sẵn, compute tắt |
| **Warm Standby** | Phút / Giây | Bản thu nhỏ chạy sẵn, scale lên khi cần |
| **Multi-Site Active/Active** | Giây / Gần 0 | Cả hai region phục vụ thật |

- **RTO** — bao lâu để khôi phục
- **RPO** — mất bao nhiêu dữ liệu (tính theo thời gian)

Chọn theo *chi phí của downtime*, không theo mong muốn. Multi-site active/active
đắt gấp đôi và phức tạp hơn nhiều — chỉ đáng khi downtime thực sự tốn hơn thế.

## Well-Architected — sáu trụ cột

1. **Operational Excellence** — tự động hoá, quan sát được
2. **Security** — least privilege, mã hoá, audit
3. **Reliability** — multi-AZ, tự phục hồi, có kế hoạch DR
4. **Performance Efficiency** — đúng instance type, có cache
5. **Cost Optimization** — Savings Plans, right-sizing, dọn tài nguyên rác
6. **Sustainability** — dùng Graviton, giảm tài nguyên nhàn rỗi

Công cụ tự đánh giá:

```bash
aws wellarchitected create-workload --workload-name my-app \
  --description "..." --environment PRODUCTION \
  --lenses wellarchitected --review-owner me@example.com
```

## Câu hỏi kiểm tra một thiết kế

- Instance nào chết thì có ảnh hưởng gì? Còn cả AZ chết?
- State nằm ở đâu? Có gì trên đĩa local không?
- Deploy có cần downtime không?
- Database là cổ chai chưa? Đã có cache và read replica chưa?
- Tiền đi đâu nhiều nhất? (thường: NAT Gateway, data transfer, RDS)
- Có ai đang chạy tài nguyên không dùng? (EIP rời, EBS mồ côi, ALB rỗng)
- Có backup không, và **đã thử restore chưa**?

Câu cuối là câu hay bị bỏ qua nhất — backup chưa từng restore thử thì chưa phải
backup.

## Lab

### Lab 1 — Dựng kiến trúc 3 tầng

Ghép lại những gì đã làm ở các trang trước:

1. VPC với 2 public + 2 private subnet (2 AZ)
2. [ALB](./ec2-high-availability) ở public
3. [ASG](./ec2-high-availability) ở private, min 2
4. [RDS Multi-AZ](./rds-aurora-elasticache) ở private
5. SG chuỗi: `sg-alb` → `sg-app` → `sg-db`
6. [VPC Gateway Endpoint](./s3-security#vpc-endpoint) cho S3

Kiểm tra:

```bash
# App có ra Internet được không (qua NAT)
curl -s https://checkip.amazonaws.com

# S3 đi qua endpoint, không qua NAT
aws s3 ls
dig +short s3.ap-southeast-1.amazonaws.com    # trả về IP private
```

### Lab 2 — Diễn tập mất AZ

```bash
# Bỏ 1 AZ khỏi ASG
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name lab-asg --vpc-zone-identifier "subnet-a"
```

Quan sát service vẫn chạy. Rồi cho RDS failover:

```bash
aws rds reboot-db-instance --db-instance-identifier lab-pg --force-failover
```

Đo bao lâu app kết nối lại được — đó là RTO thật của bạn.

### Lab 3 — Tìm tiền rác

```bash
# Elastic IP không gắn vào đâu
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]' --output table

# EBS volume mồ côi
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query 'Volumes[].[VolumeId,Size,CreateTime]' --output table

# Snapshot cũ
aws ec2 describe-snapshots --owner-ids self \
  --query 'sort_by(Snapshots,&StartTime)[:10].[SnapshotId,VolumeSize,StartTime]' --output table
```

Chạy định kỳ — ba loại này là nguồn hoá đơn rác phổ biến nhất.

## Liên quan

- [EC2 — HA & Scalability](./ec2-high-availability)
- [RDS, Aurora & ElastiCache](./rds-aurora-elasticache)
- [Integration & Messaging](./integration-messaging)
- [Serverless Architectures](./serverless-architectures)
