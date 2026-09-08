# AWS Storage Extras

Các service phục vụ việc **di chuyển** và **kết nối** dữ liệu giữa on-premise và
AWS.

## Bảng chọn nhanh

| Nhu cầu | Service |
|---|---|
| Chuyển vài TB qua mạng, có lịch, đồng bộ liên tục | **DataSync** |
| Chuyển hàng chục TB–PB, mạng không đủ | **Snowball / Snowmobile** |
| On-premise dùng S3/EBS như đĩa local | **Storage Gateway** |
| Windows file share (SMB, AD) | **FSx for Windows** |
| HPC/ML cần file system nhanh trên dữ liệu S3 | **FSx for Lustre** |
| Backup tập trung nhiều service | **AWS Backup** |

## Quy tắc quyết định: mạng hay thiết bị

Tính thời gian truyền trước khi chọn:

```
Thời gian (giờ) ≈ Dung lượng (GB) × 8 / (Băng thông Mbps × 0.7) / 3600
```

10TB qua đường 100 Mbps ≈ **13 ngày**. Cùng lượng đó qua Snowball ≈ **1 tuần**
kể cả thời gian vận chuyển, và không chiếm băng thông.

Ngưỡng thực dụng: **trên ~10TB hoặc mạng dưới 100 Mbps** thì cân nhắc Snow
Family.

## Snow Family

| Thiết bị | Dung lượng | Đặc điểm |
|---|---|---|
| **Snowcone** | 8–14TB | Nhỏ, chịu được môi trường khắc nghiệt |
| **Snowball Edge Storage Optimized** | ~80TB | Phổ biến nhất |
| **Snowball Edge Compute Optimized** | ~42TB | Có GPU, chạy EC2/Lambda tại chỗ |
| **Snowmobile** | 100PB | Xe container |

Snowball Edge còn dùng cho **edge computing** — chạy xử lý tại nơi không có
mạng (tàu biển, mỏ, nhà máy) rồi mang dữ liệu về.

Dữ liệu được mã hoá bằng KMS, thiết bị bị wipe sau khi nhập.

## Storage Gateway

Cho hệ thống on-premise dùng storage AWS qua giao thức quen thuộc:

| Loại | Giao thức | Dữ liệu nằm ở |
|---|---|---|
| **S3 File Gateway** | NFS, SMB | S3 (cache local) |
| **FSx File Gateway** | SMB | FSx for Windows |
| **Volume Gateway — Cached** | iSCSI | S3, cache local phần nóng |
| **Volume Gateway — Stored** | iSCSI | Local, backup sang S3 |
| **Tape Gateway** | iSCSI VTL | S3/Glacier — thay thư viện băng từ |

**Tape Gateway** đáng nhớ: nó giả lập thư viện băng từ nên software backup cũ
(Veeam, NetBackup) dùng được S3 mà không phải sửa gì.

Phân biệt Cached vs Stored: **Cached** = dữ liệu chính ở S3 (tiết kiệm đĩa
local); **Stored** = dữ liệu chính ở local (truy cập nhanh, S3 chỉ để backup).

## DataSync

Đồng bộ có lịch, tự xác minh toàn vẹn, chuyển được cả metadata:

```bash
aws datasync create-location-nfs \
  --server-hostname 10.0.0.10 --subdirectory /export/data \
  --on-prem-config AgentArns=arn:aws:datasync:...:agent/agent-xxx

aws datasync create-location-s3 \
  --s3-bucket-arn arn:aws:s3:::my-bucket \
  --s3-config BucketAccessRoleArn=arn:aws:iam::...:role/datasync

aws datasync create-task \
  --source-location-arn <nfs> --destination-location-arn <s3> \
  --options VerifyMode=POINT_IN_TIME_CONSISTENT,PreserveDeletedFiles=REMOVE
```

Khác `aws s3 sync`: DataSync giữ metadata POSIX (owner, permission, timestamp),
tự retry, chạy song song nhiều luồng và báo cáo chi tiết. Với việc di chuyển
dữ liệu thật thì tin cậy hơn nhiều.

Chuyển được cả hai chiều, và cả S3 ↔ EFS ↔ FSx.

## AWS Backup

Quản lý backup tập trung cho EBS, RDS, DynamoDB, EFS, FSx, S3, EC2:

```bash
aws backup create-backup-plan --backup-plan '{
  "BackupPlanName": "daily-35d",
  "Rules": [{
    "RuleName": "daily",
    "TargetBackupVaultName": "Default",
    "ScheduleExpression": "cron(0 17 * * ? *)",
    "Lifecycle": { "DeleteAfterDays": 35 },
    "CopyActions": [{
      "DestinationBackupVaultArn": "arn:aws:backup:us-east-1:111122223333:backup-vault:dr"
    }]
  }]
}'
```

Ưu điểm so với tự viết script snapshot: một chỗ quản lý mọi service, có
cross-region copy, có **Backup Vault Lock** (WORM — chống xoá backup, kể cả bởi
kẻ tấn công có quyền admin).

Vault Lock ở chế độ compliance là không thể hoàn tác — đúng như
[S3 Object Lock](./s3-advanced#object-lock-và-mfa-delete).

## Lab

### Lab 1 — Tính toán quyết định

Với dữ liệu 20TB và đường truyền 200 Mbps:

```bash
python3 -c "
gb=20000; mbps=200
hours = gb*8/(mbps*0.7)/3600
print(f'{hours:.0f} giờ = {hours/24:.1f} ngày')
"
```

So với Snowball (~1 tuần cả vận chuyển) để tự quyết.

### Lab 2 — DataSync trong AWS (S3 → S3)

Không cần agent khi cả hai đầu đều trong AWS:

```bash
SRC=lab-ds-src-$(date +%s); DST=lab-ds-dst-$(date +%s)
aws s3 mb s3://$SRC && aws s3 mb s3://$DST

for i in $(seq 1 20); do echo "file $i" | aws s3 cp - s3://$SRC/f$i.txt; done
```

Tạo 2 location S3 + task qua console, chạy task, rồi:

```bash
aws s3 ls s3://$DST/ --recursive | wc -l    # 20
aws datasync list-task-executions
```

### Lab 3 — AWS Backup cho EBS

```bash
aws backup start-backup-job \
  --backup-vault-name Default \
  --resource-arn arn:aws:ec2:ap-southeast-1:111122223333:volume/vol-xxx \
  --iam-role-arn arn:aws:iam::111122223333:role/service-role/AWSBackupDefaultServiceRole

aws backup list-backup-jobs --by-state COMPLETED \
  --query 'BackupJobs[].[BackupJobId,ResourceType,State]' --output table
```

### Dọn dẹp

```bash
aws s3 rb s3://$SRC --force && aws s3 rb s3://$DST --force
aws backup delete-recovery-point --backup-vault-name Default --recovery-point-arn <arn>
```

## Liên quan

- [EC2 — Instance Storage](./ec2-instance-storage) — EBS, EFS, FSx
- [S3 — Nâng cao](./s3-advanced) — replication như một cách di chuyển
