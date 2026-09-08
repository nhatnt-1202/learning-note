# Docker Networking

## Các loại network

| Type | Mô tả |
|------|-------|
| bridge | Mặc định, containers cùng host liên lạc được |
| host | Dùng chung network stack với host |
| none | Không có network |
| overlay | Kết nối containers trên nhiều Docker hosts (Swarm) |

## Lệnh network

```bash
# Liệt kê networks
docker network ls

# Tạo network
docker network create mynetwork

# Chạy container trong network
docker run --network mynetwork --name app myapp

# Kết nối container vào network
docker network connect mynetwork container_name

# Xem chi tiết network
docker network inspect mynetwork
```

## Trong Docker Compose

```yaml
services:
  app:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend    # Chỉ nội bộ, không expose ra frontend

networks:
  frontend:
  backend:
    internal: true   # Không có internet access
```

## DNS trong Docker

Các container trong cùng network có thể kết nối với nhau qua **tên service** thay vì IP:

```bash
# Từ container app, kết nối đến db bằng hostname "db"
postgresql://db:5432/mydb
redis://redis:6379
```
