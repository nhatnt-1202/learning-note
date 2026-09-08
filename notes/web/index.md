<script setup>
const demo = {
  html: `<h2 id="loi-chao">Xin chào!</h2>
<p>Sửa chữ này rồi bấm <b>Chạy</b>.</p>
<button id="nut">Bấm tôi</button>`,
  css: `#loi-chao {
  color: teal;
}`,
  js: `document.getElementById("nut").onclick = function () {
  alert("Editor chạy được rồi!");
};`
}
</script>

# Lập trình Web: HTML, DHTML & JavaScript

Loạt ghi chép này biên soạn lại từ 10 slide *Web Page Programming with HTML,
DHTML & JavaScript*. Hai slide cuối trùng nội dung nên còn **9 bài**.

Giáo trình gốc viết cho thời Netscape Navigator 4 / IE 5 (khoảng 2000–2005).
Kiến thức nền vẫn đúng, nhưng khá nhiều thẻ trong đó nay đã **bị khai tử**. Mỗi
bài vì vậy có hai lớp:

- **Nội dung bài học** — theo đúng slide, để đọc và ôn đúng chương trình.
- Khối **Ghi chú hiện đại** — thứ tương đương nên dùng hôm nay, kèm lý do.

Đọc theo thứ tự; mỗi bài kết thúc bằng bài tập có lời giải gấp lại.

## Lộ trình

### Phần 1 — HTML

| # | Bài | Nội dung chính |
|---|---|---|
| 1 | [Giới thiệu HTML & siêu liên kết](./01-html-va-sieu-lien-ket) | WWW, cấu trúc tài liệu, thẻ và thuộc tính, `<a href>`, ký tự đặc biệt |
| 2 | [Các thẻ cơ bản & hình ảnh](./02-the-co-ban-va-hinh-anh) | Heading, đoạn, định dạng, danh sách, `<hr>`, `<font>`, `<img>` |
| 3 | [Bảng, tầng & multimedia](./03-bang-tang-multimedia) | `<table>`, colspan/rowspan, layer, âm thanh, video, applet |
| 4 | [Biểu mẫu & khung](./04-bieu-mau-va-khung) | `<form>`, các loại `<input>`, `<select>`, frameset, iframe |

### Phần 2 — DHTML & CSS

| # | Bài | Nội dung chính |
|---|---|---|
| 5 | [DHTML & Style Sheets](./05-dhtml-va-style-sheets) | DHTML là gì, cú pháp CSS, 5 loại bộ chọn, 3 cách gắn CSS |

### Phần 3 — JavaScript

| # | Bài | Nội dung chính |
|---|---|---|
| 6 | [Nền tảng cú pháp JavaScript](./06-javascript-can-ban) | Biến, kiểu dữ liệu, toán tử, mảng, rẽ nhánh, vòng lặp, hàm, regex |
| 7 | [Các đối tượng cơ bản](./07-doi-tuong-co-ban) | Object, `this`, `for...in`, `with`, `new`, String, Math, Date |
| 8 | [Đối tượng trình duyệt & sự kiện](./08-doi-tuong-trinh-duyet) | Vòng đời sự kiện, các handler, window, document, history, location |
| 9 | [Form & kiểm tra hợp lệ](./09-form-va-kiem-tra-hop-le) | Textfield, button, checkbox, radio, select, validation |

Ngoài ra: [Sân chơi tự do](./playground) — editor trống để thử bất cứ thứ gì.

## Editor trong trang

Mỗi ví dụ đều là một editor sống. Sửa code bên trái, bấm **▶ Chạy**, kết quả
hiện ngay bên phải:

<CodePlayground title="Thử sửa rồi bấm Chạy" :html="demo.html" :css="demo.css" :js="demo.js" :height="200" />

Vài điều nên biết về editor này:

- Ba tab **HTML / CSS / JavaScript** ghép lại thành một trang hoàn chỉnh trước
  khi chạy — không cần tự viết `<html>`, `<head>`, `<body>`.
- Chạy trong `iframe` **sandbox**, khác origin với trang này, nên code sai cũng
  không phá được trang ghi chép.
- `console.log` và lỗi runtime đổ vào khung **Console** ở dưới (các bài
  JavaScript bật sẵn khung này).
- **↺ Đặt lại** trả về code gốc, **↗ Tab mới** mở kết quả toàn màn hình.
- Code **không được lưu** khi tải lại trang — muốn giữ thì tự copy ra ngoài.
