#!/usr/bin/env node
// Kiểm tra renderer markdown của quiz: nội dung câu hỏi đến từ DB, do người
// dùng khác viết, và được đưa ra DOM bằng v-html — nên "không nhả HTML thô" là
// tính chất bảo mật, phải có test giữ.
//
//   npm run test:md
//
// esbuild có sẵn (vite phụ thuộc trực tiếp vào nó) nên không cần thêm dependency
// chỉ để dịch một file .ts.

import {build} from "esbuild";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const bundled = await build({
  entryPoints: [path.join(ROOT, ".vitepress/theme/lib/md.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral"
});

const {renderMd} = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);

// Bỏ hết thẻ được phép ra, phần còn lại không được chứa dấu "<" nào — nếu còn
// thì có HTML của người viết chui ra ngoài.
const ALLOWED = /<\/?(?:p|br|code|pre|strong|em|a)(?:\s+(?:class|href|rel)="[^"]*")*\s*\/?>/g;

const cases = [
  ["<script>alert(1)</script>", "thẻ script"],
  ["<img src=x onerror=alert(1)>", "thẻ img onerror"],
  ["<iframe src=//evil></iframe>", "iframe"],
  ["<a href=\"javascript:alert(1)\">x</a>", "thẻ a thô"],
  ["[bấm](javascript:alert(1))", "link javascript:"],
  ["[bấm](data:text/html,<script>)", "link data:"],
  ["<svg/onload=alert(1)>", "svg onload"],
  ["`<script>x</script>`", "HTML trong code inline"],
  ["```html\n<script>x</script>\n```", "HTML trong code block"],
  ["dùng `**a**` chứ không phải **b**", "code inline giữ nguyên **"],
  ["Đoạn 1\n\n```js\nvar a = 1 < 2;\n```\n\nĐoạn 2", "code block giữa hai đoạn"],
  ["[bài 6](/notes/web/06-x) và [ngoài](https://a.dev)", "link được phép"]
];

let failed = 0;

for (const [src, ten] of cases) {
  const out = renderMd(src);
  const problems = [];

  if (out.replace(ALLOWED, "").includes("<")) problems.push("còn HTML thô");
  if (/href="(?!https?:\/\/|\/)/i.test(out)) problems.push("href có scheme lạ");
  if (/\u0001/.test(out)) problems.push("còn chỗ giữ chỗ chưa khôi phục");

  if (problems.length) {
    failed++;
    console.log(`✗ ${ten}: ${problems.join(", ")}\n    ${out}`);
  } else {
    console.log(`✓ ${ten}`);
  }
}

// Vài tính chất về nội dung, không phải bảo mật
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.log(`✗ ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
};

ok(
  renderMd("dùng `**a**` chứ không phải **b**").includes("<code>**a**</code>"),
  "code inline không bị hiểu là chữ đậm"
);
ok(
  renderMd("```js\nvar a = 1;\n```").includes('class="language-js"'),
  "code block giữ tên ngôn ngữ"
);
ok(renderMd("a\n\nb") === "<p>a</p><p>b</p>", "hai đoạn thành hai thẻ p");

console.log(`\n${cases.length + 3} kiểm tra · ${failed} lỗi`);
process.exit(failed ? 1 : 0);
