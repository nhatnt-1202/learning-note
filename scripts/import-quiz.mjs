#!/usr/bin/env node
// Đẩy các file .quiz.yml lên Supabase làm đề của site (source = 'auto').
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/import-quiz.mjs
//   node scripts/import-quiz.mjs --dry-run
//
// Cần service role key vì đề 'auto' không thuộc về ai (owner_id null) và RLS
// chặn mọi client tạo loại đề đó. Key này KHÔNG bao giờ được đặt vào biến có
// tiền tố VITE_ — mọi biến VITE_* đều đi vào bundle của trình duyệt.
//
// Chạy lại được nhiều lần: upsert theo slug, và thay toàn bộ câu hỏi của đề.

import path from "node:path";
import fs from "node:fs";
import {createClient} from "@supabase/supabase-js";
import {collectQuizFiles, readQuizFile, hashLesson} from "../.vitepress/quiz/quiz-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY && (!url || !key)) {
  console.error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Dùng --dry-run để xem sẽ đẩy những gì mà không cần key.");
  process.exit(1);
}

const sb = DRY ? null : createClient(url, key, {auth: {persistSession: false}});

const files = collectQuizFiles(ROOT);
if (!files.length) {
  console.log("Không có file .quiz.yml nào trong notes/.");
  process.exit(0);
}

let failed = 0;

for (const rel of files) {
  const lessonRel = rel.replace(/\.quiz\.yml$/, ".md");
  const lessonPath = lessonRel.replace(/\.md$/, "");
  const {quiz, errors} = readQuizFile(path.join(ROOT, rel), lessonPath);

  if (errors.length) {
    console.log(`✗ ${rel}`);
    for (const e of errors) console.log(`    ${e}`);
    failed++;
    continue;
  }

  const lessonAbs = path.join(ROOT, lessonRel);
  if (fs.existsSync(lessonAbs)) {
    const now = hashLesson(fs.readFileSync(lessonAbs, "utf-8"));
    if (quiz.sourceHash && quiz.sourceHash !== now) {
      console.log(`! ${rel} — bài học đã sửa sau khi sinh quiz, vẫn đẩy bản hiện tại`);
    }
  }

  const head = {
    slug: lessonPath,
    lesson_path: lessonPath,
    title: quiz.title,
    source: "auto",
    visibility: "public",
    owner_id: null,
    pass_score: quiz.pass,
    model: quiz.generated,
    source_hash: quiz.sourceHash
  };

  const rows = quiz.questions.map((q, i) => {
    const isText = q.type === "fill" || q.type === "output";
    return {
      position: i,
      key: q.id,
      type: q.type,
      prompt: q.prompt,
      options: isText ? null : q.options,
      answer: q.answer,
      explanation: q.explanation || null,
      tags: q.tags,
      case_sensitive: Boolean(q.caseSensitive)
    };
  });

  if (DRY) {
    console.log(`· ${rel} → "${quiz.title}" (${rows.length} câu, slug ${lessonPath})`);
    continue;
  }

  const {data: saved, error} = await sb
    .from("quizzes")
    .upsert(head, {onConflict: "slug"})
    .select("id")
    .single();
  if (error) {
    console.log(`✗ ${rel} — ${error.message}`);
    failed++;
    continue;
  }

  // Thay toàn bộ câu hỏi. `key` giữ nguyên theo id trong YAML nên vẫn nhận ra
  // được câu nào là câu nào giữa các lần import.
  const {error: delErr} = await sb.from("questions").delete().eq("quiz_id", saved.id);
  if (delErr) {
    console.log(`✗ ${rel} — không xoá được câu cũ: ${delErr.message}`);
    failed++;
    continue;
  }

  const {error: insErr} = await sb
    .from("questions")
    .insert(rows.map((r) => ({...r, quiz_id: saved.id})));
  if (insErr) {
    console.log(`✗ ${rel} — ${insErr.message}`);
    failed++;
    continue;
  }

  console.log(`✓ ${rel} — ${rows.length} câu`);
}

console.log(`\n${files.length} quiz · ${failed} lỗi${DRY ? " · chế độ thử, chưa ghi gì" : ""}`);
process.exit(failed ? 1 : 0);
