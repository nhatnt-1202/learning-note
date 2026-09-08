<script setup>
const ex1 = {
  html: `<h1>Introduction to HTML</h1>
<h2>Introduction to HTML</h2>
<h3>Introduction to HTML</h3>
<h4>Introduction to HTML</h4>
<h5>Introduction to HTML</h5>
<h6>Introduction to HTML</h6>`
}
const ex2 = {
  html: `<h3>My first HTML document</h3>
<p>This is going to be real fun</p>
<h2>Using another heading</h2>
<p>Another paragraph element</p>

<address>
  <a href="#">Click here to register for a free newsletter</a><br>
  &copy; 2026 Công ty ABC — 12 Nguyễn Trãi, Hà Nội
</address>`,
  css: `body { background: lavender; }`
}
const ex3 = {
  html: `<p>Đoạn thường, trình duyệt tự xuống dòng theo bề rộng.</p>

<blockquote>
  Trích dẫn dài được lùi vào hai bên. Dùng cho đoạn trích nguyên văn
  từ nguồn khác, không phải để tạo thụt lề.
</blockquote>

<pre>
Thẻ pre giữ nguyên
    khoảng trắng   và
        xuống dòng.
Font mặc định là monospace.
<\/pre>

<div style="border: 1px solid teal; padding: 8px">
  div là phần tử nhóm dạng KHỐI — chiếm trọn chiều ngang.
</div>

<p>span là phần tử nhóm dạng
  <span style="background: gold">nội tuyến</span> —
  chỉ bọc đúng phần chữ bên trong.</p>`
}
const ex4 = {
  html: `<h4>Mức vật lý — nói trình duyệt VẼ thế nào</h4>
<p>
  <b>b: in đậm</b> ·
  <i>i: in nghiêng</i> ·
  <u>u: gạch chân</u> ·
  <tt>tt: chữ máy đánh</tt> ·
  <big>big</big> ·
  <small>small</small> ·
  X<sup>sup: mũ</sup> ·
  H<sub>sub: chỉ số</sub> ·
  <s>s: gạch ngang</s>
</p>

<h4>Mức logic — nói NGHĨA của đoạn văn bản</h4>
<p>
  <em>em: nhấn mạnh</em> ·
  <strong>strong: quan trọng</strong> ·
  <code>code: mã nguồn</code> ·
  <var>var: tên biến</var> ·
  <cite>cite: tên tác phẩm</cite> ·
  <kbd>kbd: phím bấm</kbd> ·
  <samp>samp: kết xuất máy</samp>
</p>`
}
const ex5 = {
  html: `<h4>Không sắp xếp — ul</h4>
<ul>
  <li>Monday</li>
  <li style="list-style-type: square">Tuesday — square</li>
  <li style="list-style-type: circle">Wednesday — circle</li>
  <li style="list-style-type: disc">Thursday — disc (mặc định)</li>
</ul>

<h4>Sắp xếp — ol</h4>
<ol>
  <li>Mặc định: số 1, 2, 3</li>
</ol>
<ol type="I"><li>type="I" — số La Mã hoa</li></ol>
<ol type="i"><li>type="i" — số La Mã thường</li></ol>
<ol type="A"><li>type="A" — chữ hoa</li></ol>
<ol type="a"><li>type="a" — chữ thường</li></ol>
<ol start="5">
  <li>start="5" — bắt đầu từ 5</li>
  <li>tiếp theo</li>
</ol>

<h4>Danh sách lồng nhau</h4>
<ul>
  <li>Phần 1
    <ol>
      <li>Mục con a</li>
      <li>Mục con b</li>
    </ol>
  </li>
  <li>Phần 2</li>
</ul>

<h4>Định nghĩa — dl</h4>
<dl>
  <dt>Sunday</dt>
    <dd>The first day of the week</dd>
  <dt>HTML</dt>
    <dd>HyperText Markup Language</dd>
  <dt>Internet</dt>
    <dd>A network of networks</dd>
</dl>`
}
const ex6 = {
  html: `<p>Mặc định:</p>
<hr>

<p>width + align:</p>
<hr width="50%" align="left">

<p>size (độ dày) + noshade:</p>
<hr size="6" noshade>

<p>Cách hiện đại — cùng hiệu ứng, bằng CSS:</p>
<hr class="dep">`,
  css: `hr.dep {
  border: 0;
  height: 4px;
  width: 50%;
  margin-left: 0;
  background: linear-gradient(90deg, #3451b2, transparent);
}`
}
const ex7 = {
  html: `<h3><font color="limegreen">Welcome to HTML</font></h3>
<p><font color="red" size="5" face="Georgia">This is good fun</font></p>

<hr>

<h3 class="xanh">Welcome to HTML</h3>
<p class="do">This is good fun</p>`,
  css: `body { background: lavender; }

.xanh { color: limegreen; }

.do {
  color: red;
  font-size: 1.5rem;
  font-family: Georgia, "Times New Roman", serif;
}`
}
const ex8 = {
  html: `<p>Ảnh cơ bản (SVG nhúng inline để chạy được offline):</p>
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%233451b2'/%3E%3Ctext x='60' y='46' fill='white' font-size='14' text-anchor='middle'%3EAnh%3C/text%3E%3C/svg%3E"
     alt="Hình chữ nhật xanh có chữ Anh"
     width="120" height="80">

<p>Ảnh hỏng — chú ý chữ ALT hiện ra thay chỗ:</p>
<img src="khong-ton-tai.jpg" alt="Mô tả ảnh bị lỗi">

<p>Chữ chảy quanh ảnh khi float:
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Ccircle cx='35' cy='35' r='33' fill='%23e0a800'/%3E%3C/svg%3E"
     alt="Vòng tròn vàng" style="float: left; margin: 0 10px 6px 0">
Đoạn văn này dài để thấy rõ hiệu ứng chữ chảy quanh ảnh. Trong giáo trình cũ
người ta viết ALIGN="left" ngay trên thẻ IMG; hôm nay dùng CSS float, hoặc tốt
hơn nữa là flexbox/grid.</p>`
}
const bt = {
  html: `<!-- Chỗ làm bài tập -->
<h1>Thực đơn</h1>`
}
</script>

# Bài 2 — Các thẻ cơ bản & hình ảnh

## Mục tiêu

- Dùng các thẻ HTML cơ bản
- Chèn hình ảnh vào tài liệu HTML

Slide liệt kê 8 nhóm: thẻ tiêu đề (`h1`–`h6`), thẻ mức đoạn, thẻ khối, thẻ định
dạng ký tự, danh sách, đường kẻ ngang `<hr>`, thẻ `<font>`, thẻ `<img>`.

## 1. Tiêu đề — h1 đến h6

```html
<H1>Introduction to HTML</H1>
<H2>Introduction to HTML</H2>
...
<H6>Introduction to HTML</H6>
```

<CodePlayground title="Sáu cấp tiêu đề" :html="ex1.html" :height="230" />

`h1` lớn nhất, `h6` nhỏ nhất. Nhưng **kích thước chữ không phải mục đích** của
heading — mục đích là *đánh số cấp trong dàn ý*. Máy đọc màn hình cho người
khiếm thị dùng danh sách heading để nhảy nhanh giữa các mục, Google dùng nó để
hiểu bố cục trang.

Quy tắc: mỗi trang **một `h1`** duy nhất, và **không nhảy cóc cấp** (từ `h2`
xuống thẳng `h4` là sai). Muốn chữ nhỏ hơn thì dùng CSS `font-size`, đừng đổi
sang thẻ heading cấp thấp hơn.

## 2. Thẻ Address

`<address>` chứa thông tin liên hệ của tác giả trang. Slide nói nó có thể chứa:

- Liên kết đến trang chủ
- Đặc tính chuỗi tìm kiếm
- Thông tin bản quyền

<CodePlayground title="address" :html="ex2.html" :css="ex2.css" :height="260" />

Trình duyệt in nghiêng nội dung `<address>` theo mặc định — nhưng giá trị thật
của nó là **ngữ nghĩa**, không phải kiểu chữ.

## 3. Cấu trúc văn bản: blockquote, pre, div, span

| Thẻ | Dùng để |
|---|---|
| `<blockquote>` | Trích dẫn dài, trình duyệt lùi vào hai bên |
| `<pre>` | Văn bản định dạng sẵn — **giữ nguyên** khoảng trắng và xuống dòng |
| `<div>` | Nhóm dạng **khối** (block) — chiếm trọn chiều ngang, tự xuống dòng |
| `<span>` | Nhóm dạng **nội tuyến** (inline) — chỉ bọc đúng phần nội dung |

<CodePlayground title="Bốn thẻ cấu trúc" :html="ex3.html" :height="330" />

Khác biệt `div` / `span` là nền tảng cho toàn bộ phần CSS ở bài 5, nắm chắc từ
bây giờ: **block xuống dòng, inline thì không**.

`<pre>` là thẻ duy nhất trong nhóm này giữ nguyên khoảng trắng — hữu ích khi in
code hay bảng ASCII.

## 4. Định dạng ký tự

Slide chia hai mức:

**Mức vật lý** — chỉ định trình duyệt vẽ ra sao: `<b>`, `<i>`, `<u>`, `<tt>`,
`<sup>`, `<sub>`, `<big>`, `<small>`, `<s>`.

**Mức logic** — chỉ định *ý nghĩa*, để trình duyệt tự chọn cách thể hiện:
`<em>`, `<strong>`, `<code>`, `<var>`, `<cite>`, `<kbd>`, `<samp>`.

<CodePlayground title="Hai mức định dạng" :html="ex4.html" :height="280" />

Trên màn hình `<b>` và `<strong>` trông y hệt nhau. Khác biệt nằm ở chỗ khác:
máy đọc màn hình **đọc nhấn giọng** ở `<strong>` và `<em>`, nhưng đọc bình
thường ở `<b>` và `<i>`. Chọn theo ý định:

| Ý định | Thẻ |
|---|---|
| Nội dung này *quan trọng* | `<strong>` |
| Nội dung này được *nhấn giọng* | `<em>` |
| Chỉ muốn chữ đậm/nghiêng, không thêm nghĩa | `<b>` / `<i>` hoặc CSS |

::: warning Ghi chú hiện đại
`<tt>`, `<big>`, `<center>`, `<font>`, `<strike>` đã bị **loại khỏi HTML5**.
`<u>` được giữ lại nhưng đổi nghĩa (đánh dấu chỗ sai chính tả, tên riêng) —
đừng dùng nó cho mục đích trang trí, vì người đọc sẽ tưởng đó là link.
:::

## 5. Danh sách

Ba loại:

| Loại | Thẻ bao | Thẻ mục |
|---|---|---|
| Không sắp xếp (unordered) | `<ul>` | `<li>` |
| Có sắp xếp (ordered) | `<ol>` | `<li>` |
| Định nghĩa (definition) | `<dl>` | `<dt>` + `<dd>` |

Kiểu bullet cho `<ul>`: `disc` (mặc định), `circle`, `square`.

Kiểu đánh số cho `<ol>`: `1` (mặc định), `I`, `i`, `A`, `a`; và `start="n"` để
bắt đầu từ số khác 1.

<CodePlayground title="Ba loại danh sách" :html="ex5.html" :height="440" />

Giáo trình viết `<LI TYPE=SQUARE>`; cách hiện đại là CSS
`list-style-type: square` trên `<ul>`. Với `<ol>` thì `type` vẫn hợp lệ trong
HTML5 (vì nó mang nghĩa, không chỉ trang trí).

Trong ví dụ có cả **danh sách lồng nhau** — `<ul>` con nằm *bên trong* một
`<li>`, không phải nằm cạnh nó. Đặt sai chỗ là lỗi rất phổ biến.

## 6. Đường kẻ ngang

Thuộc tính của `<hr>` theo slide: `align`, `width`, `size`, `noshade`.

<CodePlayground title="hr" :html="ex6.html" :css="ex6.css" :height="300" />

Cả bốn thuộc tính đó đều đã lỗi thời. Trong HTML5, `<hr>` mang nghĩa "chuyển
chủ đề"; hình thức thì giao hết cho CSS `border` / `background`, như dòng cuối
trong ví dụ.

## 7. Thẻ Font và màu

```html
<FONT COLOR = LIMEGREEN SIZE = 5 FACE = "Georgia"> ... </FONT>
```

| Thuộc tính | Giá trị |
|---|---|
| `color` | Tên màu (`red`, `limegreen`) hoặc mã hex (`#3451b2`) |
| `size` | 1 → 7, mặc định 3 |
| `face` | Danh sách font, cách nhau bằng dấu phẩy |

<CodePlayground title="font vs CSS" :html="ex7.html" :css="ex7.css" :height="300" />

::: danger Thẻ font đã chết
`<font>` bị bỏ khỏi HTML5. Lý do rất thực tế: nó buộc bạn **lặp lại kiểu dáng ở
từng chỗ**. Trang 200 đoạn văn thì có 200 thẻ `<font>`; muốn đổi màu chủ đạo
phải sửa đủ 200 chỗ. CSS sinh ra chính là để giải bài toán này — một quy tắc,
áp cho mọi phần tử khớp. Xem bài 5.
:::

### Màu trong HTML/CSS

| Cách viết | Ví dụ |
|---|---|
| Tên màu | `red`, `lavender`, `limegreen` (147 tên chuẩn) |
| Hex 6 chữ số | `#3451b2` |
| Hex 3 chữ số | `#37b` (viết tắt của `#3377bb`) |
| RGB | `rgb(52, 81, 178)` |
| RGB + độ trong | `rgb(52 81 178 / 0.5)` |

## 8. Ảnh trong tài liệu HTML

Các định dạng slide nêu:

| Định dạng | Đặc điểm |
|---|---|
| **GIF** | 256 màu, hỗ trợ trong suốt và ảnh động, có kiểu *interlaced* (hiện dần) |
| **JPEG** | Nén mất dữ liệu, triệu màu — hợp với ảnh chụp |
| **PNG** | Nén không mất dữ liệu, trong suốt mượt (alpha) |

### Chèn ảnh

```html
<IMG SRC="URL">
<IMG ALIGN=position SRC="PICTURE.GIF">
<IMG SRC=Flowers.jpg ALT="Beautiful Flowers">
<BODY BACKGROUND=bgimage.gif>
<BODY BACKGROUND=bgimage.gif BGPROPERTIES=FIXED>
```

| Thuộc tính | Vai trò |
|---|---|
| `src` | Đường dẫn tới file ảnh — **bắt buộc** |
| `alt` | Văn bản thay thế khi ảnh không tải được — **bắt buộc** |
| `width` / `height` | Kích thước hiển thị, tính bằng pixel |
| `align` | Canh ảnh so với văn bản (đã lỗi thời) |

<CodePlayground title="img" :html="ex8.html" :height="360" />

**Về `alt`** — đây là thuộc tính hay bị bỏ quên nhất và cũng quan trọng nhất:

- Người khiếm thị nghe `alt` thay cho ảnh
- Mạng chậm / ảnh hỏng: `alt` hiện thay chỗ (thấy rõ ở ví dụ 2 bên trên)
- Máy tìm kiếm đọc `alt` để hiểu ảnh

Ảnh thuần trang trí thì để `alt=""` (rỗng, nhưng vẫn phải có) — máy đọc màn hình
sẽ bỏ qua nó, thay vì đọc tên file.

::: tip Ghi chú hiện đại
Luôn ghi `width` và `height` đúng tỉ lệ thật của ảnh. Trình duyệt dựa vào đó
chừa sẵn chỗ, tránh việc nội dung *nhảy giật* khi ảnh tải xong.

`<body background="...">` đã lỗi thời — dùng CSS `background-image`. Còn
`BGPROPERTIES=FIXED` vốn chỉ IE hiểu; tương đương ngày nay là
`background-attachment: fixed`.

Định dạng nên dùng năm 2026: **WebP** hoặc **AVIF** cho ảnh chụp (nhẹ hơn JPEG
25–50%), **SVG** cho logo và icon, PNG khi cần trong suốt và không có lựa chọn
khác. GIF chỉ còn dùng cho ảnh động cũ.
:::

## Tóm tắt

| Nhóm | Thẻ còn dùng | Thẻ đã bỏ, thay bằng CSS |
|---|---|---|
| Tiêu đề | `h1`–`h6` | — |
| Khối | `p`, `div`, `blockquote`, `pre` | `center` |
| Nội tuyến | `span`, `strong`, `em`, `code`, `kbd` | `font`, `big`, `tt`, `strike` |
| Danh sách | `ul`, `ol`, `li`, `dl`, `dt`, `dd` | `type` trên `li` |
| Khác | `hr`, `img`, `address` | `align`, `bgcolor`, `background` |

## Bài tập

### Bài 2.1

Làm một trang thực đơn quán ăn: tiêu đề `h1`, hai mục `h2` ("Món chính", "Đồ
uống"), mỗi mục một danh sách không sắp xếp gồm 3 món kèm giá. Kẻ một đường
`<hr>` giữa hai mục.

### Bài 2.2

Dùng danh sách định nghĩa `<dl>` giải thích 4 thuật ngữ: HTML, CSS, JavaScript,
URL.

### Bài 2.3

Viết lại đoạn dưới đây bỏ hết `<font>`, thay bằng CSS class:

```html
<p><font color="red" size="4" face="Arial">Cảnh báo</font></p>
<p><font color="red" size="4" face="Arial">Lỗi</font></p>
<p><font color="red" size="4" face="Arial">Hết hạn</font></p>
```

### Bài 2.4

Viết một danh sách lồng: 2 chương, mỗi chương 3 bài đánh số La Mã thường.

<CodePlayground title="Chỗ làm bài" :html="bt.html" :height="360" />

::: details Lời giải 2.1
```html
<h1>Quán Cơm Nhà</h1>

<h2>Món chính</h2>
<ul>
  <li>Cơm gà — 45.000đ</li>
  <li>Bún bò — 50.000đ</li>
  <li>Phở tái — 55.000đ</li>
</ul>

<hr>

<h2>Đồ uống</h2>
<ul>
  <li>Trà đá — 3.000đ</li>
  <li>Cà phê sữa — 25.000đ</li>
  <li>Nước cam — 30.000đ</li>
</ul>
```
:::

::: details Lời giải 2.2
```html
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language — ngôn ngữ đánh dấu cấu trúc trang web.</dd>

  <dt>CSS</dt>
  <dd>Cascading Style Sheets — quy định hình thức trình bày.</dd>

  <dt>JavaScript</dt>
  <dd>Ngôn ngữ kịch bản chạy trong trình duyệt, tạo tương tác.</dd>

  <dt>URL</dt>
  <dd>Uniform Resource Locator — địa chỉ định danh một tài nguyên trên web.</dd>
</dl>
```
:::

::: details Lời giải 2.3
Đây là bài học cốt lõi của bài này: định nghĩa kiểu **một lần**, dùng lại nhiều
lần.

```html
<style>
  .canh-bao {
    color: red;
    font-size: 1.2rem;
    font-family: Arial, Helvetica, sans-serif;
  }
</style>

<p class="canh-bao">Cảnh báo</p>
<p class="canh-bao">Lỗi</p>
<p class="canh-bao">Hết hạn</p>
```

Đổi màu cảnh báo từ đỏ sang cam giờ chỉ cần sửa **một dòng**, thay vì ba (hay
ba trăm).
:::

::: details Lời giải 2.4
`<ol>` con phải nằm **bên trong** `<li>` cha, trước thẻ `</li>`:

```html
<ol>
  <li>Chương 1 — HTML
    <ol type="i">
      <li>Cấu trúc tài liệu</li>
      <li>Thẻ và thuộc tính</li>
      <li>Siêu liên kết</li>
    </ol>
  </li>
  <li>Chương 2 — CSS
    <ol type="i">
      <li>Bộ chọn</li>
      <li>Hộp và lề</li>
      <li>Bố cục</li>
    </ol>
  </li>
</ol>
```
:::

---

[← Bài 1](./01-html-va-sieu-lien-ket) · Bài tiếp: [Bảng, tầng & multimedia →](./03-bang-tang-multimedia)
