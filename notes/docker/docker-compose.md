# Docker Compose

## File cơ bản

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Lệnh Docker Compose

```bash
# Khởi động tất cả service
docker compose up -d

# Xem logs
docker compose logs -f
docker compose logs -f app    # Chỉ service app

# Dừng và xóa container
docker compose down

# Dừng, xóa container + volumes
docker compose down -v

# Build lại images
docker compose build

# Scale service
docker compose up -d --scale app=3

# Chạy lệnh trong service
docker compose exec app sh
```

## Override cho development

```yaml
# docker-compose.override.yml (tự động merge)
services:
  app:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```
