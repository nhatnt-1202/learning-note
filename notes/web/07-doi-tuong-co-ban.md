<script setup>
const ex1 = {
  js: `// Đối tượng = thuộc tính (dữ liệu) + phương thức (hàm)
var xeHoi = {
  cauTao: "sedan",
  kieuDang: "4 cửa",
  mauSac: "đỏ",

  go: function () { console.log("Xe chạy tới"); },
  brake: function () { console.log("Xe phanh"); },
  reverse: function () { console.log("Xe lùi"); }
};

// Truy cập thuộc tính: objectName.propertyName
console.log(xeHoi.mauSac);
console.log(xeHoi["mauSac"]);   // cú pháp ngoặc vuông — dùng khi tên là biến

// Truy cập phương thức: objectName.method()
xeHoi.go();
xeHoi.brake();

// Thêm và xoá thuộc tính lúc chạy
xeHoi.namSanXuat = 2024;
delete xeHoi.cauTao;
console.log(xeHoi);`
}
const ex2 = {
  html: `<button onclick="hienThi(this)">Nút A</button>
<button onclick="hienThi(this)">Nút B</button>

<form name="fm">
  <input type="text" value="gõ rồi rời chuột đi" size="30"
         onchange="console.log('this.value =', this.value)">
</form>`,
  js: `function hienThi(el) {
  console.log("this.tagName    =", el.tagName);
  console.log("this.textContent=", el.textContent);
}

// this trong phương thức của đối tượng
var nguoi = {
  ten: "An",
  chao: function () {
    console.log("Tôi là " + this.ten);
  }
};
nguoi.chao();

// Bẫy: tách phương thức ra khỏi đối tượng thì mất this
var f = nguoi.chao;
// f();   // "Tôi là undefined"
console.log("Dùng bind để giữ this:", "");
var g = nguoi.chao.bind(nguoi);
g();`
}
const ex3 = {
  js: `var xe = { hang: "Toyota", mau: "đỏ", nam: 2020 };

// for ... in duyệt KHOÁ
for (var k in xe) {
  console.log(k, "=", xe[k]);
}

console.log("---");

// Với mảng, for...in cho ra CHỈ SỐ dạng CHUỖI
var a = ["x", "y", "z"];
for (var i in a) {
  console.log(typeof i, i, a[i]);
}

console.log("--- cách hiện đại ---");
console.log(Object.keys(xe));
console.log(Object.values(xe));
Object.entries(xe).forEach(([k, v]) => console.log(k, "->", v));`
}
const ex4 = {
  js: `// Toán tử new: objectName = new objectType(param1, param2, ...)
var mang = new Array(1, 2, 3);
var ngay = new Date(2026, 0, 15);
var chuoi = new String("xin chào");

console.log(mang, typeof mang);
console.log(chuoi, typeof chuoi);   // "object" (!) chứ không phải "string"

// Đối tượng do người dùng định nghĩa — cách của giáo trình
function NhanVien(ten, tuoi, luong) {
  this.ten = ten;
  this.tuoi = tuoi;
  this.luong = luong;
  this.tangLuong = function (n) {
    this.luong += n;
    return this.luong;
  };
}

var nv1 = new NhanVien("An", 25, 1000);
var nv2 = new NhanVien("Bình", 30, 1500);
console.log(nv1.ten, nv1.luong, "→", nv1.tangLuong(200));
console.log(nv2.ten, nv2.luong);

// Cách hiện đại — class (ES6), bên trong vẫn là cơ chế trên
class NhanVien2 {
  constructor(ten, luong) {
    this.ten = ten;
    this.luong = luong;
  }
  tangLuong(n) { this.luong += n; return this.luong; }
}
const nv3 = new NhanVien2("Chi", 2000);
console.log(nv3.ten, nv3.tangLuong(500));`
}
const ex5 = {
  js: `// Ba cách tạo chuỗi theo slide
var s1 = "Xin chào";                 // var + gán
var s2 = s1;                         // toán tử = với tên biến
var s3 = new String("Xin chào");     // hàm khởi tạo String

console.log(typeof s1, typeof s3);   // string / object
console.log(s1 === "Xin chào");      // true
console.log(s3 === "Xin chào");      // false (!) — object khác primitive

// Thuộc tính
var s = "JavaScript";
console.log("length:", s.length);

// Các phương thức hay dùng
console.log("toUpperCase :", s.toUpperCase());
console.log("toLowerCase :", s.toLowerCase());
console.log("charAt(4)   :", s.charAt(4));
console.log("indexOf     :", s.indexOf("Script"));
console.log("slice(0,4)  :", s.slice(0, 4));
console.log("substring   :", s.substring(4));
console.log("split       :", "a,b,c".split(","));
console.log("replace     :", s.replace("Java", "Type"));
console.log("trim        :", "   có lề   ".trim() + "|");
console.log("includes    :", s.includes("Scr"));
console.log("startsWith  :", s.startsWith("Java"));
console.log("repeat      :", "ab".repeat(3));
console.log("padStart    :", "7".padStart(3, "0"));

// Chuỗi là BẤT BIẾN — mọi phương thức trả về chuỗi MỚI
var t = "abc";
t.toUpperCase();
console.log("t vẫn là:", t);
t = t.toUpperCase();
console.log("phải gán lại:", t);`
}
const ex6 = {
  js: `// Ví dụ trong slide
function doCalc(x) {
  var a = Math.PI * x * x;
  console.log("Diện tích hình tròn bán kính " + x + " là " + a.toFixed(2));
}
doCalc(3);

// Hằng số
console.log("PI =", Math.PI, "| E =", Math.E);

// Làm tròn — bốn cách khác nhau
console.log("round(2.5) =", Math.round(2.5));   // 3
console.log("round(-2.5)=", Math.round(-2.5));  // -2 (!)
console.log("floor(2.9) =", Math.floor(2.9));   // 2
console.log("ceil(2.1)  =", Math.ceil(2.1));    // 3
console.log("trunc(-2.9)=", Math.trunc(-2.9));  // -2

// Khác
console.log("abs, sqrt, pow:", Math.abs(-5), Math.sqrt(16), Math.pow(2, 10));
console.log("max, min:", Math.max(3, 9, 1), Math.min(3, 9, 1));

// Số ngẫu nhiên: [0, 1)
console.log("random:", Math.random());

// Số nguyên ngẫu nhiên từ min đến max (bao gồm cả hai)
function nganNhien(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
console.log("Xúc xắc:", nganNhien(1, 6), nganNhien(1, 6), nganNhien(1, 6));`
}
const ex7 = {
  js: `// Date lưu thời gian bằng số MILI GIÂY kể từ 1/1/1970 00:00:00 UTC
var bayGio = new Date();
console.log("Bây giờ    :", bayGio.toString());
console.log("Mốc mili giây:", bayGio.getTime());

// Các cách khởi tạo
console.log(new Date(0).toISOString());                  // mốc gốc
console.log(new Date(2026, 0, 15).toDateString());       // THÁNG TỪ 0!
console.log(new Date("2026-01-15T10:30:00").toString());

// Lấy từng phần
var d = new Date(2026, 8, 8, 14, 30, 45);
console.log("getFullYear:", d.getFullYear());
console.log("getMonth   :", d.getMonth(), "(0 = tháng 1)");
console.log("getDate    :", d.getDate());
console.log("getDay     :", d.getDay(), "(0 = Chủ nhật)");
console.log("giờ:phút:giây =", d.getHours(), d.getMinutes(), d.getSeconds());

// Định dạng cho người Việt đọc
console.log(d.toLocaleDateString("vi-VN"));
console.log(d.toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" }));

// Tính khoảng cách giữa hai mốc
var tet = new Date(2027, 1, 6);
var soNgay = Math.ceil((tet - new Date()) / 86400000);
console.log("Còn khoảng", soNgay, "ngày nữa tới 6/2/2027");`
}
const ex8 = {
  html: `<h4>Đồng hồ + đếm ngược</h4>
<p id="dh" style="font-size:1.6rem;font-family:monospace"></p>
<p id="dem"></p>`,
  js: `function hai(n) { return String(n).padStart(2, "0"); }

function capNhat() {
  const d = new Date();
  document.getElementById("dh").textContent =
    hai(d.getHours()) + ":" + hai(d.getMinutes()) + ":" + hai(d.getSeconds());

  const namMoi = new Date(d.getFullYear() + 1, 0, 1);
  const conLai = namMoi - d;
  const ngay = Math.floor(conLai / 86400000);
  const gio  = Math.floor(conLai % 86400000 / 3600000);
  const phut = Math.floor(conLai % 3600000 / 60000);
  document.getElementById("dem").textContent =
    "Còn " + ngay + " ngày " + gio + " giờ " + phut + " phút tới năm mới.";
}

capNhat();
setInterval(capNhat, 1000);`
}
const bt = {
  js: `// Chỗ làm bài
console.log("Bắt đầu");`
}
</script>

# Bài 7 — Các đối tượng cơ bản trong JavaScript

## Mục tiêu

- Làm việc trên các đối tượng cơ bản
- Sử dụng các thuộc tính và phương thức của đối tượng

## 1. Đối tượng là gì

Theo slide:

> Thuộc tính (biến) dùng để định nghĩa đối tượng và các phương thức (hàm) tác
> động tới dữ liệu đều nằm trong đối tượng.
>
> Ví dụ: một chiếc xe hơi là một đối tượng. Các thuộc tính của nó là cấu tạo,
> kiểu dáng và màu sắc. Hầu hết xe hơi đều có vài phương thức chung như `go()`,
> `brake()`, `reverse()`.

Nói ngắn: **đối tượng gói dữ liệu và hành vi liên quan vào cùng một chỗ**.

### Thuộc tính và phương thức

```js
objectName.propertyName    // truy cập thuộc tính
objectName.method()        // gọi phương thức
```

<CodePlayground title="Đối tượng xe hơi" :js="ex1.js" mode="js" :height="300" />

Có hai cú pháp truy cập, và chúng không hoàn toàn thay thế nhau:

| Cú pháp | Dùng khi |
|---|---|
| `xe.mauSac` | Biết trước tên thuộc tính — gọn, dễ đọc |
| `xe["mauSac"]` | Tên nằm trong biến, hoặc tên chứa ký tự lạ / khoảng trắng |

```js
const truong = "mauSac";
console.log(xe[truong]);   // đọc động — dấu chấm không làm được
```

### Cách dùng đối tượng

Slide nói khi tạo trang web ta cần chèn:

- Các **đối tượng trình duyệt** (window, document… — bài 8)
- Các **đối tượng có sẵn** (String, Math, Date… — bài này)
- Các **phần tử HTML**

Và ta cũng tự tạo được đối tượng theo yêu cầu của mình.

### Cây phân cấp đối tượng

```
window                       (cửa sổ trình duyệt — đối tượng gốc)
├── document                 (tài liệu HTML)
│   ├── forms[]
│   │   └── elements[]       (input, select, textarea…)
│   ├── images[]
│   └── links[]
├── location                 (URL hiện tại)
├── history                  (lịch sử duyệt)
├── navigator                (thông tin trình duyệt)
└── screen                   (thông tin màn hình)
```

Mọi thứ treo dưới `window`, nên `window.document.write(...)` viết tắt được thành
`document.write(...)`. Chi tiết ở [bài 8](./08-doi-tuong-trinh-duyet).

## 2. Câu lệnh `this`

Theo slide: `this` không chỉ là một thuộc tính nội tại; giá trị của nó chỉ ra
**đối tượng hiện hành**.

<CodePlayground title="this" :html="ex2.html" :js="ex2.js" :height="260" :console="true" />

`this` là chủ đề gây rối nhất của JavaScript vì **giá trị của nó phụ thuộc vào
cách hàm được gọi**, không phải nơi hàm được viết:

| Cách gọi | `this` là |
|---|---|
| `obj.method()` | `obj` |
| `ham()` (gọi trơn) | `undefined` (strict) hoặc `window` |
| `new Ham()` | Đối tượng mới vừa tạo |
| `onclick="f(this)"` | Phần tử HTML gây ra sự kiện |
| Arrow function | `this` của **phạm vi bao ngoài** — không có `this` riêng |

Chính vì luật cuối, arrow function rất tiện làm callback:

```js
// Sai — this trong hàm thường trỏ ra ngoài object
const bo = {
  ten: "Bộ đếm", so: [1, 2, 3],
  in() { this.so.forEach(function (x) { console.log(this.ten, x); }); }
};

// Đúng — arrow giữ nguyên this của phương thức
const bo2 = {
  ten: "Bộ đếm", so: [1, 2, 3],
  in() { this.so.forEach(x => console.log(this.ten, x)); }
};
```

## 3. Câu lệnh `for...in`

Duyệt mỗi thuộc tính của đối tượng, hoặc mỗi phần tử của mảng:

```js
for (variable in object) { statements; }
```

<CodePlayground title="for...in" :js="ex3.js" mode="js" :height="280" />

Hai điều cần lưu ý mà slide không nêu:

1. Với mảng, biến lặp là **chuỗi** `"0"`, `"1"`, `"2"` chứ không phải số.
2. `for…in` duyệt cả thuộc tính kế thừa qua prototype.

Nên duyệt mảng thì dùng `for…of` hoặc `forEach`; duyệt object thì dùng
`Object.keys()` / `Object.entries()`.

## 4. Câu lệnh `with`

```js
with (object) { statements; }
```

Thực thi một tập lệnh dùng các phương thức của cùng một đối tượng, không phải
lặp lại tên đối tượng.

::: danger Đã bị cấm
`with` **bị cấm hoàn toàn trong strict mode** — mà mọi module ES đều tự động ở
strict mode. Xem lại giải thích ở [bài 6](./06-javascript-can-ban). Thay bằng
gán vào biến ngắn hoặc destructuring:

```js
const { PI, sqrt, pow } = Math;
console.log(PI, sqrt(16), pow(2, 8));
```
:::

## 5. Toán tử `new`

Tạo một thực thể mới của một loại đối tượng:

```js
objectName = new objectType(param1 [, param2] ... [, paramN])
```

| Thành phần | Nghĩa (theo slide) |
|---|---|
| `objectName` | Tên của thực thể đối tượng mới |
| `objectType` | Hàm quyết định loại của đối tượng, ví dụ `Array` |
| `param[1,2,…]` | Các giá trị thuộc tính của đối tượng |

<CodePlayground title="new và hàm khởi tạo" :js="ex4.js" mode="js" :height="340" />

Chú ý `new String("abc")` cho ra một **object**, không phải chuỗi nguyên thuỷ —
nên `=== "abc"` là `false`. Đây là lý do thực tế: **đừng dùng `new` với
`String`, `Number`, `Boolean`.** Viết `"abc"`, `42`, `true` trực tiếp.

## 6. Hàm `eval`

Theo slide: đánh giá một chuỗi mã lệnh mà không cần tham chiếu đối tượng cụ thể
nào. Chuỗi có thể là biểu thức, một câu lệnh hoặc nhóm câu lệnh.

```js
var x = 5;
var z = 10;
document.write(eval("x + z + 5"));   // 20
```

Xem lại cảnh báo ở [bài 6](./06-javascript-can-ban) — `eval` là lỗ hổng bảo mật
và không nên dùng. Bài 8 sẽ gặp lại nó trong ví dụ máy tính bỏ túi của giáo
trình, kèm cách viết lại an toàn.

## 7. Đối tượng String

Theo slide: dùng để thao tác với chuỗi văn bản — tách chuỗi thành chuỗi con,
biến đổi hoa thường.

```js
stringName.propertyName
stringName.methodName()
```

Ba cách tạo chuỗi slide nêu: dùng `var` và gán giá trị; dùng toán tử `=` với tên
biến; dùng hàm khởi tạo `String()`.

<CodePlayground title="String" :js="ex5.js" mode="js" :height="400" />

Điều quan trọng nhất về chuỗi: **chuỗi là bất biến (immutable)**. `toUpperCase()`
không sửa chuỗi gốc mà trả về chuỗi mới. Quên gán lại là lỗi kinh điển của người
mới.

## 8. Đối tượng Math

Theo slide: có các thuộc tính và phương thức biểu thị phép tính toán học nâng
cao.

```js
function doCalc(x) {
  var a;
  a = Math.PI * x * x;
  alert("The area of a circle with a radius of " + x + " is " + a);
}
```

<CodePlayground title="Math" :js="ex6.js" mode="js" :height="340" />

`Math` khác các đối tượng khác ở chỗ **không tạo bằng `new`** — nó là một đối
tượng tĩnh, gọi thẳng `Math.PI`, `Math.random()`.

Một chi tiết dễ vấp: `Math.round(-2.5)` cho `-2` chứ không phải `-3`, vì JS làm
tròn **về phía +∞** khi gặp đúng .5. Cần làm tròn kiểu khác thì dùng
`Math.floor`, `Math.ceil` hoặc `Math.trunc`.

## 9. Đối tượng Date

Theo slide:

- `Date` là đối tượng có sẵn chứa thông tin về ngày và giờ
- **Không có thuộc tính nào** — chỉ có phương thức để thiết lập, lấy và xử lý
  thông tin thời gian
- Lưu thời gian theo **số mili giây tính từ 1/1/1970 00:00:00**

```js
DateObject = new Date(parameters)
```

<CodePlayground title="Date" :js="ex7.js" mode="js" :height="360" />

::: warning Ba cái bẫy của Date
**1. Tháng đếm từ 0.** `new Date(2026, 0, 15)` là **15 tháng 1**, không phải
tháng 2. Ngày và năm thì đếm bình thường — chỉ riêng tháng lệch. Đây là di sản
từ ngôn ngữ C, và là nguồn lỗi bất tận.

**2. `getDay()` khác `getDate()`.** `getDate()` trả về ngày trong tháng (1–31),
`getDay()` trả về **thứ** trong tuần (0 = Chủ nhật).

**3. Múi giờ.** `new Date("2026-01-15")` được hiểu là **UTC**, còn
`new Date("2026-01-15T00:00:00")` được hiểu là **giờ địa phương**. Chênh nhau
đúng một ngày ở Việt Nam (UTC+7). Khác biệt một dấu `T` mà lệch cả ngày.
:::

Một mẹo thực dụng: **hiệu hai `Date` cho ra số mili giây**, vì JS ép chúng về
số. Chia cho `86400000` (số mili giây trong một ngày) để ra số ngày.

Bài toán ngày tháng phức tạp (múi giờ, định dạng, cộng trừ tháng) thì nên dùng
thư viện như **date-fns** hoặc **Day.js**; API `Temporal` đang được đưa vào
chuẩn để thay hẳn `Date`.

Kết hợp mọi thứ trong bài — đồng hồ chạy thật:

<CodePlayground title="Đồng hồ + đếm ngược" :html="ex8.html" :js="ex8.js" :height="220" />

## Tóm tắt

| Đối tượng | Điểm cần nhớ |
|---|---|
| Object | `obj.prop` hoặc `obj["prop"]`; ngoặc vuông khi tên là biến |
| `this` | Phụ thuộc **cách gọi**, không phải nơi viết |
| `for…in` | Duyệt khoá; với mảng dùng `for…of` / `forEach` |
| `with` | Bị cấm ở strict mode — đừng dùng |
| `new` | Đừng dùng với `String`/`Number`/`Boolean` |
| `eval` | Đừng dùng, chấm hết |
| String | **Bất biến** — phương thức trả về chuỗi mới, phải gán lại |
| Math | Đối tượng tĩnh, không `new`; `Math.round(-2.5) === -2` |
| Date | Mili giây từ 1/1/1970; **tháng đếm từ 0**; cẩn thận múi giờ |

## Bài tập

### Bài 7.1

Tạo đối tượng `sinhVien` có: `hoTen`, `tuoi`, `diem` (mảng 4 số), và hai phương
thức `diemTrungBinh()`, `xepLoai()`. In kết quả ra console.

### Bài 7.2

Viết hàm `vietHoaChuCaiDau(chuoi)` biến `"nguyễn văn an"` thành
`"Nguyễn Văn An"`.

### Bài 7.3

Viết hàm `laPalindrome(s)` kiểm tra chuỗi đọc xuôi ngược như nhau, bỏ qua hoa
thường, khoảng trắng và dấu câu. Thử với `"Racecar"`, `"A man a plan a canal
Panama"`, `"Xin chào"`.

### Bài 7.4

Viết hàm `tuoi(ngaySinh)` trả về số tuổi tính đến hôm nay (đủ ngày sinh nhật
mới tính thêm một tuổi). Thử với `"2000-12-31"` và `"2000-01-01"`.

### Bài 7.5

Viết hàm `xucXac(n)` tung `n` lần xúc xắc 6 mặt và trả về đối tượng đếm số lần
ra từng mặt, ví dụ `{1: 16, 2: 18, ...}`. Chạy với `n = 6000`, kiểm tra xem các
mặt có xấp xỉ 1000 lần không.

<CodePlayground title="Chỗ làm bài" :js="bt.js" mode="js" :height="340" />

::: details Lời giải 7.1
```js
var sinhVien = {
  hoTen: "Nguyễn Văn An",
  tuoi: 20,
  diem: [8, 7.5, 9, 6],

  diemTrungBinh: function () {
    var tong = this.diem.reduce(function (t, d) { return t + d; }, 0);
    return tong / this.diem.length;
  },

  xepLoai: function () {
    var tb = this.diemTrungBinh();     // gọi phương thức khác qua this
    if (tb >= 8)   return "Giỏi";
    if (tb >= 6.5) return "Khá";
    if (tb >= 5)   return "Trung bình";
    return "Yếu";
  }
};

console.log(sinhVien.hoTen);
console.log("TB:", sinhVien.diemTrungBinh().toFixed(2));
console.log("Xếp loại:", sinhVien.xepLoai());
```
Điểm mấu chốt: bên trong phương thức, `this` trỏ về chính đối tượng, nên
`this.diem` và `this.diemTrungBinh()` dùng được.
:::

::: details Lời giải 7.2
```js
function vietHoaChuCaiDau(chuoi) {
  return chuoi
    .toLowerCase()
    .split(" ")
    .map(function (tu) {
      if (tu.length === 0) return tu;          // tránh lỗi với dấu cách kép
      return tu.charAt(0).toUpperCase() + tu.slice(1);
    })
    .join(" ");
}

console.log(vietHoaChuCaiDau("nguyễn văn an"));
console.log(vietHoaChuCaiDau("TRẦN   THỊ  BÌNH"));
```

Cách ngắn bằng regex:

```js
const vietHoa = s =>
  s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
```
:::

::: details Lời giải 7.3
```js
function laPalindrome(s) {
  // Bỏ mọi thứ không phải chữ/số, rồi hạ về chữ thường
  var sach = s.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, "");
  var nguoc = sach.split("").reverse().join("");
  return sach === nguoc;
}

["Racecar", "A man a plan a canal Panama", "Xin chào"].forEach(function (s) {
  console.log(JSON.stringify(s), "→", laPalindrome(s));
});
```
`split("").reverse().join("")` là thành ngữ đảo chuỗi — vì chuỗi không có
phương thức `reverse` riêng, phải mượn của mảng.
:::

::: details Lời giải 7.4
```js
function tuoi(ngaySinh) {
  var ns = new Date(ngaySinh);
  var nay = new Date();

  var t = nay.getFullYear() - ns.getFullYear();

  // Chưa tới sinh nhật năm nay thì trừ đi 1
  var thangChenh = nay.getMonth() - ns.getMonth();
  if (thangChenh < 0 || (thangChenh === 0 && nay.getDate() < ns.getDate())) {
    t--;
  }
  return t;
}

console.log("Sinh 2000-12-31:", tuoi("2000-12-31"));
console.log("Sinh 2000-01-01:", tuoi("2000-01-01"));
```

Chỗ sai phổ biến là chỉ lấy hiệu hai năm — người sinh 31/12/2000 sẽ bị tính
thừa gần một tuổi trong suốt cả năm.
:::

::: details Lời giải 7.5
```js
function xucXac(n) {
  var dem = {};
  for (var i = 1; i <= 6; i++) dem[i] = 0;      // khởi tạo đủ 6 mặt

  for (var j = 0; j < n; j++) {
    var mat = Math.floor(Math.random() * 6) + 1;
    dem[mat]++;
  }
  return dem;
}

var kq = xucXac(6000);
console.log(kq);

// Kiểm tra độ lệch so với kỳ vọng 1000
for (var mat in kq) {
  var lech = ((kq[mat] - 1000) / 1000 * 100).toFixed(1);
  console.log("Mặt " + mat + ": " + kq[mat] + "  (lệch " + lech + "%)");
}
```

`Math.floor(Math.random() * 6) + 1` — `Math.random()` cho `[0, 1)`, nhân 6 ra
`[0, 6)`, `floor` ra 0–5, cộng 1 ra 1–6. Dùng `Math.round` thay `Math.floor` là
sai: mặt 1 và 6 sẽ ra ít hơn một nửa so với các mặt khác.
:::

---

[← Bài 6](./06-javascript-can-ban) · Bài tiếp: [Đối tượng trình duyệt & sự kiện →](./08-doi-tuong-trinh-duyet)
