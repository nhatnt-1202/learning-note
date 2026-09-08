<script setup>
const ex1 = {
  html: `<p>Trang này chứa ba đoạn script. Mở Console ở dưới.</p>
<p id="dich"></p>`,
  js: `// 1. Ghi thẳng vào tài liệu
document.getElementById("dich").innerHTML =
  "<b>Thank You!</b> — ghi bằng JavaScript";

// 2. Hộp thoại
// confirm("Are you Sure?");   // bỏ chú thích để thử
// alert("OK");

console.log("Script đã chạy xong");`
}
const ex2 = {
  js: `var A = 10;              // cách cũ — vẫn chạy
let B = 20;              // cách hiện đại, có phạm vi khối
const C = 30;            // hằng, không gán lại được

console.log(A, B, C);

// Biến toàn cục và biến cục bộ
var toanCuc = "tôi ở ngoài";

function thu() {
  var cucBo = "tôi ở trong hàm";
  console.log(toanCuc);   // đọc được
  console.log(cucBo);
}
thu();

// console.log(cucBo);   // lỗi: cucBo không tồn tại ngoài hàm

// Khác biệt var / let
for (var i = 0; i < 3; i++) {}
console.log("sau vòng lặp, var i =", i);   // 3 — var rò ra ngoài

for (let j = 0; j < 3; j++) {}
// console.log(j);   // lỗi: let chỉ sống trong khối`
}
const ex3 = {
  js: `// Bốn kiểu dữ liệu slide nêu
console.log(typeof 42);            // number
console.log(typeof true);          // boolean
console.log(typeof "xin chào");    // string
console.log(typeof null);          // "object" — LỖI LỊCH SỬ của JS

// JavaScript phân biệt hoa thường
var ten = "A";
var Ten = "B";
console.log(ten, Ten);   // hai biến KHÁC NHAU

// Hai biến khác kiểu kết hợp được — ví dụ trong slide
var A = "This apple costs Rs." + 5;
console.log(A);

// Và cái bẫy kinh điển
console.log("12" + 7.5);   // "127.5"  — CỘNG CHUỖI
console.log("12" - 7.5);   // 4.5      — TRỪ thì ép về số
console.log("12" * 2);     // 24
console.log(1 + 2 + "3");  // "33"  (trái sang phải)
console.log("1" + 2 + 3);  // "123"`
}
const ex4 = {
  js: `// Số nguyên: thập phân, thập lục phân, nhị phân
console.log(255, 0xff, 0b11111111, 0o377);

// Số thực, ký hiệu mũ
console.log(3.14, 1.5e3, 2E-4);

// Chuỗi: nháy đơn, nháy kép, và template literal (hiện đại)
var a = 'nháy đơn';
var b = "nháy kép";
var ten = "An";
var c = "Chào " + ten + "!";
console.log(a, b, c);

// Boolean
console.log(true, false);

// null và undefined — khác nhau!
var chuaGan;
console.log(chuaGan);        // undefined: chưa hề gán
console.log(null);           // null: cố ý gán "không có gì"
console.log(null == undefined);   // true  — so sánh lỏng
console.log(null === undefined);  // false — so sánh chặt`
}
const ex5 = {
  js: `var x = 17, y = 5;

console.log("x + y  =", x + y);
console.log("x - y  =", x - y);
console.log("x * y  =", x * y);
console.log("x / y  =", x / y);    // 3.4 — JS không chia lấy nguyên
console.log("x % y  =", x % y);    // 2   — phần dư
console.log("x ** 2 =", x ** 2);   // luỹ thừa (thêm sau này)

var n = 5;
console.log("n++ trả về", n++, "rồi n =", n);   // 5, rồi 6
console.log("++n trả về", ++n, "và n =", n);    // 7, và 7
console.log("phủ định:", -n);`
}
const ex6 = {
  js: `console.log(5 == "5");    // true  — ép kiểu rồi so sánh
console.log(5 === "5");   // false — so cả KIỂU
console.log(5 != "5");    // false
console.log(5 !== "5");   // true

console.log(10 > 5, 10 >= 10, 3 < 3, 3 <= 3);

// Vài kết quả gây sốc của so sánh lỏng
console.log("" == 0);        // true
console.log("0" == 0);       // true
console.log("" == "0");      // false  (!)
console.log(null == 0);      // false
console.log(NaN == NaN);     // false — NaN không bằng chính nó

// Kết luận: LUÔN dùng === và !==`
}
const ex7 = {
  js: `var x = 10;
var y = 5;

console.log("x =", x, "| y =", y);
console.log("x && y =", x && y);   // 5   — trả TOÁN HẠNG, không phải true
console.log("x || y =", x || y);   // 10
console.log("!x     =", !x);       // false

// && trả về toán hạng đầu tiên "sai", nếu không thì cái cuối
// || trả về toán hạng đầu tiên "đúng", nếu không thì cái cuối
console.log(0 || "mặc định");      // "mặc định"  — mẹo đặt giá trị mặc định
console.log("" && "không tới");    // ""

// 8 giá trị "falsy" — mọi thứ còn lại là truthy
[false, 0, -0, 0n, "", null, undefined, NaN].forEach(function (v) {
  console.log(JSON.stringify(v), "->", Boolean(v));
});`
}
const ex8 = {
  js: `// Toán tử chuỗi — ví dụ trong slide
var x = "yellow";
var y = "green";
var z = x + y + "white";
console.log(z);            // yellowgreenwhite

var w = y + 9;
console.log(w);            // green9

// Toán tử điều kiện (ba ngôi)
var age = 20;
var status = (age >= 18) ? "adult" : "minor";
console.log(status);

// typeof
var n = 5;
console.log(typeof n, typeof "a", typeof true, typeof [], typeof function(){});

// Gán rút gọn
var t = 10;
t += 5;  console.log(t);   // 15
t *= 2;  console.log(t);   // 30
t %= 7;  console.log(t);   // 2`
}
const ex9 = {
  js: `// Tạo mảng
var emp = new Array("Ryan Dias", "An", "Bình");
var emp2 = ["Ryan Dias", "An", "Bình"];   // cách hiện đại, gọn hơn

console.log(emp2[0]);        // chỉ số bắt đầu từ 0
console.log(emp2.length);

// Thêm phần tử
emp2[3] = "Chi";
emp2.push("Dũng");
console.log(emp2);

// Các phương thức slide nêu
var a = [3, 1, 2];
console.log("join   :", a.join(" - "));
console.log("reverse:", [...a].reverse());
console.log("sort   :", [...a].sort());

var b = [1, 2, 3];
console.log("pop    :", b.pop(), "→", b);    // bỏ CUỐI
var c = [1, 2, 3];
console.log("shift  :", c.shift(), "→", c);  // bỏ ĐẦU

// Bẫy sort: mặc định sắp theo CHUỖI
console.log([10, 9, 100, 1].sort());              // [1, 10, 100, 9] (!)
console.log([10, 9, 100, 1].sort((x, y) => x - y)); // [1, 9, 10, 100]

// Mảng nhiều chiều
var bang = [[1, 2], [3, 4]];
console.log(bang[1][0]);   // 3`
}
const ex10 = {
  js: `var diem = 7;

// if ... else if ... else
if (diem >= 8) {
  console.log("Giỏi");
} else if (diem >= 6.5) {
  console.log("Khá");
} else if (diem >= 5) {
  console.log("Trung bình");
} else {
  console.log("Yếu");
}

// switch
var thu = 3;
switch (thu) {
  case 1:
    console.log("Chủ nhật");
    break;
  case 2:
  case 3:
  case 4:
    console.log("Đầu tuần");
    break;       // THIẾU break là rơi xuống case sau!
  default:
    console.log("Không rõ");
}`
}
const ex11 = {
  js: `// for
for (var i = 1; i <= 3; i++) console.log("for", i);

// while
var n = 3;
while (n > 0) { console.log("while", n); n--; }

// do ... while — chạy ÍT NHẤT một lần
var m = 0;
do { console.log("do-while chạy dù điều kiện sai ngay từ đầu"); } while (m > 0);

// break và continue
for (var i = 1; i <= 6; i++) {
  if (i === 3) continue;   // bỏ qua vòng này
  if (i === 5) break;      // thoát hẳn
  console.log("i =", i);
}

// for ... in — duyệt KHOÁ của đối tượng
var xe = { hang: "Toyota", mau: "đỏ", nam: 2020 };
for (var k in xe) console.log(k, "=", xe[k]);

// with — cú pháp cũ, ĐỪNG dùng (bị cấm ở strict mode)
// with (Math) { console.log(PI, sqrt(16)); }
console.log(Math.PI, Math.sqrt(16));

// Cách hiện đại để duyệt mảng
["a", "b", "c"].forEach((v, i) => console.log(i, v));
for (const v of ["x", "y"]) console.log("for-of", v);`
}
const ex12 = {
  js: `// Hàm do người dùng định nghĩa
function tinhTong(a, b) {
  return a + b;
}
console.log(tinhTong(3, 4));

// Không return thì trả về undefined
function khongTra() { var x = 1; }
console.log(khongTra());

// Hàm dựng sẵn slide nêu
console.log(eval("2 + 3 * 4"));     // 14 — nhưng ĐỪNG dùng eval
console.log(isNaN("abc"));          // true
console.log(isNaN("123"));          // false
console.log(parseInt("42px"));      // 42
console.log(parseFloat("3.14abc")); // 3.14
console.log(Number("42px"));        // NaN — chặt hơn parseInt

// Tham số mặc định và arrow function (hiện đại)
const chao = (ten = "bạn") => "Xin chào " + ten;
console.log(chao());
console.log(chao("An"));

// Hàm là giá trị — gán được cho biến, truyền được vào hàm khác
const nhan = function (a, b) { return a * b; };
function apDung(f, x, y) { return f(x, y); }
console.log(apDung(nhan, 6, 7));`
}
const ex13 = {
  js: `// Hai cách tạo biểu thức chính quy
var re1 = /Time/;                    // khởi tạo trực tiếp
var re2 = new RegExp("Time", "i");   // gọi hàm khởi tạo RegExp

// test — ví dụ trong slide
var str = re1.test("Time and Tide wait for none");
console.log("test:", str);

// exec — trả về chi tiết chỗ khớp
console.log("exec:", /T\\w+/.exec("Time and Tide"));

// match / search / replace / split trên chuỗi
var s = "Time and Tide wait for none";
console.log("match  :", s.match(/T\\w+/g));
console.log("search :", s.search(/Tide/));
console.log("replace:", s.replace(/Tide/, "Sóng"));
console.log("split  :", s.split(/\\s+/));

// Ví dụ thực tế: kiểm tra e-mail và số điện thoại
const reMail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
console.log(reMail.test("a@b.com"), reMail.test("sai@@b"));

const reSdt = /^0\\d{9}$/;
console.log(reSdt.test("0912345678"), reSdt.test("12345"));`
}
const bt = {
  js: `// Chỗ làm bài — bấm Chạy để xem kết quả ở khung Console
console.log("Bắt đầu");`
}
</script>

# Bài 6 — Nền tảng cú pháp JavaScript

## Mục tiêu

- Mô tả về JavaScript
- Nắm bắt nền tảng cú pháp của JavaScript

## 1. JavaScript là gì

Theo slide:

- Ngôn ngữ kịch bản dùng để tạo **client-side scripts** và **server-side scripts**
- Làm việc tạo trang Web động và tương tác dễ dàng hơn
- Do Sun Microsystems và Netscape phát triển, tiến hoá từ **LiveScript** của
  Netscape
- Ứng dụng client chạy trên trình duyệt

Một điểm cần nói rõ ngay: **JavaScript không liên quan gì đến Java.** Cái tên là
quyết định marketing năm 1995, khi Java đang nổi và Netscape muốn ăn theo. Hai
ngôn ngữ khác nhau về gần như mọi mặt. Câu ví von quen thuộc: *Java và JavaScript
giống nhau như "car" và "carpet"*.

Tên chuẩn hoá của ngôn ngữ là **ECMAScript**. Các phiên bản đáng nhớ:

| Phiên bản | Năm | Mang lại |
|---|---|---|
| ES3 | 1999 | Phiên bản mà giáo trình này dạy |
| ES5 | 2009 | `strict mode`, `JSON`, `forEach`, `map` |
| **ES6 / ES2015** | 2015 | `let`/`const`, arrow function, class, module, Promise |
| ES2017+ | 2017→ | `async/await`, optional chaining, mỗi năm một bản |

### Hiệu ứng JavaScript mang lại

Slide nêu ba việc chính: cung cấp sự tương tác người dùng, thay đổi nội dung
động, xác nhận tính hợp lệ của dữ liệu.

Và bốn quy tắc ngữ pháp: **quy tắc chữ hoa** (phân biệt hoa thường), **using
pairs** (mở phải có đóng), **using spaces**, **using comments**.

## 2. Nhúng JavaScript vào trang

Slide liệt kê bốn cách:

**1. Thẻ `<script>`:**

```html
<script language="JavaScript">
<!--
JavaScript statements;
//-->
</script>
```

Cặp `<!--` … `//-->` là để **giấu code khỏi trình duyệt quá cũ** không hiểu thẻ
`<script>` — nếu không, chúng in nguyên đoạn code ra màn hình. Trình duyệt cuối
cùng cần đến mẹo này đã tuyệt chủng từ lâu; đừng viết nữa.

**2. File JavaScript bên ngoài:**

```html
<script language="JavaScript" src="filename.js"></script>
```

**3. Biểu thức JavaScript trong giá trị thuộc tính của thẻ**

**4. JavaScript trong các trình điều khiển sự kiện** (bài 8)

::: tip Ghi chú hiện đại
`language="JavaScript"` đã lỗi thời; `type="text/javascript"` cũng thừa. Viết:

```html
<script src="app.js" defer></script>
<script type="module" src="app.js"></script>
```

Vị trí đặt thẻ script rất quan trọng:

| Cách viết | Hành vi |
|---|---|
| `<script>` trong `<head>` | Chặn việc dựng trang cho tới khi tải và chạy xong |
| `<script defer>` | Tải song song, chạy **sau khi** HTML dựng xong — **nên dùng** |
| `<script async>` | Tải song song, chạy ngay khi tải xong (thứ tự không đảm bảo) |
| `<script>` cuối `<body>` | Tương đương `defer`, cách cũ |
:::

<CodePlayground title="Nhúng script" :html="ex1.html" :js="ex1.js" :height="180" :console="true" />

## 3. Biến

Theo slide: biến là vật chứa tham chiếu đến một vị trí trong bộ nhớ, giữ giá trị
và thay đổi được khi kịch bản chạy. Khai báo bằng từ khoá `var`:

```js
var A = 10;
```

Phạm vi biến: **toàn cục** (khai báo ngoài mọi hàm) hoặc **cục bộ** (trong hàm).

Quy tắc đặt tên:

- Bắt đầu bằng chữ cái, `_` hoặc `$`
- Không bắt đầu bằng chữ số
- Không chứa khoảng trắng, không trùng từ khoá
- **Phân biệt hoa thường** — `ten` và `Ten` là hai biến khác nhau

<CodePlayground title="var / let / const và phạm vi" :js="ex2.js" mode="js" :height="330" />

::: tip let và const — thứ nên dùng thay var
`var` có hai tật khiến ES6 phải thay nó:

**1. Phạm vi hàm, không phải phạm vi khối.** Biến `var` khai báo trong `if` hay
`for` vẫn sống sau khi ra khỏi khối (xem ví dụ trên).

**2. Hoisting.** Khai báo `var` bị "kéo" lên đầu hàm, nên đọc biến trước dòng
khai báo thì được `undefined` thay vì báo lỗi — che giấu lỗi đánh máy.

Quy tắc thực dụng ngày nay: **mặc định dùng `const`**, đổi sang `let` khi thật
sự cần gán lại, **không bao giờ dùng `var`** trong code mới.
:::

## 4. Kiểu dữ liệu

Slide nêu bốn kiểu: **number**, **boolean**, **string**, **null**. Nói thêm:
JavaScript phân biệt hoa thường, và hai biến khác kiểu có thể kết hợp với nhau —
`A = "This apple costs Rs." + 5` cho ra chuỗi `"This apple costs Rs. 5"`.

Danh sách đầy đủ ngày nay có 8 kiểu:

| Kiểu | Ví dụ |
|---|---|
| `number` | `42`, `3.14`, `NaN`, `Infinity` |
| `string` | `"a"`, `'b'` |
| `boolean` | `true`, `false` |
| `null` | `null` — cố ý rỗng |
| `undefined` | Chưa gán giá trị |
| `bigint` | `9007199254740993n` |
| `symbol` | `Symbol("id")` |
| `object` | `{}`, `[]`, `function(){}` |

<CodePlayground title="Kiểu dữ liệu và ép kiểu" :js="ex3.js" mode="js" :height="330" />

Ví dụ trong slide, `var A = "12" + 7.5` cho ra `"127.5"` chứ không phải `19.5` —
vì `+` gặp một chuỗi thì chuyển sang **nối chuỗi**. Đây là nguồn lỗi phổ biến
bậc nhất khi đọc giá trị từ form (mọi thứ lấy từ `input.value` đều là chuỗi).

Cách tránh: ép kiểu tường minh bằng `Number(x)`, `parseInt(x, 10)`, hoặc `+x`.

### Các kiểu nguyên dạng (literal)

| Loại | Mô tả trong slide |
|---|---|
| Integer | Hệ thập phân, thập lục phân, nhị phân |
| Floating-point | Số thập phân, dùng `e`/`E` cho phần mũ |
| String | Chuỗi rỗng hoặc chuỗi ký tự trong nháy đơn / nháy kép |
| Boolean | `true` hoặc `false` |
| null | Chỉ một giá trị `null`, hàm ý không có dữ liệu |

<CodePlayground title="Literal" :js="ex4.js" mode="js" :height="300" />

## 5. Các toán tử

### Số học

Slide liệt kê: cộng `+`, trừ `-`, nhân `*`, chia `/`, chia lấy dư `%`, tăng
`++`, giảm `--`, phủ định `-`.

*(Bảng trong slide gốc ghi nhầm: "Nhân (/)" và "Chia (%)". Đúng phải là nhân
`*`, chia `/`, và `%` là lấy phần dư.)*

<CodePlayground title="Toán tử số học" :js="ex5.js" mode="js" :height="240" />

Chú ý `x++` (hậu tố) trả về giá trị **cũ** rồi mới tăng, còn `++x` (tiền tố)
tăng trước rồi trả giá trị **mới**.

### So sánh

Bằng `==`, khác `!=`, lớn hơn `>`, lớn hơn hoặc bằng `>=`, nhỏ hơn `<`, nhỏ hơn
hoặc bằng `<=`.

<CodePlayground title="So sánh — và vì sao phải dùng ===" :js="ex6.js" mode="js" :height="290" />

::: warning == hay ===?
`==` **ép kiểu trước khi so sánh**, sinh ra một loạt kết quả phi trực giác:
`"" == 0` là `true`, nhưng `"" == "0"` là `false`.

`===` so sánh cả giá trị lẫn kiểu, không ép gì cả. **Luôn dùng `===` và `!==`.**
Ngoại lệ duy nhất được chấp nhận rộng rãi: `x == null` để kiểm tra cùng lúc cả
`null` và `undefined`.
:::

### Logic

`&&` (và), `||` (hoặc), `!` (phủ định).

<CodePlayground title="Toán tử logic và truthy/falsy" :js="ex7.js" mode="js" :height="300" />

Điều slide không nói: trong JavaScript, `&&` và `||` **không trả về `true`/`false`
mà trả về chính một trong hai toán hạng**. Nhờ đó có mẹo rất hay dùng:

```js
const ten = nhapVao || "Khách";        // giá trị mặc định
dangNhap && hienBangDieuKhien();       // chạy có điều kiện
const so = nhapVao ?? 0;               // ?? chỉ thay khi null/undefined
```

### Chuỗi, lượng giá, ưu tiên

Toán tử chuỗi `+` nối các chuỗi con lại. Toán tử điều kiện (ba ngôi):

```js
status = (age >= 18) ? "adult" : "minor"
```

Toán tử `typeof` trả về chuỗi cho biết kiểu của toán hạng.

**Mức ưu tiên** xác định thứ tự thực hiện khi một biểu thức có nhiều toán tử.
Không cần học thuộc bảng — **cứ dùng dấu ngoặc** khi có nghi ngờ, vừa đúng vừa
dễ đọc.

<CodePlayground title="Chuỗi, ba ngôi, typeof" :js="ex8.js" mode="js" :height="280" />

## 6. Mảng

Theo slide: mảng lưu một dãy biến cùng tên, phân biệt bằng chỉ số. **Chỉ số bắt
đầu từ 0.**

```js
arrayObjectName = new Array([element0, element1, ..., elementN])
emp[0] = "Ryan Dias"
```

Phương thức slide nêu: `join`, `pop`, `push`, `reverse`, `shift`, `sort`. Và:
JavaScript hỗ trợ mảng nhiều chiều.

<CodePlayground title="Mảng" :js="ex9.js" mode="js" :height="360" />

Cái bẫy đáng nhớ nhất về mảng: **`sort()` mặc định sắp theo chuỗi**, nên
`[10, 9, 100, 1].sort()` cho `[1, 10, 100, 9]`. Sắp số phải truyền hàm so sánh:
`sort((a, b) => a - b)`.

::: tip Phương thức mảng hiện đại
Nhóm này ra đời sau giáo trình nhưng nay dùng hàng ngày:

```js
const a = [1, 2, 3, 4, 5];
a.map(x => x * 2)            // [2,4,6,8,10]      biến đổi
a.filter(x => x % 2 === 0)   // [2,4]             lọc
a.reduce((t, x) => t + x, 0) // 15                gộp
a.find(x => x > 3)           // 4                 tìm phần tử đầu khớp
a.includes(3)                // true              có chứa không
a.some(x => x > 4)           // true              có ít nhất một
a.every(x => x > 0)          // true              tất cả đều
```

Khác `pop`/`push`/`sort`/`reverse` (sửa mảng gốc), nhóm này **trả về mảng mới**
— an toàn hơn nhiều.
:::

## 7. Câu lệnh điều kiện

Slide nêu `if…else` và `switch`.

<CodePlayground title="if / switch" :js="ex10.js" mode="js" :height="300" />

Bẫy của `switch`: **thiếu `break` thì rơi xuống case kế tiếp** (fall-through).
Đôi khi ta cố ý dùng nó để gộp nhiều case (như case 2, 3, 4 trong ví dụ), nhưng
quên `break` thì lỗi rất khó thấy.

## 8. Lệnh lặp

Slide liệt kê: `for`, `do…while`, `while`, `break` & `continue`, `for…in`,
`with`.

<CodePlayground title="Các kiểu vòng lặp" :js="ex11.js" mode="js" :height="360" />

| Vòng lặp | Dùng khi |
|---|---|
| `for` | Biết trước số lần lặp |
| `while` | Lặp tới khi điều kiện sai, không rõ mấy lần |
| `do…while` | Như `while` nhưng **chắc chắn chạy ít nhất một lần** |
| `for…in` | Duyệt **khoá** của đối tượng |
| `for…of` | Duyệt **giá trị** của mảng (ES6, không có trong slide) |
| `forEach` | Duyệt mảng bằng callback |

::: danger Đừng dùng `with`
`with (object) { ... }` cho phép bỏ tên đối tượng khi truy cập thuộc tính. Nó bị
xem là sai lầm thiết kế vì làm code mơ hồ — nhìn `PI` không biết là thuộc tính
của object hay biến toàn cục — và ngăn trình biên dịch tối ưu hoá.

`with` **bị cấm hoàn toàn trong strict mode**, và mọi module ES đều tự động ở
strict mode. Thực tế là bạn không dùng được nó nữa. Thay bằng biến ngắn:

```js
const m = Math;
console.log(m.PI, m.sqrt(16));
```
:::

Và một bẫy phổ biến của `for…in`: nó duyệt cả thuộc tính kế thừa từ prototype.
Duyệt mảng thì dùng `for…of` hoặc `forEach`, đừng dùng `for…in`.

## 9. Hàm

Slide nêu hai loại: hàm dựng sẵn (`eval`, `isNaN`) và hàm do người dùng tạo:

```js
function funcName(argument1, argument2, etc) {
  statements;
}
```

<CodePlayground title="Hàm" :js="ex12.js" mode="js" :height="330" />

::: danger eval là ác quỷ
`eval("2 + 3 * 4")` chạy chuỗi như code. Ba lý do không dùng:

1. **Bảo mật** — chuỗi đến từ người dùng thì bạn vừa cho họ chạy code tuỳ ý
   trên trang của mình.
2. **Chậm** — engine không tối ưu được đoạn có `eval`.
3. **Không debug được** — lỗi bên trong chuỗi rất khó lần.

Gần như mọi trường hợp dùng `eval` đều có cách khác: cần đọc thuộc tính động thì
dùng `obj[ten]`, cần phân tích JSON thì dùng `JSON.parse`, cần bảng công thức
thì dùng object ánh xạ tên → hàm.
:::

## 10. Biểu thức chính quy

Slide gọi là "biểu thức quy tắc". Định nghĩa: một kiểu mẫu xác định để tìm kiếm
sự tương ứng của các ký tự trong chuỗi. Dùng để tìm mẫu trong dữ liệu người dùng
nhập vào.

Hai cách tạo:

```js
var re1 = /Time/;                    // khởi tạo đối tượng
var re2 = new RegExp("Time");        // gọi hàm khởi tạo RegExp
```

Các phương thức: `exec`, `test`, `match`, `search`, `replace`, `split`.

<CodePlayground title="Regex" :js="ex13.js" mode="js" :height="330" />

Bảng ký hiệu tối thiểu cần nhớ:

| Ký hiệu | Khớp với |
|---|---|
| `.` | Một ký tự bất kỳ |
| `\d` `\w` `\s` | Chữ số / ký tự từ / khoảng trắng |
| `\D` `\W` `\S` | Phủ định của ba cái trên |
| `^` `$` | Đầu chuỗi / cuối chuỗi |
| `*` `+` `?` | 0 trở lên / 1 trở lên / 0 hoặc 1 |
| `{n}` `{n,m}` | Đúng n lần / từ n đến m lần |
| `[abc]` `[^abc]` | Một trong / không phải một trong |
| `(…)` | Nhóm, và bắt giá trị |
| `\|` | Hoặc |

Cờ đặt sau dấu `/` cuối: `g` (tìm toàn bộ), `i` (không phân biệt hoa thường),
`m` (nhiều dòng).

## Tóm tắt

| Chủ đề | Điểm cần nhớ |
|---|---|
| Khai báo biến | `const` mặc định, `let` khi cần gán lại, không dùng `var` |
| So sánh | Luôn `===`, không bao giờ `==` |
| `+` với chuỗi | `"12" + 7.5` là `"127.5"` — ép kiểu tường minh trước khi tính |
| `&&` `\|\|` | Trả về toán hạng, không phải boolean — dùng làm giá trị mặc định |
| Mảng | Chỉ số từ 0; `sort()` mặc định sắp theo chuỗi |
| `switch` | Thiếu `break` là rơi xuống case sau |
| `with`, `eval` | Đừng dùng, cả hai |
| Regex | `test` trả boolean, `match` trả chỗ khớp |

## Bài tập

### Bài 6.1

Viết hàm `tinhDiem(diem)` trả về xếp loại: ≥ 8 "Giỏi", ≥ 6.5 "Khá", ≥ 5 "Trung
bình", còn lại "Yếu". Nếu tham số không phải số trong 0–10 thì trả về `"Không
hợp lệ"`. Kiểm tra với: `9`, `6.5`, `4`, `"abc"`, `11`, `-1`.

### Bài 6.2

In bảng cửu chương từ 2 đến 5, mỗi dòng dạng `3 x 7 = 21`.

### Bài 6.3

Cho `var gio = [12, 5, 8, 130, 25]`. Viết code:
a) Sắp xếp tăng dần (đúng theo số).
b) Tính tổng và trung bình.
c) Lọc ra các giá trị lớn hơn 10.
d) Tìm giá trị lớn nhất.

### Bài 6.4

Đoạn code sau in ra gì, và vì sao? Sửa lại cho đúng ý định (cộng hai số).

```js
var a = "10";
var b = "5";
console.log(a + b);
console.log(a - b);
```

### Bài 6.5

Viết regex kiểm tra mật khẩu mạnh: ít nhất 8 ký tự, có ít nhất một chữ hoa, một
chữ thường và một chữ số.

<CodePlayground title="Chỗ làm bài" :js="bt.js" mode="js" :height="330" />

::: details Lời giải 6.1
```js
function tinhDiem(diem) {
  // typeof để chặn chuỗi, isNaN để chặn NaN
  if (typeof diem !== "number" || isNaN(diem) || diem < 0 || diem > 10) {
    return "Không hợp lệ";
  }
  if (diem >= 8)   return "Giỏi";
  if (diem >= 6.5) return "Khá";
  if (diem >= 5)   return "Trung bình";
  return "Yếu";
}

[9, 6.5, 4, "abc", 11, -1].forEach(function (d) {
  console.log(JSON.stringify(d), "→", tinhDiem(d));
});
```
Chú ý: `return` sớm khiến không cần `else` — code phẳng và dễ đọc hơn chuỗi
`if/else if` lồng nhau.
:::

::: details Lời giải 6.2
```js
for (var bang = 2; bang <= 5; bang++) {
  console.log("--- Bảng " + bang + " ---");
  for (var i = 1; i <= 10; i++) {
    console.log(bang + " x " + i + " = " + bang * i);
  }
}
```
:::

::: details Lời giải 6.3
```js
var gio = [12, 5, 8, 130, 25];

// a) Sắp xếp theo SỐ — bắt buộc truyền hàm so sánh
var tang = [...gio].sort(function (a, b) { return a - b; });
console.log("a)", tang);          // [5, 8, 12, 25, 130]
console.log("   sai:", [...gio].sort());   // [12, 130, 25, 5, 8]

// b) Tổng và trung bình
var tong = gio.reduce(function (t, x) { return t + x; }, 0);
console.log("b) tổng =", tong, "| tb =", (tong / gio.length).toFixed(2));

// c) Lọc
console.log("c)", gio.filter(function (x) { return x > 10; }));

// d) Lớn nhất
console.log("d)", Math.max(...gio));
```
`[...gio]` sao chép mảng để `sort` không sửa mảng gốc.
:::

::: details Lời giải 6.4
```
"105"   ← a + b
5       ← a - b
```

`+` là toán tử **quá tải**: gặp một toán hạng là chuỗi thì nó nối chuỗi thay vì
cộng số. Còn `-` không có nghĩa nào cho chuỗi, nên JavaScript ép cả hai về số
rồi trừ — kết quả `5` đúng như số.

Sửa bằng cách ép kiểu tường minh:

```js
var a = "10";
var b = "5";

console.log(Number(a) + Number(b));   // 15
console.log(parseInt(a, 10) + parseInt(b, 10));  // 15
console.log(+a + +b);                 // 15 — gọn nhưng khó đọc
```

Đây chính xác là lỗi bạn sẽ gặp ở bài 9: mọi giá trị lấy từ `input.value` đều là
chuỗi, kể cả ô `type="number"`.
:::

::: details Lời giải 6.5
```js
// (?=...) là "lookahead": phải tồn tại mẫu này ở phía trước,
// nhưng không tiêu thụ ký tự nào — nhờ đó ghép được nhiều điều kiện.
const reMatKhau = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

[
  "abc",            // quá ngắn
  "abcdefgh",       // thiếu hoa và số
  "Abcdefgh",       // thiếu số
  "Abcdef12",       // đạt
  "MatKhau2026"     // đạt
].forEach(function (mk) {
  console.log(mk.padEnd(14), reMatKhau.test(mk) ? "OK" : "yếu");
});
```

Đọc từng mảnh:
- `^` đầu chuỗi
- `(?=.*[a-z])` phía trước có ít nhất một chữ thường
- `(?=.*[A-Z])` … một chữ hoa
- `(?=.*\d)` … một chữ số
- `.{8,}` tổng cộng từ 8 ký tự
- `$` cuối chuỗi

Lưu ý thực tế: đây là kiểm tra **phía client**, chỉ để báo cho người dùng biết
sớm. Server vẫn phải kiểm tra lại.
:::

---

[← Bài 5](./05-dhtml-va-style-sheets) · Bài tiếp: [Các đối tượng cơ bản →](./07-doi-tuong-co-ban)
