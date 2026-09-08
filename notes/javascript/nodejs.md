# Node.js

## File System

```javascript
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Đọc file
const content = await readFile('file.txt', 'utf-8')

// Ghi file
await writeFile('output.txt', 'Hello!', 'utf-8')

// Tạo thư mục (kể cả nested)
await mkdir('dir/sub', { recursive: true })

// Join path an toàn (cross-platform)
const filePath = path.join(__dirname, 'data', 'file.json')
```

## HTTP Server (built-in)

```javascript
import { createServer } from 'http'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Hello!' }))
})

server.listen(3000, () => {
  console.log('Server chạy tại http://localhost:3000')
})
```

## Environment Variables

```javascript
// Dùng .env file với dotenv
import 'dotenv/config'

const DB_URL = process.env.DATABASE_URL
const PORT = parseInt(process.env.PORT ?? '3000', 10)
```

## EventEmitter

```javascript
import { EventEmitter } from 'events'

class JobQueue extends EventEmitter {
  add(job) {
    this.emit('job:added', job)
    // process...
    this.emit('job:done', job)
  }
}

const queue = new JobQueue()
queue.on('job:done', (job) => console.log('Xong:', job))
queue.add({ id: 1, task: 'send-email' })
```

## Stream

```javascript
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createGzip } from 'zlib'

// Nén file lớn mà không load toàn bộ vào RAM
await pipeline(
  createReadStream('large-file.txt'),
  createGzip(),
  createWriteStream('large-file.txt.gz')
)
```
