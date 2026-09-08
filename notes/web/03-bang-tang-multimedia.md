<script setup>
const ex1 = {
  html: `<table>
  <td>A single cell table</td>
</table>

<hr>

<table border="1">
  <caption>Bảng đủ phần tử</caption>
  <tr>
    <th>Tên</th><th>Tuổi</th><th>Thành phố</th>
  </tr>
  <tr>
    <td>An</td><td>25</td><td>Hà Nội</td>
  </tr>
  <tr>
    <td>Bình</td><td>30</td><td>Đà Nẵng</td>
  </tr>
</table>`
}
const ex2 = {
  html: `<p>cellspacing=0 cellpadding=0</p>
<table border="1" cellspacing="0" cellpadding="0">
  <tr><td>A</td><td>B</td></tr>
  <tr><td>C</td><td>D</td></tr>
</table>

<p>cellspacing=2 cellpadding=6 (như slide)</p>
<table border="2" cellspacing="2" cellpadding="6">
  <tr><td>A</td><td>B</td></tr>
  <tr><td>C</td><td>D</td></tr>
</table>

<p>cellspacing=12 — thấy rõ khoảng hở GIỮA các ô</p>
<table border="1" cellspacing="12" cellpadding="2">
  <tr><td>A</td><td>B</td></tr>
  <tr><td>C</td><td>D</td></tr>
</table>`
}
const ex3 = {
  html: `<table border="1" cellpadding="6">
  <tr>
    <th colspan="3">Doanh thu quý I — colspan=3</th>
  </tr>
  <tr>
    <th>Tháng</th><th>Miền Bắc</th><th>Miền Nam</th>
  </tr>
  <tr>
    <td rowspan="2">Q1<br>rowspan=2</td>
    <td>120</td><td>150</td>
  </tr>
  <tr>
    <td>135</td><td>160</td>
  </tr>
</table>`
}
const ex4 = {
  html: `<table border="1" cellpadding="8" width="100%">
  <tr style="height: 70px">
    <td align="left" valign="top">left / top</td>
    <td align="center" valign="middle">center / middle</td>
    <td align="right" valign="bottom">right / bottom</td>
  </tr>
</table>

<p>Cách hiện đại — cùng kết quả, viết bằng CSS:</p>
<table class="css-table">
  <tr>
    <td class="a">left / top</td>
    <td class="b">center / middle</td>
    <td class="c">right / bottom</td>
  </tr>
</table>`,
  css: `.css-table {
  width: 100%;
  border-collapse: collapse;
}
.css-table td {
  border: 1px solid #999;
  padding: 8px;
  height: 70px;
}
.css-table .a { text-align: left;   vertical-align: top; }
.css-table .b { text-align: center; vertical-align: middle; }
.css-table .c { text-align: right;  vertical-align: bottom; }`
}
const ex5 = {
  html: `<div id="lop1">Lớp 1 — z-index 1</div>
<div id="lop2">Lớp 2 — z-index 2, nằm ĐÈ lên</div>
<div id="lop3">Lớp 3 — z-index 3</div>

<p style="margin-top: 180px">Nội dung bình thường bên dưới.</p>`,
  css: `#lop1, #lop2, #lop3 {
  position: absolute;
  width: 180px;
  padding: 12px;
  color: white;
  font-weight: bold;
}
#lop1 { top: 20px; left: 20px; background: #3451b2; z-index: 1; }
#lop2 { top: 55px; left: 60px; background: #22a06b; z-index: 2; }
#lop3 { top: 90px; left: 100px; background: #d64545; z-index: 3; }`
}
const ex6 = {
  html: `<div class="the">
  <h4>Thẻ có thể kéo lên xuống</h4>
  <p>Đây là "tầng" viết bằng chuẩn CSS thay cho thẻ LAYER cũ.</p>
  <button id="len">Lên trên cùng</button>
  <button id="xuong">Xuống dưới</button>
  <button id="an">Ẩn / hiện</button>
</div>
<div class="nen">Khối nền — luôn ở z-index 0</div>`,
  css: `.the {
  position: relative;
  z-index: 1;
  background: #fffbe6;
  border: 2px solid #e0a800;
  padding: 12px;
  width: 300px;
}
.nen {
  position: relative;
  z-index: 2;
  margin-top: -40px;
  margin-left: 60px;
  background: #cfe3ff;
  border: 2px solid #3451b2;
  padding: 24px;
  width: 300px;
}`,
  js: `const the = document.querySelector(".the");

document.getElementById("len").onclick = () => {
  the.style.zIndex = 5;
  console.log("z-index =", the.style.zIndex);
};
document.getElementById("xuong").onclick = () => {
  the.style.zIndex = 0;
  console.log("z-index =", the.style.zIndex);
};
document.getElementById("an").onclick = () => {
  the.style.visibility =
    the.style.visibility === "hidden" ? "visible" : "hidden";
  console.log("visibility =", the.style.visibility || "visible");
};`
}
const ex7 = {
  html: `<h4>Audio — chuẩn HTML5</h4>
<audio controls src="khong-co-file.mp3">
  Trình duyệt của bạn không hỗ trợ thẻ audio.
</audio>
<p><small>File không tồn tại nên player hiện trạng thái lỗi — đúng như mong đợi.</small></p>

<h4>Video — chuẩn HTML5</h4>
<video controls width="280" poster="" >
  <source src="phim.webm" type="video/webm">
  <source src="phim.mp4" type="video/mp4">
  Trình duyệt của bạn không hỗ trợ thẻ video.
</video>

<h4>Nhúng trang ngoài bằng iframe</h4>
<iframe srcdoc="&lt;p style='font:14px system-ui'&gt;Nội dung bên trong iframe&lt;/p&gt;"
        width="280" height="60" style="border:1px solid #999"></iframe>`
}
const bt = {
  html: `<!-- Chỗ làm bài -->
<table border="1" cellpadding="6">
  <tr><th>Thứ</th><th>Sáng</th><th>Chiều</th></tr>
</table>`
}
</script>

# Bài 3 — Bảng, tầng & multimedia

## Mục tiêu

- Cách sử dụng bảng
- Cách sử dụng tầng (layer)
- Chèn multimedia vào tài liệu HTML

## 1. Cấu trúc một bảng

Bảng trong HTML được xây theo **hàng**, không phải theo cột. Ta khai báo từng
`<tr>`, trong mỗi `<tr>` liệt kê các ô.

| Phần tử | Vai trò |
|---|---|
| `<table>` … `</table>` | Bao toàn bộ bảng |
| `<tr>` … `</tr>` | Table Row — một hàng |
| `<td>` … `</td>` | Table Data — một ô dữ liệu |
| `<th>` … `</th>` | Table Header — ô tiêu đề (đậm, canh giữa) |
| `<caption>` … `</caption>` | Chú thích bảng, đặt ngay sau `<table>` |

Bảng nhỏ nhất có thể theo slide:

```html
<TABLE>
  <TD> A single cell table </TD>
</TABLE>
```

<CodePlayground title="Bảng cơ bản" :html="ex1.html" :height="300" />

Chú ý: bảng đầu thiếu `<tr>` mà trình duyệt vẫn vẽ được — nó tự chèn hàng còn
thiếu. Nhưng đừng dựa vào việc đó, hãy viết đủ.

## 2. Khoảng cách: cellspacing và cellpadding

Hai thuộc tính rất dễ nhầm:

- **`cellspacing`** — khoảng trống **giữa** các ô, tính bằng pixel
- **`cellpadding`** — khoảng trống **bên trong** ô, giữa viền và nội dung

```html
<TABLE BORDER = 2 CELLSPACING = 2 CELLPADDING = 6>
```

<CodePlayground title="spacing vs padding" :html="ex2.html" :height="380" />

Mẹo nhớ: *spacing* là khoảng cách giữa các ô (space **between**), *padding* là
đệm trong ô (pad **inside**).

CSS tương đương: `border-spacing` và `padding`. Đặt
`border-collapse: collapse` thì các viền chồng lên nhau thành một nét — kiểu
bảng thường thấy nhất hiện nay.

## 3. Nối ô: colspan và rowspan

- **`colspan`** — ô kéo rộng qua nhiều **cột** (ngang)
- **`rowspan`** — ô kéo dài qua nhiều **hàng** (dọc)

Slide viết rằng `colspan` dùng với `<th>` còn `rowspan` dùng với `<td>`. Thực
tế **cả hai thuộc tính đều dùng được trên cả `<th>` lẫn `<td>`** — slide chỉ
mô tả ví dụ minh hoạ của nó, đừng nhớ nhầm thành quy tắc.

<CodePlayground title="colspan / rowspan" :html="ex3.html" :height="250" />

Khi nối ô, **tổng số ô của mỗi hàng phải khớp**. Ở ví dụ trên, hàng thứ ba chỉ
viết 3 `<td>` nhưng ô `rowspan=2` từ hàng trước đã "chiếm chỗ" cột đầu, nên
hàng cuối chỉ cần 2 `<td>`. Đếm sai là bảng vỡ ngay.

## 4. Định dạng dữ liệu trong ô

Canh ngang bằng `align`: `left`, `center`, `right`, `justify`.
Canh dọc bằng `valign`: `top`, `middle`, `bottom`, `baseline`.

```html
<TD ALIGN = right VALIGN = bottom>Data Cell 1</TD>
```

<CodePlayground title="align / valign và bản CSS" :html="ex4.html" :css="ex4.css" :height="320" />

::: warning Ghi chú hiện đại
`align`, `valign`, `border`, `cellspacing`, `cellpadding`, `width` trên thẻ
bảng đều đã lỗi thời. Bản CSS trong ví dụ trên (`text-align`,
`vertical-align`, `border-collapse`, `padding`) là cách viết đúng hiện nay.

Quan trọng hơn: **đừng dùng bảng để dàn trang.** Suốt những năm 1997–2007
người ta dựng cả bố cục website bằng `<table>` lồng nhau vì chưa có công cụ nào
khác. Ngày nay dùng **Flexbox** và **CSS Grid**. Bảng chỉ dành cho *dữ liệu
dạng bảng* — thứ mà hàng và cột đều mang nghĩa. Trang dựng bằng table đọc rất
tệ trên máy đọc màn hình và không co giãn được theo màn hình điện thoại.
:::

Cấu trúc bảng đầy đủ nên viết theo mẫu này:

```html
<table>
  <caption>Doanh thu 2026</caption>
  <thead>
    <tr><th scope="col">Tháng</th><th scope="col">Doanh thu</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">1</th><td>120tr</td></tr>
    <tr><th scope="row">2</th><td>135tr</td></tr>
  </tbody>
  <tfoot>
    <tr><th scope="row">Tổng</th><td>255tr</td></tr>
  </tfoot>
</table>
```

`scope="col"` / `scope="row"` cho máy đọc màn hình biết ô tiêu đề này mô tả cột
hay hàng — nhờ đó người dùng nghe được "Tháng 2, doanh thu 135tr" thay vì hai
con số rời rạc.

## 5. Tầng (Layer)

Ý tưởng của tầng, theo slide:

- Có thể đặt một phần tử **trên hay dưới** một phần tử khác
- **Toạ độ z** xác định thứ tự các phần tử được hiển thị
- Một tầng giống như một khung: chứa nội dung và được chỉ định vị trí tuỳ ý

Đây chính là khái niệm mà CSS gọi là **positioning + z-index**.

<CodePlayground title="Ba tầng chồng nhau" :html="ex5.html" :css="ex5.css" :height="280" />

Thử đổi `z-index` của `#lop1` thành `9` rồi bấm Chạy — nó nhảy lên trên cùng.

### Thẻ LAYER

Slide dạy thẻ `<LAYER>`:

```html
<LAYER top = 25 ID=layer1 visibility=show>
  <P><FONT color=limegreen size=4><B>Layer 1</B></FONT></P>
</LAYER>
```

Và ghi rõ sự chia rẽ thời đó: Internet Explorer đi theo mô hình CSS, còn
Netscape thực hiện DHTML chủ yếu qua `<LAYER>`. Muốn áp kiểu tầng cho mọi phần
tử bên trong thì dùng `<DIV>` hoặc `<SPAN>`.

::: danger Thẻ LAYER đã chết hoàn toàn
`<LAYER>` là thẻ **độc quyền Netscape Navigator 4** (1997). Nó chưa từng là
chuẩn, không trình duyệt nào ngoài Netscape 4 hỗ trợ, và biến mất hẳn từ
Netscape 6. Viết `<layer>` hôm nay thì trình duyệt coi như một thẻ vô nghĩa.

Cuộc chiến trình duyệt mà slide mô tả đã có kết quả rõ ràng: **phe CSS thắng**.
Mọi thứ `<LAYER>` từng làm, giờ làm bằng:

| LAYER | CSS |
|---|---|
| `<layer top=25 left=10>` | `position: absolute; top: 25px; left: 10px` |
| `z-index` | `z-index` (giữ nguyên tên) |
| `visibility=show/hide` | `visibility: visible / hidden` |
| `clip` | `clip-path` |
| `bgcolor` | `background-color` |
:::

Bản viết lại bằng CSS chuẩn, điều khiển bằng JavaScript đúng như ý đồ gốc của
bài học:

<CodePlayground title="Tầng bằng CSS + JS" :html="ex6.html" :css="ex6.css" :js="ex6.js" :height="300" />

### Giới thiệu CSS trong slide

Slide đã nhắc trước phần bài 5: khi dùng bảng kiểu, ta nhóm các thành phần
trang lại trong một CSS (Cascading Style Sheets — "bảng kiểu hình thác nước").
Bảng kiểu có thể áp cho *tất cả* phần tử trong tài liệu hoặc chỉ *một số*, và
các phần tử này điều khiển được qua VBScript hay JavaScript.

Chữ "thác nước" (cascading) nói về cơ chế **xếp tầng ưu tiên** khi nhiều quy
tắc cùng chọn một phần tử. Chi tiết ở [bài 5](./05-dhtml-va-style-sheets).

## 6. Multimedia

### Âm thanh

```html
<BGSOUND SRC="path\sound filename">
<BGSOUND src="WindowsLogonSound.wav">
```

Slide ghi chú: `BGSOUND` **không được Netscape Navigator hỗ trợ**. Thực tế nó
là thẻ độc quyền của IE và cũng đã chết cùng IE.

### Video

```html
<EMBED SRC="path\video file name"
       WIDTH="width in pixels or percentage"
       HEIGHT="height in pixels or percentage">
```

`<embed>` thời đó nhúng nội dung cần **plug-in** ngoài (Flash, QuickTime,
RealPlayer). Nay Flash đã bị gỡ khỏi mọi trình duyệt (cuối 2020).

::: tip Ghi chú hiện đại
HTML5 đưa audio và video thành công dân hạng nhất — không plug-in, không thẻ
độc quyền:

```html
<audio controls src="nhac.mp3"></audio>

<video controls width="640" poster="anh-bia.jpg">
  <source src="phim.webm" type="video/webm">
  <source src="phim.mp4"  type="video/mp4">
  Trình duyệt không hỗ trợ video.
</video>
```

Vài điểm thực dụng:
- Nhiều `<source>` để trình duyệt tự chọn định dạng nó đọc được
- Văn bản giữa hai thẻ là **fallback** khi không hỗ trợ
- Trình duyệt **chặn autoplay có tiếng** — muốn tự chạy phải `muted`
- Nhúng YouTube/Vimeo thì dùng `<iframe>` họ cung cấp, không dùng `<embed>`
:::

<CodePlayground title="audio / video / iframe" :html="ex7.html" :height="340" />

### Java Applet

```html
<applet code = FirstApplet width=200 height=200></applet>
```

Truyền tham số vào applet bằng thẻ `<PARAM>` bên trong:

```html
<applet code=FirstApplet width=200 height=200>
  <PARAM name="parameter name" value="parameter value">
</applet>
```

::: danger Applet đã bị gỡ bỏ
Java Applet bị Oracle *deprecate* ở Java 9 (2017) và **xoá hẳn** ở Java 11.
Không trình duyệt hiện đại nào còn chạy được plug-in Java — kể cả khi bạn cài
Java trên máy.

Lý do là bảo mật: applet chạy mã nhị phân do trang web cung cấp, và suốt hơn
một thập kỷ đó là một trong những vector tấn công nặng nhất trên desktop.

Thứ thay thế cho các bài toán từng cần applet:
| Nhu cầu ngày ấy | Hôm nay |
|---|---|
| Đồ hoạ, game trong trang | `<canvas>` + JavaScript, WebGL |
| Tính toán nặng | **WebAssembly** (biên dịch C/C++/Rust ra web) |
| Giao diện tương tác | JavaScript + CSS, các framework như Vue/React |
| Truy cập camera/mic | `navigator.mediaDevices` |
:::

## Tóm tắt

| Chủ đề | Còn dùng | Đã chết |
|---|---|---|
| Bảng | `table` `tr` `td` `th` `caption` `thead` `tbody` `colspan` `rowspan` | `align` `valign` `cellspacing` `cellpadding` `border` (dùng CSS) |
| Tầng | `position` + `z-index` + `visibility` (CSS) | `<layer>`, `<ilayer>` |
| Âm thanh | `<audio>` | `<bgsound>` |
| Video | `<video>` + `<source>` | `<embed>` + plug-in |
| Nội dung ngoài | `<iframe>` | `<applet>`, Flash |

## Bài tập

### Bài 3.1

Dựng thời khoá biểu: cột đầu là Thứ 2 → Thứ 6, hai cột "Sáng" và "Chiều". Hàng
đầu là tiêu đề `<th>`. Thứ 7 chỉ học buổi sáng — dùng `colspan` cho ô "Nghỉ"
trải hết hai cột.

### Bài 3.2

Dựng bảng hoá đơn có `rowspan`: cột "Khách hàng" gộp 3 hàng sản phẩm của cùng
một người, cột cuối là "Tổng cộng" trải `colspan` toàn bảng.

### Bài 3.3

Ba khối vuông màu chồng lên nhau như bộ bài. Thêm nút "Đảo thứ tự" đưa khối
dưới cùng lên trên.

### Bài 3.4

Viết lại đoạn code cũ này bằng HTML5 + CSS hiện đại:

```html
<TABLE BORDER=1 CELLPADDING=5 CELLSPACING=0 WIDTH="100%" BGCOLOR="#EEEEEE">
  <TR><TD ALIGN=center VALIGN=middle><FONT SIZE=4>Ô</FONT></TD></TR>
</TABLE>
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :height="360" />

::: details Lời giải 3.1
```html
<table border="1" cellpadding="6">
  <caption>Thời khoá biểu</caption>
  <tr>
    <th>Thứ</th><th>Sáng</th><th>Chiều</th>
  </tr>
  <tr><td>Thứ 2</td><td>Toán</td><td>Lý</td></tr>
  <tr><td>Thứ 3</td><td>Văn</td><td>Hoá</td></tr>
  <tr><td>Thứ 4</td><td>Anh</td><td>Sinh</td></tr>
  <tr><td>Thứ 5</td><td>Sử</td><td>Địa</td></tr>
  <tr><td>Thứ 6</td><td>Tin</td><td>Thể dục</td></tr>
  <tr>
    <td>Thứ 7</td>
    <td colspan="2" align="center">Nghỉ</td>
  </tr>
</table>
```
Hàng cuối chỉ có 2 ô vì ô thứ hai đã trải qua 2 cột.
:::

::: details Lời giải 3.2
```html
<table border="1" cellpadding="6">
  <tr>
    <th>Khách hàng</th><th>Sản phẩm</th><th>Thành tiền</th>
  </tr>
  <tr>
    <td rowspan="3">Nguyễn Văn A</td>
    <td>Bàn phím</td><td>450.000đ</td>
  </tr>
  <tr><td>Chuột</td><td>250.000đ</td></tr>
  <tr><td>Tai nghe</td><td>800.000đ</td></tr>
  <tr>
    <td colspan="2" align="right"><b>Tổng cộng</b></td>
    <td><b>1.500.000đ</b></td>
  </tr>
</table>
```
Hai hàng giữa chỉ có 2 ô — cột đầu đã bị `rowspan="3"` chiếm.
:::

::: details Lời giải 3.3
```html
<div class="bai b1">1</div>
<div class="bai b2">2</div>
<div class="bai b3">3</div>
<p style="margin-top:150px"><button id="dao">Đảo thứ tự</button></p>

<style>
.bai {
  position: absolute;
  width: 90px; height: 90px;
  color: #fff; font-size: 32px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}
.b1 { top: 20px; left: 20px; background: #3451b2; z-index: 1; }
.b2 { top: 45px; left: 55px; background: #22a06b; z-index: 2; }
.b3 { top: 70px; left: 90px; background: #d64545; z-index: 3; }
</style>

<script>
document.getElementById("dao").onclick = function () {
  const khoi = document.querySelectorAll(".bai");
  // Đọc z-index hiện tại rồi gán ngược lại
  const z = [...khoi].map(el => getComputedStyle(el).zIndex);
  khoi.forEach((el, i) => el.style.zIndex = z[z.length - 1 - i]);
};
</script>
```
:::

::: details Lời giải 3.4
```html
<table class="hoa-don">
  <tr><td>Ô</td></tr>
</table>

<style>
.hoa-don {
  width: 100%;
  border-collapse: collapse;   /* thay cellspacing=0 */
  background: #eee;            /* thay bgcolor */
}
.hoa-don td {
  border: 1px solid #999;      /* thay border=1 */
  padding: 5px;                /* thay cellpadding=5 */
  text-align: center;          /* thay align=center */
  vertical-align: middle;      /* thay valign=middle */
  font-size: 1.15rem;          /* thay <font size=4> */
}
</style>
```
Bảy thuộc tính HTML trình bày đổi thành bảy khai báo CSS — và giờ chúng nằm một
chỗ, tái dùng được cho mọi bảng khác chỉ bằng `class="hoa-don"`.
:::

---

[← Bài 2](./02-the-co-ban-va-hinh-anh) · Bài tiếp: [Biểu mẫu & khung →](./04-bieu-mau-va-khung)
