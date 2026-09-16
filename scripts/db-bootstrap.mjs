#!/usr/bin/env node
// Xuất một file SQL duy nhất để dựng DB từ con số không.
//
//   npm run db:sql > bootstrap.sql
//
// Dành cho lần đầu, khi chưa có Supabase CLI cũng chưa có service role key:
// mở Supabase Dashboard → SQL Editor, dán cả file vào, chạy một lần.
//
// Gồm toàn bộ supabase/migrations/ theo thứ tự tên, rồi tới đề của site sinh từ
// notes/**/*.quiz.yml.
//
// CHỈ dùng cho DB trống. Chạy lần hai sẽ dừng ở `create table ... profiles` —
// migration nền dùng `create table` trần, và để nguyên như vậy là đúng: một
// migration im lặng bỏ qua khi bảng đã tồn tại sẽ giấu mất việc schema trên
// server đã lệch khỏi file.
//
// Muốn đẩy lại ĐỀ (sau khi sửa .quiz.yml) thì dùng `npm run quiz:sql` — phần đó
// upsert theo slug nên chạy lại bao nhiêu lần cũng được.

import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIG = path.join(ROOT, "supabase", "migrations");

// --schema-only: bỏ phần đề, chỉ còn migration. Dùng khi dán vào SQL Editor —
// 300KB INSERT trong một ô textarea là chỗ trình duyệt hay nghẽn nhất, mà phần
// đề thì đẩy bằng scripts/import-quiz.mjs gọn hơn nhiều.
const SCHEMA_ONLY = process.argv.includes("--schema-only");

const out = [];
for (const f of fs.readdirSync(MIG).sort()) {
  if (!f.endsWith(".sql")) continue;
  out.push(`-- ══ ${f} ══`, fs.readFileSync(path.join(MIG, f), "utf-8"));
  console.error(`→ ${f}`);
}

if (!SCHEMA_ONLY) {
out.push("-- ══ đề của site (notes/**/*.quiz.yml) ══");
out.push(
  execFileSync("node", [path.join(ROOT, "scripts", "quiz-to-sql.mjs")], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
    // stderr của script con là phần thống kê, để nó chảy thẳng ra terminal.
    stdio: ["ignore", "pipe", "inherit"]
  })
);
}

process.stdout.write(out.join("\n\n"));
