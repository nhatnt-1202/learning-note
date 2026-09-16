#!/usr/bin/env node
// Kiểm tra mọi file .quiz.yml: schema có đúng, đáp án có nằm trong danh sách
// options, và bài học có bị sửa sau khi sinh quiz hay không.
//
//   node scripts/validate-quiz.mjs
//
// Thoát với mã 1 nếu có lỗi. Cảnh báo (thiếu "why", quiz cũ hơn bài học…) chỉ
// in ra chứ không làm fail — để CI chặn cái sai, còn cái cần soát thì nhắc.

import fs from "node:fs";
import path from "node:path";
import {
  collectQuizFiles,
  readQuizFile,
  hashLesson
} from "../.vitepress/quiz/quiz-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const files = collectQuizFiles(ROOT);

if (!files.length) {
  console.log("Không tìm thấy file .quiz.yml nào trong notes/.");
  process.exit(0);
}

let errorCount = 0;
let warnCount = 0;

for (const rel of files) {
  const lessonRel = rel.replace(/\.quiz\.yml$/, ".md");
  const lessonAbs = path.join(ROOT, lessonRel);
  const {quiz, errors, warnings} = readQuizFile(path.join(ROOT, rel), lessonRel.replace(/\.md$/, ""));

  if (!fs.existsSync(lessonAbs)) {
    errors.push(`không có bài học tương ứng (${lessonRel})`);
  } else {
    const src = fs.readFileSync(lessonAbs, "utf-8");
    if (!src.includes("<Quiz />")) {
      warnings.push(`bài học chưa có dòng <Quiz /> nên quiz không hiện ra`);
    }
    const now = hashLesson(src);
    if (!quiz?.sourceHash) {
      warnings.push("thiếu source_hash — không biết quiz còn khớp bài học hay không");
    } else if (quiz.sourceHash !== now) {
      warnings.push(`bài học đã sửa sau khi sinh quiz (${quiz.sourceHash} → ${now}) — nên sinh lại`);
    }
  }

  const label = quiz?.questions?.length ? `${quiz.questions.length} câu` : "0 câu";
  const mark = errors.length ? "✗" : warnings.length ? "!" : "✓";
  console.log(`${mark} ${rel} — ${label}`);

  for (const e of errors) console.log(`    lỗi: ${e}`);
  for (const w of warnings) console.log(`    nhắc: ${w}`);

  errorCount += errors.length;
  warnCount += warnings.length;
}

console.log(`\n${files.length} quiz · ${errorCount} lỗi · ${warnCount} nhắc`);
process.exit(errorCount ? 1 : 0);
