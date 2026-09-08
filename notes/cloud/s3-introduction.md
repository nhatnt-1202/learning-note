# S3 — Giới thiệu

Object storage: lưu file (object) trong bucket, truy cập qua HTTP API. Không
phải file system — không có thư mục thật, không sửa được một phần file.

## Bucket và object

- **Tên bucket toàn cầu duy nhất** — trùng với bucket của người khác cũng không
  tạo được
- Bucket thuộc **một region** (dữ liệu không tự rời region đó)
- Object tối đa **5TB**; trên 5GB **phải** dùng multipart upload
- **Không có thư mục.** `photos/2026/a.jpg` chỉ là một key có dấu `/`. Console
  hiển thị như folder cho dễ nhìn

Hệ quả của việc không có thư mục: "đổi tên folder" nghĩa là copy + delete từng
object. Với hàng triệu object, đó là việc lớn.

```bash
aws s3 mb s3://my-unique-bucket-name --region ap-southeast-1
aws s3 cp file.txt s3://my-bucket/path/file.txt
aws s3 ls s3://my-bucket/path/ --recursive --human-readable --summarize
aws s3 sync ./local s3://my-bucket/backup/ --delete
```

`aws s3 sync` là lệnh hay dùng nhất — nó chỉ truyền file thay đổi. Cẩn thận với
`--delete`: nó xoá ở đích những gì không còn ở nguồn.

## Storage class

| Class | Giá lưu | Phí truy cập | Thời gian lấy | Dùng cho |
|---|---|---|---|---|
| **Standard** | Cao nhất | Không | Ngay | Dữ liệu nóng |
| **Intelligent-Tiering** | Standard + phí monitor | Không | Ngay | **Không rõ pattern truy cập** |
| Standard-IA | ~45% rẻ hơn | Có | Ngay | Backup, truy cập tháng/lần |
| One Zone-IA | Rẻ hơn IA 20% | Có | Ngay | Dữ liệu tạo lại được (1 AZ) |
| Glacier Instant Retrieval | Rẻ | Có | Ngay | Archive nhưng cần lấy nhanh |
| Glacier Flexible Retrieval | Rẻ hơn | Có | 1 phút – 12 giờ | Archive |
| **Glacier Deep Archive** | **Rẻ nhất** | Có | 12–48 giờ | Lưu trữ pháp lý, 7–10 năm |

Hai điều dễ mắc bẫy:

1. **Minimum storage duration** — IA tính tối thiểu 30 ngày, Glacier 90 ngày,
   Deep Archive 180 ngày. Xoá sớm vẫn bị tính đủ. Chuyển file "nóng lên rồi
   nguội đi" liên tục có thể **đắt hơn** để nguyên Standard
2. **Phí retrieval** — Deep Archive lưu rẻ nhưng lấy ra đắt. Tính cả chi phí đọc
   khi chọn class

`Intelligent-Tiering` giải quyết việc đoán sai: AWS tự chuyển tầng theo truy cập
thực tế, chỉ tốn phí monitor nhỏ. Đây là lựa chọn mặc định tốt khi không chắc.

```bash
aws s3 cp big.zip s3://my-bucket/ --storage-class INTELLIGENT_TIERING
```

## Versioning

```bash
aws s3api put-bucket-versioning --bucket my-bucket \
  --versioning-configuration Status=Enabled
```

Bật rồi thì:

- Ghi đè **không mất** bản cũ
- `DELETE` chỉ tạo **delete marker**, object vẫn còn
- **Không tắt được**, chỉ `Suspended` — và bản đã có version vẫn giữ version

Điểm hay bị bất ngờ: **hoá đơn tăng** vì mọi bản cũ đều được tính tiền. Luôn
kèm [lifecycle rule](./s3-advanced) xoá version cũ sau N ngày.

Khôi phục file đã xoá = xoá delete marker:

```bash
aws s3api list-object-versions --bucket my-bucket --prefix path/file.txt
aws s3api delete-object --bucket my-bucket --key path/file.txt --version-id <id>
```

## Consistency

S3 có **strong read-after-write consistency** cho mọi thao tác từ 2020 — ghi
xong đọc ra ngay là bản mới. Không cần workaround như trước nữa.

Nhưng `ListObjects` sau khi ghi hàng loạt vẫn có thể chậm phản ánh trong một số
trường hợp — đừng dùng list làm cơ chế đồng bộ.

## Static website hosting

```bash
aws s3 website s3://my-bucket/ --index-document index.html --error-document error.html
```

Endpoint: `http://my-bucket.s3-website-<region>.amazonaws.com`

Chỉ HTTP, không HTTPS. Cần HTTPS và domain riêng thì đặt
[CloudFront](./cloudfront) phía trước — và khi đó **không** cần bật website
hosting hay public bucket, dùng OAC là đủ.

## Presigned URL

Cho phép truy cập tạm thời object private mà không cần cấp IAM:

```bash
aws s3 presign s3://my-bucket/private.pdf --expires-in 3600
```

Đây là cách đúng để cho người dùng tải/upload file: không mở bucket public, không
proxy file qua server của mình.

Presigned URL cho **upload** (dùng từ backend):

```python
import boto3
s3 = boto3.client('s3')
url = s3.generate_presigned_url('put_object',
    Params={'Bucket': 'my-bucket', 'Key': 'uploads/f.jpg'}, ExpiresIn=900)
```

URL mang quyền của **người tạo ra nó** — nên role sinh URL phải có đúng quyền
tối thiểu.

## Chi phí

Bốn thành phần, và người ta thường chỉ nhớ cái đầu:

1. **Lưu trữ** — $/GB/tháng theo class
2. **Request** — PUT/GET tính theo 1000 request
3. **Data transfer OUT ra Internet** — thường là khoản lớn nhất
4. Phí retrieval, phí chuyển tầng, phí monitor

Transfer **vào** S3 miễn phí. Transfer **ra** đắt — đó là lý do đặt
[CloudFront](./cloudfront) phía trước giúp giảm tiền, vì giá egress của
CloudFront thấp hơn và có cache.

Xem dung lượng thật:

```bash
aws s3 ls s3://my-bucket --recursive --summarize | tail -2

# Hoặc từ CloudWatch (không phải quét cả bucket)
aws cloudwatch get-metric-statistics --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=my-bucket Name=StorageType,Value=StandardStorage \
  --start-time 2026-09-01T00:00:00Z --end-time 2026-09-08T00:00:00Z \
  --period 86400 --statistics Average
```

## Lab

### Lab 1 — Bucket cơ bản

```bash
B=lab-s3-$(date +%s)-$RANDOM
aws s3 mb s3://$B --region ap-southeast-1

echo "v1" > f.txt
aws s3 cp f.txt s3://$B/f.txt
aws s3 ls s3://$B/
aws s3 cp s3://$B/f.txt -    # in ra stdout
```

### Lab 2 — Versioning và khôi phục

```bash
aws s3api put-bucket-versioning --bucket $B \
  --versioning-configuration Status=Enabled

echo "v2" > f.txt && aws s3 cp f.txt s3://$B/f.txt
echo "v3" > f.txt && aws s3 cp f.txt s3://$B/f.txt

aws s3api list-object-versions --bucket $B --prefix f.txt \
  --query 'Versions[].[VersionId,LastModified,Size]' --output table

# Xoá → chỉ tạo delete marker
aws s3 rm s3://$B/f.txt
aws s3 ls s3://$B/                                  # không thấy
aws s3api list-object-versions --bucket $B --prefix f.txt   # vẫn còn

# Khôi phục
MARKER=$(aws s3api list-object-versions --bucket $B --prefix f.txt \
  --query 'DeleteMarkers[0].VersionId' --output text)
aws s3api delete-object --bucket $B --key f.txt --version-id $MARKER
aws s3 cp s3://$B/f.txt -     # đã về
```

### Lab 3 — Presigned URL

```bash
aws s3 presign s3://$B/f.txt --expires-in 60
```

Mở link trên browser → tải được. Đợi hơn 60 giây, thử lại → hết hạn.

### Lab 4 — So storage class

```bash
dd if=/dev/urandom of=big bs=1M count=50
aws s3 cp big s3://$B/std   --storage-class STANDARD
aws s3 cp big s3://$B/ia    --storage-class STANDARD_IA
aws s3 cp big s3://$B/glac  --storage-class GLACIER

aws s3api list-objects-v2 --bucket $B \
  --query 'Contents[].[Key,StorageClass,Size]' --output table

# Object Glacier không đọc trực tiếp được
aws s3 cp s3://$B/glac ./x    # lỗi InvalidObjectState

# Phải restore trước
aws s3api restore-object --bucket $B --key glac \
  --restore-request Days=1,GlacierJobParameters={Tier=Expedited}
```

### Dọn dẹp

Bucket có versioning cần xoá **mọi version** mới rỗng được:

```bash
aws s3api delete-objects --bucket $B --delete "$(aws s3api list-object-versions \
  --bucket $B --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
  --output json)" 2>/dev/null

aws s3api delete-objects --bucket $B --delete "$(aws s3api list-object-versions \
  --bucket $B --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
  --output json)" 2>/dev/null

aws s3 rb s3://$B
```

## Liên quan

- [S3 — Nâng cao](./s3-advanced) — lifecycle, replication
- [S3 — Bảo mật](./s3-security) — policy, mã hoá
- [CloudFront](./cloudfront)
