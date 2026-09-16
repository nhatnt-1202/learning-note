#!/usr/bin/env node
// Gộp phiếu của các model và tách ra những câu cần phân xử.
//
//   node scripts/ktct-merge.mjs <work-dir>
//
// work-dir chứa bank.json và solve/<model>-<chunk>.json do ktct-solve sinh ra.
// Ghi ra merged.json (mọi câu, kèm phiếu) và disputes.txt (câu chưa đồng thuận,
// định dạng để đưa thẳng cho model phân xử đọc).
//
// Nguyên tắc: **nhất trí tuyệt đối mới được đi thẳng**. Đa số 2/3 vẫn phải phân
// xử — bộ đề này có rất nhiều câu "chọn đáp án SAI", và khi một model đọc nhầm
// chiều câu hỏi thì hai model còn lại cũng dễ nhầm y hệt. Đa số ở đây không
// phải bằng chứng đủ mạnh.

import fs from "node:fs";
import path from "node:path";

const WORK = process.argv[2];
if (!WORK) {
  console.error("Thiếu tham số: node scripts/ktct-merge.mjs <work-dir>");
  process.exit(2);
}

const bank = JSON.parse(fs.readFileSync(path.join(WORK, "bank.json"), "utf-8"));
const byId = new Map(bank.map((q) => [q.id, q]));

// { id -> { model -> vote } }
const votes = new Map(bank.map((q) => [q.id, {}]));
const models = new Set();
const missing = [];

for (const file of fs.readdirSync(path.join(WORK, "solve")).sort()) {
  const m = file.match(/^([a-z0-9.-]+)-(\d+)\.json$/i);
  if (!m) continue;
  const model = m[1];
  models.add(model);

  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(path.join(WORK, "solve", file), "utf-8"));
  } catch (e) {
    console.error(`✗ ${file}: JSON hỏng — ${e.message.slice(0, 80)}`);
    continue;
  }

  for (const r of rows) {
    if (!votes.has(r.id)) {
      console.error(`✗ ${file}: id lạ ${r.id}`);
      continue;
    }
    // Chuẩn hoá về chuỗi chữ cái đã sắp: "A" và ["A"] phải so sánh được với nhau.
    const letters = [...new Set([].concat(r.answer ?? []).map((s) => String(s).trim().toUpperCase()))]
      .filter((s) => "ABCD".includes(s))
      .sort();
    votes.get(r.id)[model] = {
      answer: letters.join(""),
      multi: letters.length > 1,
      topic: String(r.topic ?? "").trim(),
      confidence: String(r.confidence ?? "medium").trim(),
      why: String(r.why ?? "").trim()
    };
  }
}

const MODELS = [...models].sort();

/** Giá trị xuất hiện nhiều nhất; hoà thì lấy theo thứ tự model ưu tiên. */
function majority(list, prefer) {
  const count = new Map();
  for (const v of list) count.set(v, (count.get(v) ?? 0) + 1);
  let best = null;
  let bestN = 0;
  for (const [v, n] of count) {
    if (n > bestN) [best, bestN] = [v, n];
  }
  if ([...count.values()].filter((n) => n === bestN).length > 1) return prefer ?? best;
  return best;
}

// Một số câu hỏi về đối tượng / chức năng / lịch sử hình thành của môn học —
// không thuộc chương nào trong 7 mã, model nào cũng phải xếp bừa. Nhận ra bằng
// từ khoá ở đây rẻ và ổn định hơn là bắt model đoán.
const NHAP_MON =
  /đối tượng nghiên cứu|phương pháp nghiên cứu|chức năng của kinh tế chính trị|thuật ngữ|chủ nghĩa trọng thương|trọng nông|kinh tế chính trị tư sản cổ điển|montchr|quesnay|thomas mun|a\.? smith|ricardo|lịch sử hình thành|ra đời của kinh tế chính trị/i;

const merged = [];
const disputes = [];

for (const q of bank) {
  const v = votes.get(q.id);
  const present = MODELS.filter((m) => v[m]);

  if (!present.length) {
    missing.push(q.id);
    continue;
  }

  const answers = present.map((m) => v[m].answer);
  const agreed = new Set(answers).size === 1;
  const lowSomewhere = present.some((m) => v[m].confidence === "low");

  let topic = majority(present.map((m) => v[m].topic));
  if (NHAP_MON.test(q.prompt)) topic = "nhap-mon";

  const row = {
    id: q.id,
    part: q.part,
    num: q.num,
    prompt: q.prompt,
    options: q.options,
    topic,
    votes: Object.fromEntries(present.map((m) => [m, v[m]])),
    voters: present.length,
    // Nhất trí và không model nào kêu "low" mới được nhận thẳng.
    status: agreed && !lowSomewhere ? "agreed" : "disputed",
    answer: agreed ? answers[0] : null,
    multi: agreed ? v[present[0]].multi : null,
    // Lời giải thích lấy của model đầu tiên chắc chắn nhất, chưa phải bản cuối.
    why: agreed
      ? (present.find((m) => v[m].confidence === "high") ?? present[0]) &&
        v[present.find((m) => v[m].confidence === "high") ?? present[0]].why
      : null
  };

  merged.push(row);
  if (row.status === "disputed") disputes.push(row);
}

fs.writeFileSync(path.join(WORK, "merged.json"), JSON.stringify(merged, null, 2) + "\n");

// Hồ sơ phân xử: câu hỏi + từng phiếu kèm lý do. Model phân xử cần thấy lập
// luận của các model kia, không chỉ thấy chúng chọn gì.
const doc = disputes
  .map((r) => {
    const opts = "ABCD".split("").map((L, i) => `${L}. ${r.options[i]}`).join("\n");
    const cast = Object.entries(r.votes)
      .map(([m, x]) => `  - ${m} chọn ${x.answer} (${x.confidence}): ${x.why}`)
      .join("\n");
    return `[${r.id}]\n${r.prompt}\n${opts}\n\nPhiếu:\n${cast}`;
  })
  .join("\n\n---\n\n");
fs.writeFileSync(path.join(WORK, "disputes.txt"), doc + "\n");

const byVoters = merged.reduce((a, r) => ((a[r.voters] = (a[r.voters] ?? 0) + 1), a), {});
console.log(`Model: ${MODELS.join(", ")}`);
console.log(`Câu có phiếu: ${merged.length}/${bank.length}` + (missing.length ? ` — thiếu hẳn: ${missing.length}` : ""));
console.log(`Số phiếu mỗi câu: ${Object.entries(byVoters).map(([k, n]) => `${k} phiếu × ${n} câu`).join(", ")}`);
console.log(`Nhất trí       : ${merged.filter((r) => r.status === "agreed").length}`);
console.log(`Phải phân xử   : ${disputes.length}  → disputes.txt`);
if (missing.length) console.log(`Chưa có phiếu  : ${missing.join(", ")}`);
