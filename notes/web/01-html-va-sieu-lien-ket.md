<script setup>
const ex1 = {
  html: `<h3>My first HTML document</h3>`
}
const ex2 = {
  html: `<h3>Tài liệu HTML đầu tiên</h3>
<p>Đây là đoạn thứ nhất.
<p>Đây là đoạn thứ hai.`
}
const ex3 = {
  html: `<p>Dòng một
<br>
Dòng hai (bị <code>&lt;br&gt;</code> đẩy xuống)</p>

<p>Trong HTML,   nhiều
dấu cách       và xuống dòng
đều bị gộp thành một dấu cách.</p>`
}
const ex4 = {
  html: `<p style="text-align: left">Canh trái (mặc định)</p>
<p style="text-align: center">Canh giữa</p>
<p style="text-align: right">Canh phải</p>
<p style="text-align: justify">Canh đều hai bên. Hiệu ứng chỉ thấy rõ khi
đoạn văn đủ dài để tràn nhiều dòng, vì trình duyệt phải giãn khoảng cách
giữa các từ cho hai mép thẳng hàng với nhau.</p>`
}
const ex5 = {
  html: `<p>Thẻ mở đoạn được viết là &lt;p&gt; &mdash; muốn hiện chữ
&quot;&lt;p&gt;&quot; thì phải viết &amp;lt;p&amp;gt;</p>

<p>5 &lt; 10 &amp;&amp; 10 &gt; 5</p>
<p>Dấu cách&nbsp;&nbsp;&nbsp;&nbsp;cứng giữ nguyên khoảng trống.</p>
<p>&copy; 2026 &mdash; &hellip; &amp; &nbsp;&trade;</p>`
}
const ex6 = {
  html: `<h3>Các kiểu liên kết</h3>

<p>1. Liên kết ngoài (URL tuyệt đối):
  <a href="https://developer.mozilla.org" target="_blank">MDN</a></p>

<p>2. Liên kết trong site (URL tương đối):
  <a href="lien-he.html">Trang liên hệ</a></p>

<p>3. Liên kết tới một điểm trong cùng trang:
  <a href="#ket">Nhảy xuống cuối</a></p>

<p>4. Gửi e-mail:
  <a href="mailto:ai@do.com?subject=Hoi%20bai">Gửi thư</a></p>

<p>5. Ảnh làm điểm nóng:
  <a href="#ket"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='40'%3E%3Crect width='60' height='40' fill='%233451b2'/%3E%3C/svg%3E" alt="Ô xanh"></a></p>

<div style="height: 300px"></div>
<h4 id="ket">Đây là điểm neo &lt;h4 id="ket"&gt;</h4>`
}
const bt = {
  html: `<!-- Bài tập: sửa file này cho đạt yêu cầu -->
<h1>Trang của tôi</h1>
<p>Giới thiệu ngắn.</p>`
}
</script>

# Bài 1 — Giới thiệu HTML & siêu liên kết

## Mục tiêu

- Khái quát Internet và World Wide Web
- HTML là gì, viết được một tài liệu HTML đơn giản
- Thẻ, phần tử, thuộc tính
- Siêu liên kết trong tài liệu HTML
- Thẻ `<meta>`
- Các ký tự đặc biệt (HTML entity)

## 1. Internet và World Wide Web

Internet là mạng máy tính lớn nhất thế giới — chính xác hơn, nó là **mạng của
các mạng**: vô số mạng nhỏ nối với nhau bằng chung một bộ giao thức (TCP/IP).

World Wide Web là **một tập con** của Internet, không phải là Internet. Web gồm
các *web server* rải khắp thế giới, phục vụ tài liệu qua giao thức HTTP.
E-mail, SSH, FTP cũng chạy trên Internet nhưng không thuộc Web.

Ba mảnh ghép làm nên Web:

| Mảnh | Vai trò |
|---|---|
| **URL** | Địa chỉ định danh tài nguyên |
| **HTTP** | Giao thức để hỏi và trả tài nguyên |
| **HTML** | Định dạng của tài liệu được trả về |

## 2. HTML là gì

HTML là **ngôn ngữ đánh dấu** (markup language), không phải ngôn ngữ lập trình.
Ta không ra lệnh cho máy tính tính toán; ta *đánh dấu* rằng đoạn này là tiêu đề,
đoạn kia là danh sách, chỗ nọ là liên kết.

Với các thẻ và phần tử HTML, ta có thể:

- Điều khiển hình thức và nội dung của trang
- Xuất bản tài liệu trực tuyến, chèn liên kết để truy xuất thông tin
- Tạo biểu mẫu thu thập thông tin người dùng, phục vụ giao dịch

### Tài liệu đầu tiên

```html
<HTML>
  <HEAD>
    <TITLE>Welcome to HTML</TITLE>
  </HEAD>
  <BODY>
    <H3>My first HTML document</H3>
  </BODY>
</HTML>
```

Thử ngay — editor tự bọc phần `<html>`/`<head>`/`<body>` nên bạn chỉ cần viết
phần thân:

<CodePlayground title="Tài liệu đầu tiên" :html="ex1.html" :height="140" />

### Trình duyệt và trình soạn thảo

Slide gốc liệt kê Netscape Navigator, Internet Explorer, Microsoft FrontPage và
Notepad. Ý chính vẫn đúng: **soạn bằng bất cứ trình soạn thảo văn bản nào, xem
bằng trình duyệt**. HTML là text thuần, không cần công cụ đặc biệt.

::: tip Ghi chú hiện đại
Netscape đã chết từ 2008, IE ngừng hỗ trợ tháng 6/2022. Hôm nay: viết bằng
VS Code, xem bằng Chrome/Firefox/Edge/Safari. Không cần lo "trang có chạy trên
Netscape không" nữa — nhưng vẫn phải lo trang chạy trên **điện thoại**, thứ mà
giáo trình gốc chưa hề nhắc tới.
:::

## 3. Thẻ, phần tử, thuộc tính

Thẻ HTML đánh dấu chỗ bắt đầu và kết thúc của một vùng nội dung:

```
<HTML>  . . .  </HTML>
```

Một thẻ mở có dạng:

```
<ELEMENT ATTRIBUTE = value>
```

| Thành phần | Nghĩa |
|---|---|
| **Element** | Tên nhận dạng thẻ — `p`, `a`, `img`… |
| **Attribute** | Thuộc tính mô tả thêm cho thẻ — `href`, `src`, `id`… |
| **Value** | Giá trị gán cho thuộc tính |

Ví dụ `<a href="index.html">`: element là `a`, attribute là `href`, value là
`"index.html"`.

Tên thẻ **không phân biệt hoa thường** — `<BODY>` và `<body>` như nhau. Giáo
trình cũ viết hoa toàn bộ; quy ước ngày nay là viết thường.

### Cấu trúc tài liệu

```html
<HTML>
  <HEAD>
    <TITLE>Welcome to the world of HTML</TITLE>
  </HEAD>
  <BODY>
    <P>This is going to be real fun</P>
  </BODY>
</HTML>
```

Ba phần:

- **Phần HTML** — `<html>` bao toàn bộ tài liệu
- **Phần tiêu đề** — `<head>` chứa thông tin *về* trang: title, meta, link CSS.
  Người đọc không thấy nội dung này trong vùng trang.
- **Phần thân** — `<body>` chứa nội dung hiển thị

## 4. Đoạn và ngắt dòng

Thẻ `<p>` mở một đoạn mới. Trong HTML cũ, thẻ đóng `</p>` là tuỳ chọn:

```html
<BODY BGCOLOR = lavender>
  <P>This is going to be real fun
  <P> Another paragraph element
</BODY>
```

<CodePlayground title="Đoạn văn" :html="ex2.html" :height="150" />

Thẻ ngắt `<br>` xuống dòng **bên trong** một đoạn, không tạo đoạn mới:

<CodePlayground title="Ngắt dòng và gộp khoảng trắng" :html="ex3.html" :height="200" />

Chú ý ví dụ thứ hai ở trên: HTML **gộp mọi chuỗi khoảng trắng liên tiếp thành
một dấu cách**. Xuống dòng trong file nguồn không tạo xuống dòng trên trang.
Đây là điểm gây bối rối nhiều nhất cho người mới.

## 5. Canh lề văn bản

Slide đưa bảng giá trị của thuộc tính `align`:

| Giá trị | Mô tả |
|---|---|
| `left` | Văn bản canh lề trái |
| `center` | Văn bản canh giữa |
| `right` | Văn bản canh phải |
| `justify` | Văn bản canh đều hai bên |

Cú pháp gốc: `<P ALIGN=center>`.

::: warning Ghi chú hiện đại
Thuộc tính `align` đã **bị loại khỏi HTML5**. Trình duyệt vẫn hiểu nó vì lý do
tương thích ngược, nhưng đừng viết mới. Dùng CSS: `text-align: center`.

Nguyên tắc chung xuất hiện xuyên suốt loạt bài này: **HTML lo cấu trúc, CSS lo
hình thức.** Mọi thuộc tính trình bày trong giáo trình cũ (`align`, `bgcolor`,
`color`, `border`…) đều đã được CSS thay thế.
:::

<CodePlayground title="Canh lề bằng CSS" :html="ex4.html" :height="230" />

## 6. Ký tự đặc biệt

Vấn đề: muốn hiện dấu `<` trên trang thì viết thế nào, khi `<` là ký tự mở thẻ?
Câu trả lời là **entity** — mã thay thế bắt đầu bằng `&` và kết thúc bằng `;`.

| Ký tự | Entity |
|---|---|
| Lớn hơn `>` | `&gt;` |
| Nhỏ hơn `<` | `&lt;` |
| Nháy kép `"` | `&quot;` |
| Dấu và `&` | `&amp;` |
| Dấu cách cứng | `&nbsp;` |
| Bản quyền `©` | `&copy;` |

Nhớ **`&amp;` phải viết trước tiên** khi escape thủ công một chuỗi, nếu không
bạn sẽ escape nhầm chính dấu `&` của các entity vừa tạo ra.

<CodePlayground title="Entity" :html="ex5.html" :height="230" />

## 7. Thẻ META

`<meta>` nằm trong `<head>`, mô tả thông tin *về* tài liệu cho trình duyệt và
máy tìm kiếm. Nó không hiển thị gì cả.

```html
<head>
  <meta charset="utf-8">
  <meta name="description" content="Ghi chép học HTML">
  <meta name="keywords" content="html, web, hoc">
  <meta name="author" content="NhatNT">
  <meta http-equiv="refresh" content="5; url=trang-moi.html">
</head>
```

| Thuộc tính | Dùng để |
|---|---|
| `name` + `content` | Metadata cho máy tìm kiếm và công cụ |
| `http-equiv` + `content` | Giả lập một HTTP header (ví dụ `refresh`) |
| `charset` | Khai báo bảng mã |

::: tip Ghi chú hiện đại
Hai thẻ meta *bắt buộc phải có* trong mọi trang hôm nay:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Thiếu `charset="utf-8"` thì tiếng Việt hiện thành ký tự rác. Thiếu `viewport`
thì trang bị thu nhỏ trên điện thoại. Ngược lại, `<meta name="keywords">` đã bị
Google bỏ qua từ 2009 — viết cũng không ích gì.
:::

## 8. Siêu liên kết

Siêu liên kết là thứ khiến Web là "web". Chia làm hai dạng:

- **Liên kết trong** — nối đến phần khác trong cùng tài liệu, hoặc trang khác
  trong cùng web site.
- **Liên kết ngoài** — nối đến trang trên web site khác, máy chủ khác.

Để tạo một siêu liên kết cần xác định hai thành phần:

1. **Địa chỉ đầy đủ hoặc URL** của tài nguyên đích
2. **Điểm nóng** (hot spot) để người dùng nhấp — có thể là dòng văn bản, cũng
   có thể là một tấm ảnh

### Cú pháp HREF

```
<A HREF = protocol://host.domain:port/path/filename> Hypertext </A>
```

| Phần | Ý nghĩa |
|---|---|
| `protocol` | Loại giao thức: `https`, `http`, `mailto`, `ftp` |
| `host.domain` | Địa chỉ Internet của máy chủ |
| `port` | Cổng phục vụ của máy chủ đích (bỏ qua nếu dùng cổng mặc định) |
| `path/filename` | Đường dẫn tới tài nguyên |
| `Hypertext` | Văn bản hoặc ảnh mà người dùng nhấp vào |

### Hai kiểu URL

**URL tuyệt đối** ghi đầy đủ từ giao thức: `https://example.com/tin/2026/a.html`.
Dùng khi trỏ ra ngoài site.

**URL tương đối** tính từ vị trí trang hiện tại:

| Viết | Nghĩa |
|---|---|
| `bai2.html` | Cùng thư mục |
| `img/logo.png` | Thư mục con `img` |
| `../index.html` | Lùi lên một cấp |
| `/notes/web/` | Từ gốc site |

Dùng URL tương đối trong nội bộ site: đổi tên miền hay chuyển từ máy local lên
server thì link vẫn đúng.

### Các loại liên kết cụ thể

<CodePlayground title="Năm kiểu liên kết" :html="ex6.html" :height="320" />

Đọc kỹ ví dụ trên:

- `href="#ket"` nhảy tới phần tử có `id="ket"` trong **cùng trang**
- `href="trang.html#ket"` nhảy tới điểm neo trong **trang khác**
- `href="mailto:..."` mở trình gửi thư
- Bọc `<img>` trong `<a>` biến ảnh thành điểm nóng
- `target="_blank"` mở trong tab mới

::: tip Ghi chú hiện đại
Giáo trình cũ tạo điểm neo bằng `<a name="ket">`. Cách đó đã lỗi thời — dùng
`id` trên chính phần tử đích, như trong ví dụ.

Và khi dùng `target="_blank"`, hãy thêm `rel="noopener noreferrer"` cho link ra
ngoài. Không có nó, trang đích truy cập được `window.opener` và có thể điều
hướng tab gốc sang trang giả mạo (tấn công *tabnabbing*). Trình duyệt hiện đại
đã tự áp `noopener`, nhưng viết ra vẫn là thói quen đúng.
:::

## 9. Điều hướng quanh web site

Slide liệt kê các phương tiện điều hướng: bản đồ ảnh, siêu liên kết, các trang
con, bảng mục lục, nút Back/Forward. Và hai cách tổ chức site:

**Trình bày tuyến tính** — một chuỗi liên kết liên tục giữa các trang, đọc từ
đầu đến cuối:

```
Trang 1  →  Trang 2  →  Trang 3  →  Trang 4
        ←           ←           ←
```

Hợp với hướng dẫn từng bước, truyện, giáo trình.

**Trình bày theo phân cấp** — trang chủ liên kết với nhiều trang khác, mỗi trang
đều có liên kết quay về trang chủ:

```
            Trang chủ
          /     |     \
    Sản phẩm  Tin tức  Liên hệ
      /   \
    A       B
```

Hợp với site có nhiều nhánh nội dung độc lập. Đa số site thật là **kết hợp cả
hai**: khung phân cấp, trong mỗi nhánh thì tuyến tính (chính là cấu trúc của
loạt ghi chép này).

## Tóm tắt

| Khái niệm | Điểm cần nhớ |
|---|---|
| HTML | Ngôn ngữ đánh dấu, không phải ngôn ngữ lập trình |
| Cấu trúc | `html` > `head` (thông tin) + `body` (nội dung) |
| Thẻ | `<element attribute="value">`, không phân biệt hoa thường |
| Khoảng trắng | Mọi chuỗi trắng liên tiếp bị gộp thành một dấu cách |
| Entity | `&lt;` `&gt;` `&amp;` `&quot;` `&nbsp;` |
| Liên kết | `<a href="...">`, tuyệt đối ra ngoài / tương đối trong site |
| Điểm neo | `id` trên phần tử đích, `href="#id"` để nhảy tới |

## Bài tập

### Bài 1.1

Viết một trang có: tiêu đề cấp 1 là tên bạn, một đoạn giới thiệu, và ba liên
kết — một ra site ngoài (mở tab mới), một tới `about.html` cùng thư mục, một
nhảy xuống mục "Liên hệ" ở cuối trang.

### Bài 1.2

Hiển thị **đúng nguyên văn** dòng sau lên trang (không để trình duyệt hiểu nó
là thẻ):

```
Dùng <a href="x.html"> & <img src="y.png"> để chèn "liên kết" và ảnh
```

### Bài 1.3

Trang dưới đây hiện sai: hai đoạn dính vào nhau thành một dòng. Sửa lại.

```html
<p>Dòng thứ nhất
Dòng thứ hai
Dòng thứ ba</p>
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :height="300" />

::: details Lời giải 1.1
```html
<h1>Nguyễn Văn A</h1>
<p>Tôi đang học HTML từ giáo trình Aptech.</p>

<ul>
  <li><a href="https://developer.mozilla.org" target="_blank"
         rel="noopener noreferrer">Tài liệu MDN</a></li>
  <li><a href="about.html">Về tôi</a></li>
  <li><a href="#lien-he">Xuống mục Liên hệ</a></li>
</ul>

<div style="height: 400px"></div>

<h2 id="lien-he">Liên hệ</h2>
<p><a href="mailto:a@example.com">a@example.com</a></p>
```
:::

::: details Lời giải 1.2
Escape cả `<`, `>` và `&`. Riêng `"` trong văn bản thường không bắt buộc escape,
nhưng escape cũng không sai.

```html
<p>Dùng &lt;a href="x.html"&gt; &amp; &lt;img src="y.png"&gt;
   để chèn &quot;liên kết&quot; và ảnh</p>
```

Cách gọn hơn: bọc trong `<pre>` vẫn phải escape `<` và `&` — `<pre>` chỉ giữ
khoảng trắng, không tắt việc phân tích thẻ. Chỉ có `<textarea>` và
`<script>` mới xử lý nội dung theo kiểu văn bản thô.
:::

::: details Lời giải 1.3
Xuống dòng trong file nguồn không tạo xuống dòng trên trang. Có hai cách, chọn
theo ngữ nghĩa:

```html
<!-- Ba dòng thuộc CÙNG một đoạn (ví dụ: một khổ thơ, một địa chỉ) -->
<p>Dòng thứ nhất<br>
Dòng thứ hai<br>
Dòng thứ ba</p>

<!-- Ba đoạn RIÊNG BIỆT -->
<p>Dòng thứ nhất</p>
<p>Dòng thứ hai</p>
<p>Dòng thứ ba</p>
```

Đừng dùng `<br><br>` để tạo khoảng cách giữa hai đoạn — đó là việc của
`margin` trong CSS.
:::

---

Bài tiếp: [Các thẻ cơ bản & hình ảnh →](./02-the-co-ban-va-hinh-anh)
