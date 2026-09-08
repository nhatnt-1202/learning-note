# EC2 — Instance Storage

Bốn lựa chọn lưu trữ cho EC2, khác nhau về bản chất chứ không chỉ về tốc độ.

## Bảng chọn

| | EBS | Instance Store | EFS | FSx |
|---|---|---|---|---|
| Bản chất | Đĩa mạng | **Đĩa gắn vật lý** | NFS chia sẻ | File system chuyên dụng |
| Bền vững | Có | **Mất khi stop** | Có | Có |
| Gắn nhiều instance | Chỉ io1/io2 Multi-Attach | Không | **Có, hàng nghìn** | Có |
| Qua nhiều AZ | Không (theo AZ) | Không | **Có** | Tuỳ loại |
| Tốc độ | Cao | **Cao nhất** | Trung bình | Cao |
| Giá | Trung bình | Kèm instance | **Đắt (~3× EBS)** | Đắt |

Nguyên tắc: **EBS** cho ổ đĩa của một instance, **EFS** khi nhiều instance cần
đọc/ghi cùng thư mục, **Instance Store** cho cache/scratch, **FSx** cho nhu cầu
đặc biệt (Windows SMB, Lustre HPC).

## EBS — các loại volume

| Loại | Đặc điểm | Dùng cho |
|---|---|---|
| **gp3** | 3000 IOPS cơ sở, tăng IOPS/throughput **độc lập với dung lượng** | **Mặc định nên chọn** |
| gp2 | IOPS gắn với dung lượng (3 IOPS/GB) | Đời cũ, nên chuyển sang gp3 |
| **io2 Block Express** | Tới 256k IOPS, độ bền 99.999% | Database lớn |
| st1 | HDD throughput cao, **không** boot được | Log, big data tuần tự |
| sc1 | HDD rẻ nhất | Lưu trữ lạnh, truy cập ít |

`gp3` rẻ hơn `gp2` khoảng 20% **và** cho 3000 IOPS ngay từ volume nhỏ nhất —
với `gp2` muốn 3000 IOPS phải mua 1TB. Chuyển gp2 → gp3 là một trong những cách
tiết kiệm dễ nhất:

```bash
aws ec2 modify-volume --volume-id vol-xxx --volume-type gp3
```

Thay đổi được **online**, không cần detach.

## Snapshot

Backup tăng dần (incremental) lưu trên S3, nhưng **theo region**.

```bash
aws ec2 create-snapshot --volume-id vol-xxx --description "before upgrade"

# Copy sang region khác (DR)
aws ec2 copy-snapshot --source-region ap-southeast-1 \
  --source-snapshot-id snap-xxx --destination-region us-east-1

# Tạo volume từ snapshot — ĐƯỢC chọn AZ khác
aws ec2 create-volume --snapshot-id snap-xxx --availability-zone ap-southeast-1b
```

Đây là cách di chuyển volume giữa các AZ: snapshot rồi tạo lại ở AZ mới.

### Fast Snapshot Restore

Volume tạo từ snapshot bình thường bị **lazy load** — block chưa đọc lần nào sẽ
chậm ở lần truy cập đầu. FSR loại bỏ việc đó nhưng **tốn tiền theo giờ** cho mỗi
snapshot × AZ. Chỉ bật khi thật cần restore nhanh.

Tự động hoá backup bằng **Data Lifecycle Manager** thay vì tự viết cron:

```bash
aws dlm create-lifecycle-policy --cli-input-json file://policy.json
```

## Mã hoá

```bash
# Bật mặc định cho mọi volume mới trong region
aws ec2 enable-ebs-encryption-by-default
```

Nên bật ngay — gần như không tốn gì và bỏ được cả lớp rủi ro. Volume đã tồn tại
mà chưa mã hoá thì phải qua snapshot → copy có mã hoá → tạo volume mới.

## Instance Store

Đĩa NVMe gắn trực tiếp vào host. Nhanh nhất, nhưng:

- **Mất dữ liệu khi stop/terminate** hoặc khi host lỗi
- Không snapshot được
- Dung lượng cố định theo instance type

Chỉ dùng cho: cache, temp, scratch của xử lý dữ liệu, hoặc database tự lo
replication (Cassandra).

```bash
lsblk
sudo mkfs -t xfs /dev/nvme1n1
sudo mount /dev/nvme1n1 /mnt/scratch
```

Đừng cho vào `/etc/fstab` mà không có `nofail` — đĩa trống sau reboot có thể
làm instance không boot lên được.

## EFS

NFS quản lý, tự mở rộng, truy cập được từ **nhiều AZ**.

```bash
sudo dnf install -y amazon-efs-utils
sudo mount -t efs -o tls fs-xxxxx:/ /mnt/efs
```

Các chế độ cần biết:

| Cấu hình | Lựa chọn |
|---|---|
| Performance mode | `generalPurpose` (mặc định) / `maxIO` (throughput cao, latency cao hơn) |
| Throughput mode | `bursting` / `elastic` (tự co giãn) / `provisioned` |
| Storage class | Standard / One Zone (rẻ hơn ~47%, chỉ 1 AZ) |

EFS đắt hơn EBS đáng kể, nên đặt lifecycle policy chuyển file ít dùng sang
Infrequent Access:

```bash
aws efs put-lifecycle-configuration --file-system-id fs-xxx \
  --lifecycle-policies '[{"TransitionToIA":"AFTER_30_DAYS"}]'
```

Security group của EFS phải mở port **2049** cho SG của instance.

## FSx

| Loại | Cho |
|---|---|
| **FSx for Windows File Server** | SMB, Active Directory |
| **FSx for Lustre** | HPC, ML — liên kết được với S3 |
| **FSx for NetApp ONTAP** | Multi-protocol, snapshot, dedup |
| **FSx for OpenZFS** | ZFS snapshot, clone |

FSx for Lustre đáng nhớ vì nó **mount S3 bucket** làm file system, dùng cho
training ML trên dữ liệu lớn.

## Lab

### Lab 1 — Thêm và mở rộng EBS

```bash
AZ=ap-southeast-1a
VOL=$(aws ec2 create-volume --size 10 --volume-type gp3 \
  --availability-zone $AZ --query VolumeId --output text)

aws ec2 attach-volume --volume-id $VOL --instance-id i-xxx --device /dev/sdf
```

Trên instance:

```bash
lsblk
sudo mkfs -t xfs /dev/nvme1n1
sudo mkdir /data && sudo mount /dev/nvme1n1 /data
df -h /data
```

Mở rộng online:

```bash
aws ec2 modify-volume --volume-id $VOL --size 20
```

```bash
sudo xfs_growfs /data      # xfs
# sudo resize2fs /dev/nvme1n1   # ext4
df -h /data                # đã thành 20G, không cần unmount
```

### Lab 2 — Snapshot và restore sang AZ khác

```bash
SNAP=$(aws ec2 create-snapshot --volume-id $VOL --query SnapshotId --output text)
aws ec2 wait snapshot-completed --snapshot-ids $SNAP

NEW=$(aws ec2 create-volume --snapshot-id $SNAP \
  --availability-zone ap-southeast-1b --query VolumeId --output text)
```

Gắn vào instance ở AZ khác, kiểm tra dữ liệu còn nguyên.

### Lab 3 — EFS chia sẻ giữa 2 instance

```bash
FS=$(aws efs create-file-system --performance-mode generalPurpose \
  --query FileSystemId --output text)

# Mount target cho mỗi AZ, SG phải mở port 2049
aws efs create-mount-target --file-system-id $FS \
  --subnet-id subnet-xxx --security-groups sg-efs
```

Mount trên cả hai instance, ghi file ở máy A → đọc thấy ngay ở máy B.

### Lab 4 — Instance store mất dữ liệu

Dùng instance type có instance store (`m5d.large`), ghi file vào đó, **stop**
rồi **start** lại → dữ liệu mất. So với EBS vẫn còn.

### Dọn dẹp

```bash
aws ec2 detach-volume --volume-id $VOL
aws ec2 delete-volume --volume-id $VOL
aws ec2 delete-snapshot --snapshot-id $SNAP
aws efs delete-mount-target --mount-target-id fsmt-xxx
aws efs delete-file-system --file-system-id $FS
```

Kiểm tra volume mồ côi định kỳ:

```bash
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query 'Volumes[].[VolumeId,Size,CreateTime]' --output table
```

## Liên quan

- [EC2 — Cơ bản](./ec2-basic)
- [Storage Extras](./storage-extras) — DataSync, Storage Gateway
- [S3 — Giới thiệu](./s3-introduction)
