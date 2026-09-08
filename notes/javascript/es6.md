# ES6+ Features

## Arrow Functions

```javascript
// Truyền thống
function add(a, b) { return a + b }

// Arrow function
const add = (a, b) => a + b

// Với body
const greet = (name) => {
  const msg = `Hello, ${name}!`
  return msg
}
```

## Destructuring

```javascript
// Object
const { name, age, address: { city } } = user
const { name = 'Anonymous' } = user    // Default value

// Array
const [first, second, ...rest] = [1, 2, 3, 4, 5]
const [, , third] = [1, 2, 3]          // Skip elements
```

## Spread & Rest

```javascript
// Spread — mở rộng
const arr = [1, 2, 3]
const newArr = [...arr, 4, 5]

const obj = { a: 1 }
const newObj = { ...obj, b: 2 }

// Rest — gom lại
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0)
}
```

## Template Literals

```javascript
const name = 'Nhat'
const msg = `Xin chào ${name}!`

// Multi-line
const html = `
  <div>
    <h1>${title}</h1>
  </div>
`
```

## Optional Chaining & Nullish Coalescing

```javascript
// Optional chaining — không throw nếu null/undefined
const city = user?.address?.city
const first = arr?.[0]
const result = obj?.method?.()

// Nullish coalescing — fallback khi null/undefined (không phải falsy)
const name = user.name ?? 'Anonymous'
const count = data.count ?? 0
```

## Modules (ESM)

```javascript
// Export
export const PI = 3.14
export function add(a, b) { return a + b }
export default class Calculator { }

// Import
import Calculator, { PI, add } from './math.js'
import * as math from './math.js'
```
