# EC2 — Cơ bản

EC2 (Elastic Compute Cloud) là máy ảo trên AWS. Nắm bốn thứ là chạy được:
instance type, AMI, security group, và user data.

## Instance type — đọc tên thế nào

```
m5.2xlarge
│││ └── size
││└──── generation (5)
│└───── họ bổ sung (a=AMD, g=Graviton/ARM, n=network, d=NVMe local)
└────── nhóm
```

| Nhóm | Tối ưu cho | Ví dụ dùng |
|---|---|---|
| `t` | Burstable, rẻ | Dev, web traffic thấp |
| `m` | Cân bằng | App server phổ thông |
| `c` | CPU | Xử lý batch, game server, encode |
| `r`, `x` | RAM | Database, cache, in-memory |
| `i`, `d` | Đĩa local nhanh | NoSQL, data warehouse |
| `g`, `p` | GPU | ML, render |

`g` trong tên (như `m7g`) là **Graviton** — CPU ARM của AWS, thường rẻ hơn
~20% và hiệu năng/giá tốt hơn. Đáng dùng nếu image build được cho ARM.

## Burstable — cái bẫy của họ t

Instance `t` chạy ở mức CPU cơ sở (baseline) và tích **credit** khi dùng dưới
mức đó. Vượt baseline thì tiêu credit; hết credit thì bị **giới hạn xuống
baseline** — `t3.micro` chỉ còn 10% CPU.

Đây là nguyên nhân "server tự nhiên chậm" rất hay gặp. Theo dõi
`CPUCreditBalance` trên CloudWatch.

Chế độ **unlimited** (mặc định của `t3`/`t4g`) cho vượt baseline liên tục nhưng
**tính phí thêm** — tiện nhưng hoá đơn có thể vượt cả instance lớn hơn. Với
workload CPU đều, chọn `m` thay vì `t`.

## AMI — Amazon Machine Image

Ảnh đĩa để khởi tạo instance. AMI **theo region** — copy sang region khác mới
dùng được ở đó.

```bash
# Tìm Amazon Linux 2023 mới nhất
aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text
```

Dùng SSM parameter thay vì hardcode AMI ID là cách tốt: nó luôn trả bản mới nhất
và không cần sửa script khi AWS phát hành ảnh mới.

Tự tạo AMI (golden image) giúp instance mới boot nhanh, không phải cài lại mọi
thứ qua user data.

## Security Group — firewall ở tầng instance

Đặc điểm quyết định cách dùng:

- **Chỉ có rule Allow**, không có Deny
- **Stateful** — cho request vào thì response tự động được ra
- Mặc định: **chặn hết inbound**, **cho hết outbound**
- Gắn được nhiều SG vào một instance (rule cộng dồn)

Kỹ thuật quan trọng nhất: **tham chiếu SG khác thay vì IP**.

```bash
# SG database chỉ cho phép SG web kết nối — không cần biết IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-db \
  --protocol tcp --port 5432 \
  --source-group sg-web
```

Cách này tự đúng khi instance thay đổi, scale ra scale vào — không phải cập
nhật IP.

### Security Group vs NACL

| | Security Group | NACL |
|---|---|---|
| Tầng | Instance (ENI) | Subnet |
| Rule | Chỉ Allow | Allow **và** Deny |
| Trạng thái | Stateful | **Stateless** (phải mở cả 2 chiều) |
| Đánh giá | Tất cả rule cộng dồn | Theo số thứ tự, dừng ở match đầu |

Thực tế: dùng SG cho gần như mọi việc. NACL chỉ khi cần **chặn** một IP cụ thể ở
tầng subnet.

## User Data

Script chạy **một lần** khi instance boot lần đầu, với quyền root.

```bash
#!/bin/bash
dnf update -y
dnf install -y nginx
systemctl enable --now nginx
echo "<h1>$(hostname -f)</h1>" > /usr/share/nginx/html/index.html
```

Debug khi không chạy:

```bash
sudo cat /var/log/cloud-init-output.log
```

Giới hạn 16KB. Script dài thì để trên S3 rồi user data chỉ tải về và chạy.

Muốn chạy **mỗi lần boot** thì dùng cloud-config thay vì shell script:

```yaml
#cloud-config
cloud_final_modules:
  - [scripts-user, always]
```

## Metadata service (IMDS)

Instance tự xem thông tin của mình:

```bash
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id
```

Luôn dùng **IMDSv2** (có token). IMDSv1 không cần token nên một lỗ SSRF trong
ứng dụng có thể đọc được credential của role — đây là con đường dẫn tới nhiều vụ
rò rỉ thật. Bắt buộc v2:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-xxx --http-tokens required
```

## Kết nối vào instance

| Cách | Cần gì |
|---|---|
| **SSM Session Manager** | Không cần SSH, không cần port mở, không cần key. **Nên dùng** |
| SSH bằng key pair | Port 22 mở, có file `.pem` |
| EC2 Instance Connect | Tạm cấp key, vẫn cần port 22 |

Session Manager chỉ cần instance có role với `AmazonSSMManagedInstanceCore` và
SSM agent (Amazon Linux có sẵn):

```bash
aws ssm start-session --target i-xxxxx
```

Không mở port 22 ra Internet là cách giảm rủi ro lớn nhất mà gần như miễn phí.

## IP address

| Loại | Đặc điểm |
|---|---|
| **Private IP** | Cố định suốt đời instance |
| **Public IP** | **Đổi** mỗi lần stop/start |
| **Elastic IP** | Cố định, gán được. Tốn tiền khi **không** gắn vào đâu |

Elastic IP không gắn vào instance nào vẫn bị tính phí — một trong những khoản
rác hay bị bỏ quên. Nhu cầu IP cố định thường nên giải bằng
[Load Balancer](./ec2-high-availability) hoặc [Route 53](./route53).

## Lab

### Lab 1 — Web server bằng CLI

```bash
AMI=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)

# Security group
SG=$(aws ec2 create-security-group --group-name lab-web \
  --description "lab web" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# User data
cat > ud.sh <<'SH'
#!/bin/bash
dnf install -y nginx
systemctl enable --now nginx
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<h1>Hello from $AZ</h1>" > /usr/share/nginx/html/index.html
SH

aws ec2 run-instances \
  --image-id $AMI --instance-type t3.micro \
  --security-group-ids $SG \
  --user-data file://ud.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lab-web}]'
```

Mở public IP trên browser. Không thấy gì thì đọc
`/var/log/cloud-init-output.log`.

### Lab 2 — Burst credit

Chạy `t3.micro`, cho CPU 100%:

```bash
sudo dnf install -y stress-ng
stress-ng --cpu 2 --timeout 900s
```

Xem `CPUCreditBalance` và `CPUUtilization` trên CloudWatch — quan sát credit tụt
rồi CPU bị giới hạn.

### Lab 3 — Session Manager không mở SSH

Tạo instance **không** mở port 22, gắn role có
`AmazonSSMManagedInstanceCore`, rồi:

```bash
aws ssm start-session --target i-xxxxx
```

### Dọn dẹp

```bash
aws ec2 terminate-instances --instance-ids i-xxxxx
aws ec2 delete-security-group --group-id $SG   # sau khi instance đã terminate
```

## Liên quan

- [IAM](./iam) — instance profile
- [EC2 — Nâng cao](./ec2-associate) — giá và placement
- [EC2 — HA](./ec2-high-availability) — ELB, ASG
