# EC2 — Nâng cao

Phần ảnh hưởng trực tiếp tới hoá đơn và hiệu năng: chọn hình thức mua, đặt
instance ở đâu, và cấu hình mạng.

## Purchasing options — chỗ tiết kiệm nhiều nhất

| Hình thức | Giảm giá | Cam kết | Dùng khi |
|---|---|---|---|
| **On-Demand** | 0% | Không | Tải bất định, dev |
| **Savings Plans** | ~72% | 1–3 năm, theo $/giờ | **Mặc định nên chọn** cho tải ổn định |
| **Reserved Instance** | ~72% | 1–3 năm, theo instance type | Khi cần capacity reservation |
| **Spot** | ~90% | Không, **bị thu hồi** | Batch, CI, xử lý chịu lỗi |
| **Dedicated Host** | — | Có | Yêu cầu license theo socket |

**Savings Plans** (Compute) linh hoạt hơn RI: cam kết theo số tiền mỗi giờ, áp
được cho mọi instance family, region, kể cả Fargate và Lambda. Với hệ thống bình
thường thì gần như luôn là lựa chọn đúng hơn RI.

### Spot — dùng đúng cách

Bị thu hồi khi AWS cần capacity, có **2 phút** báo trước:

```bash
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/spot/instance-action
```

Có kết quả → sắp bị thu hồi, cần drain và lưu việc đang làm.

Nguyên tắc dùng Spot an toàn:

- Kiến trúc **stateless**, checkpoint thường xuyên
- Khai **nhiều instance type và nhiều AZ** — càng đa dạng càng ít bị thu hồi
- Dùng `capacity-optimized` allocation strategy trong ASG
- Trộn On-Demand + Spot trong cùng ASG (đặt `OnDemandBaseCapacity` cho phần
  không được chết)

## Placement Groups

Điều khiển vị trí vật lý của instance:

| Loại | Cách đặt | Đánh đổi |
|---|---|---|
| **Cluster** | Cùng một rack | Mạng nhanh nhất (10 Gbps), nhưng **một rack chết là chết hết** |
| **Spread** | Mỗi instance một hardware riêng | An toàn nhất, tối đa 7 instance/AZ |
| **Partition** | Nhóm theo partition, mỗi partition rack riêng | Cho HDFS, Cassandra, Kafka |

`Cluster` cho HPC cần latency cực thấp. `Spread` cho vài instance quan trọng
không được chết cùng lúc. `Partition` cho hệ phân tán tự biết về topology.

## ENI — Elastic Network Interface

Card mạng ảo. Gắn/tháo được giữa các instance **trong cùng AZ** — dùng để
chuyển IP và MAC sang instance khác khi failover.

```bash
aws ec2 create-network-interface \
  --subnet-id subnet-xxx --groups sg-xxx \
  --description "failover eni"

aws ec2 attach-network-interface \
  --network-interface-id eni-xxx --instance-id i-xxx --device-index 1
```

Số ENI và số IP mỗi ENI **giới hạn theo instance type** — đây là chỗ hay chặn
khi chạy nhiều pod trên EKS (mỗi pod một IP từ ENI).

## Hibernate

Lưu RAM xuống EBS root volume, boot lại giữ nguyên trạng thái process:

- Root volume phải là EBS, **được mã hoá**, và đủ lớn chứa RAM
- Không quá 60 ngày
- Không dùng được với instance store hay một số instance type

Hữu ích cho dev machine có môi trường nặng, hoặc app khởi động lâu.

## Enhanced Networking

| Tính năng | Cho gì |
|---|---|
| **ENA** | Tới 100 Gbps. Mặc định trên instance đời mới |
| **EFA** | Bỏ qua kernel network stack — HPC, MPI, ML distributed |

EFA chỉ có tác dụng khi ứng dụng dùng libfabric; không phải cứ bật là nhanh hơn.

## Instance lifecycle

```
pending → running → stopping → stopped → terminated
                  ↘ shutting-down ↗
```

Điểm cần biết:

- **Stop** → không tính tiền compute, **vẫn tính tiền EBS**. Public IP đổi
- **Stop-Hibernate** → như trên, nhưng giữ RAM
- **Terminate** → xoá. Root volume mặc định bị xoá theo
  (`DeleteOnTermination = true`)
- **Reboot** → giữ nguyên public IP, không đổi host

Chống xoá nhầm:

```bash
aws ec2 modify-instance-attribute --instance-id i-xxx --disable-api-termination
```

Và giữ dữ liệu khi terminate:

```bash
aws ec2 modify-instance-attribute --instance-id i-xxx \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"DeleteOnTermination":false}}]'
```

Lưu ý mặt sau: volume không tự xoá sẽ thành **EBS mồ côi tốn tiền mãi** — nhớ
dọn.

## Lab

### Lab 1 — Spot với xử lý interruption

```bash
aws ec2 run-instances \
  --image-id $AMI --instance-type t3.micro \
  --instance-market-options 'MarketType=spot' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lab-spot}]'
```

Trên instance, chạy vòng lặp theo dõi:

```bash
while true; do
  TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  R=$(curl -s -o /dev/null -w "%{http_code}" -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/spot/instance-action)
  [ "$R" = "200" ] && echo "SẮP BỊ THU HỒI" && break
  sleep 5
done
```

So giá Spot với On-Demand:

```bash
aws ec2 describe-spot-price-history \
  --instance-types t3.micro --product-descriptions "Linux/UNIX" \
  --max-results 5 --query 'SpotPriceHistory[].[AvailabilityZone,SpotPrice]' --output table
```

### Lab 2 — Placement group

```bash
aws ec2 create-placement-group --group-name lab-spread --strategy spread

aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --count 3 --placement GroupName=lab-spread
```

Kiểm tra 3 instance nằm ở hardware khác nhau (khác AZ hoặc khác host).

### Lab 3 — ENI failover

Tạo ENI, gắn vào instance A, tháo ra, gắn sang instance B — quan sát private IP
đi theo ENI.

### Dọn dẹp

```bash
aws ec2 terminate-instances --instance-ids i-xxx i-yyy i-zzz
aws ec2 delete-placement-group --group-name lab-spread
aws ec2 delete-network-interface --network-interface-id eni-xxx
```

## Liên quan

- [EC2 — Cơ bản](./ec2-basic)
- [EC2 — HA & Scalability](./ec2-high-availability) — trộn Spot trong ASG
