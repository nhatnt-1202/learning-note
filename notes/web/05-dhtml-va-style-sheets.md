<script setup>
const ex1 = {
  html: `<h2 style="color: green; font-family: Arial">Kiểu nội tuyến</h2>
<p style="color: #555; border-left: 3px solid #ccc; padding-left: 10px">
  Khai báo nằm ngay trong thẻ, chỉ ảnh hưởng đúng phần tử này.
</p>
<p>Đoạn này không bị ảnh hưởng.</p>`
}
const ex2 = {
  html: `<h1>Bộ chọn đơn / bộ chọn HTML</h1>
<p>Đoạn thứ nhất.</p>
<p>Đoạn thứ hai.</p>
<div>Một div.</div>`,
  css: `/* Bộ chọn HTML: dùng tên thẻ, bỏ dấu ngoặc nhọn đi */
h1 {
  color: blue;
}

p {
  color: #444;
  line-height: 1.7;
}

div {
  background: #eef;
  padding: 8px;
}`
}
const ex3 = {
  html: `<p class="canh-bao">Cảnh báo: sắp hết hạn.</p>
<p>Đoạn thường.</p>
<li class="canh-bao">Mục danh sách cũng dùng được cùng class.</li>

<h3 class="canh-bao to">Class dùng chồng: canh-bao + to</h3>

<p id="dac-biet" class="canh-bao">Có cả class lẫn id — id thắng.</p>`,
  css: `/* Bộ chọn CLASS — dấu chấm đứng trước, áp cho NHIỀU phần tử */
.canh-bao {
  color: #b00;
  font-weight: bold;
}

.to {
  font-size: 1.6rem;
}

/* Bộ chọn ID — dấu thăng đứng trước, chỉ MỘT phần tử duy nhất */
#dac-biet {
  color: white;
  background: #b00;
  padding: 6px;
}`
}
const ex4 = {
  html: `<div class="hop">
  <p>Đoạn <b>bên trong</b> .hop</p>
  <ul>
    <li>Mục trong .hop</li>
  </ul>
</div>

<p>Đoạn <b>ngoài</b> .hop</p>`,
  css: `/* Bộ chọn ngữ cảnh: chỉ b nằm BÊN TRONG .hop */
.hop b {
  color: crimson;
  background: #ffe;
}

/* Con trực tiếp */
.hop > p {
  border-left: 3px solid teal;
  padding-left: 8px;
}

/* Kế thừa: mọi phần tử con đều nhận font này từ body */
body {
  font-family: Georgia, serif;
}`
}
const ex5 = {
  html: `<p>Ba cách gắn CSS cùng tác động lên trang này — xem tab CSS và HTML.</p>

<!-- Cách 2: phần tử STYLE (thường nằm trong head) -->
<style>
  .tu-the-style { color: seagreen; }
<\/style>

<p class="tu-the-style">1. Từ thẻ &lt;style&gt; ngay trong HTML.</p>
<p class="tu-file">2. Từ tab CSS (tương đương file .css liên kết qua &lt;link&gt;).</p>
<p style="color: purple">3. Từ thuộc tính style nội tuyến.</p>`,
  css: `.tu-file {
  color: #b8860b;
  font-weight: bold;
}`
}
const ex6 = {
  html: `<p class="a">Cùng một đoạn, bốn quy tắc cùng nhắm vào nó.</p>
<p>Đổi thứ tự các quy tắc trong tab CSS rồi chạy lại để thấy luật "thác nước".</p>`,
  css: `/* Độ cụ thể (specificity) tăng dần từ trên xuống.
   Quy tắc cụ thể hơn THẮNG, bất kể viết trước hay sau. */

p          { color: gray;   }   /* 0-0-1 */
.a         { color: blue;   }   /* 0-1-0  <- thắng p    */
p.a        { color: green;  }   /* 0-1-1  <- thắng .a   */
/* #x     { color: red;    }      1-0-0  <- id thắng tất cả */

/* Cùng độ cụ thể thì quy tắc VIẾT SAU thắng: */
p.a { color: darkorange; }`
}
const ex7 = {
  html: `<div class="hop">Hộp: nội dung + padding + border + margin</div>
<div class="hop hep">box-sizing: border-box → width tính CẢ padding và border</div>`,
  css: `.hop {
  width: 260px;
  padding: 16px;
  border: 4px solid #3451b2;
  margin: 12px 0;
  background: #eef2ff;
}

/* Mặc định (content-box): bề rộng thật = 260 + 16*2 + 4*2 = 308px */

.hep {
  box-sizing: border-box;
  border-color: #22a06b;
  background: #eafaf1;
}
/* border-box: bề rộng thật = đúng 260px, padding/border ăn vào trong */`
}
const ex8 = {
  html: `<div class="the" id="the">
  <h4>Nội dung động</h4>
  <p id="dong">Bấm các nút bên dưới.</p>
</div>

<p>
  <button id="b1">Đổi kiểu (dynamic style)</button>
  <button id="b2">Đổi nội dung (dynamic content)</button>
  <button id="b3">Di chuyển (positioning)</button>
  <button id="b4">Đặt lại</button>
</p>`,
  css: `.the {
  position: relative;
  left: 0;
  top: 0;
  width: 280px;
  padding: 12px;
  border: 2px solid #3451b2;
  background: #eef2ff;
  transition: all .3s;
}`,
  js: `const the = document.getElementById("the");
const dong = document.getElementById("dong");

document.getElementById("b1").onclick = () => {
  the.style.background = "#fff3cd";
  the.style.borderColor = "#e0a800";
  the.style.transform = "rotate(-2deg)";
  console.log("Đổi kiểu qua element.style");
};

document.getElementById("b2").onclick = () => {
  dong.innerHTML = "<b>Nội dung mới</b> — lúc " +
    new Date().toLocaleTimeString("vi-VN");
  console.log("Đổi nội dung qua innerHTML");
};

document.getElementById("b3").onclick = () => {
  the.style.left = (parseInt(the.style.left || 0) + 40) + "px";
  console.log("left =", the.style.left);
};

document.getElementById("b4").onclick = () => {
  the.removeAttribute("style");
  dong.textContent = "Bấm các nút bên dưới.";
  console.log("Đã xoá mọi inline style");
};`
}
const bt = {
  html: `<h1>Bài viết</h1>
<p class="tom-tat">Đoạn tóm tắt.</p>
<p>Đoạn thường thứ nhất.</p>
<p>Đoạn thường thứ hai.</p>`,
  css: `/* Viết CSS ở đây */`
}
</script>

# Bài 5 — DHTML & Style Sheets

## Mục tiêu

- Mô tả Dynamic HTML
- Dùng Bảng kiểu (Style Sheet)

## 1. DHTML là gì

Theo slide:

> "HTML động" có thể được định nghĩa như phần mềm mô tả sự kết hợp giữa HTML,
> các bảng kiểu (stylesheet) và ngôn ngữ script, làm cho tài liệu trở nên sinh
> động.

Điểm quan trọng cần hiểu ngay: **DHTML không phải một công nghệ, không phải một
ngôn ngữ, không có thẻ `<dhtml>` nào cả.** Nó chỉ là tên gọi cho *sự kết hợp*
của ba thứ đã có:

```
HTML (cấu trúc) + CSS (hình thức) + JavaScript (hành vi) = DHTML
```

Cộng thêm mảnh thứ tư mà slide gọi là "Cấu trúc của đối tượng": **DOM** — mô
hình cây cho phép script chạm tới từng phần tử.

### Cuộc chiến hai trình duyệt

Slide ghi lại đúng bối cảnh lịch sử:

- **Microsoft** tập trung vào Cascading Style Sheets. Script tương tác với các
  phần tử CSS.
- **Netscape** cũng dùng bảng kiểu, nhưng thực hiện DHTML chủ yếu qua **các lớp
  (layer)**, với thẻ `<LAYER>`.

Hai hướng đi này không tương thích. Lập trình viên cuối những năm 90 phải viết
hai bản code cho một trang, kèm đoạn "browser sniffing" để đoán xem đang chạy
trên trình duyệt nào.

Kết cục: **CSS + DOM chuẩn của W3C thắng.** Netscape từ bỏ engine cũ, `<LAYER>`
biến mất. Từ khoảng 2010 trở đi, một đoạn code chạy giống nhau trên mọi trình
duyệt lớn — thế hệ hôm nay gần như không hình dung nổi vấn đề mà slide này đang
mô tả.

### Bảy tính năng của DHTML

Slide liệt kê, kèm hình dung hiện đại:

| Tính năng | Nghĩa | Hôm nay là |
|---|---|---|
| Dynamic Styles | Đổi kiểu sau khi trang tải | `element.style.*`, `classList` |
| Dynamic Content | Đổi nội dung không tải lại trang | `innerHTML`, `textContent` |
| Positioning | Định vị và di chuyển phần tử | `position`, `transform` |
| Data binding | Gắn dữ liệu vào phần tử | Vue / React, hoặc `fetch` + render |
| Downloadable Fonts | Tải font riêng về | `@font-face`, Google Fonts |
| Scripting | Chạy mã trong trang | JavaScript (bài 6–9) |
| Object Structure | Cây đối tượng của trang | **DOM** |

Đây là DHTML chạy thật — cả bốn nút đều là một trong các tính năng trên:

<CodePlayground title="DHTML: kiểu, nội dung, vị trí" :html="ex8.html" :css="ex8.css" :js="ex8.js" :height="330" />

## 2. Bảng kiểu là gì

Theo slide: bảng kiểu là nơi ta quản lý và điều khiển các "style". Nó mô tả
**sự xuất hiện và trình diễn** của tài liệu HTML — trên màn hình, và cả khi in.
Ta chỉ được chính xác vị trí, hình thức của phần tử và tạo hiệu ứng đặc biệt.

### Lợi ích

| Lợi ích (theo slide) | Nghĩa thực tế |
|---|---|
| Nạp chồng trình duyệt | Áp kiểu của mình đè lên kiểu mặc định của trình duyệt |
| Bố trí trang | Kiểm soát vị trí, không chỉ màu chữ |
| Dùng lại được | Một file `.css` cho cả trăm trang |
| Chỉ cần một lần thật tốt | Viết một lần, sửa một chỗ, đổi cả site |

Điểm cuối là lý do CSS ra đời và là lý do `<font>` bị khai tử ở bài 2. Site 500
trang muốn đổi màu chủ đạo: với `<font>` là sửa hàng nghìn thẻ; với CSS là sửa
một dòng.

### Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| **Style Rule** (quy tắc kiểu) | Một cặp bộ chọn + khối khai báo |
| **Style Sheet** (bảng kiểu) | Tập hợp các quy tắc |
| **Declaration** (khai báo) | Một cặp `thuộc-tính: giá-trị` |

```
h1        { color: blue;  font-size: 2rem; }
└bộ chọn┘  └───────── khối khai báo ──────┘
            └khai báo┘  └── khai báo ───┘
```

## 3. Các bộ chọn (Selectors)

Bộ chọn là chuỗi ký tự nhận ra phần tử mà quy tắc áp dụng tới. Slide chia thành:

### Bộ chọn đơn / bộ chọn HTML

Mô tả một phần tử bất kể vị trí của nó trong tài liệu. Dùng chính tên thẻ, chỉ
**bỏ dấu ngoặc nhọn** đi — thẻ `<P>` thành bộ chọn `p`.

```css
H1 { color: blue }
```

<CodePlayground title="Bộ chọn theo tên thẻ" :html="ex2.html" :css="ex2.css" :height="220" />

### Bộ chọn Class

Dùng thuộc tính `class` của phần tử HTML. Có thể gán cùng một class cho **nhiều
phần tử**, kể cả khác loại thẻ. Bộ chọn class có **dấu chấm** (`.`) đứng trước —
slide gọi là "ký tự cờ".

```css
.canh-bao { color: red }
```

### Bộ chọn ID

Dùng thuộc tính `id`. Áp kiểu cho **riêng một phần tử** trên trang. Bắt đầu
bằng **dấu thăng** (`#`).

```css
#dac-biet { background: red }
```

Khác biệt cốt lõi:

| | `class` | `id` |
|---|---|---|
| Ký hiệu | `.` | `#` |
| Số phần tử dùng được | Nhiều | **Đúng một** trong cả trang |
| Một phần tử mang được mấy cái | Nhiều (`class="a b c"`) | Một |
| Độ ưu tiên | Thấp hơn | Cao hơn |

<CodePlayground title="class và id" :html="ex3.html" :css="ex3.css" :height="290" />

### Bộ chọn ngữ cảnh

Chỉ đến **ngữ cảnh** của phần tử — dựa trên khái niệm kế thừa: phần tử con kế
thừa kiểu gán cho thẻ cha. Slide lấy ví dụ `<BODY>`: mọi phần tử bên trong đều
kế thừa kiểu của `<body>`.

```css
.hop b { color: crimson }   /* chỉ <b> nằm trong .hop */
```

<CodePlayground title="Ngữ cảnh và kế thừa" :html="ex4.html" :css="ex4.css" :height="250" />

Có khoảng cách trắng giữa hai bộ chọn nghĩa là "hậu duệ ở bất kỳ cấp nào". Dấu
`>` nghĩa là "con trực tiếp".

Về **kế thừa**: không phải mọi thuộc tính đều kế thừa. `color`, `font-family`,
`line-height` thì có; `border`, `padding`, `background` thì không. Quy tắc dễ
nhớ: thuộc tính về *chữ* thì kế thừa, thuộc tính về *hộp* thì không.

::: tip Bộ chọn hiện đại
CSS ngày nay có nhiều bộ chọn hơn hẳn danh sách trong slide:

```css
a:hover           { }   /* khi rê chuột lên */
input:focus       { }   /* khi đang có tiêu điểm */
li:first-child    { }   /* con đầu tiên */
tr:nth-child(2n)  { }   /* các hàng chẵn */
input[type=email] { }   /* theo thuộc tính */
p::first-line     { }   /* dòng đầu tiên */
h2 + p            { }   /* p đứng ngay sau h2 */
:is(h1, h2, h3)   { }   /* gộp nhiều bộ chọn */
```
:::

## 4. Ba cách gắn CSS vào HTML

Slide nêu đúng ba cách, và đây là ba cách vẫn dùng hôm nay.

### Cách 1 — Thuộc tính `style` (nội tuyến)

Nhúng khai báo vào thẳng thẻ mở của phần tử:

```html
<H2 style="color: green; font-family: Arial"> </H2>
```

<CodePlayground title="Inline style" :html="ex1.html" :height="160" />

Ưu: mạnh nhất, ghi đè mọi thứ. Nhược: **không tái dùng được**, chính là vấn đề
của `<font>` ngày xưa. Chỉ nên dùng khi JavaScript đặt giá trị động lúc chạy.

### Cách 2 — Phần tử `<style>`

Nhúng cả bảng kiểu vào tài liệu. Slide nói rõ: phần tử `STYLE` được chèn **bên
trong `<HEAD>`**, mọi quy tắc đặt giữa thẻ mở và thẻ đóng.

```html
<head>
  <style>
    body { font-family: Verdana, sans-serif; }
    h1   { color: #3451b2; }
  </style>
</head>
```

Dùng khi kiểu chỉ áp cho **một trang duy nhất**.

### Cách 3 — Phần tử `<link>`

Bảng kiểu là **file riêng**, được liên kết vào:

```html
<LINK REL="stylesheet"
      HREF="stylesmine.css"
      TYPE="text/css">
```

Đây là cách dùng cho site thật. Một file `.css`, mọi trang cùng `<link>` tới —
sửa một chỗ đổi cả site, và trình duyệt cache file đó nên các trang sau tải
nhanh hơn.

<CodePlayground title="Ba cách cùng lúc" :html="ex5.html" :css="ex5.css" :height="230" />

## 5. Cascading — "hình thác nước"

Chữ **Cascading** trong CSS nói về cơ chế quyết định khi nhiều quy tắc cùng
nhắm vào một phần tử với các giá trị khác nhau. Slide gọi CSS là "bảng kiểu
hình thác nước" nhưng không giải thích cơ chế — đây là phần bù.

Thứ tự xét, từ mạnh đến yếu:

1. **`!important`** — cửa sau, tránh dùng
2. **Độ cụ thể (specificity)** — bộ chọn nào "chỉ đích danh" hơn thì thắng
3. **Thứ tự xuất hiện** — cùng độ cụ thể thì quy tắc viết sau thắng

Cách tính độ cụ thể — đếm thành bộ ba số:

| Loại bộ chọn | Điểm | Ví dụ |
|---|---|---|
| Inline `style=""` | 1-0-0-0 | `<p style="...">` |
| `#id` | 0-1-0-0 | `#menu` |
| `.class`, `:hover`, `[attr]` | 0-0-1-0 | `.nav`, `a:hover` |
| Tên thẻ, `::before` | 0-0-0-1 | `p`, `li` |

So sánh từ trái sang phải. `#menu` (0-1-0-0) thắng `.nav .item a.link`
(0-0-3-1) — **một id mạnh hơn bao nhiêu class cũng vậy**.

<CodePlayground title="Thác nước và độ cụ thể" :html="ex6.html" :css="ex6.css" :height="240" />

Bỏ dấu chú thích ở dòng `#x` trong tab CSS rồi chạy lại — nhưng nhớ thêm
`id="x"` vào thẻ `<p>` thì mới thấy tác dụng.

::: warning Về !important
`!important` phá vỡ toàn bộ hệ thống ưu tiên. Dùng nó một lần thì lần sau muốn
ghi đè lại phải dùng tiếp `!important` mạnh hơn, và bảng kiểu nhanh chóng thành
mớ bòng bong. Khi thấy mình cần `!important`, gần như luôn có nghĩa bộ chọn
đang được viết sai — hãy sửa bộ chọn.
:::

## 6. Các thuộc tính trong bảng kiểu

Slide đưa một bảng phân nhóm. Chép lại đầy đủ:

| Nhóm | Thuộc tính |
|---|---|
| **Font properties** | `font`, `font-size`, `font-style`, `font-family`, `font-weight` |
| **Text properties** | `text-align`, `text-indent`, `vertical-align`, `line-height`, `text-decoration` |
| **Box properties** | `border`, `border-width`, `border-bottom`, `border-color`, `margin`, `padding` |
| **Positioning** | `position`, `top`, `left`, `height`, `width`, `clip`, `z-index` |

### Mô hình hộp (Box Model)

Nhóm "Box properties" là thứ quan trọng nhất trong CSS và slide chỉ liệt kê tên.
Mọi phần tử HTML là một hộp gồm bốn lớp, từ trong ra:

```
┌──────────── margin (khoảng cách VỚI phần tử khác) ────────────┐
│  ┌───────────── border (đường viền) ─────────────┐            │
│  │  ┌────── padding (đệm trong) ──────┐          │            │
│  │  │       content (nội dung)        │          │            │
│  │  └─────────────────────────────────┘          │            │
│  └───────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────┘
```

<CodePlayground title="Box model và box-sizing" :html="ex7.html" :css="ex7.css" :height="260" />

Điểm khiến người mới bối rối nhất: mặc định `width: 260px` là bề rộng của
**riêng phần content**; padding và border cộng thêm vào bên ngoài, nên hộp thật
rộng 308px. Đặt `box-sizing: border-box` thì `width` tính cả padding và border —
trực giác hơn hẳn. Nhiều dự án đặt ngay từ đầu:

```css
*, *::before, *::after { box-sizing: border-box; }
```

### Đơn vị

| Đơn vị | Nghĩa | Dùng cho |
|---|---|---|
| `px` | Pixel tuyệt đối | Viền, bóng đổ |
| `rem` | Bội số cỡ chữ gốc (thường 16px) | **Cỡ chữ, khoảng cách** |
| `em` | Bội số cỡ chữ của chính phần tử | Padding theo cỡ chữ |
| `%` | Phần trăm so với phần tử cha | Bề rộng |
| `vw` / `vh` | 1% bề rộng / chiều cao khung nhìn | Bố cục toàn màn hình |
| `fr` | Một phần của không gian còn lại (Grid) | Cột trong Grid |

Ưu tiên `rem` cho cỡ chữ: người dùng phóng to chữ trong cài đặt trình duyệt thì
trang giãn theo. Cố định bằng `px` thì không.

::: tip Những gì CSS có thêm sau giáo trình này
Bảng thuộc tính trong slide dừng lại ở CSS1/CSS2 (1996–1998). Từ đó tới nay:

| Thứ | Ra đời | Giải quyết |
|---|---|---|
| **Flexbox** | ~2012 | Xếp hàng một chiều, canh giữa dễ dàng |
| **CSS Grid** | ~2017 | Bố cục hai chiều — thay hẳn table layout |
| **Biến CSS** | ~2016 | `--mau-chinh: #3451b2` rồi `var(--mau-chinh)` |
| **Media query** | ~2012 | Đổi bố cục theo bề rộng màn hình |
| **Transition / Animation** | ~2012 | Chuyển động, không cần JS |
| **`:has()`** | ~2023 | Chọn cha dựa trên con |

Canh một khối vào chính giữa — bài toán từng phải dùng mẹo bảng:

```css
.giua {
  display: flex;
  align-items: center;      /* giữa theo chiều dọc */
  justify-content: center;  /* giữa theo chiều ngang */
  min-height: 100vh;
}
```
:::

## Tóm tắt

| Khái niệm | Điểm cần nhớ |
|---|---|
| DHTML | HTML + CSS + JavaScript + DOM, không phải công nghệ riêng |
| Quy tắc | `bộ-chọn { thuộc-tính: giá-trị; }` |
| `.class` | Nhiều phần tử, dùng lại được — **mặc định nên dùng cái này** |
| `#id` | Một phần tử duy nhất, ưu tiên cao |
| Ngữ cảnh | `A B` = hậu duệ, `A > B` = con trực tiếp |
| Ba cách gắn | Inline (mạnh nhất) < `<style>` < `<link>` (tái dùng tốt nhất) |
| Cascade | `!important` > độ cụ thể > thứ tự xuất hiện |
| Box model | content → padding → border → margin; `box-sizing: border-box` |

## Bài tập

### Bài 5.1

Cho HTML sẵn ở editor dưới, viết CSS sao cho: `h1` màu xanh dương, canh giữa,
có đường kẻ dưới; `.tom-tat` in nghiêng, chữ to hơn, màu xám; mọi `p` có
`line-height` 1.7; đoạn `p` **đầu tiên** sau tóm tắt có chữ cái đầu to gấp ba.

### Bài 5.2

Đoạn CSS dưới đây không ăn. Vì sao?

```html
<p class="ghi-chu">Nội dung</p>

<style>
  #ghi-chu { color: green; }
  .ghi chu { font-weight: bold; }
  p.ghi-chu { color: red }
  .ghi-chu { color: blue !important }
</style>
```

Cuối cùng đoạn văn có màu gì?

### Bài 5.3

Một `div` có `width: 300px; padding: 20px; border: 5px solid`. Bề rộng thật
trên màn hình là bao nhiêu? Muốn nó rộng đúng 300px thì làm sao?

### Bài 5.4

Viết lại đoạn HTML cũ này, tách sạch trình bày ra CSS:

```html
<body bgcolor="#FFFFFF">
  <center>
    <font face="Arial" size="5" color="#000080"><b>Tiêu đề</b></font>
  </center>
  <p align="justify"><font face="Arial" size="2">Nội dung...</font></p>
</body>
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :css="bt.css" :height="360" />

::: details Lời giải 5.1
```css
h1 {
  color: #3451b2;
  text-align: center;
  border-bottom: 2px solid #3451b2;
  padding-bottom: 8px;
}

.tom-tat {
  font-style: italic;
  font-size: 1.2rem;
  color: #666;
}

p {
  line-height: 1.7;
}

/* Đoạn p đầu tiên đứng NGAY SAU .tom-tat */
.tom-tat + p::first-letter {
  font-size: 3em;
  float: left;
  line-height: 1;
  padding-right: 6px;
}
```
`+` là bộ chọn anh em kề, `::first-letter` là phần tử giả chọn chữ cái đầu.
:::

::: details Lời giải 5.2
Ba lỗi và một kết quả:

1. `#ghi-chu` — dùng `#` nhưng thẻ chỉ có `class`, không có `id`. Không khớp gì.
2. `.ghi chu` — **thừa dấu cách**, biến thành bộ chọn ngữ cảnh: "phần tử `chu`
   nằm trong phần tử có class `ghi`". Cả hai đều không tồn tại. Đúng phải là
   `.ghi-chu`.
3. `p.ghi-chu` (0-0-1-1) cụ thể hơn `.ghi-chu` (0-0-1-0), nên bình thường màu
   đỏ sẽ thắng…

…nhưng dòng cuối có `!important`, mà `!important` **vượt trên mọi độ cụ thể**.
Kết quả: đoạn văn màu **xanh dương (blue)**, không in đậm.
:::

::: details Lời giải 5.3
Mặc định (`box-sizing: content-box`), `width` chỉ tính phần nội dung:

```
300 (content) + 20×2 (padding) + 5×2 (border) = 350px
```

`margin` không tính vào bề rộng của hộp — nó là khoảng cách *bên ngoài*.

Muốn hộp rộng đúng 300px:

```css
div {
  box-sizing: border-box;   /* padding và border ăn vào trong */
  width: 300px;
  padding: 20px;
  border: 5px solid;
}
/* Nội dung còn lại: 300 - 40 - 10 = 250px */
```
:::

::: details Lời giải 5.4
```html
<h1>Tiêu đề</h1>
<p>Nội dung...</p>

<style>
  body {
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
  }

  h1 {
    text-align: center;      /* thay <center> */
    font-size: 1.5rem;       /* thay size="5"  */
    color: #000080;          /* thay color=... */
    font-weight: bold;       /* h1 vốn đã đậm  */
  }

  p {
    text-align: justify;     /* thay align="justify" */
    font-size: 0.875rem;     /* thay size="2" */
  }
</style>
```

Hai điều đáng chú ý ngoài chuyện đổi cú pháp:

- `<center><font><b>` ba thẻ lồng nhau chỉ để nói "đây là tiêu đề" — thay bằng
  một thẻ `<h1>` **có nghĩa**. Máy tìm kiếm và máy đọc màn hình hiểu được `h1`,
  không hiểu được `<font size=5>`.
- `font-family` đặt trên `body` và **kế thừa** xuống mọi phần tử con, nên không
  phải lặp lại ở từng chỗ như thẻ `<font>` buộc phải làm.
:::

---

[← Bài 4](./04-bieu-mau-va-khung) · Bài tiếp: [Nền tảng cú pháp JavaScript →](./06-javascript-can-ban)
