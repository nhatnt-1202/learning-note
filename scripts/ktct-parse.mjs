#!/usr/bin/env node
// Bóc 303 câu trắc nghiệm từ PDF ngân hàng câu hỏi KTCT ra JSON.
//
//   node scripts/ktct-parse.mjs > data/ktct-bank.json
//
// Đầu vào là `pdftotext -layout`, không phải chế độ mặc định: bản gốc có những
// câu xếp đáp án thành 2–4 cột trên cùng một dòng, chỉ chế độ -layout mới giữ
// lại khoảng trắng đủ để tách cột ra.
//
// Việc duy nhất của file này là bóc tách — không sắp xếp, không đoán đáp án.
// Đáp án do các model giải ở bước sau (scripts/ktct-solve.mjs).

import {execFileSync} from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PDF = path.join(ROOT, "data", "KTCT ngan hang cau hoi cho sinh vien (303 câu) 1.pdf");

const LETTERS = ["A", "B", "C", "D"];

// Dòng trang trí lặp ở mọi trang, không thuộc câu hỏi nào.
const NOISE = [
  /^BỘ GIÁO DỤC/i,
  /^NGÂN HÀNG CÂU HỎI/i,
  /^TRƯỜNG ĐẠI HỌC/i,
  /^Môn:\s*Kinh tế chính trị/i,
  /^Trang\s*\d+\s*\/\s*\d+$/i,
  /^-+\s*HẾT\s*-+$/i,
  /^Lưu ý:/i,
  /^Chọn phương án \(A hoặc B/i
];

/** "A. x    B. y" -> ["A. x", "B. y"]. Cột cách nhau bằng ít nhất 2 khoảng trắng. */
function splitColumns(line) {
  return line.split(/\s{2,}(?=[A-D]\.\s)/).map((s) => s.trim()).filter(Boolean);
}

function parse(text) {
  const questions = [];
  let part = null;
  let cur = null;      // câu đang gom
  let sink = null;     // {kind:'prompt'} | {kind:'option', letter}

  const flushDone = () => {
    if (cur) questions.push(cur);
    cur = null;
    sink = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || NOISE.some((re) => re.test(line))) continue;

    const mPart = line.match(/^Phần\s+([IVX]+)\s*:/);
    if (mPart) {
      flushDone();
      part = mPart[1];
      continue;
    }

    const mQ = line.match(/^Câu\s+(\d+)\s*[:.]\s*(.*)$/);
    if (mQ) {
      flushDone();
      cur = {part, num: Number(mQ[1]), prompt: mQ[2].trim(), options: {}};
      sink = {kind: "prompt"};
      continue;
    }

    if (!cur) continue;

    // Dòng đáp án: có thể chứa 1–4 cột.
    if (/^[A-D]\.\s/.test(line)) {
      for (const col of splitColumns(line)) {
        const m = col.match(/^([A-D])\.\s*(.*)$/);
        if (!m) continue;
        cur.options[m[1]] = m[2].trim();
        sink = {kind: "option", letter: m[1]};
      }
      continue;
    }

    // Dòng tràn: nối vào chỗ vừa ghi. Bản gốc ngắt dòng giữa câu rất nhiều,
    // kể cả giữa một đáp án, nên không nối thì mất hẳn nửa nội dung.
    if (sink.kind === "prompt") cur.prompt += " " + line;
    else cur.options[sink.letter] += " " + line;
  }
  flushDone();

  return questions.map((q, i) => ({
    id: `ktct-${String(i + 1).padStart(3, "0")}`,
    part: q.part,
    num: q.num,
    prompt: q.prompt.replace(/\s+/g, " ").trim(),
    options: LETTERS.map((L) => (q.options[L] ?? "").replace(/\s+/g, " ").trim())
  }));
}

const text = execFileSync("pdftotext", ["-layout", PDF, "-"], {
  encoding: "utf-8",
  maxBuffer: 32 * 1024 * 1024
});

const bank = parse(text);

// Kiểm tra ngay tại đây thay vì để lỗi trôi xuống bước giải: một câu thiếu đáp
// án D mà vẫn đem đi giải thì model sẽ chọn trong 3 phương án và chắc chắn sai.
const bad = bank.filter(
  (q) => !q.prompt || q.options.some((o) => !o) || new Set(q.options).size !== 4
);
if (bad.length) {
  console.error(`⚠ ${bad.length} câu bóc tách lỗi:`);
  for (const q of bad.slice(0, 10)) {
    console.error(`  ${q.id} (Phần ${q.part}, câu ${q.num}): ${q.prompt.slice(0, 70)}`);
    console.error(`    options: ${JSON.stringify(q.options)}`);
  }
}
console.error(`✓ ${bank.length} câu — Phần ${[...new Set(bank.map((q) => q.part))].join(", ")}`);
process.stdout.write(JSON.stringify(bank, null, 2) + "\n");
