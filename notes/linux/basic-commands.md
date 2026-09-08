# Các lệnh Linux cơ bản

## Điều hướng file system

```bash
pwd           # In thư mục hiện tại
ls -la        # Liệt kê tất cả file (gồm cả ẩn), kèm chi tiết
cd /path      # Di chuyển đến thư mục
cd ~          # Về home directory
cd -          # Quay lại thư mục trước
```

## Thao tác file & thư mục

```bash
mkdir -p dir/subdir     # Tạo thư mục (kể cả parent)
rm -rf dir              # Xóa thư mục và toàn bộ nội dung
cp -r src/ dest/        # Copy thư mục
mv old new              # Đổi tên / di chuyển
touch file.txt          # Tạo file trống
```

## Tìm kiếm

```bash
find . -name "*.log"          # Tìm file theo tên
find . -type f -size +10M     # Tìm file lớn hơn 10MB
grep -r "keyword" ./          # Tìm chuỗi trong file
grep -n "error" app.log       # Hiện số dòng kết quả
```

## Xem nội dung file

```bash
cat file.txt          # In toàn bộ nội dung
less file.txt         # Xem từng trang (q để thoát)
head -n 20 file.txt   # Xem 20 dòng đầu
tail -f app.log       # Theo dõi file log real-time
```

## Xử lý text

```bash
# Đếm số dòng, từ, ký tự
wc -l file.txt

# Lọc và biến đổi với awk
awk '{print $1, $3}' file.txt

# Thay thế chuỗi với sed
sed 's/old/new/g' file.txt

# Sắp xếp
sort file.txt
sort -u file.txt      # Sắp xếp và loại trùng lặp
```

## Mạng

```bash
curl -I https://example.com    # Xem HTTP headers
wget https://example.com/file  # Download file
ping google.com                # Kiểm tra kết nối
ss -tlnp                       # Xem port đang lắng nghe
```

## Disk & Memory

```bash
df -h          # Xem dung lượng ổ đĩa
du -sh ./dir   # Xem kích thước thư mục
free -h        # Xem RAM
htop           # Monitor tài nguyên (interactive)
```
