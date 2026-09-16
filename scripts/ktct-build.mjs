#!/usr/bin/env node
// Dựng bộ đề KTCT trong notes/ktct/ từ kết quả đã đối chiếu chéo.
//
//   node scripts/ktct-build.mjs <work-dir>
//
// Đọc merged.json (phiếu của các model) và verdicts.json (phán quyết cho những
// câu không nhất trí), rồi ghi ra mỗi chủ đề một bài + một file .quiz.yml.
//
// Đề ghi ra dùng `serve: db`: đáp án không được nhúng vào trang. Bộ này dùng để
// tính điểm và xếp hạng nên phải chấm ở server — xem quiz-data.mjs.

import fs from "node:fs";
import path from "node:path";
import {dump as toYaml} from "js-yaml";
import {hashLesson} from "../.vitepress/quiz/quiz-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const WORK = process.argv[2];
if (!WORK) {
  console.error("Thiếu tham số: node scripts/ktct-build.mjs <work-dir>");
  process.exit(2);
}

const OUT_DIR = path.join(ROOT, "notes", "ktct");
const LETTERS = ["A", "B", "C", "D"];

// Thứ tự ở đây là thứ tự chương trong giáo trình, nên cũng là thứ tự sidebar.
const TOPICS = [
  {
    id: "nhap-mon",
    slug: "01-nhap-mon",
    title: "Nhập môn Kinh tế chính trị Mác - Lênin",
    blurb:
      "Đối tượng, phương pháp và chức năng của môn học; các trường phái kinh tế chính trị trước Mác và quá trình hình thành lý luận."
  },
  {
    id: "hang-hoa-tien-te",
    slug: "02-hang-hoa-thi-truong-tien-te",
    title: "Hàng hoá, thị trường và tiền tệ",
    blurb:
      "Hai thuộc tính của hàng hoá, lao động cụ thể và lao động trừu tượng, lượng giá trị, các chức năng của tiền, quy luật giá trị, cung - cầu và cạnh tranh."
  },
  {
    id: "gia-tri-thang-du",
    slug: "03-gia-tri-thang-du",
    title: "Giá trị thặng dư trong nền kinh tế thị trường",
    blurb:
      "Sức lao động, tư bản bất biến và khả biến, m và m', giá trị thặng dư tuyệt đối - tương đối - siêu ngạch, tuần hoàn và chu chuyển tư bản, lợi nhuận, địa tô."
  },
  {
    id: "doc-quyen",
    slug: "04-canh-tranh-va-doc-quyen",
    title: "Cạnh tranh và độc quyền trong kinh tế thị trường",
    blurb:
      "Năm đặc điểm của chủ nghĩa tư bản độc quyền, các hình thức tổ chức độc quyền, tư bản tài chính, xuất khẩu tư bản, độc quyền nhà nước và chủ nghĩa tư bản ngày nay."
  },
  {
    id: "kinh-te-thi-truong-xhcn",
    slug: "05-kinh-te-thi-truong-dinh-huong-xhcn",
    title: "Kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam",
    blurb:
      "Tính tất yếu, các đặc trưng, thể chế kinh tế thị trường định hướng XHCN và nội dung hoàn thiện thể chế."
  },
  {
    id: "loi-ich-kinh-te",
    slug: "06-quan-he-loi-ich-kinh-te",
    title: "Quan hệ lợi ích kinh tế ở Việt Nam",
    blurb:
      "Bản chất lợi ích kinh tế, các quan hệ lợi ích trong nền kinh tế thị trường, mâu thuẫn lợi ích và vai trò của Nhà nước trong bảo đảm hài hoà lợi ích."
  },
  {
    id: "cnh-hdh",
    slug: "07-cong-nghiep-hoa-hien-dai-hoa",
    title: "Công nghiệp hoá, hiện đại hoá ở Việt Nam",
    blurb:
      "Bốn cuộc cách mạng công nghiệp, các mô hình công nghiệp hoá, nội dung và đặc điểm công nghiệp hoá - hiện đại hoá ở Việt Nam, kinh tế tri thức."
  },
  {
    id: "hoi-nhap",
    slug: "08-hoi-nhap-kinh-te-quoc-te",
    title: "Hội nhập kinh tế quốc tế của Việt Nam",
    blurb:
      "Toàn cầu hoá và tính tất yếu của hội nhập, nội dung hội nhập, tác động hai mặt, và xây dựng nền kinh tế độc lập tự chủ."
  }
];

const merged = JSON.parse(fs.readFileSync(path.join(WORK, "merged.json"), "utf-8"));

const verdictFile = path.join(WORK, "verdicts.json");
const verdicts = fs.existsSync(verdictFile)
  ? new Map(JSON.parse(fs.readFileSync(verdictFile, "utf-8")).map((v) => [v.id, v]))
  : new Map();

// ── Chốt từng câu ───────────────────────────────────────────────────────────

const unresolved = [];
const rows = [];

for (const r of merged) {
  const v = verdicts.get(r.id);

  // Phán quyết (nếu có) luôn thắng phiếu: nó được đưa ra khi đã nhìn thấy đủ
  // lập luận của các model, còn phiếu thì không.
  // merge ghi "AB", người phân xử ghi ["A","B"] — nhận cả hai.
  const letters = [...new Set(
    []
      .concat(v?.answer ?? r.answer ?? [])
      .join("")
      .toUpperCase()
      .split("")
      .filter((c) => LETTERS.includes(c))
  )].sort();

  if (!letters.length) {
    unresolved.push(r.id);
    continue;
  }

  const topic = v?.topic || r.topic;
  rows.push({
    id: r.id,
    part: r.part,
    num: r.num,
    topic: TOPICS.some((t) => t.id === topic) ? topic : "nhap-mon",
    prompt: r.prompt,
    options: r.options,
    answer: letters.map((L) => LETTERS.indexOf(L)).sort((a, b) => a - b),
    // Câu nhiều đáp án đúng phải là type multi, nếu không thì DB từ chối ghi
    // (questions_validate) — và đúng ra là phải thế.
    type: letters.length > 1 ? "multi" : "single",
    why: (v?.why || r.why || "").trim(),
    voters: Object.keys(r.votes ?? {}),
    // Dấu vết để tra ngược: câu này ai chốt, và có phải bản gốc đề không.
    tags: [
      `phan-${String(r.part).toLowerCase()}`,
      `goc-cau-${r.num}`,
      v ? "phan-xu" : "nhat-tri",
      ...(v?.flag ? [v.flag] : [])
    ]
  });
}

// ── Ghi ra file ─────────────────────────────────────────────────────────────

function lessonPage(t, n) {
  return `# ${t.title}

${t.blurb}

::: tip Bộ đề này đến từ đâu
${n} câu rút từ *Ngân hàng câu hỏi ôn tập môn Kinh tế chính trị Mác - Lênin*
(303 câu, Trường Đại học Xây dựng Hà Nội). Đề gốc **không kèm đáp án** — đáp án ở
đây do ba model giải độc lập rồi đối chiếu chéo, câu nào lệch nhau thì phân xử
riêng. Vẫn nên đối chiếu giáo trình ở những câu bạn thấy nghi ngờ.
:::

Làm bài xong, câu nào sai sẽ được hẹn ôn lại ở [trang Quiz](/notes/quiz/), và
điểm được tính vào [bảng xếp hạng](/notes/quiz/#bang-xep-hang).

<Quiz />
`;
}

fs.mkdirSync(OUT_DIR, {recursive: true});

// Dọn sạch trước khi ghi. Không dọn thì một chương bị gộp đi vẫn để lại
// .quiz.yml mồ côi, và quiz:import sẽ đẩy nguyên nó lên DB thành đề trùng.
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".quiz.yml") || f.endsWith(".md")) fs.rmSync(path.join(OUT_DIR, f));
}

const summary = [];

// Chương quá ít câu thì không thành một đề — gộp về chương hàng hoá, nơi phần
// lớn kiến thức nền của môn nằm ở đó.
const FALLBACK = "hang-hoa-tien-te";
const MIN = 5;
for (const t of TOPICS) {
  if (t.id === FALLBACK) continue;
  const list = rows.filter((r) => r.topic === t.id);
  if (list.length && list.length < MIN) {
    console.log(`· gộp ${list.length} câu của ${t.id} vào ${FALLBACK} (dưới ${MIN} câu)`);
    for (const r of list) r.topic = FALLBACK;
  }
}

for (const t of TOPICS) {
  const list = rows.filter((r) => r.topic === t.id);
  if (!list.length) {
    summary.push({...t, n: 0});
    continue;
  }

  // Giữ nguyên thứ tự trong ngân hàng gốc để còn dò ngược lại được.
  list.sort((a, b) => a.id.localeCompare(b.id));

  const md = lessonPage(t, list.length);
  fs.writeFileSync(path.join(OUT_DIR, `${t.slug}.md`), md);

  const quiz = {
    title: `KTCT — ${t.title}`,
    serve: "db",
    // Giữ nguyên thứ tự đáp án của đề gốc: người học tra chéo với bản in và nói
    // chuyện với nhau bằng "câu 7 chọn A", nên chữ cái hiển thị phải khớp.
    shuffle: false,
    pass: 70,
    // Ghi đúng những model thật sự đã bỏ phiếu cho đề này — hai chunk cuối do
    // Fable giải thay Haiku, và đề nào cũng phải nói đúng nguồn gốc của nó.
    generated: [...new Set(list.flatMap((r) => r.voters))].sort().join(" + ") +
      " (giải độc lập rồi đối chiếu chéo)",
    reviewed: false,
    // Câu hỏi đến từ PDF chứ không từ bài, nên hash này chỉ nói "trang giới
    // thiệu có bị sửa tay sau khi dựng đề không" — vẫn đáng giữ, vì trang đó mô
    // tả bộ đề đến từ đâu.
    source_hash: hashLesson(md),
    questions: list.map((r) => ({
      id: r.id,
      type: r.type,
      q: r.prompt,
      options: r.options,
      answer: r.answer.length === 1 ? r.answer[0] : r.answer,
      why: r.why,
      tags: r.tags
    }))
  };

  fs.writeFileSync(
    path.join(OUT_DIR, `${t.slug}.quiz.yml`),
    toYaml(quiz, {lineWidth: -1, noRefs: true})
  );

  summary.push({...t, n: list.length});
}

// Trang mục lục của cả phần.
const index = `# Kinh tế chính trị Mác - Lênin

Ngân hàng ${rows.length} câu trắc nghiệm, chia theo chương của giáo trình.

| Chương | Số câu |
|---|---|
${summary
  .filter((s) => s.n)
  .map((s) => `| [${s.title}](/notes/ktct/${s.slug}) | ${s.n} |`)
  .join("\n")}

Điểm, hàng đợi ôn tập và bảng xếp hạng nằm ở [trang Quiz](/notes/quiz/).
`;
fs.writeFileSync(path.join(OUT_DIR, "index.md"), index);

// ── Báo cáo ─────────────────────────────────────────────────────────────────

console.log(`Đã ghi ${OUT_DIR}`);
for (const s of summary) console.log(`  ${String(s.n).padStart(3)} câu  ${s.slug}`);
console.log(`  ${String(rows.length).padStart(3)} câu  tổng`);

const multi = rows.filter((r) => r.type === "multi");
const judged = rows.filter((r) => r.tags.includes("phan-xu"));
console.log(`\nCâu nhiều đáp án : ${multi.length}${multi.length ? " — " + multi.map((r) => r.id).join(", ") : ""}`);
console.log(`Câu qua phân xử  : ${judged.length}`);
const noWhy = rows.filter((r) => !r.why);
if (noWhy.length) console.log(`⚠ Thiếu lời giải : ${noWhy.map((r) => r.id).join(", ")}`);
if (unresolved.length) console.log(`⚠ Chưa có đáp án : ${unresolved.join(", ")}`);
process.exit(unresolved.length ? 1 : 0);
