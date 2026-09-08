# MySQL

## Kết nối

```bash
mysql -h localhost -u root -p
mysql -u root -p mydb
```

## Lệnh cơ bản

```sql
SHOW DATABASES;
USE mydb;
SHOW TABLES;
DESCRIBE users;
```

## Query

```sql
-- Tạo database
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search
ALTER TABLE posts ADD FULLTEXT(title, content);
SELECT * FROM posts WHERE MATCH(title, content) AGAINST('keyword');
```

## Backup & Restore

```bash
# Backup
mysqldump -u root -p mydb > backup.sql

# Restore
mysql -u root -p mydb < backup.sql
```
