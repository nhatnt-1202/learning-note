<script setup>
const ex1 = {
  html: `<form action="dang-ky.php" method="post" accept-charset="utf-8">
  <p>
    <label for="ten">Họ tên:</label><br>
    <input type="text" id="ten" name="ten" size="30" maxlength="50">
  </p>
  <p>
    <label for="mail">E-mail:</label><br>
    <input type="text" id="mail" name="email" size="30">
  </p>
  <p>
    <input type="submit" value="Đăng ký">
    <input type="reset" value="Xoá hết">
  </p>
</form>`
}
const ex2 = {
  html: `<form>
  <p>text —
    <input type="text" name="t" value="giá trị sẵn" size="20" maxlength="10">
    <small>(maxlength=10 nên chỉ gõ thêm được tới 10 ký tự)</small></p>

  <p>password —
    <input type="password" name="pw" size="20"></p>

  <p>checkbox —
    <label><input type="checkbox" name="mon" value="html" checked> HTML</label>
    <label><input type="checkbox" name="mon" value="css"> CSS</label>
    <label><input type="checkbox" name="mon" value="js"> JS</label></p>

  <p>radio (cùng NAME nên loại trừ nhau) —
    <label><input type="radio" name="gt" value="nam" checked> Nam</label>
    <label><input type="radio" name="gt" value="nu"> Nữ</label></p>

  <p>hidden — không hiện, nhưng vẫn được gửi đi:
    <input type="hidden" name="token" value="abc123"></p>

  <p>file —
    <input type="file" name="anh"></p>

  <p>
    <input type="button" value="button (không làm gì)">
    <input type="submit" value="submit">
    <input type="reset"  value="reset">
  </p>
</form>`
}
const ex3 = {
  html: `<form>
  <p>
    <label for="gt">Góp ý (textarea):</label><br>
    <textarea id="gt" name="gopy" rows="4" cols="40">Nội dung mặc định<\/textarea>
  </p>

  <p>
    <label for="tp">Thành phố (select 1 dòng):</label>
    <select id="tp" name="thanhpho">
      <option value="">-- Chọn --</option>
      <option value="hn" selected>Hà Nội</option>
      <option value="dn">Đà Nẵng</option>
      <option value="hcm">TP. Hồ Chí Minh</option>
    </select>
  </p>

  <p>
    <label for="sk">Sở thích (select multiple size=4):</label><br>
    <select id="sk" name="sothich" size="4" multiple>
      <option>Đọc sách</option>
      <option>Chạy bộ</option>
      <option>Nấu ăn</option>
      <option>Chơi game</option>
    </select><br>
    <small>Giữ Ctrl / Cmd để chọn nhiều</small>
  </p>

  <p>
    <button type="button" onclick="alert('Thẻ button có thể chứa HTML bên trong')">
      <b>Nút</b> <i>giàu nội dung</i>
    </button>
  </p>
</form>`
}
const ex4 = {
  html: `<form>
  <fieldset>
    <legend>Điều khiển phần tử</legend>

    <p><input type="text" id="a" value="tabindex=2" tabindex="2"></p>
    <p><input type="text" id="b" value="tabindex=1 — Tab vào đây TRƯỚC" tabindex="1" size="40"></p>

    <p>
      <label accesskey="l" for="c"><u>L</u>ưu (Alt+L để nhảy tới):</label>
      <input type="text" id="c" accesskey="l">
    </p>

    <p><input type="text" value="bị disabled — không gõ, KHÔNG gửi đi" size="40" disabled></p>
    <p><input type="text" value="readonly — không gõ, nhưng VẪN gửi đi" size="40" readonly></p>

    <p><button type="button" id="tieudiem">Đặt tiêu điểm vào ô đầu</button></p>
  </fieldset>
</form>`,
  js: `document.getElementById("tieudiem").onclick = function () {
  document.getElementById("a").focus();
  console.log("Đã focus vào ô A");
};`
}
const ex5 = {
  html: `<h4>Form HTML5 tự kiểm tra — chưa cần một dòng JavaScript</h4>
<form>
  <p><input type="email" name="e" placeholder="email@..." required></p>
  <p><input type="number" name="n" min="1" max="10" step="1" placeholder="1..10"></p>
  <p><input type="date" name="d"></p>
  <p><input type="range" name="r" min="0" max="100" value="50"></p>
  <p><input type="color" name="c" value="#3451b2"></p>
  <p><input type="tel" name="t" pattern="0[0-9]{9}" placeholder="0912345678"
            title="10 số, bắt đầu bằng 0"></p>
  <p><input type="search" name="s" placeholder="Tìm..."></p>
  <p><input type="url" name="u" placeholder="https://..."></p>
  <p><button type="submit">Gửi — thử bỏ trống ô email</button></p>
</form>`
}
const ex6 = {
  html: `<p>Khung nội tuyến (iframe) — thứ duy nhất trong họ "khung" còn sống:</p>

<iframe
  srcdoc="&lt;body style='font:14px system-ui;background:#eef'&gt;&lt;h4&gt;Trang A&lt;/h4&gt;&lt;p&gt;Tôi là một tài liệu HTML độc lập.&lt;/p&gt;&lt;/body&gt;"
  name="khungA" width="100%" height="120"
  style="border: 2px solid #3451b2"></iframe>

<p>
  <a href="data:text/html,<body style='font:14px system-ui;background:%23efe'><h4>Trang B</h4><p>Đã nạp vào iframe qua target.</p>" target="khungA">
    Nạp Trang B vào khung trên (target="khungA")
  </a>
</p>`
}
const bt = {
  html: `<!-- Chỗ làm bài -->
<form>
</form>`
}
</script>

# Bài 4 — Biểu mẫu & khung

## Mục tiêu

- Sử dụng biểu mẫu và các phần tử nhập thông thường trong HTML
- Sử dụng khung (frame)

## 1. Biểu mẫu dùng để làm gì

Theo slide:

- Thu thập tên, địa chỉ, số điện thoại, e-mail… để người dùng đăng ký một dịch vụ
- Tập hợp thông tin đặt mua hàng — ví dụ mua sách trên Internet phải điền tên,
  địa chỉ nhận, phương thức thanh toán…

Nói gọn: form là **con đường duy nhất** để dữ liệu đi ngược từ người dùng lên
máy chủ, trong thế giới HTML thuần.

## 2. Phần tử FORM

```html
<FORM> … </FORM>
```

Ba thuộc tính slide nêu:

| Thuộc tính | Ý nghĩa |
|---|---|
| `action` | URL nhận dữ liệu khi form được gửi |
| `method` | Cách gửi: `GET` hoặc `POST` |
| `accept` | Kiểu MIME mà server chấp nhận |

### GET hay POST?

| | GET | POST |
|---|---|---|
| Dữ liệu nằm ở | Chuỗi truy vấn trên URL: `?ten=an&tuoi=25` | Thân của HTTP request |
| Thấy trên thanh địa chỉ | Có | Không |
| Bookmark / chia sẻ link được | Có | Không |
| Giới hạn độ dài | Có (~2000 ký tự thực tế) | Gần như không |
| Upload file | Không | Có |
| Dùng cho | **Tìm kiếm, lọc, phân trang** — thao tác chỉ đọc | **Đăng ký, đăng nhập, thanh toán** — thao tác thay đổi dữ liệu |

Quy tắc: GET không được gây thay đổi ở server. Đặt "Xoá bài viết" sau một link
GET thì trình thu thập dữ liệu của Google có thể xoá sạch cơ sở dữ liệu của bạn
chỉ bằng việc bò qua trang.

<CodePlayground title="Form cơ bản" :html="ex1.html" :height="280" />

## 3. Phần tử INPUT

Thuộc tính theo slide: `type`, `name`, `value`, `size`, `maxlength`, `checked`,
`src`.

| Thuộc tính | Ý nghĩa |
|---|---|
| `type` | Loại ô nhập — quyết định hình dạng và hành vi |
| `name` | **Tên trường khi gửi lên server** — thiếu nó thì dữ liệu không được gửi |
| `value` | Giá trị ban đầu (hoặc giá trị gửi đi, với checkbox/radio) |
| `size` | Bề rộng ô, tính theo số ký tự |
| `maxlength` | Số ký tự tối đa gõ được |
| `checked` | Chọn sẵn (checkbox / radio) |
| `src` | Đường dẫn ảnh, khi `type="image"` |

Các giá trị `type` slide liệt kê: `TEXT` (mặc định), `CHECKBOX`, `RADIO`,
`SUBMIT`, `RESET`, `IMAGE`, `BUTTON`.

<CodePlayground title="Các loại input" :html="ex2.html" :height="420" />

Hai điểm nhiều người vấp:

**`name` với radio.** Các radio thuộc cùng một nhóm **phải trùng `name`** —
đó chính là thứ khiến chúng loại trừ lẫn nhau. Đặt khác `name` thì mỗi nút thành
một nhóm riêng và chọn được tất cả.

**`name` với checkbox.** Nhiều checkbox cùng `name` sẽ gửi lên nhiều giá trị
cùng tên, server nhận thành mảng — đúng ý đồ khi hỏi "chọn tất cả những mục phù
hợp".

## 4. Các phần tử nhập khác

### TEXTAREA

Ô nhập nhiều dòng. Thuộc tính: `rows`, `cols`, `name`.

Khác `<input>` ở chỗ nó **có thẻ đóng**, và giá trị ban đầu nằm giữa hai thẻ chứ
không đặt trong `value`.

### BUTTON

Thuộc tính: `name`, `value`, `type`.

Khác `<input type="button">` ở chỗ `<button>` **chứa được HTML** bên trong —
chữ đậm, icon, ảnh.

Lưu ý bẫy: `<button>` không ghi `type` thì **mặc định là `submit`**. Đặt một
nút như vậy trong form và nó sẽ gửi form đi khi bạn chỉ định nó mở một hộp
thoại. Luôn ghi rõ `type="button"` cho nút không dùng để gửi.

### SELECT

Thuộc tính: `name`, `size`, `multiple`.

- Không `size` → danh sách sổ xuống (dropdown)
- `size="n"` → hộp cuộn hiện n dòng
- `multiple` → chọn được nhiều mục

### LABEL

Gắn nhãn với ô nhập. Hai cách viết:

```html
<label for="ten">Họ tên</label> <input id="ten">
<label>Họ tên <input></label>
```

Đây **không phải chi tiết trang trí**: có `<label>` thì nhấp vào chữ cũng focus
được vào ô (vùng bấm rộng hơn nhiều, quan trọng trên điện thoại), và máy đọc
màn hình mới đọc được ô này hỏi gì.

<CodePlayground title="textarea, select, button" :html="ex3.html" :height="440" />

## 5. Điều khiển các phần tử

Slide nêu bốn kỹ thuật:

| Kỹ thuật | Cách làm |
|---|---|
| Thiết lập tiêu điểm | `element.focus()` bằng JavaScript, hoặc thuộc tính `autofocus` |
| Thứ tự Tab | `tabindex="n"` |
| Phím truy nhập | `accesskey="k"` — nhấn `Alt+k` (Windows) để nhảy tới |
| Vô hiệu hoá | `disabled` |

<CodePlayground title="focus / tabindex / accesskey / disabled" :html="ex4.html" :js="ex4.js" :height="330" />

Phân biệt `disabled` và `readonly` — một khác biệt hay bị hỏi:

| | `disabled` | `readonly` |
|---|---|---|
| Gõ được không | Không | Không |
| Có gửi lên server không | **Không** | **Có** |
| Focus được không | Không | Có |
| Hình thức | Mờ đi | Bình thường |

::: tip Ghi chú hiện đại
`tabindex` với số dương như trong ví dụ được xem là **thực hành xấu** ngày nay:
nó bẻ gãy thứ tự tự nhiên và cực khó bảo trì khi trang lớn. Hãy **sắp xếp đúng
thứ tự trong HTML** rồi để trình duyệt tự lo. Chỉ dùng `tabindex="0"` (đưa phần
tử vốn không focus được vào luồng Tab) và `tabindex="-1"` (focus được bằng
script nhưng bỏ qua khi Tab).

`accesskey` cũng gần như không còn ai dùng — nó đụng độ phím tắt của trình duyệt
và của phần mềm hỗ trợ tiếp cận.
:::

### Form HTML5 — thứ giáo trình chưa kịp có

Bài 9 sẽ dạy viết JavaScript kiểm tra ô trống, ô sai định dạng. Nhưng phần lớn
việc đó nay HTML tự làm được:

<CodePlayground title="input types + validation của HTML5" :html="ex5.html" :height="400" />

| Thuộc tính | Tác dụng |
|---|---|
| `required` | Bắt buộc nhập, trình duyệt tự chặn khi submit |
| `pattern` | Biểu thức chính quy mà giá trị phải khớp |
| `min` `max` `step` | Giới hạn cho số và ngày |
| `placeholder` | Chữ gợi ý mờ trong ô (**không thay được `<label>`**) |
| `autocomplete` | Gợi ý trình duyệt điền sẵn |

Trên điện thoại, `type` còn quyết định **bàn phím ảo** nào hiện lên:
`type="tel"` cho bàn phím số, `type="email"` có sẵn phím `@`.

::: warning Kiểm tra ở client không bao giờ là bảo mật
Mọi thứ vừa nói — HTML5 validation lẫn JavaScript ở bài 9 — chỉ để **giúp người
dùng**, cho họ biết sai chỗ nào ngay lập tức. Kẻ tấn công bỏ qua trang web của
bạn và gửi thẳng request tới server.

**Server bắt buộc phải kiểm tra lại toàn bộ.** Không có ngoại lệ.
:::

## 6. Khung (Frames)

Khung chia cửa sổ trình duyệt thành nhiều vùng riêng biệt, mỗi vùng hiển thị
một trang riêng và cuộn độc lập. Ví dụ điển hình trong slide: ba khung — một
làm biểu ngữ (banner), một làm menu điều hướng, một hiển thị dữ liệu.

Lợi ích slide nêu:

- Giữ logo hoặc thông tin tĩnh ở vị trí cố định
- Người dùng nhấp và di chuyển quanh site mà không phải liên tục quay lại trang
  nội dung
- Nhiều cách hiển thị cùng lúc (multiple views)

### FRAMESET và FRAME

Trang dùng frameset **không có `<body>`** — `<frameset>` thay chỗ nó.

| Phần tử | Thuộc tính |
|---|---|
| `<frameset>` | `rows`, `cols` |
| `<frame>` | `name`, `src`, `noresize`, `scrolling`, `frameborder`, `marginwidth`, `marginheight` |

Khung lồng nhau:

```html
<HTML>
  <HEAD>
    <TITLE>Nested Frames</TITLE>
  </HEAD>
  <FRAMESET cols="33%, 33%, 34%">
    <FRAME src="flowers.jpg">
    <FRAMESET rows="40%, 50%">
      <FRAME src="x.html">
      <FRAME src="y.html">
    </FRAMESET>
    <FRAME src="flowers.jpg">
  </FRAMESET>
</HTML>
```

Đọc: chia dọc thành 3 cột; cột giữa lại chia ngang thành 2 hàng.

### NOFRAMES

Nội dung dự phòng cho trình duyệt không hỗ trợ khung:

```html
<FRAMESET COLS="40%,60%">
  <FRAME SRC="Flowers.jpg" NAME="Flowers" SCROLLING=yes>
  <FRAMESET ROWS="60,*">
    <FRAME SRC="x.html" NAME="x" SCROLLING=no FRAMEBORDER=no>
    <FRAME SRC="y.html" NAME="y">
    <NOFRAMES>
      Frames are not being displayed. Click here
      <A href="main.htm">for a non-frames version</A>
    </NOFRAMES>
  </FRAMESET>
</FRAMESET>
```

Chú ý `ROWS="60,*"`: hàng đầu cao đúng 60px, dấu `*` nghĩa là "phần còn lại".

::: danger Frameset đã bị xoá khỏi HTML5
`<frameset>`, `<frame>` và `<noframes>` **không còn hợp lệ** trong HTML5. Vì
sao chúng bị bỏ, sau khoảng mười năm được dùng rộng rãi:

- **URL không phản ánh nội dung.** Người dùng đang xem trang con nào cũng chỉ
  thấy một URL của frameset — không bookmark, không chia sẻ link được.
- **Nút Back loạn.** Back đi lùi trong khung nào? Không ai đoán được.
- **Máy tìm kiếm index từng frame lẻ**, người dùng vào thẳng một frame thì mất
  hết menu điều hướng.
- **In ấn hỏng**, máy đọc màn hình rối, và hoàn toàn không co giãn cho điện
  thoại.

Nhu cầu "giữ menu cố định, chỉ đổi phần nội dung" ngày nay giải bằng:
| Cách | Khi nào dùng |
|---|---|
| CSS `position: sticky` / `fixed` | Menu, header dính khi cuộn |
| Include từ server (PHP/template engine) | Site nhiều trang tĩnh |
| Router phía client (Vue, React) | Ứng dụng một trang (SPA) |
:::

### Khung nội tuyến — iframe

Đây là thành viên duy nhất của họ "khung" sống sót vào HTML5, vì nó giải quyết
một bài toán khác hẳn: **nhúng một tài liệu độc lập vào giữa trang**, không phải
dựng bố cục.

Thuộc tính slide nêu: `name`, `width`, `height`.

<CodePlayground title="iframe và target" :html="ex6.html" :height="280" />

Dùng đúng chỗ ngày nay: video YouTube, bản đồ Google Maps, cổng thanh toán,
quảng cáo, và chính khung xem trước của các editor trong trang này.

Khi nhúng nội dung không do mình kiểm soát, thêm `sandbox`:

```html
<iframe src="https://ben-thu-ba.com/widget"
        sandbox="allow-scripts"
        loading="lazy"
        title="Widget bên thứ ba"></iframe>
```

`sandbox` tước hết quyền rồi cấp lại từng phần. Không có `allow-same-origin`
thì trang bên trong không đọc được cookie hay storage của bạn.

## Tóm tắt

| Chủ đề | Điểm cần nhớ |
|---|---|
| `action` / `method` | GET để đọc, POST để thay đổi dữ liệu |
| `name` | Không có `name` thì trường **không được gửi** |
| Radio | Cùng `name` mới loại trừ nhau |
| `<button>` | Mặc định `type="submit"` — nhớ ghi rõ `type="button"` |
| `<label>` | Bắt buộc, vì tiếp cận và vì vùng bấm |
| `disabled` vs `readonly` | `disabled` không gửi, `readonly` vẫn gửi |
| Validation | HTML5 làm hộ phần lớn; **server vẫn phải kiểm tra lại** |
| Frameset | Đã chết. `<iframe>` thì còn, nhưng để *nhúng*, không để *dàn trang* |

## Bài tập

### Bài 4.1

Dựng form đăng ký gồm: họ tên (bắt buộc), e-mail (bắt buộc, đúng định dạng),
mật khẩu (tối thiểu 8 ký tự), giới tính (radio), sở thích (nhiều checkbox),
tỉnh thành (select), lời nhắn (textarea), nút Gửi và Xoá. Mọi ô đều phải có
`<label>` gắn đúng.

### Bài 4.2

Vì sao form dưới đây gửi lên server mà thiếu mất giá trị? Có **hai** lỗi.

```html
<form action="/luu" method="post">
  <input type="text" value="Nguyễn Văn A">
  <input type="text" name="tuoi" value="25" disabled>
  <input type="submit" value="Gửi">
</form>
```

### Bài 4.3

Bốn radio dưới đây chọn được **cả bốn** cùng lúc. Sửa lại.

```html
<input type="radio" name="mau1" value="do"> Đỏ
<input type="radio" name="mau2" value="xanh"> Xanh
<input type="radio" name="mau3" value="vang"> Vàng
<input type="radio" name="mau4" value="tim"> Tím
```

### Bài 4.4

Chuyển bố cục frameset sau sang HTML5 + CSS (menu bên trái rộng 200px cố định,
nội dung bên phải chiếm phần còn lại và cuộn được):

```html
<FRAMESET COLS="200,*">
  <FRAME SRC="menu.html" NAME="menu">
  <FRAME SRC="noidung.html" NAME="main">
</FRAMESET>
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :height="380" />

::: details Lời giải 4.1
```html
<form action="/dang-ky" method="post">
  <p>
    <label for="ten">Họ tên *</label><br>
    <input type="text" id="ten" name="hoten" required>
  </p>

  <p>
    <label for="mail">E-mail *</label><br>
    <input type="email" id="mail" name="email" required>
  </p>

  <p>
    <label for="mk">Mật khẩu * (từ 8 ký tự)</label><br>
    <input type="password" id="mk" name="matkhau" minlength="8" required>
  </p>

  <fieldset>
    <legend>Giới tính</legend>
    <label><input type="radio" name="gioitinh" value="nam" checked> Nam</label>
    <label><input type="radio" name="gioitinh" value="nu"> Nữ</label>
    <label><input type="radio" name="gioitinh" value="khac"> Khác</label>
  </fieldset>

  <fieldset>
    <legend>Sở thích</legend>
    <label><input type="checkbox" name="sothich" value="doc"> Đọc sách</label>
    <label><input type="checkbox" name="sothich" value="chay"> Chạy bộ</label>
    <label><input type="checkbox" name="sothich" value="nau"> Nấu ăn</label>
  </fieldset>

  <p>
    <label for="tp">Tỉnh / thành</label>
    <select id="tp" name="tinhthanh">
      <option value="">-- Chọn --</option>
      <option value="hn">Hà Nội</option>
      <option value="dn">Đà Nẵng</option>
      <option value="hcm">TP. Hồ Chí Minh</option>
    </select>
  </p>

  <p>
    <label for="ln">Lời nhắn</label><br>
    <textarea id="ln" name="loinhan" rows="4" cols="40"></textarea>
  </p>

  <p>
    <button type="submit">Gửi</button>
    <button type="reset">Xoá</button>
  </p>
</form>
```
`fieldset` + `legend` gom nhóm radio/checkbox lại — máy đọc màn hình sẽ đọc
"Giới tính: Nam" thay vì chỉ "Nam".
:::

::: details Lời giải 4.2
1. Ô đầu **không có `name`** → trình duyệt không gửi trường này. `value` chỉ là
   nội dung, `name` mới là khoá.
2. Ô thứ hai có `disabled` → phần tử bị vô hiệu hoá **không nằm trong dữ liệu
   gửi đi**. Nếu chỉ muốn cấm sửa nhưng vẫn gửi thì dùng `readonly`.

```html
<form action="/luu" method="post">
  <input type="text" name="hoten" value="Nguyễn Văn A">
  <input type="text" name="tuoi"  value="25" readonly>
  <input type="submit" value="Gửi">
</form>
```
:::

::: details Lời giải 4.3
Radio loại trừ nhau **nhờ trùng `name`**. Bốn `name` khác nhau = bốn nhóm độc
lập, mỗi nhóm một nút, nên nút nào cũng bật được.

```html
<label><input type="radio" name="mau" value="do"> Đỏ</label>
<label><input type="radio" name="mau" value="xanh"> Xanh</label>
<label><input type="radio" name="mau" value="vang"> Vàng</label>
<label><input type="radio" name="mau" value="tim"> Tím</label>
```
`value` mới là thứ phân biệt lựa chọn, và cũng là thứ được gửi lên server.
:::

::: details Lời giải 4.4
```html
<div class="trang">
  <nav class="menu">
    <h3>Menu</h3>
    <ul>
      <li><a href="#">Trang chủ</a></li>
      <li><a href="#">Sản phẩm</a></li>
      <li><a href="#">Liên hệ</a></li>
    </ul>
  </nav>

  <main class="noidung">
    <h1>Nội dung</h1>
    <p>Phần này cuộn độc lập với menu.</p>
  </main>
</div>

<style>
.trang {
  display: grid;
  grid-template-columns: 200px 1fr;   /* thay COLS="200,*" */
  height: 100vh;
}
.menu {
  background: #f4f4f8;
  border-right: 1px solid #ccc;
  padding: 12px;
  overflow-y: auto;
}
.noidung {
  padding: 12px;
  overflow-y: auto;                    /* cuộn riêng, như frame */
}

/* Thứ frameset không bao giờ làm được: xếp dọc trên điện thoại */
@media (max-width: 600px) {
  .trang {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
```
`grid-template-columns: 200px 1fr` chính là `COLS="200,*"` — `1fr` đóng vai
trò dấu `*`. Khác biệt: URL vẫn đúng, nút Back vẫn chạy, và khối `@media` cho
phép đổi bố cục trên màn hình nhỏ.
:::

---

[← Bài 3](./03-bang-tang-multimedia) · Bài tiếp: [DHTML & Style Sheets →](./05-dhtml-va-style-sheets)
