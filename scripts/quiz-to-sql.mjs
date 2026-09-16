#!/usr/bin/env node
// Xuất các file .quiz.yml thành SQL để nạp làm đề của site.
//
//   node scripts/quiz-to-sql.mjs > seed.sql
//   node scripts/quiz-to-sql.mjs | psql "$DATABASE_URL"
//
// Đường thay thế cho scripts/import-quiz.mjs khi không muốn dùng service role
// key qua mạng — và là cách để npm run db:test kiểm tra rằng dữ liệu từ YAML
// thật sự thoả các ràng buộc của schema, chứ không chỉ thoả validator riêng.

import path from "node:path";
import {collectQuizFiles, readQuizFile} from "../.vitepress/quiz/quiz-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function lit(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function json(v) {
  return v === null || v === undefined ? "null" : lit(JSON.stringify(v)) + "::jsonb";
}

function textArray(list) {
  return "array[" + list.map(lit).join(", ") + "]::text[]";
}

const out = ["begin;"];
let count = 0;

for (const rel of collectQuizFiles(ROOT)) {
  const lessonPath = rel.replace(/\.quiz\.yml$/, "");
  const {quiz, errors} = readQuizFile(path.join(ROOT, rel), lessonPath);
  if (errors.length) {
    console.error(`Bỏ qua ${rel}: ${errors.join("; ")}`);
    process.exitCode = 1;
    continue;
  }

  out.push(``, `-- ${rel}`);

  // Ba câu lệnh riêng, KHÔNG gộp vào một câu bằng CTE: các CTE ghi dữ liệu dùng
  // chung một snapshot, nên INSERT sẽ không thấy DELETE vừa chạy và đâm vào
  // ràng buộc unique (quiz_id, position).
  out.push(`insert into public.quizzes`);
  out.push(`  (slug, lesson_path, title, source, visibility, owner_id, pass_score, model, source_hash)`);
  out.push(`values (${lit(lessonPath)}, ${lit(lessonPath)}, ${lit(quiz.title)},`);
  out.push(`        'auto', 'public', null, ${quiz.pass}, ${lit(quiz.generated)}, ${lit(quiz.sourceHash)})`);
  out.push(`on conflict (slug) do update set`);
  out.push(`  title = excluded.title, lesson_path = excluded.lesson_path,`);
  out.push(`  pass_score = excluded.pass_score, model = excluded.model,`);
  out.push(`  source_hash = excluded.source_hash, updated_at = now();`);
  out.push(``);
  out.push(`delete from public.questions`);
  out.push(` where quiz_id = (select id from public.quizzes where slug = ${lit(lessonPath)});`);
  out.push(``);
  out.push(`insert into public.questions`);
  out.push(`  (quiz_id, position, key, type, prompt, options, answer, explanation, tags, case_sensitive)`);
  out.push(`select (select id from public.quizzes where slug = ${lit(lessonPath)}), v.*`);
  out.push(`from (values`);

  const rows = quiz.questions.map((q, i) => {
    const isText = q.type === "fill" || q.type === "output";
    return (
      `  (${i}::int, ${lit(q.id)}::text, ${lit(q.type)}::text, ${lit(q.prompt)}::text, ` +
      `${isText ? "null::jsonb" : json(q.options)}, ${json(q.answer)}, ` +
      `${lit(q.explanation || null)}::text, ${textArray(q.tags)}, ` +
      `${lit(Boolean(q.caseSensitive))}::boolean)`
    );
  });
  out.push(rows.join(",\n"));
  out.push(`) as v(position, key, type, prompt, options, answer, explanation, tags, case_sensitive);`);
  count++;
}

out.push(``, `commit;`);
console.log(out.join("\n"));
console.error(`${count} quiz`);
