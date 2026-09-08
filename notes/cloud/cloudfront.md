# CloudFront & Global Accelerator

Hai service đều đưa traffic vào mạng biên của AWS, nhưng cho hai bài toán khác
nhau.

| | CloudFront | Global Accelerator |
|---|---|---|
| Tầng | 7 (HTTP/HTTPS) | 4 (TCP/UDP) |
| **Cache** | **Có** | Không |
| IP | DNS thay đổi | **2 IP tĩnh anycast** |
| Dùng cho | Web, API, static asset, video | Game, IoT, VoIP, non-HTTP |

Chọn nhanh: nội dung HTTP cache được → **CloudFront**. Cần IP tĩnh hoặc giao
thức không phải HTTP → **Global Accelerator**.

## CloudFront — vì sao dùng

1. **Latency** — phục vụ từ edge gần người dùng
2. **Chi phí** — giá egress của CloudFront thấp hơn
   [S3](./s3-introduction#chi-phí)/EC2, và cache giảm số request về origin
3. **Bảo mật** — origin không cần public; có WAF, DDoS protection (Shield
   Standard miễn phí)
4. **HTTPS + domain riêng** miễn phí qua ACM

Với static website trên S3, CloudFront giải quyết luôn việc S3 website endpoint
không có HTTPS.

## Origin Access Control

Cách đúng để CloudFront đọc S3 bucket **private**:

```bash
OAC=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name":"s3-oac","OriginAccessControlOriginType":"s3",
    "SigningBehavior":"always","SigningProtocol":"sigv4"
  }' --query 'OriginAccessControl.Id' --output text)
```

Bucket policy chỉ cho CloudFront distribution đó:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/E1234ABCD"
      }
    }
  }]
}
```

Bucket vẫn hoàn toàn private — không cần Block Public Access tắt, không cần
website hosting. **OAC thay thế OAI** (đời cũ); hệ mới luôn dùng OAC.

## Cache behavior

Cấu hình quan trọng nhất và cũng dễ sai nhất:

| Thiết lập | Ý nghĩa |
|---|---|
| **Path pattern** | `/api/*`, `/static/*` — khớp theo thứ tự, cụ thể trước |
| **Cache policy** | Cái gì tham gia cache key (header, cookie, query string) |
| **Origin request policy** | Cái gì được chuyển tiếp về origin |
| **TTL** | Min / Default / Max |

Nguyên tắc: **cache key càng nhiều thành phần, hit rate càng thấp**. Forward
toàn bộ header và cookie thì gần như mỗi request là một cache miss — CloudFront
lúc đó chỉ là proxy tốn tiền.

Cấu hình thường dùng:

- `/static/*`, `/assets/*` → cache lâu (1 năm), không forward cookie
- `/api/*` → `CachingDisabled`, forward hết header cần thiết
- `/` (default) → cache ngắn, forward tối thiểu

Managed policy có sẵn, nên dùng thay vì tự tạo:

```bash
aws cloudfront list-cache-policies --type managed \
  --query 'CachePolicyList.Items[].CachePolicy.[Id,CachePolicyConfig.Name]' --output table
```

- `CachingOptimized` — static asset
- `CachingDisabled` — API
- `CachingOptimizedForUncompressedObjects`

## Cache versioning thay vì invalidation

```bash
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

Invalidation **tốn tiền** sau 1000 path/tháng và mất vài phút. Cách tốt hơn là
**đổi tên file** khi nội dung đổi:

```
/static/app.a1b2c3d4.js     ← hash trong tên
```

Rồi cache 1 năm với `immutable`. Deploy mới sinh tên mới, không cần invalidate
gì. Đây là cách mọi build tool hiện đại (Vite, webpack) làm sẵn.

Chỉ `index.html` cần TTL ngắn.

## Signed URL và Signed Cookie

Cho nội dung trả phí:

- **Signed URL** — một file (video, PDF)
- **Signed Cookie** — nhiều file (cả thư viện phim)

Khác với [presigned URL của S3](./s3-introduction#presigned-url): CloudFront
signed URL đi qua edge nên có cache và bảo vệ origin.

## Lambda@Edge và CloudFront Functions

| | CloudFront Functions | Lambda@Edge |
|---|---|---|
| Thời gian chạy | < 1ms | tới 5–30s |
| Ngôn ngữ | JavaScript (hạn chế) | Node.js, Python |
| Gọi network được | Không | Có |
| Giá | Rất rẻ | Đắt hơn ~6× |
| Dùng cho | Rewrite URL, thêm header, A/B | Auth, gọi API, xử lý ảnh |

Việc đơn giản (redirect, header) → **Functions**. Cần logic thật → Lambda@Edge.

Ví dụ Functions thêm security header:

```js
function handler(event) {
  var res = event.response;
  res.headers['strict-transport-security'] = { value: 'max-age=63072000' };
  res.headers['x-content-type-options'] = { value: 'nosniff' };
  return res;
}
```

## Price class

```
PriceClass_All  — mọi edge, nhanh nhất, đắt nhất
PriceClass_200  — bỏ Nam Mỹ, New Zealand
PriceClass_100  — chỉ US, Canada, Europe
```

Người dùng chủ yếu ở Việt Nam thì `PriceClass_200` (có châu Á) là hợp lý —
`PriceClass_100` sẽ **chậm hơn** vì bỏ edge châu Á.

## Global Accelerator

```bash
aws globalaccelerator create-accelerator --name lab-ga --ip-address-type IPV4
```

Cho 2 IP tĩnh anycast, traffic vào edge gần nhất rồi đi mạng nội bộ AWS tới
endpoint. Lợi ích:

- **IP tĩnh** — tiện cho client cần whitelist IP
- **Failover nhanh** (giây) giữa các region
- Bỏ qua Internet công cộng → jitter thấp hơn

Dùng khi: game server, VoIP, hoặc cần failover đa region cho non-HTTP.

## Lab

### Lab 1 — S3 private + CloudFront OAC

```bash
B=lab-cf-$(date +%s)
aws s3 mb s3://$B
echo "<h1>Hello CloudFront</h1>" > index.html
aws s3 cp index.html s3://$B/index.html

# Bucket VẪN private — không bật website hosting
aws s3api get-public-access-block --bucket $B
```

Tạo distribution qua console (nhanh hơn CLI cho bước này): origin là bucket,
chọn "Origin access control settings", để console tự sinh bucket policy.

```bash
# Kiểm tra
curl -I https://<dist>.cloudfront.net/index.html      # 200
curl -I https://$B.s3.ap-southeast-1.amazonaws.com/index.html  # 403
```

Đúng như mong muốn: chỉ vào được qua CloudFront.

### Lab 2 — Quan sát cache

```bash
for i in 1 2 3; do
  curl -sI https://<dist>.cloudfront.net/index.html | grep -i x-cache
done
```

Lần đầu `Miss from cloudfront`, sau đó `Hit from cloudfront`.

Đổi file rồi kiểm tra vẫn thấy bản cũ (còn TTL), sau đó invalidate:

```bash
aws s3 cp index.html s3://$B/index.html
curl -s https://<dist>.cloudfront.net/index.html      # vẫn bản cũ

aws cloudfront create-invalidation --distribution-id E123 --paths "/index.html"
sleep 60
curl -s https://<dist>.cloudfront.net/index.html      # bản mới
```

### Lab 3 — CloudFront Functions

Tạo function thêm header như ví dụ trên, associate vào viewer response, rồi:

```bash
curl -sI https://<dist>.cloudfront.net/ | grep -i strict-transport
```

### Dọn dẹp

Distribution phải **disable** rồi mới xoá được, và mất ~15 phút:

```bash
# Console: Disable → đợi → Delete
aws s3 rm s3://$B --recursive && aws s3 rb s3://$B
```

## Liên quan

- [S3 — Bảo mật](./s3-security) — bucket policy cho OAC
- [Route 53](./route53) — alias record trỏ tới distribution
- [Serverless Architectures](./serverless-architectures)
