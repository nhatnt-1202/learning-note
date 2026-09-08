# Async / Await

## Promise cơ bản

```javascript
const fetchUser = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) resolve({ id, name: 'Nhat' })
      else reject(new Error('Invalid ID'))
    }, 1000)
  })
}

fetchUser(1)
  .then(user => console.log(user))
  .catch(err => console.error(err))
  .finally(() => console.log('Done'))
```

## Async / Await

```javascript
async function getUser(id) {
  try {
    const user = await fetchUser(id)
    const posts = await fetchPosts(user.id)
    return { user, posts }
  } catch (error) {
    console.error('Error:', error.message)
    throw error
  }
}
```

## Chạy song song

```javascript
// Tuần tự (chậm)
const user = await fetchUser(id)
const posts = await fetchPosts(id)

// Song song (nhanh hơn)
const [user, posts] = await Promise.all([
  fetchUser(id),
  fetchPosts(id)
])

// Lấy kết quả đầu tiên
const result = await Promise.race([
  fetchFromServer1(),
  fetchFromServer2()
])
```

## Xử lý lỗi nâng cao

```javascript
// Promise.allSettled — không fail khi có 1 cái lỗi
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(999)   // Lỗi
])

results.forEach(result => {
  if (result.status === 'fulfilled') {
    console.log('OK:', result.value)
  } else {
    console.log('Lỗi:', result.reason)
  }
})
```

## Fetch API

```javascript
async function apiGet(url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return res.json()
}
```
