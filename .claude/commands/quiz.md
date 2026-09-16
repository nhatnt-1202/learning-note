---
description: Sinh quiz cho một bài học vào file .quiz.yml cạnh nó
argument-hint: <đường dẫn file .md của bài học>
allowed-tools: Read, Write, Edit, Bash(node:*), Bash(npm run quiz:check), Bash(cat:*), Bash(ls:*)
---

Sinh quiz tự kiểm tra cho bài học: **$ARGUMENTS**

## Cách làm

1. Đọc trọn file bài học. Bỏ qua khối `<script setup>` ở đầu (đó là dữ liệu cho
   `<CodePlayground>`, không phải nội dung bài) — nhưng phần code trong đó cho
   biết bài này nhấn vào cái gì, dùng làm gợi ý chọn câu hỏi.
2. Viết **6–9 câu** vào file `.quiz.yml` cùng tên, cùng thư mục với bài học
   (ví dụ `notes/web/06-x.md` → `notes/web/06-x.quiz.yml`).
3. Tính `source_hash`:
   ```bash
   node --input-type=module -e "
   import fs from 'node:fs';
   import {hashLesson} from './.vitepress/quiz/quiz-data.mjs';
   process.stdout.write(hashLesson(fs.readFileSync('<đường dẫn .md>','utf-8')));
   "
   ```
4. Thêm dòng `<Quiz />` vào cuối bài học, ngay trước dấu `---` và dòng điều
   hướng cuối trang, nếu bài chưa có.
5. Chạy `npm run quiz:check` và sửa cho hết lỗi.

## Nguyên tắc chọn câu hỏi

- **Hỏi vào cái bẫy, không hỏi định nghĩa.** Bài học đã tự đánh dấu chỗ quan
  trọng bằng các khối `::: tip`, `::: warning`, `::: danger` và bảng "Tóm tắt" ở
  cuối — câu hỏi tốt gần như luôn nằm ở đó. Đừng hỏi "HTML viết tắt của gì".
- **Đáp án sai phải là lỗi người học thật sự mắc**, không phải phương án bịa cho
  đủ bốn ô. Ví dụ với `"12" + 7.5` thì `19.5` là đáp án sai đúng chuẩn: đó chính
  là điều người mới tưởng.
- **`why` là phần quan trọng nhất.** Giải thích vì sao đáp án đúng *và* vì sao
  cái bẫy hấp dẫn. Viết như giọng trong bài: ngắn, thẳng, có ví dụ code khi cần.
- Chỉ hỏi những gì bài học có dạy. Không kiểm tra kiến thức bài sau.
- Trộn loại câu: phần lớn `single`, thêm 1–2 câu `multi`/`truefalse`, và với bài
  có code thì nên có `output` hoặc `fill`.
- Viết tiếng Việt, giữ nguyên thuật ngữ tiếng Anh đã dùng trong bài.

## Schema

```yaml
title: Kiểm tra bài 6 — Nền tảng cú pháp   # ngắn, có số bài
pass: 70                  # % để tính là đạt
generated: claude-opus-5  # model đã sinh; giữ nguyên khi sinh lại
reviewed: false           # người sinh KHÔNG được đặt true — chỉ chủ repo đặt
source_hash: e83a0869…    # từ bước 3
questions:
  - id: var-leak          # kebab-case, ổn định (localStorage lưu theo id này)
    type: single          # single | multi | truefalse | fill | output
    q: |                  # markdown, có code fence được
      Đoạn này in ra gì?

      ```js
      for (var i = 0; i < 3; i++) {}
      console.log(i);
      ```
    options: ["…", "…"]   # chỉ cho single/multi; markdown inline
    answer: 1             # single: 1 chỉ số · multi: [0, 3] · truefalse: true/false
                          # fill/output: mảng chuỗi được chấp nhận, ví dụ ["3"]
    why: |                # bắt buộc — markdown
      …
    tags: [scope, var-let]
```

Lưu ý về `answer`: `single`/`multi` đếm chỉ số options **từ 0**. Đây là chỗ dễ
lệch nhất — đọc lại từng câu sau khi viết, `npm run quiz:check` chỉ bắt được chỉ
số nằm ngoài khoảng, không bắt được chọn sai ô.

`fill` và `output` so khớp chuỗi sau khi bỏ khoảng trắng thừa, dòng trống và
không phân biệt hoa thường (đặt `caseSensitive: true` nếu cần). Liệt kê mọi cách
viết đúng hợp lý vào `answer`.

## Khi bài học đã có quiz

`npm run quiz:check` báo *"bài học đã sửa sau khi sinh quiz"* thì chỉ cập nhật
những câu liên quan tới phần vừa sửa và cập nhật `source_hash` — giữ nguyên `id`
của câu cũ để không mất tiến độ đã lưu trong trình duyệt. Nếu file có
`reviewed: true` thì **không sửa gì**, chỉ báo lại cho người dùng biết chỗ lệch.
