-- Dữ liệu mẫu cho test. Id cố định để test đọc dễ.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'u1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'u2@example.com');

-- Đề auto: nội dung của site, công khai, không thuộc về ai.
insert into public.quizzes (id, slug, lesson_path, title, source, visibility, model)
values ('aaaaaaaa-0000-0000-0000-000000000000', 'notes/web/06-javascript-can-ban',
        'notes/web/06-javascript-can-ban', 'Kiểm tra bài 6', 'auto', 'public',
        'claude-opus-5');

insert into public.questions (id, quiz_id, position, key, type, prompt, options, answer, explanation)
values
  ('a1000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
   0, 'cong-chuoi', 'single', '`var A = "12" + 7.5;` — A là gì?',
   '["19.5", "\"127.5\"", "NaN", "Lỗi cú pháp"]'::jsonb, '[1]'::jsonb,
   '`+` gặp chuỗi thì nối chuỗi.'),
  ('a2000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
   1, 'nullish', 'fill', 'Toán tử chỉ thay khi null/undefined?',
   null, '["??", "a ?? b"]'::jsonb, '`??` — nullish coalescing.');

-- Đề do u1 tự tạo, để private.
insert into public.quizzes (id, title, source, visibility, owner_id)
values ('bbbbbbbb-0000-0000-0000-000000000000', 'Đề riêng của u1', 'user', 'private',
        '11111111-1111-1111-1111-111111111111');

insert into public.questions (id, quiz_id, position, key, type, prompt, options, answer, explanation)
values ('b1000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000',
        0, 'so-sanh', 'multi', 'Biểu thức nào cho true?',
        '["\"\" == 0", "\"\" == \"0\"", "1 === \"1\"", "null == undefined"]'::jsonb,
        '[0, 3]'::jsonb, '`==` ép kiểu trước khi so.');
