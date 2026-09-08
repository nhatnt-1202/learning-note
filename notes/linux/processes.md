# Process Management

## Xem tiến trình

```bash
ps aux                   # Liệt kê tất cả process
ps aux | grep nginx      # Lọc theo tên
top                      # Monitor real-time
htop                     # Monitor (đẹp hơn, cần cài thêm)
pgrep nginx              # Tìm PID theo tên
```

## Kill process

```bash
kill PID                 # Gửi SIGTERM (graceful)
kill -9 PID              # Gửi SIGKILL (force)
killall nginx            # Kill tất cả process theo tên
pkill -f "python app"    # Kill theo pattern
```

## Background & Foreground

```bash
command &           # Chạy nền
Ctrl+Z              # Tạm dừng process
bg                  # Tiếp tục chạy nền
fg                  # Đưa lên foreground
jobs                # Liệt kê background jobs
nohup command &     # Chạy không bị dừng khi logout
```

## systemd (quản lý service)

```bash
systemctl status nginx       # Xem trạng thái
systemctl start nginx        # Khởi động
systemctl stop nginx         # Dừng
systemctl restart nginx      # Khởi động lại
systemctl enable nginx       # Tự khởi động cùng hệ thống
systemctl disable nginx      # Tắt tự khởi động
journalctl -u nginx -f       # Xem log service
```
