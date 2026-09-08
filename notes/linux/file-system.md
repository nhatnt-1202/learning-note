# Linux File System

## Cấu trúc thư mục

```
/
├── bin/        # Lệnh cơ bản (ls, cp, mv...)
├── boot/       # Kernel và bootloader
├── dev/        # Device files
├── etc/        # File cấu hình hệ thống
├── home/       # Home directory của users
├── lib/        # Shared libraries
├── opt/        # Phần mềm tùy chọn
├── proc/       # Thông tin tiến trình (virtual filesystem)
├── root/       # Home của root user
├── srv/        # Dữ liệu của services
├── tmp/        # File tạm (xóa sau khi reboot)
├── usr/        # User programs và data
└── var/        # Log, database, mail...
```

## Mount

```bash
# Xem các mount point
mount | column -t
lsblk

# Mount thiết bị
mount /dev/sdb1 /mnt/data

# Unmount
umount /mnt/data

# Mount tự động khi boot (thêm vào /etc/fstab)
# /dev/sdb1  /mnt/data  ext4  defaults  0  2
```

## Symlinks

```bash
# Tạo symbolic link
ln -s /path/to/original /path/to/link

# Tạo hard link
ln /path/to/original /path/to/hardlink
```
