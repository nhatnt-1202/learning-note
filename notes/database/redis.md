# Redis

## Kết nối

```bash
redis-cli
redis-cli -h localhost -p 6379 -a password
```

## Các kiểu dữ liệu

### String

```bash
SET key "value"
GET key
DEL key
EXISTS key
EXPIRE key 3600     # TTL 1 giờ
TTL key             # Xem thời gian còn lại
```

### Hash

```bash
HSET user:1 name "Nhat" email "nhat@example.com"
HGET user:1 name
HGETALL user:1
HDEL user:1 email
```

### List

```bash
LPUSH queue "task1"    # Thêm vào đầu
RPUSH queue "task2"    # Thêm vào cuối
LPOP queue             # Lấy từ đầu
LRANGE queue 0 -1      # Xem toàn bộ
```

### Set

```bash
SADD tags "nodejs" "javascript"
SMEMBERS tags
SISMEMBER tags "nodejs"
```

### Sorted Set

```bash
ZADD leaderboard 100 "player1"
ZADD leaderboard 200 "player2"
ZRANGE leaderboard 0 -1 WITHSCORES
ZRANK leaderboard "player1"
```

## Pub/Sub

```bash
# Subscribe
SUBSCRIBE channel

# Publish
PUBLISH channel "Hello!"
```

## Cache pattern trong Node.js

```javascript
const redis = require('redis')
const client = redis.createClient()

async function getUser(id) {
  const cacheKey = `user:${id}`
  
  // Kiểm tra cache
  const cached = await client.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // Query DB
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id])
  
  // Lưu cache 5 phút
  await client.setEx(cacheKey, 300, JSON.stringify(user))
  
  return user
}
```
