<script setup>
const start = {
  html: `<h1>Sân chơi</h1>
<p>Viết gì cũng được. Ba tab HTML / CSS / JS sẽ được ghép thành một trang.</p>
<button id="go">Chạy thử</button>
<ul id="out"></ul>`,
  css: `body {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
h1 {
  color: #3451b2;
}
#out li {
  font-family: ui-monospace, monospace;
}`,
  js: `document.getElementById("go").addEventListener("click", function () {
  const out = document.getElementById("out");
  out.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const li = document.createElement("li");
    li.textContent = i + " x 7 = " + i * 7;
    out.appendChild(li);
  }
  console.log("Đã in", 5, "dòng");
});`
}
</script>

# Sân chơi tự do

Editor trống để thử nghiệm. Không lưu lại khi tải lại trang — cần giữ thì copy
ra file.

<CodePlayground title="Sandbox" :html="start.html" :css="start.css" :js="start.js" :height="420" :console="true" />

## Mẹo dùng

| Việc | Cách làm |
|---|---|
| Xem giá trị biến | `console.log(x)` — hiện ở khung Console dưới cùng |
| Xem toàn màn hình | Bấm **↗ Tab mới** |
| Kéo dài ô soạn thảo | Kéo góc dưới-phải của textarea |
| Thụt dòng | Phím `Tab` chèn 2 dấu cách (không nhảy focus) |
| Bắt đầu lại | **↺ Đặt lại** |

Lưu ý sandbox: iframe chạy với `allow-scripts allow-modals allow-forms
allow-popups` nhưng **không** có `allow-same-origin`. Nghĩa là `alert`,
`confirm`, `prompt`, form và `window.open` đều chạy được, còn `localStorage`,
`document.cookie` và fetch cùng origin thì không.
