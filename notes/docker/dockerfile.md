# Dockerfile

## Cấu trúc cơ bản

```dockerfile
# Base image
FROM node:20-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Copy package files trước (tận dụng layer cache)
COPY package*.json ./

# Cài dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Lệnh khởi động
CMD ["node", "dist/index.js"]
```

## Best practices

### Dùng multi-stage build để giảm image size

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (chỉ copy artifact)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### .dockerignore

```
node_modules/
dist/
.git/
.env
*.log
README.md
```

## Lệnh cơ bản

```bash
# Build image
docker build -t myapp:latest .

# Chạy container
docker run -d -p 3000:3000 --name myapp myapp:latest

# Xem logs
docker logs -f myapp

# Vào container
docker exec -it myapp sh

# Dừng / xóa
docker stop myapp
docker rm myapp

# Liệt kê images và containers
docker images
docker ps -a
```
