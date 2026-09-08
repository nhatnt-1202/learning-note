# PostgreSQL

## Kết nối

```bash
# Kết nối CLI
psql -h localhost -U postgres -d mydb

# Kết nối với URL
psql "postgresql://user:password@localhost:5432/mydb"
```

## Các lệnh psql hay dùng

```sql
\l              -- Liệt kê databases
\c dbname       -- Chuyển database
\dt             -- Liệt kê tables
\d table_name   -- Xem cấu trúc table
\du             -- Liệt kê users/roles
\q              -- Thoát
```

## Query cơ bản

```sql
-- Tạo database
CREATE DATABASE mydb;

-- Tạo table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert
INSERT INTO users (name, email) VALUES ('Nhat', 'nhat@example.com');

-- Select
SELECT * FROM users WHERE name LIKE '%Nhat%';

-- Update
UPDATE users SET name = 'Nhat NT' WHERE id = 1;

-- Delete
DELETE FROM users WHERE id = 1;
```

## Index

```sql
-- Tạo index thường
CREATE INDEX idx_users_email ON users(email);

-- Index duy nhất
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Xem index của table
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';

-- Xóa index
DROP INDEX idx_users_email;
```

## Explain & Optimize

```sql
-- Xem query plan
EXPLAIN SELECT * FROM users WHERE email = 'nhat@example.com';

-- Xem query plan + thực thi thực tế
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'nhat@example.com';
```

## Backup & Restore

```bash
# Backup toàn bộ database
pg_dump -U postgres mydb > backup.sql

# Backup dạng binary (nhanh hơn)
pg_dump -U postgres -Fc mydb > backup.dump

# Restore từ SQL
psql -U postgres mydb < backup.sql

# Restore từ binary
pg_restore -U postgres -d mydb backup.dump
```
