# Route 53

DNS quản lý, kèm health check và các routing policy mà DNS thường không có.

## Loại record

| Record | Dùng cho |
|---|---|
| `A` / `AAAA` | Trỏ tới IPv4 / IPv6 |
| `CNAME` | Trỏ tên này sang tên khác — **không dùng được ở root domain** |
| **`Alias`** | Riêng của AWS: trỏ tới ALB, CloudFront, S3, API Gateway |
| `MX`, `TXT`, `NS`, `SRV`, `CAA` | Mail, xác thực, name server |

## Alias — dùng thay CNAME

Ba lý do Alias tốt hơn:

1. **Dùng được ở root domain** (`example.com`), CNAME thì không (chuẩn DNS cấm)
2. **Miễn phí** — query alias tới tài nguyên AWS không tính tiền
3. Tự cập nhật khi IP của tài nguyên đổi

```bash
aws route53 change-resource-record-sets --hosted-zone-id Z123 \
  --change-batch '{
    "Changes":[{
      "Action":"UPSERT",
      "ResourceRecordSet":{
        "Name":"example.com",
        "Type":"A",
        "AliasTarget":{
          "HostedZoneId":"Z1LZHHVLTUM8OW",
          "DNSName":"lab-alb-123.ap-southeast-1.elb.amazonaws.com",
          "EvaluateTargetHealth":true
        }
      }
    }]
  }'
```

`HostedZoneId` trong `AliasTarget` là ID **của loại tài nguyên đích**, không phải
zone của bạn — mỗi region/service có một giá trị riêng. Lấy bằng:

```bash
aws elbv2 describe-load-balancers --names lab-alb \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text
```

CloudFront luôn là `Z2FDTNDATAQYW2`.

## Routing policies

| Policy | Cách chọn | Dùng cho |
|---|---|---|
| **Simple** | Một đích | Cơ bản |
| **Weighted** | Theo tỉ lệ | **Canary, blue/green, A/B** |
| **Latency** | Region cho latency thấp nhất | Đa region |
| **Failover** | Primary, chuyển sang secondary khi unhealthy | DR active-passive |
| **Geolocation** | Theo quốc gia người dùng | Nội dung theo vùng, tuân thủ |
| **Geoproximity** | Theo khoảng cách, có bias điều chỉnh được | Tinh chỉnh phân bố |
| **Multivalue** | Trả nhiều IP khoẻ, client tự chọn | Load balancing đơn giản |

### Weighted — canary deployment

```bash
# 90% sang v1
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch '{
 "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
   "Name":"api.example.com","Type":"A","SetIdentifier":"v1","Weight":90,
   "AliasTarget":{"HostedZoneId":"Z1LZ...","DNSName":"alb-v1...","EvaluateTargetHealth":true}
 }}]}'

# 10% sang v2 — tăng dần nếu ổn
```

Trọng số `0` là cách tắt một đích mà không xoá record.

Lưu ý: DNS có **TTL và cache ở client**, nên đổi trọng số không có hiệu lực
ngay. Canary chính xác hơn thì làm ở tầng
[ALB](./ec2-high-availability#alb--routing) (weighted target group).

### Geolocation vs Latency

Hai cái hay bị lẫn:

- **Latency** — chọn theo *đo lường độ trễ*, để nhanh nhất
- **Geolocation** — chọn theo *vị trí người dùng*, để đúng nội dung/pháp lý

Người dùng ở Việt Nam có thể được latency-routing đưa sang Singapore (nhanh
nhất), còn geolocation sẽ đưa về đúng endpoint dành cho Việt Nam.

Geolocation nên **luôn có record `Default`** cho trường hợp không xác định được
vị trí — không có thì query đó không trả về gì.

## Health check

```bash
aws route53 create-health-check --caller-reference $(date +%s) \
  --health-check-config '{
    "Type":"HTTPS","FullyQualifiedDomainName":"api.example.com",
    "ResourcePath":"/health","RequestInterval":30,"FailureThreshold":3
  }'
```

Ba loại:

1. **Endpoint** — kiểm tra HTTP/TCP tới một địa chỉ
2. **Calculated** — kết hợp nhiều health check con (AND/OR)
3. **CloudWatch alarm** — dựa trên metric, dùng cho endpoint private

Health check của Route 53 gọi từ **ngoài Internet** — endpoint private phải dùng
loại (3).

Kết hợp failover:

```bash
# Primary
"SetIdentifier":"primary","Failover":"PRIMARY","HealthCheckId":"hc-xxx"
# Secondary
"SetIdentifier":"secondary","Failover":"SECONDARY"
```

## Hosted zone: public vs private

- **Public** — phân giải từ Internet
- **Private** — chỉ trong VPC được gắn. Dùng cho tên nội bộ
  (`db.internal`)

```bash
aws route53 create-hosted-zone --name internal.local \
  --caller-reference $(date +%s) \
  --vpc VPCRegion=ap-southeast-1,VPCId=vpc-xxx \
  --hosted-zone-config PrivateZone=true
```

VPC cần `enableDnsHostnames` và `enableDnsSupport` bật, không thì private zone
không hoạt động.

## Đăng ký và chuyển domain

Route 53 đăng ký được domain, nhưng domain ở nhà cung cấp khác vẫn dùng được:
chỉ cần trỏ **NS record** về name server của hosted zone.

```bash
aws route53 get-hosted-zone --id Z123 --query 'DelegationSet.NameServers'
```

Đây là bước hay bị quên — tạo hosted zone mà không đổi NS ở nơi đăng ký thì
không có gì hoạt động.

## Lab

### Lab 1 — Private hosted zone

Không cần mua domain:

```bash
Z=$(aws route53 create-hosted-zone --name lab.internal \
  --caller-reference $(date +%s) \
  --vpc VPCRegion=ap-southeast-1,VPCId=vpc-xxx \
  --hosted-zone-config PrivateZone=true \
  --query 'HostedZone.Id' --output text | cut -d/ -f3)

aws route53 change-resource-record-sets --hosted-zone-id $Z --change-batch '{
 "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
   "Name":"web.lab.internal","Type":"A","TTL":60,
   "ResourceRecords":[{"Value":"10.0.1.100"}]}}]}'
```

Từ EC2 trong VPC đó:

```bash
dig +short web.lab.internal      # 10.0.1.100
```

Từ ngoài VPC → không phân giải được. Đó là điểm của private zone.

### Lab 2 — Weighted routing

Tạo 2 record cùng tên, weight 50/50, trỏ 2 IP khác nhau:

```bash
for i in 1 2; do
  aws route53 change-resource-record-sets --hosted-zone-id $Z --change-batch '{
   "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
     "Name":"app.lab.internal","Type":"A","TTL":10,
     "SetIdentifier":"v'$i'","Weight":50,
     "ResourceRecords":[{"Value":"10.0.1.'$((100+i))'"}]}}]}'
done
```

Từ EC2, query nhiều lần và đếm phân bố:

```bash
for i in $(seq 1 40); do dig +short app.lab.internal; sleep 1; done | sort | uniq -c
```

TTL 10s để thấy đổi nhanh — production đừng để TTL thấp thế (tốn query).

### Lab 3 — Health check + failover

Tạo health check trỏ tới một endpoint public thật, tắt endpoint đó và quan sát
trạng thái đổi:

```bash
aws route53 get-health-check-status --health-check-id hc-xxx \
  --query 'HealthCheckObservations[].StatusReport.Status'
```

### Dọn dẹp

```bash
# Phải xoá hết record (trừ NS, SOA) trước khi xoá zone
aws route53 delete-hosted-zone --id $Z
aws route53 delete-health-check --health-check-id hc-xxx
```

Hosted zone tính **$0.50/tháng** — nhớ xoá.

## Liên quan

- [EC2 — HA](./ec2-high-availability) — alias tới ALB
- [CloudFront](./cloudfront)
- [Classic Solutions Architecture](./classic-architecture)
