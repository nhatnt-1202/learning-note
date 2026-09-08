# 📚 Learning Notes

Tài liệu học tập cá nhân, được build bằng [VitePress](https://vitepress.dev/).

## Cài đặt & Chạy

```bash
# Cài dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview bản build
npm run preview
```

## Cấu trúc thư mục

```
learning-note/
├── .vitepress/
│   └── config.mts        # Cấu hình VitePress
├── notes/
│   ├── linux/            # Linux notes
│   ├── database/         # Database notes
│   ├── docker/           # Docker notes
│   └── javascript/       # JavaScript notes
├── index.md              # Trang chủ
└── package.json
```

## Thêm trang mới

1. Tạo file `.md` trong thư mục tương ứng
2. Thêm vào sidebar trong `.vitepress/config.mts`
3. Viết nội dung bằng Markdown + code blocks

## Deploy

Bản build output nằm ở `.vitepress/dist/`, có thể deploy lên:
- GitHub Pages
- Vercel
- Netlify
- Bất kỳ static hosting nào
