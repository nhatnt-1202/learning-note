<script setup>
const ex1 = {
  html: `<p>Rê chuột, bấm, gõ… rồi xem Console.</p>
<button id="nut">Bấm tôi</button>
<input id="o" placeholder="gõ vào đây rồi Tab ra">`,
  js: `const nut = document.getElementById("nut");

nut.addEventListener("click", function (e) {
  console.log("--- Đối tượng Event ---");
  console.log("type    :", e.type);
  console.log("target  :", e.target.tagName);
  console.log("clientX :", e.clientX, "clientY:", e.clientY);
  console.log("phím phụ:", "shift=" + e.shiftKey, "ctrl=" + e.ctrlKey);
});

const o = document.getElementById("o");
o.addEventListener("focus",  () => console.log("onFocus  — vào ô"));
o.addEventListener("blur",   () => console.log("onBlur   — rời ô"));
o.addEventListener("change", e => console.log("onChange — giá trị mới:", e.target.value));
o.addEventListener("input",  e => console.log("oninput  — gõ từng ký tự:", e.target.value));`
}
const ex2 = {
  html: `<style>
  a { display:inline-block; padding:4px 8px; border:1px solid #ccc; margin:2px }
<\/style>
<form>
  <input type="text" size="45" style="padding:4px">
</form>

<a href="#" onmouseover="showLink(1)" onmouseout="clearLink()">Aptech</a>
<a href="#" onmouseover="showLink(2)" onmouseout="clearLink()">Asset</a>
<a href="#" onmouseover="showLink(3)" onmouseout="clearLink()">Arena</a>`,
  js: `// Bản gốc trong slide: ba lệnh if lặp gần y hệt nhau
function showLink(num) {
  if (num == 1) {
    document.forms[0].elements[0].value = "You have selected Aptech";
  }
  if (num == 2) {
    document.forms[0].elements[0].value = "You have selected Asset";
  }
  if (num == 3) {
    document.forms[0].elements[0].value = "You have selected Arena";
  }
}

function clearLink() {
  document.forms[0].elements[0].value = "";
}

// Cách viết gọn hơn — dữ liệu tách khỏi logic:
// const TEN = ["", "Aptech", "Asset", "Arena"];
// const showLink = n => document.forms[0].elements[0].value =
//   "You have selected " + TEN[n];`
}
const ex3 = {
  html: `<h3>Máy tính bỏ túi (ví dụ gốc của slide)</h3>
<form id="fm">
  Enter an expression:
  <input type="text" name="expr" size="15" value="2 + 3 * 4"><br><br>
  <input type="button" value="Calculate" id="tinh"><br><br>
  Result:
  <input type="text" name="result" size="15">
</form>`,
  js: `const fm = document.getElementById("fm");

document.getElementById("tinh").onclick = function () {
  if (confirm("Are you sure?")) {
    // Bản gốc: form.result.value = eval(form.expr.value)
    fm.result.value = eval(fm.expr.value);
    console.log("eval →", fm.result.value);
  } else {
    alert("Please come back again.");
  }
};

// Vì sao KHÔNG nên dùng eval ở đây: thử gõ vào ô biểu thức
//   document.body.innerHTML = "bị chiếm quyền"
// rồi bấm Calculate. eval chạy nó như code thật.
//
// Bản an toàn — chỉ chấp nhận số và 4 phép tính:
function tinhAnToan(bieuThuc) {
  if (!/^[\\d\\s+\\-*/().]+$/.test(bieuThuc)) return "Biểu thức không hợp lệ";
  try {
    return Function('"use strict"; return (' + bieuThuc + ')')();
  } catch (e) {
    return "Lỗi cú pháp";
  }
}
console.log("tinhAnToan('2+3*4') =", tinhAnToan("2+3*4"));
console.log("tinhAnToan(mã độc) =", tinhAnToan("document.body.innerHTML=1"));`
}
const ex4 = {
  html: `<form>
  Please enter a number:
  <input type="text" size="8" id="so">
</form>
<p><small>Gõ giá trị rồi bấm Tab / bấm ra ngoài để kích hoạt onChange.</small></p>`,
  js: `// Ví dụ trong slide
function checkNum(num) {
  if (num == "") {
    alert("Please enter a number");
    return false;
  }
  if (isNaN(num)) {
    alert("Please enter a numeric value");
    return false;
  }
  alert("Thank you");
  return true;
}

document.getElementById("so").onchange = function () {
  console.log("checkNum →", checkNum(this.value));
};`
}
const ex5 = {
  html: `<h4>Ba cách gắn trình xử lý sự kiện</h4>

<!-- Cách 1: thuộc tính của thẻ HTML -->
<button onclick="console.log('1. Thuộc tính HTML onclick')">Cách 1</button>

<button id="b2">Cách 2</button>
<button id="b3">Cách 3</button>

<p id="log"></p>`,
  js: `// Cách 2: thuộc tính của đối tượng — object.eventhandler = function
document.getElementById("b2").onclick = function () {
  console.log("2. Thuộc tính đối tượng: el.onclick = f");
};
// Nhược điểm: gán cái thứ hai sẽ ĐÈ MẤT cái thứ nhất
document.getElementById("b2").onclick = function () {
  console.log("2b. Cái này đè mất cái trên");
};

// Cách 3 (hiện đại): addEventListener — gắn được NHIỀU handler
const b3 = document.getElementById("b3");
b3.addEventListener("click", () => console.log("3a. handler thứ nhất"));
b3.addEventListener("click", () => console.log("3b. handler thứ hai — cả hai cùng chạy"));`
}
const ex6 = {
  html: `<p>Bấm nút để xem thông tin từ các đối tượng trình duyệt.</p>
<button id="w">window</button>
<button id="d">document</button>
<button id="n">navigator</button>
<button id="s">screen</button>
<button id="l">location</button>
<button id="h">history</button>`,
  js: `const p = (nhan, o, keys) => {
  console.log("--- " + nhan + " ---");
  keys.forEach(k => console.log("  " + k + " =", o[k]));
};

document.getElementById("w").onclick = () =>
  p("window", window, ["innerWidth", "innerHeight", "name", "closed"]);

document.getElementById("d").onclick = () => {
  p("document", document, ["title", "URL", "characterSet", "readyState"]);
  console.log("  số form   :", document.forms.length);
  console.log("  số ảnh    :", document.images.length);
  console.log("  số liên kết:", document.links.length);
};

document.getElementById("n").onclick = () =>
  p("navigator", navigator, ["language", "onLine", "cookieEnabled", "platform"]);

document.getElementById("s").onclick = () =>
  p("screen", screen, ["width", "height", "availWidth", "colorDepth"]);

document.getElementById("l").onclick = () =>
  p("location", location, ["href", "protocol", "host", "pathname", "hash"]);

document.getElementById("h").onclick = () => {
  console.log("--- history ---");
  console.log("  length =", history.length);
  console.log("  history.back() / forward() / go(n) để điều hướng");
};`
}
const ex7 = {
  html: `<h4>window.onresize</h4>
<p>Kéo đường chia giữa editor và khung xem trước, hoặc kéo góc dưới-phải
   của ô soạn thảo, để đổi kích thước.</p>
<p id="kt" style="font-family:monospace;font-size:1.1rem"></p>`,
  js: `// Ví dụ gốc trong slide dùng alert — ở đây in ra để khỏi phiền
// window.onresize = notify;
// function notify() { alert("Window resized!"); }

function notify() {
  document.getElementById("kt").textContent =
    window.innerWidth + " x " + window.innerHeight;
  console.log("resize →", window.innerWidth, "x", window.innerHeight);
}

window.onresize = notify;
notify();`
}
const ex8 = {
  html: `<h4>Bốn cách chọn phần tử trong DOM</h4>
<div id="hop">
  <p class="dong">Đoạn 1</p>
  <p class="dong">Đoạn 2</p>
  <p>Đoạn 3 (không có class)</p>
</div>
<button id="chay">Chạy thử</button>`,
  js: `document.getElementById("chay").onclick = function () {
  console.log("getElementById  :", document.getElementById("hop").tagName);
  console.log("getElementsByClassName:", document.getElementsByClassName("dong").length);
  console.log("querySelector   :", document.querySelector(".dong").textContent);
  console.log("querySelectorAll:",
    [...document.querySelectorAll("#hop p")].map(el => el.textContent));

  // Đọc / ghi nội dung
  const p1 = document.querySelector(".dong");
  console.log("textContent:", p1.textContent);
  p1.innerHTML = "<b>Đã đổi bằng innerHTML</b>";

  // Tạo phần tử mới
  const moi = document.createElement("p");
  moi.textContent = "Đoạn mới tạo lúc " + new Date().toLocaleTimeString("vi-VN");
  moi.style.color = "teal";
  document.getElementById("hop").appendChild(moi);

  // Đổi class thay vì đổi style trực tiếp — cách nên dùng
  p1.classList.add("noi-bat");
};`,
  css: `.noi-bat { background: gold; padding: 4px; }`
}
const bt = {
  html: `<!-- Chỗ làm bài -->
<button id="nut">Nút</button>
<p id="kq"></p>`,
  js: `console.log("Bắt đầu");`
}
</script>

# Bài 8 — Đối tượng trình duyệt & sự kiện

## Mục tiêu

- Các sự kiện thông thường trong JavaScript
- Các đối tượng trong trình duyệt — thuộc tính và phương thức

## 1. Đối tượng Event

Theo slide:

- Sự kiện là kết quả của các hành động do người sử dụng thực hiện
- Một sự kiện có thể được khởi tạo bởi **người dùng** hoặc **hệ thống**
- Mỗi sự kiện gắn với một đối tượng `Event`, cung cấp thông tin về **kiểu sự
  kiện** và **vị trí con trỏ** tại thời điểm xảy ra
- Đối tượng `Event` được xem như một phần của trình xử lý sự kiện

### Chu trình sống của sự kiện

Slide nêu năm bước:

1. Hành động của người dùng, hoặc một điều kiện tương ứng, khiến sự kiện xảy ra
2. Đối tượng `Event` được cập nhật ngay để phản ánh sự kiện
3. Phát sinh sự kiện
4. Trình xử lý sự kiện tương ứng được gọi
5. Trình xử lý thực hiện các hành động và trả về kết quả

<CodePlayground title="Đối tượng Event" :html="ex1.html" :js="ex1.js" :height="240" :console="true" />

::: tip Điều slide chưa nói: sự kiện lan truyền theo ba pha
Sự kiện không chỉ "xảy ra ở một phần tử". Nó đi qua ba pha:

```
1. CAPTURE   window → document → … → phần tử cha  (đi xuống)
2. TARGET    tại chính phần tử bị tác động
3. BUBBLE    phần tử cha → … → document → window  (nổi lên)
```

Mặc định handler chạy ở pha **bubble**. Vì thế bấm vào một nút trong `<div>` thì
handler của `<div>` cũng chạy theo.

Hai phương thức để kiểm soát:

| Phương thức | Tác dụng |
|---|---|
| `e.stopPropagation()` | Dừng lan truyền, cha không nhận nữa |
| `e.preventDefault()` | Huỷ hành vi mặc định (link không nhảy, form không gửi) |

Bubbling còn cho một kỹ thuật rất mạnh — **uỷ quyền sự kiện**: gắn một handler
duy nhất ở phần tử cha thay vì gắn cho từng con.

```js
// Thay vì gắn 100 handler cho 100 dòng
document.getElementById("bang").addEventListener("click", function (e) {
  const dong = e.target.closest("tr");
  if (dong) console.log("Bấm dòng:", dong.dataset.id);
});
```
Ưu điểm: chạy đúng cả với các dòng **được thêm vào sau đó**.
:::

## 2. Các sự kiện thông thường

Slide liệt kê mười sự kiện:

| Sự kiện | Xảy ra khi |
|---|---|
| `onClick` | Người dùng click vào button, phần tử form hoặc liên kết |
| `onChange` | Nội dung phần tử form thay đổi **và người dùng rời khỏi ô đó** |
| `onFocus` | Phần tử form trở thành phần tử hiện thời, sẵn sàng nhận dữ liệu |
| `onBlur` | Ngược với focus — người dùng rời khỏi phần tử |
| `onMouseOver` | Con trỏ chuột di chuyển lên trên một phần tử |
| `onMouseOut` | Con trỏ chuột rời khỏi phần tử |
| `onLoad` | Tài liệu đã tải xong |
| `onSubmit` | Người dùng gửi form — xảy ra **trước khi** form thật sự được gửi |
| `onMouseDown` | Nhấn nút chuột xuống |
| `onMouseUp` | Nhả nút chuột ra |
| `onResize` | Người dùng hoặc script chỉnh kích thước cửa sổ hay frame |

Điểm hay nhầm: **`onChange` không chạy ngay khi gõ**. Nó chờ đến khi ô mất tiêu
điểm. Muốn phản ứng theo từng phím thì dùng `input` (sự kiện này ra đời sau
giáo trình).

### Ví dụ onMouseOver trong slide

<CodePlayground title="onMouseOver / onMouseOut" :html="ex2.html" :js="ex2.js" :height="200" />

### Ví dụ onChange — kiểm tra số

<CodePlayground title="onChange + isNaN" :html="ex4.html" :js="ex4.js" :height="200" />

### Ví dụ onResize

<CodePlayground title="window.onresize" :html="ex7.html" :js="ex7.js" :height="220" />

### Ví dụ onClick — máy tính bỏ túi

Đây là ví dụ nổi tiếng của giáo trình, và cũng là dịp tốt để nói về `eval`:

<CodePlayground title="Máy tính (và vì sao eval nguy hiểm)" :html="ex3.html" :js="ex3.js" :height="300" :console="true" />

Thử gõ vào ô biểu thức: `document.body.innerHTML = "bị chiếm quyền"` rồi bấm
Calculate. `eval` chạy nó như code thật. Trong một trang thực, chuỗi này có thể
đọc cookie phiên đăng nhập và gửi đi nơi khác.

Hàm `tinhAnToan` trong tab JS cho thấy cách viết lại: **lọc đầu vào bằng regex
trước**, chỉ cho phép chữ số và bốn phép tính.

## 3. Điều khiển các sự kiện

Slide gọi đoạn mã chạy để đáp ứng sự kiện là **trình điều khiển sự kiện** (event
handler), và phân làm hai loại:

**Là thuộc tính của thẻ HTML:**

```html
<TAG eventHandler="JavaScript Code">
<INPUT TYPE="button" NAME="docode" onClick="DoOnClick();">
```

**Là thuộc tính của đối tượng:**

```js
object.eventhandler = function;
```

<CodePlayground title="Ba cách gắn handler" :html="ex5.html" :js="ex5.js" :height="230" :console="true" />

::: tip addEventListener — cách thứ ba, và là cách nên dùng
Hai cách trong slide đều có cùng nhược điểm: **mỗi phần tử chỉ giữ được một
handler cho mỗi sự kiện**. Gán cái thứ hai là đè mất cái thứ nhất.

`addEventListener` (chuẩn DOM Level 2, 2000) giải quyết điều đó:

```js
el.addEventListener("click", xuLy);
el.addEventListener("click", ghiLog);      // cả hai cùng chạy
el.removeEventListener("click", ghiLog);   // gỡ được từng cái

el.addEventListener("click", f, { once: true });     // chỉ chạy một lần
el.addEventListener("scroll", f, { passive: true }); // không chặn cuộn
el.addEventListener("click", f, true);               // bắt ở pha capture
```

Còn một lý do quan trọng nữa để bỏ `onclick="..."` trong HTML: nó **trộn hành vi
vào cấu trúc**, đúng thứ mà cả bài 5 đã thuyết phục ta tránh với CSS. Và trang
áp dụng Content Security Policy chặt sẽ **chặn thẳng** mọi handler viết inline.
:::

## 4. DOM

Theo slide:

> Một tính năng quan trọng của JavaScript là ngôn ngữ dựa trên đối tượng, giúp
> phát triển chương trình theo môđun và có thể sử dụng lại. Đối tượng là một
> thực thể đơn nhất bao gồm các thuộc tính và phương thức. Thuộc tính là giá trị
> của một đối tượng — ví dụ `Document.bgcolor`.

**DOM** (Document Object Model) là cách trình duyệt biểu diễn tài liệu HTML
thành **cây đối tượng** mà JavaScript chạm được vào.

```
document
└── html
    ├── head
    │   └── title
    └── body
        ├── h1
        └── div#hop
            ├── p.dong
            └── p.dong
```

<CodePlayground title="Chọn và thay đổi phần tử DOM" :html="ex8.html" :css="ex8.css" :js="ex8.js" :height="290" :console="true" />

Bảng đối chiếu cách cũ và cách nay:

| Việc | Giáo trình dạy | Nên dùng |
|---|---|---|
| Lấy một phần tử | `document.forms[0].elements[0]` | `document.querySelector("#id")` |
| Lấy nhiều phần tử | `document.images` | `document.querySelectorAll(".class")` |
| Ghi nội dung | `document.write(...)` | `el.textContent` / `el.innerHTML` |
| Đổi kiểu | `document.bgColor = "red"` | `el.style.background` / `el.classList` |
| Tạo phần tử | — | `document.createElement()` |

::: danger document.write
`document.write()` xuất hiện khắp giáo trình này. Nó có một hành vi tai hại:
**gọi sau khi trang đã tải xong thì nó xoá sạch toàn bộ tài liệu** rồi ghi đè.
Nó cũng chặn việc dựng trang. Trình duyệt hiện đại cảnh báo trong console khi
thấy nó.

Thay bằng `element.textContent` (an toàn, chỉ ghi văn bản) hoặc
`element.innerHTML` (ghi được HTML — nhưng **không bao giờ** đưa dữ liệu do
người dùng nhập vào đây, đó là lỗ hổng XSS).
:::

### innerHTML hay textContent?

```js
const nhapVao = '<img src=x onerror="alert(1)">';

el.innerHTML = nhapVao;    // NGUY HIỂM — mã chạy thật
el.textContent = nhapVao;  // AN TOÀN — hiện đúng chuỗi đó ra màn hình
```

Quy tắc: dữ liệu từ người dùng, từ URL, từ API → luôn `textContent`.

## 5. Các đối tượng trình duyệt

Theo slide: trình duyệt là ứng dụng hiển thị nội dung tài liệu HTML, và nó đưa
ra một số đối tượng mà script truy cập được.

<CodePlayground title="Khám phá các đối tượng trình duyệt" :html="ex6.html" :js="ex6.js" :height="230" :console="true" />

*(Trong khung sandbox, một vài giá trị bị hạn chế — `location.href` là `about:srcdoc`,
`document.cookie` không truy cập được. Đó là chủ ý của sandbox.)*

### window

Tương ứng với cửa sổ trình duyệt; dùng để truy xuất thông tin về trạng thái cửa
sổ. Đây là **đối tượng toàn cục** — mọi biến toàn cục đều là thuộc tính của nó.

| Thuộc tính (theo slide) | Phương thức (theo slide) |
|---|---|
| `document`, `event`, `history`, `location`, `name`, `navigator`, `screen` | `alert`, `blur`, `close`, `focus`, `navigate`, `open` |

Thêm những thứ dùng nhiều ngày nay:

```js
window.innerWidth / innerHeight     // kích thước vùng hiển thị
window.scrollTo({ top: 0, behavior: "smooth" })
setTimeout(f, 1000)                 // chạy f sau 1 giây
setInterval(f, 1000)                // chạy f mỗi giây
clearInterval(id)                   // dừng lại
localStorage.setItem("k", "v")      // lưu bền qua các phiên
```

Ba hộp thoại của `window`:

| Hàm | Trả về |
|---|---|
| `alert("...")` | Không gì cả — chỉ thông báo |
| `confirm("...")` | `true` / `false` |
| `prompt("...", "mặc định")` | Chuỗi người dùng nhập, hoặc `null` nếu Cancel |

Cả ba đều **chặn toàn bộ trang** cho tới khi người dùng bấm. Trong ứng dụng
thật, hãy thay bằng hộp thoại tự dựng (`<dialog>`).

### document

Tương ứng với tài liệu HTML trong cửa sổ; dùng để truy xuất thông tin về tài
liệu.

| Thuộc tính (theo slide) | Phương thức (theo slide) |
|---|---|
| `alinkColor`, `bgColor`, `body`, `fgColor`, `linkColor`, `location`, `title`, `URL`, `vlinkColor` | `clear`, `close`, `open`, `write`, `writeln` |

Các thuộc tính màu (`bgColor`, `fgColor`, `linkColor`…) đã lỗi thời cùng với các
thuộc tính HTML tương ứng — dùng CSS.

Còn dùng nhiều: `document.title`, `document.body`,
`document.querySelector()`, `document.createElement()`,
`document.addEventListener("DOMContentLoaded", …)`.

### history

Cung cấp danh sách URL được thăm gần đây nhất của client.

| Phương thức | Tác dụng |
|---|---|
| `history.back()` | Lùi một trang (giống nút Back) |
| `history.forward()` | Tiến một trang |
| `history.go(n)` | Đi `n` bước (`-2` là lùi hai trang) |

Vì lý do riêng tư, script **không đọc được** danh sách URL thực — chỉ biết
`history.length`.

Bổ sung hiện đại: `history.pushState()` đổi URL **mà không tải lại trang**. Đây
là nền tảng của mọi ứng dụng một trang (SPA) — và cũng là câu trả lời cho vấn đề
"frameset làm hỏng URL" ở bài 4.

### location

Chứa thông tin về URL hiện thời, và cung cấp phương thức để tải lại URL đó.

| Thuộc tính | Phương thức |
|---|---|
| `href`, `hash`, `host`, `hostname`, `protocol`, `pathname`, `search`, `port` | `assign()`, `reload()`, `replace()` |

```js
location.href = "trang-moi.html";   // chuyển trang, CÓ lưu vào history
location.replace("trang-moi.html"); // chuyển trang, KHÔNG lưu (Back không quay lại)
location.reload();                  // tải lại
```

Đọc tham số trên URL, cách hiện đại:

```js
// URL: /tim?q=html&trang=2
const p = new URLSearchParams(location.search);
console.log(p.get("q"));      // "html"
console.log(p.get("trang"));  // "2"
```

### navigator và screen

`navigator` cho thông tin về trình duyệt: `language`, `onLine`, `cookieEnabled`,
`userAgent`. `screen` cho thông tin màn hình: `width`, `height`, `colorDepth`.

::: warning Đừng dò trình duyệt
Slide ra đời giữa cuộc chiến IE–Netscape, khi việc đọc `navigator.userAgent` để
đoán trình duyệt rồi chạy hai nhánh code là chuyện thường ngày.

Cách đó đã sai từ lâu. `userAgent` bị làm giả tràn lan (mọi trình duyệt đều
nhận mình là "Mozilla"), và có trình duyệt mới thì code cũ đoán sai. Cách đúng
là **dò tính năng**:

```js
// Sai
if (navigator.userAgent.indexOf("Chrome") > -1) { ... }

// Đúng — hỏi thẳng xem tính năng có tồn tại không
if ("geolocation" in navigator) { ... }
if (typeof el.animate === "function") { ... }
```
:::

## Tóm tắt

| Chủ đề | Điểm cần nhớ |
|---|---|
| Sự kiện | Ba pha: capture → target → **bubble** (mặc định) |
| `onChange` | Chỉ chạy khi **rời khỏi** ô, không phải khi gõ — dùng `input` |
| Gắn handler | `addEventListener` thay cho `onclick=` |
| Uỷ quyền | Gắn handler ở cha, dùng `e.target` — chạy cả với phần tử thêm sau |
| DOM | `querySelector` / `querySelectorAll` thay cho `forms[0].elements[0]` |
| `document.write` | Đừng dùng — xoá sạch trang nếu gọi sau khi tải xong |
| `innerHTML` | Không bao giờ đưa dữ liệu người dùng vào — XSS |
| `location` | `href` để chuyển trang, `replace` để chuyển không lưu history |
| Dò trình duyệt | Dò **tính năng**, không dò `userAgent` |

## Bài tập

### Bài 8.1

Nút "Đổi màu nền": mỗi lần bấm đổi nền trang sang một màu ngẫu nhiên trong danh
sách 5 màu, và hiện tên màu hiện tại.

### Bài 8.2

Ô nhập giới hạn 100 ký tự. Hiện số ký tự còn lại **ngay khi gõ** (không đợi rời
ô). Còn dưới 10 ký tự thì chữ chuyển sang đỏ.

### Bài 8.3

Danh sách 5 mục, mỗi mục có nút "Xoá". Dùng **uỷ quyền sự kiện** — chỉ một
handler duy nhất trên `<ul>`. Thêm nút "Thêm mục" để chứng minh mục mới cũng xoá
được mà không cần gắn thêm handler.

### Bài 8.4

Vì sao code dưới đây in ra `5 5 5 5 5` thay vì `0 1 2 3 4`? Sửa hai cách.

```js
for (var i = 0; i < 5; i++) {
  document.getElementById("nut" + i).onclick = function () {
    console.log(i);
  };
}
```

### Bài 8.5

Viết lại đoạn code cũ này theo lối hiện đại:

```html
<a href="#" onmouseover="document.images[0].src='sang.gif'"
            onmouseout="document.images[0].src='toi.gif'">
  <img src="toi.gif">
</a>
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :js="bt.js" :height="340" :console="true" />

::: details Lời giải 8.1
```html
<button id="doi">Đổi màu nền</button>
<p id="ten"></p>

<script>
const MAU = ["#ffe8e8", "#e8ffe8", "#e8e8ff", "#fff8e0", "#f0e8ff"];

document.getElementById("doi").addEventListener("click", function () {
  const i = Math.floor(Math.random() * MAU.length);
  document.body.style.background = MAU[i];
  document.getElementById("ten").textContent = "Màu hiện tại: " + MAU[i];
});
</script>
```
:::

::: details Lời giải 8.2
```html
<textarea id="o" rows="4" cols="40" maxlength="100"></textarea>
<p id="dem">Còn 100 ký tự</p>

<script>
const GIOI_HAN = 100;
const o = document.getElementById("o");
const dem = document.getElementById("dem");

// 'input' chạy theo TỪNG PHÍM — 'change' thì phải đợi rời ô
o.addEventListener("input", function () {
  const conLai = GIOI_HAN - o.value.length;
  dem.textContent = "Còn " + conLai + " ký tự";
  dem.style.color = conLai < 10 ? "red" : "";
});
</script>
```
Đây chính là khác biệt `change` / `input` nói ở phần 2.
:::

::: details Lời giải 8.3
```html
<ul id="ds">
  <li>Mục 1 <button class="xoa">Xoá</button></li>
  <li>Mục 2 <button class="xoa">Xoá</button></li>
  <li>Mục 3 <button class="xoa">Xoá</button></li>
  <li>Mục 4 <button class="xoa">Xoá</button></li>
  <li>Mục 5 <button class="xoa">Xoá</button></li>
</ul>
<button id="them">Thêm mục</button>

<script>
const ds = document.getElementById("ds");
let n = 5;

// MỘT handler duy nhất trên phần tử cha
ds.addEventListener("click", function (e) {
  if (!e.target.classList.contains("xoa")) return;   // bấm chỗ khác thì bỏ qua
  e.target.closest("li").remove();
});

document.getElementById("them").addEventListener("click", function () {
  n++;
  const li = document.createElement("li");
  li.innerHTML = "Mục " + n + ' <button class="xoa">Xoá</button>';
  ds.appendChild(li);
  // Không cần gắn handler cho nút mới — sự kiện nổi lên tới <ul>
});
</script>
```
Đó là điểm mạnh của uỷ quyền: handler tồn tại trước cả khi phần tử ra đời.
:::

::: details Lời giải 8.4
`var` có **phạm vi hàm**, không phải phạm vi khối. Cả 5 hàm callback cùng tham
chiếu tới **một biến `i` duy nhất**. Vòng lặp chạy xong thì `i` bằng 5, và mãi
sau đó người dùng mới bấm nút — nên hàm nào cũng đọc ra 5.

**Cách 1 — dùng `let`:** mỗi vòng lặp tạo một biến `i` riêng.

```js
for (let i = 0; i < 5; i++) {
  document.getElementById("nut" + i).onclick = function () {
    console.log(i);
  };
}
```

**Cách 2 — bao đóng (closure), cách duy nhất thời chưa có `let`:**

```js
for (var i = 0; i < 5; i++) {
  (function (j) {
    document.getElementById("nut" + j).onclick = function () {
      console.log(j);
    };
  })(i);   // truyền i vào làm tham số → mỗi lần một bản sao riêng
}
```

**Cách 3 — đọc từ chính phần tử, thường là sạch nhất:**

```js
document.querySelectorAll("[data-so]").forEach(function (nut) {
  nut.addEventListener("click", function () {
    console.log(this.dataset.so);
  });
});
```
:::

::: details Lời giải 8.5
```html
<a href="#" id="lienket">
  <img id="anh" src="toi.gif" alt="Ảnh đổi khi rê chuột">
</a>

<script>
const lk = document.getElementById("lienket");
const anh = document.getElementById("anh");

lk.addEventListener("mouseenter", () => anh.src = "sang.gif");
lk.addEventListener("mouseleave", () => anh.src = "toi.gif");
</script>
```

Bốn thay đổi so với bản gốc:

1. **Tách JS khỏi HTML** — không còn `onmouseover=` trong thẻ.
2. **`getElementById` thay `document.images[0]`** — không phụ thuộc thứ tự ảnh
   trên trang. Chèn thêm một ảnh phía trên là bản cũ hỏng ngay.
3. **`mouseenter`/`mouseleave` thay `mouseover`/`mouseout`** — hai cái sau còn
   kích hoạt khi chuột đi qua các phần tử *con*, gây nháy liên tục.
4. Có `alt` cho ảnh.

Và thực ra hiệu ứng này ngày nay nên làm bằng CSS thuần, không cần JavaScript:

```css
.nut-anh        { background-image: url(toi.gif); }
.nut-anh:hover  { background-image: url(sang.gif); }
```
:::

---

[← Bài 7](./07-doi-tuong-co-ban) · Bài tiếp: [Form & kiểm tra hợp lệ →](./09-form-va-kiem-tra-hop-le)
