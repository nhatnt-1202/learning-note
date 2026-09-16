// Đọc, chuẩn hoá và kiểm tra file .quiz.yml đặt cạnh bài học.
//
// Là JS thuần (không phải .ts) vì có hai chỗ dùng:
//   - .vitepress/config.mts        — nhúng quiz vào page data lúc build
//   - scripts/validate-quiz.mjs    — kiểm tra schema, chạy được trong CI
//
// Khoá trong YAML cố tình ngắn (`q`, `why`) vì file do người viết tay hoặc do
// model sinh; tên dài chỉ làm prompt và file phình ra mà không thêm thông tin.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// js-yaml 5 là ESM, chỉ có named export.
import {load as parseYaml} from "js-yaml";

export const TYPES = ["single", "multi", "truefalse", "fill", "output"];
export const TF_OPTIONS = ["Đúng", "Sai"];

/** notes/web/06-x.md -> notes/web/06-x.quiz.yml */
export function quizFileFor(mdPath) {
  return mdPath.replace(/\.md$/, ".quiz.yml");
}

/**
 * Hash thân bài (đã bỏ frontmatter) để biết bài học có sửa sau khi sinh quiz.
 * Cắt còn 16 ký tự cho dễ đọc trong diff — vẫn đủ để phát hiện thay đổi.
 */
export function hashLesson(markdown) {
  const body = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    // Bỏ chính dòng <Quiz /> ra khỏi hash, nếu không thì việc gắn quiz vào bài
    // lại làm quiz vừa sinh bị báo là lỗi thời.
    .replace(/^[ \t]*<Quiz\b[^>]*\/>[ \t]*\r?\n?/gm, "");
  return crypto
    .createHash("sha256")
    .update(body.trim())
    .digest("hex")
    .slice(0, 16);
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeQuestion(raw, i, seen, errors, warnings) {
  const id = String(raw.id || `c${i + 1}`);
  const at = `câu ${i + 1} (${id})`;

  if (seen.has(id)) errors.push(`${at}: id trùng với câu trước`);
  seen.add(id);

  const type = String(raw.type || "single");
  if (!TYPES.includes(type)) {
    errors.push(`${at}: type "${type}" không hợp lệ — chọn một trong ${TYPES.join(", ")}`);
    return null;
  }

  const prompt = String(raw.q ?? raw.prompt ?? "").trim();
  if (!prompt) errors.push(`${at}: thiếu "q" (nội dung câu hỏi)`);

  const explanation = String(raw.why ?? raw.explanation ?? "").trim();
  if (!explanation) {
    warnings.push(`${at}: thiếu "why" — làm sai mà không biết vì sao thì quiz vô dụng`);
  }

  const q = {id, type, prompt, explanation, tags: asArray(raw.tags).map(String)};

  if (type === "truefalse") {
    q.options = TF_OPTIONS.slice();
    const a = raw.answer;
    const yes = a === true || a === "true" || a === "Đúng";
    const no = a === false || a === "false" || a === "Sai";
    if (!yes && !no) errors.push(`${at}: answer phải là true hoặc false`);
    q.answer = [yes ? 0 : 1];
    return q;
  }

  if (type === "single" || type === "multi") {
    q.options = asArray(raw.options).map(String);
    if (q.options.length < 2) errors.push(`${at}: cần ít nhất 2 options`);

    const picked = asArray(raw.answer).map(Number);
    if (!picked.length) errors.push(`${at}: thiếu answer`);
    if (type === "single" && picked.length > 1) {
      errors.push(`${at}: type single chỉ được một answer — dùng type multi nếu muốn nhiều`);
    }
    for (const n of picked) {
      if (!Number.isInteger(n) || n < 0 || n >= q.options.length) {
        errors.push(`${at}: answer ${raw.answer} nằm ngoài options (chỉ số 0..${q.options.length - 1})`);
      }
    }
    if (new Set(picked).size !== picked.length) errors.push(`${at}: answer lặp chỉ số`);
    if (q.options.length && picked.length === q.options.length) {
      warnings.push(`${at}: mọi đáp án đều đúng — câu này không phân loại được ai hiểu bài`);
    }

    q.answer = [...new Set(picked)].sort((a, b) => a - b);
    return q;
  }

  // fill | output — so khớp chuỗi, cho phép nhiều cách viết đúng
  q.answer = asArray(raw.answer).map(String).filter((s) => s.trim() !== "");
  if (!q.answer.length) errors.push(`${at}: thiếu answer`);
  if (raw.caseSensitive) q.caseSensitive = true;
  return q;
}

/** raw YAML -> {quiz, errors, warnings}. Không throw để báo được nhiều lỗi một lượt. */
export function normalizeQuiz(raw, lessonPath) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {quiz: null, errors: ["file rỗng hoặc không phải YAML dạng map"], warnings};
  }

  const list = asArray(raw.questions);
  if (!list.length) errors.push("không có câu hỏi nào");
  else if (list.length < 5) warnings.push(`chỉ có ${list.length} câu — nên từ 5 câu trở lên`);

  const seen = new Set();
  const questions = list
    .map((q, i) => normalizeQuestion(q && typeof q === "object" ? q : {}, i, seen, errors, warnings))
    .filter(Boolean);

  const pass = Number(raw.pass ?? 70);

  // `serve` quyết định quiz được chấm ở đâu, và đó là một lựa chọn đánh đổi:
  //   static — nhúng vào page data, chạy được cả khi không có mạng lẫn DB,
  //            nhưng đáp án nằm trong HTML và không ghi lại được điểm.
  //   db     — chỉ đọc từ Supabase, chấm bằng RPC. Đáp án ở lại server, có
  //            điểm, có hàng đợi ôn tập, có bảng xếp hạng. Bộ đề nào dùng để
  //            thi đua thì phải chọn cái này.
  const serve = raw.serve === "db" ? "db" : "static";
  if (raw.serve !== undefined && !["db", "static"].includes(raw.serve)) {
    errors.push(`serve "${raw.serve}" không hợp lệ — chỉ nhận "static" hoặc "db"`);
  }

  // Mặc định trộn: làm lại lần hai mà thứ tự y hệt thì rất dễ nhớ "câu này chọn
  // ô thứ ba" thay vì nhớ kiến thức. Đặt false khi thứ tự là một phần của đề —
  // đề in sẵn, nơi người học tra chéo với bản gốc theo chữ cái A/B/C/D.
  const shuffle = raw.shuffle !== false;

  const quiz = {
    lessonPath,
    serve,
    shuffle,
    title: String(raw.title || "Tự kiểm tra"),
    pass: Number.isFinite(pass) ? Math.min(100, Math.max(0, Math.round(pass))) : 70,
    generated: raw.generated ? String(raw.generated) : null,
    reviewed: raw.reviewed === true,
    sourceHash: raw.source_hash ? String(raw.source_hash) : null,
    questions
  };

  return {quiz, errors, warnings};
}

export function readQuizFile(file, lessonPath) {
  let raw;
  try {
    raw = parseYaml(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    return {quiz: null, errors: [`YAML lỗi: ${String(e.message).split("\n")[0]}`], warnings: []};
  }
  return normalizeQuiz(raw, lessonPath);
}

/** Liệt kê mọi file .quiz.yml dưới một thư mục (đường dẫn tương đối so với root). */
export function collectQuizFiles(root, dir = "notes") {
  const out = [];
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;

  for (const entry of fs.readdirSync(abs, {withFileTypes: true})) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectQuizFiles(root, rel));
    else if (entry.name.endsWith(".quiz.yml")) out.push(rel);
  }
  return out.sort();
}
