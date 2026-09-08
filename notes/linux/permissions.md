# Linux Permissions

## Đọc quyền

```bash
ls -la
# -rwxr-xr-- 1 user group 1234 Jan 1 file.txt
#  ^^^ ^^^ ^^^
#  |   |   └── Others: r--  (4)
#  |   └─────── Group:  r-x  (5)
#  └─────────── Owner:  rwx  (7)
```

| Ký tự | Số | Nghĩa |
|-------|----|-------|
| r     | 4  | Read  |
| w     | 2  | Write |
| x     | 1  | Execute |
| -     | 0  | Không có quyền |

## chmod

```bash
chmod 755 file.sh     # rwxr-xr-x
chmod 644 file.txt    # rw-r--r--
chmod +x script.sh    # Thêm quyền execute
chmod -w file.txt     # Bỏ quyền write
chmod -R 755 dir/     # Áp dụng đệ quy
```

## chown

```bash
chown user file.txt           # Đổi owner
chown user:group file.txt     # Đổi owner và group
chown -R user:group dir/      # Áp dụng đệ quy
```

## sudo

```bash
sudo command          # Chạy với quyền root
sudo -u user command  # Chạy với quyền user khác
sudo -i               # Vào shell root
visudo                # Chỉnh sửa file sudoers an toàn
```
