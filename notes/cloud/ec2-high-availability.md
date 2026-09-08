# EC2 — HA & Scalability

Làm hệ thống chịu được việc mất một instance hoặc cả một AZ, và tự co giãn theo
tải. Hai thành phần: **Load Balancer** phân phối traffic, **Auto Scaling Group**
quản lý số lượng instance.

## Phân biệt hai khái niệm

- **High Availability** — chịu lỗi. Chạy ở **nhiều AZ**
- **Scalability** — chịu tải. Thêm instance (ngang) hoặc instance to hơn (dọc)

Đa số hệ thống cần cả hai, và cả hai đều đạt được bằng ASG + ELB trải trên
nhiều AZ.

## Load Balancer — chọn loại nào

| | ALB | NLB | GWLB |
|---|---|---|---|
| Tầng | 7 (HTTP/HTTPS) | 4 (TCP/UDP/TLS) | 3 |
| Định tuyến theo | Path, host, header, query | Chỉ port | — |
| Hiệu năng | Cao | **Cực cao, latency thấp** | — |
| IP tĩnh | Không (dùng DNS) | **Có, 1 IP/AZ** | — |
| WebSocket / HTTP2 | Có | Pass-through | — |
| Dùng cho | Web app, microservice, container | Game, IoT, cần IP tĩnh | Firewall ảo |

Chọn nhanh: HTTP → **ALB**. Cần IP tĩnh, TCP thuần, hoặc throughput cực cao →
**NLB**.

(Classic Load Balancer là đời cũ, không nên dùng cho hệ mới.)

## ALB — routing

```bash
# Target group
TG=$(aws elbv2 create-target-group --name lab-tg \
  --protocol HTTP --port 80 --vpc-id vpc-xxx \
  --health-check-path /health \
  --health-check-interval-seconds 15 \
  --healthy-threshold-count 2 --unhealthy-threshold-count 2 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# ALB — cần ít nhất 2 subnet ở 2 AZ khác nhau
ALB=$(aws elbv2 create-load-balancer --name lab-alb \
  --subnets subnet-a subnet-b --security-groups sg-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

aws elbv2 create-listener --load-balancer-arn $ALB \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG
```

Định tuyến theo path:

```bash
aws elbv2 create-rule --listener-arn $LISTENER --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$TG_API
```

ALB **bắt buộc ≥ 2 subnet ở 2 AZ** — đây là lỗi hay gặp khi tạo lần đầu.

## Health check — chỗ quyết định

Health check sai làm ASG rơi vào vòng lặp giết instance khoẻ. Nguyên tắc:

- Endpoint `/health` phải **nhẹ**, không gọi database hay service ngoài
- Nếu health check phụ thuộc database, database chậm sẽ làm **toàn bộ** instance
  bị đánh dấu unhealthy cùng lúc → mất cả service
- Đặt `HealthCheckGracePeriod` dài hơn thời gian boot + warmup thật của app

```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name lab-asg \
  --health-check-type ELB \
  --health-check-grace-period 300
```

`--health-check-type ELB` (thay vì `EC2`) mới bắt được trường hợp instance sống
nhưng app chết.

## Sticky session

```bash
aws elbv2 modify-target-group-attributes --target-group-arn $TG \
  --attributes Key=stickiness.enabled,Value=true \
               Key=stickiness.type,Value=lb_cookie \
               Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

Sticky session làm phân phối tải lệch và cản scale-in. Giải pháp tốt hơn là để
app **stateless** — session lưu ở [ElastiCache](./rds-aurora-elasticache) hoặc
[DynamoDB](./serverless-dynamodb).

## Connection draining

```bash
aws elbv2 modify-target-group-attributes --target-group-arn $TG \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30
```

Thời gian ALB chờ request đang chạy hoàn tất trước khi bỏ instance ra. Mặc định
300s — quá dài, làm deploy chậm. Đặt bằng thời gian request dài nhất + biên
(thường 30–60s).

## Auto Scaling Group

```bash
# Launch template
aws ec2 create-launch-template --launch-template-name lab-lt \
  --launch-template-data '{
    "ImageId":"ami-xxx","InstanceType":"t3.micro",
    "SecurityGroupIds":["sg-web"],
    "IamInstanceProfile":{"Name":"EC2S3ReadOnly"},
    "UserData":"'"$(base64 -w0 ud.sh)"'"
  }'

aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name lab-asg \
  --launch-template LaunchTemplateName=lab-lt,Version='$Latest' \
  --min-size 2 --max-size 6 --desired-capacity 2 \
  --vpc-zone-identifier "subnet-a,subnet-b" \
  --target-group-arns $TG \
  --health-check-type ELB --health-check-grace-period 300
```

`min-size 2` trải trên 2 AZ là mức tối thiểu để chịu được mất một AZ.

Dùng **Launch Template**, không dùng Launch Configuration (đời cũ, đã ngừng phát
triển và không hỗ trợ Spot mix).

## Scaling policy

### Target tracking — nên dùng mặc định

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name lab-asg \
  --policy-name cpu-50 --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "TargetValue": 50.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType":"ASGAverageCPUUtilization"}
  }'
```

AWS tự tính cần thêm/bớt bao nhiêu. Đơn giản và đủ tốt cho hầu hết trường hợp.

Metric tốt hơn CPU cho web app là **số request mỗi instance**:

```json
{"PredefinedMetricType": "ALBRequestCountPerTarget",
 "ResourceLabel": "app/lab-alb/xxx/targetgroup/lab-tg/yyy"}
```

### Các loại khác

| Loại | Khi nào |
|---|---|
| **Target tracking** | Mặc định — giữ một metric ở mức mong muốn |
| **Step scaling** | Cần phản ứng khác nhau theo mức độ vượt ngưỡng |
| **Scheduled** | Tải theo giờ biết trước (giờ hành chính, flash sale) |
| **Predictive** | ML dự đoán theo lịch sử, scale **trước** khi tải đến |

## Trộn On-Demand và Spot

Cách giảm chi phí lớn nhất cho ASG:

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name lab-mixed \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {"LaunchTemplateName":"lab-lt","Version":"$Latest"},
      "Overrides":[{"InstanceType":"t3.micro"},{"InstanceType":"t3a.micro"},{"InstanceType":"t3.small"}]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 25,
      "SpotAllocationStrategy": "capacity-optimized"
    }
  }' \
  --min-size 2 --max-size 10 --vpc-zone-identifier "subnet-a,subnet-b"
```

Nghĩa là: 2 instance đầu luôn On-Demand (nền đảm bảo), phần vượt lên thì 25%
On-Demand + 75% Spot. Khai nhiều instance type để Spot ít bị thu hồi.

## Lifecycle hook

Chạy việc gì đó trước khi instance vào/ra khỏi service:

```bash
aws autoscaling put-lifecycle-hook \
  --auto-scaling-group-name lab-asg \
  --lifecycle-hook-name drain \
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
  --heartbeat-timeout 300
```

Dùng để: đăng ký service discovery, warm cache, hoặc upload log trước khi
instance bị xoá.

## Termination policy

Khi scale in, ASG chọn instance nào để xoá:

```
OldestInstance → NewestInstance → OldestLaunchTemplate
→ ClosestToNextInstanceHour → Default
```

Mặc định ưu tiên cân bằng AZ trước, rồi launch template cũ nhất. Muốn bảo vệ
một instance cụ thể:

```bash
aws autoscaling set-instance-protection \
  --auto-scaling-group-name lab-asg --instance-ids i-xxx \
  --protected-from-scale-in
```

## Lab

### Lab 1 — ALB + ASG hai AZ

Dựng đầy đủ theo các lệnh trên, rồi:

```bash
# Lấy DNS của ALB
aws elbv2 describe-load-balancers --names lab-alb \
  --query 'LoadBalancers[0].DNSName' --output text
```

Gọi nhiều lần, quan sát AZ trong response đổi qua lại (user data ở
[EC2 cơ bản](./ec2-basic#lab) in ra AZ).

### Lab 2 — Giết instance, xem ASG tự thay

```bash
aws ec2 terminate-instances --instance-ids i-xxx
watch -n 5 "aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-name lab-asg \
  --query 'AutoScalingGroups[0].Instances[].[InstanceId,LifecycleState,HealthStatus]' \
  --output table"
```

### Lab 3 — Scale theo tải thật

```bash
# Trên một instance
stress-ng --cpu 2 --timeout 600s

# Hoặc bắn tải từ ngoài
ab -n 200000 -c 100 http://<alb-dns>/
```

Quan sát ASG tăng số instance, rồi giảm lại sau khi hết tải. Xem lịch sử:

```bash
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name lab-asg \
  --query 'Activities[].[StartTime,Description,StatusCode]' --output table
```

### Lab 4 — Health check sai gây vòng lặp

Đổi `--health-check-path` sang một path không tồn tại (`/nope`) và quan sát ASG
liên tục giết rồi tạo instance mới. Đây là sự cố production rất thật — sửa lại
sau khi quan sát xong.

### Dọn dẹp

Thứ tự quan trọng — ASG trước, ALB sau:

```bash
aws autoscaling update-auto-scaling-group --auto-scaling-group-name lab-asg \
  --min-size 0 --desired-capacity 0
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name lab-asg --force-delete
aws elbv2 delete-load-balancer --load-balancer-arn $ALB
aws elbv2 delete-target-group --target-group-arn $TG
aws ec2 delete-launch-template --launch-template-name lab-lt
```

ALB tính tiền theo giờ **kể cả không có traffic** — đừng để quên.

## Liên quan

- [EC2 — Nâng cao](./ec2-associate) — Spot
- [Route 53](./route53) — alias record trỏ tới ALB
- [Classic Solutions Architecture](./classic-architecture)
