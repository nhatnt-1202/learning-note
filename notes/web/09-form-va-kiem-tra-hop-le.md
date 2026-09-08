<script setup>
const ex1 = {
  html: `<form name="myfm" id="myfm" action="Simple.htm" method="POST"
      accept-charset="utf-8">
  <p>Tên: <input type="text" name="ten"></p>
  <p><input type="button" value="Xem thuộc tính form" id="xem"></p>
</form>`,
  js: `document.getElementById("xem").onclick = function () {
  const f = document.forms["myfm"];      // truy cập theo TÊN
  console.log("document.forms.length =", document.forms.length);
  console.log("action =", f.action);
  console.log("method =", f.method);
  console.log("name   =", f.name);
  console.log("số phần tử =", f.elements.length);

  // Ba cách trỏ tới cùng một ô
  console.log("f.ten.value            =", f.ten.value);
  console.log("f.elements['ten'].value =", f.elements["ten"].value);
  console.log("querySelector          =",
    document.querySelector("#myfm [name=ten]").value);
};`
}
const ex2 = {
  html: `<form name="myfm" id="myfm">
  <p>
    <input type="text" name="first_text" size="30" value="gõ rồi Tab ra">
  </p>
  <p id="nhatky" style="font-family:monospace;min-height:5em"></p>
</form>`,
  js: `// Ví dụ trong slide:
// <input type="text" name="first_text"
//        onFocus="writeIt('focus');" onBlur="writeIt('blur');"
//        onChange="writeIt('change');">

const nk = document.getElementById("nhatky");
function writeIt(s) {
  nk.innerHTML += s + "<br>";
  console.log(s);
}

const o = document.forms.myfm.first_text;
o.onfocus  = () => writeIt("onFocus  — vào ô");
o.onblur   = () => writeIt("onBlur   — rời ô");
o.onchange = () => writeIt("onChange — nội dung ĐÃ đổi + rời ô");

// Thứ tự khi bạn gõ rồi Tab ra: focus → change → blur
// Nếu KHÔNG sửa gì mà chỉ Tab ra: focus → blur (không có change)`
}
const ex3 = {
  html: `<form name="myfm" id="myfm">
  <p><input type="text" name="first_text" size="30" value="Nội dung nguồn"></p>
  <p>
    <input type="button" value="Copy" id="copy">
    <input type="button" value="Xoá"  id="xoa">
  </p>
  <p><input type="text" name="dich" size="30" placeholder="đích"></p>
</form>`,
  js: `// Slide: <INPUT TYPE="button" value="Copy"
//              onClick="writeIt(myfm.first_text.value);">
const fm = document.forms.myfm;

document.getElementById("copy").onclick = function () {
  fm.dich.value = fm.first_text.value;
  console.log("Đã copy:", fm.dich.value);
};

document.getElementById("xoa").onclick = function () {
  fm.dich.value = "";
  console.log("Đã xoá ô đích");
};`
}
const ex4 = {
  html: `<form id="fm">
  <fieldset>
    <legend>Checkbox — bật tắt độc lập</legend>
    <label><input type="checkbox" name="mon" value="HTML"> HTML</label>
    <label><input type="checkbox" name="mon" value="CSS"> CSS</label>
    <label><input type="checkbox" name="mon" value="JS"> JavaScript</label>
    <p><label><input type="checkbox" id="tatca"> Chọn tất cả</label></p>
  </fieldset>

  <fieldset>
    <legend>Radio — chỉ chọn được một</legend>
    <label><input type="radio" name="tr" value="Cơ bản" checked> Cơ bản</label>
    <label><input type="radio" name="tr" value="Nâng cao"> Nâng cao</label>
    <label><input type="radio" name="tr" value="Chuyên sâu"> Chuyên sâu</label>
  </fieldset>

  <p id="kq" style="font-family:monospace"></p>
</form>`,
  js: `const fm = document.getElementById("fm");
const kq = document.getElementById("kq");

function capNhat() {
  // Lấy các checkbox đang được tick
  const daChon = [...fm.querySelectorAll("input[name=mon]:checked")]
    .map(c => c.value);

  // Radio: chỉ một, dùng luôn .value của nhóm
  const trinhDo = fm.tr.value;

  kq.innerHTML = "Môn đã chọn: " + (daChon.join(", ") || "(chưa chọn)") +
                 "<br>Trình độ: " + trinhDo;
  console.log(daChon, trinhDo);
}

fm.addEventListener("change", capNhat);

document.getElementById("tatca").onclick = function () {
  fm.querySelectorAll("input[name=mon]").forEach(c => c.checked = this.checked);
  capNhat();
};

capNhat();`
}
const ex5 = {
  html: `<form id="fm">
  <p>
    Một lựa chọn:
    <select name="tp">
      <option value="">-- Chọn --</option>
      <option value="hn">Hà Nội</option>
      <option value="dn">Đà Nẵng</option>
      <option value="hcm">TP. Hồ Chí Minh</option>
    </select>
  </p>

  <p>
    Nhiều lựa chọn:<br>
    <select name="mon" size="4" multiple>
      <option value="html">HTML</option>
      <option value="css">CSS</option>
      <option value="js">JavaScript</option>
      <option value="sql">SQL</option>
    </select>
  </p>

  <p>
    <button type="button" id="them">Thêm option</button>
    <button type="button" id="xoa">Xoá option cuối</button>
  </p>

  <p id="kq" style="font-family:monospace"></p>
</form>`,
  js: `const fm = document.getElementById("fm");
const kq = document.getElementById("kq");

function capNhat() {
  const tp = fm.tp;
  const nhieu = [...fm.mon.selectedOptions].map(o => o.value);

  kq.innerHTML =
    "value        = " + tp.value + "<br>" +
    "selectedIndex= " + tp.selectedIndex + "<br>" +
    "text hiển thị= " + (tp.selectedIndex >= 0 ? tp.options[tp.selectedIndex].text : "") +
    "<br>multiple     = [" + nhieu.join(", ") + "]";
}

fm.addEventListener("change", capNhat);

document.getElementById("them").onclick = function () {
  const o = new Option("Mục mới " + (fm.mon.options.length + 1), "moi");
  fm.mon.add(o);
  console.log("Đã thêm, giờ có", fm.mon.options.length, "option");
};

document.getElementById("xoa").onclick = function () {
  if (fm.mon.options.length) fm.mon.remove(fm.mon.options.length - 1);
};

capNhat();`
}
const ex6 = {
  html: `<h2 style="text-align:center">Handling Form Events</h2>
<hr>
<form name="form1" id="form1">
  <p>
    First Name:
    <input type="text" name="fname" size="10">
    Last Name:
    <input type="text" name="lname" size="15">
  </p>
  <p>
    Email:
    <input type="text" name="email" size="20">
  </p>
  <p>
    Comments:<br>
    <textarea name="comment" rows="4" cols="34">Enter your comments<\/textarea>
  </p>
  <p style="text-align:center">
    <input type="button" value="Submit this form" id="gui">
    <input type="reset">
  </p>
</form>
<div id="ketqua"></div>`,
  js: `const form1 = document.forms.form1;

function validateFirstName() {
  const str = form1.fname.value;
  if (str.length === 0) {
    alert("The first name cannot be empty");
    return false;
  }
  return true;
}

function validateLastName() {
  const str = form1.lname.value;
  if (str.length === 0) {
    alert("The last name cannot be empty");
    return false;
  }
  return true;
}

function validateEmail() {
  const str = form1.email.value;
  if (str.length === 0) {
    alert("The Email field cannot be empty");
    return false;
  }
  return true;   // bản gốc trong slide QUÊN dòng này
}

form1.fname.onblur = validateFirstName;
form1.lname.onblur = validateLastName;
form1.email.onblur = validateEmail;

// Bản gốc mở cửa sổ mới bằng open("", "result") rồi document.write.
// Ở đây in ra ngay trong trang cho gọn và không bị chặn popup.
document.getElementById("gui").onclick = function processForm() {
  if (!validateFirstName() || !validateLastName() || !validateEmail()) return;

  const esc = s => s.replace(/[<>&]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

  document.getElementById("ketqua").innerHTML =
    "<h2 style='text-align:center'>Thanks for signing in</h2><hr><pre>" +
    "First name    : " + esc(form1.fname.value) + "\\n" +
    "Last name     : " + esc(form1.lname.value) + "\\n" +
    "Email         : " + esc(form1.email.value) + "\\n" +
    "Your Comments : " + esc(form1.comment.value) + "<\/pre>";

  console.log("Đã gửi form");
};`
}
const ex7 = {
  html: `<form id="dk" novalidate>
  <p>
    <label for="ten">Họ tên *</label><br>
    <input type="text" id="ten" name="ten">
    <span class="loi" id="loi-ten"></span>
  </p>
  <p>
    <label for="mail">E-mail *</label><br>
    <input type="text" id="mail" name="email">
    <span class="loi" id="loi-mail"></span>
  </p>
  <p>
    <label for="sdt">Điện thoại (10 số, bắt đầu bằng 0)</label><br>
    <input type="text" id="sdt" name="sdt">
    <span class="loi" id="loi-sdt"></span>
  </p>
  <p>
    <label for="mk">Mật khẩu * (≥ 8 ký tự, có hoa, thường, số)</label><br>
    <input type="password" id="mk" name="mk">
    <span class="loi" id="loi-mk"></span>
  </p>
  <p>
    <label for="mk2">Nhập lại mật khẩu *</label><br>
    <input type="password" id="mk2" name="mk2">
    <span class="loi" id="loi-mk2"></span>
  </p>
  <p><button type="submit">Đăng ký</button></p>
  <p id="tong" class="ok"></p>
</form>`,
  css: `label { font-weight: 600; }
input { padding: 5px; width: 260px; }
input.sai { border: 2px solid #d64545; background: #fff5f5; }
input.dung { border: 2px solid #22a06b; }
.loi { color: #d64545; font-size: 13px; display: block; min-height: 1.2em; }
.ok  { color: #22a06b; font-weight: bold; }`,
  js: `const dk = document.getElementById("dk");

// Mỗi luật là một hàm nhận giá trị, trả về "" nếu hợp lệ
// hoặc chuỗi lỗi nếu không. Tách bạch dữ liệu và logic.
const LUAT = {
  ten: v => v.trim() === "" ? "Họ tên không được để trống"
          : v.trim().length < 2 ? "Họ tên quá ngắn" : "",

  mail: v => v.trim() === "" ? "E-mail không được để trống"
           : !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v) ? "E-mail không đúng định dạng" : "",

  sdt: v => v.trim() === "" ? ""                       // không bắt buộc
          : !/^0\\d{9}$/.test(v.trim()) ? "Phải là 10 chữ số, bắt đầu bằng 0" : "",

  mk: v => v.length < 8 ? "Mật khẩu phải từ 8 ký tự"
         : !/(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/.test(v)
           ? "Phải có chữ hoa, chữ thường và chữ số" : "",

  mk2: v => v !== document.getElementById("mk").value ? "Hai mật khẩu không khớp" : ""
};

function kiemTra(id) {
  const o = document.getElementById(id);
  const luat = LUAT[id];
  const loi = luat(o.value);
  document.getElementById("loi-" + id).textContent = loi;
  o.classList.toggle("sai", loi !== "");
  o.classList.toggle("dung", loi === "" && o.value !== "");
  return loi === "";
}

// Kiểm tra khi rời ô, và kiểm tra lại ngay khi gõ NẾU ô đang báo lỗi
Object.keys(LUAT).forEach(id => {
  const o = document.getElementById(id);
  o.addEventListener("blur", () => kiemTra(id));
  o.addEventListener("input", () => { if (o.classList.contains("sai")) kiemTra(id); });
});

dk.addEventListener("submit", function (e) {
  e.preventDefault();                       // chặn gửi để xem kết quả

  // Dùng map trước rồi mới every — để MỌI ô đều được kiểm tra và hiện lỗi
  const ketQua = Object.keys(LUAT).map(kiemTra);
  const hopLe = ketQua.every(Boolean);

  document.getElementById("tong").textContent =
    hopLe ? "Hợp lệ — sẵn sàng gửi lên server" : "";

  if (!hopLe) {
    // Đưa tiêu điểm về ô sai đầu tiên
    dk.querySelector(".sai")?.focus();
  }
  console.log(hopLe ? "PASS" : "FAIL", ketQua);
});`
}
const bt = {
  html: `<form id="fm">
</form>
<p id="kq"></p>`,
  js: `console.log("Bắt đầu");`
}
</script>

# Bài 9 — Form & kiểm tra tính hợp lệ

## Mục tiêu

- Làm việc với đối tượng form và các thành phần trên form
- Sử dụng các sự kiện của đối tượng form
- Kiểm tra tính hợp lệ của form

Bài này ghép mọi thứ đã học: HTML form (bài 4), sự kiện (bài 8), chuỗi và regex
(bài 6–7).

## 1. Đối tượng Form

Theo slide, đối tượng Form chứa ba thuộc tính: `Accept`, `Action`, `Method`.

```html
<Form ACTION="Simple.htm" Accept="TEXT/HTML" Method="POST">
```

<CodePlayground title="Đối tượng Form" :html="ex1.html" :js="ex1.js" :height="220" :console="true" />

Có bốn cách trỏ tới cùng một ô nhập, từ cũ đến mới:

```js
document.forms[0].elements[0]        // theo chỉ số — dễ vỡ nhất
document.forms["myfm"].elements["ten"]  // theo tên
document.forms.myfm.ten              // rút gọn
document.querySelector("#myfm [name=ten]")   // hiện đại, rõ ràng nhất
```

Cách theo chỉ số là thứ giáo trình dùng nhiều nhất, và cũng là thứ **dễ hỏng
nhất**: chèn thêm một ô ở phía trên là mọi chỉ số lệch hết.

## 2. Đối tượng Textfield

Theo slide, textfield nhận biết ba sự kiện:

| Sự kiện | Xảy ra khi |
|---|---|
| `onFocus` | Nhấp chuột vào bên trong trường văn bản |
| `onBlur` | Người dùng di chuyển ra khỏi trường văn bản |
| `onChange` | Người dùng **có sự thay đổi** trong trường, **rồi mới** rời khỏi nó |

```html
<input type="text" name="first_text"
       onFocus="writeIt('focus');"
       onBlur="writeIt('blur');"
       onChange="writeIt('change');">
```

<CodePlayground title="focus / blur / change" :html="ex2.html" :js="ex2.js" :height="240" />

Thử hai kịch bản để thấy khác biệt:

- Nhấp vào ô, gõ thêm gì đó, rồi Tab ra → `focus`, `change`, `blur`
- Nhấp vào ô rồi Tab ra ngay, không sửa gì → `focus`, `blur` — **không có
  `change`**

Thuộc tính hay dùng của textfield:

| Thuộc tính | Nghĩa |
|---|---|
| `value` | Nội dung hiện tại — **luôn là chuỗi** |
| `defaultValue` | Giá trị ban đầu, dùng khi reset |
| `disabled`, `readOnly` | Xem bài 4 |
| `select()`, `focus()`, `blur()` | Phương thức điều khiển |

Nhắc lại cái bẫy ở bài 6: `input.value` **luôn là chuỗi**, kể cả với
`type="number"`. Cộng hai ô số mà quên ép kiểu thì `"10" + "5"` ra `"105"`.

## 3. Đối tượng Command Button

Theo slide, command button nhận biết sự kiện `onClick`:

```html
<INPUT TYPE="button" value="Copy" onClick="writeIt(myfm.first_text.value);">
```

<CodePlayground title="Button" :html="ex3.html" :js="ex3.js" :height="230" />

Ba loại nút và khác biệt quyết định:

| Loại | Hành vi mặc định |
|---|---|
| `<input type="button">` | Không làm gì — chỉ chạy handler |
| `<input type="submit">` | **Gửi form** |
| `<input type="reset">` | Đưa mọi trường về `defaultValue` |

Và `<button>` không ghi `type` thì mặc định là `submit`. Nút mở hộp thoại mà
quên `type="button"` sẽ gửi form và tải lại trang — lỗi rất hay gặp.

## 4. Checkbox và Radio Button

Theo slide:

**Checkbox** là đối tượng form HTML hoạt động theo cơ chế **bật tắt**, có thể
được check hoặc không. Giống nút lệnh, nó hiểu sự kiện `onClick`.

**Radio button** gần giống checkbox, khác ở chỗ **chỉ một radio được chọn**. Khi
một radio được chọn, nó giữ nguyên lựa chọn đó cho đến khi nút khác được chọn.
Radio cũng hiểu `onClick`.

<CodePlayground title="Checkbox và Radio" :html="ex4.html" :js="ex4.js" :height="330" />

Điểm mấu chốt về cách đọc giá trị:

```js
// Checkbox: đọc .checked (boolean), KHÔNG phải .value
if (o.checked) { ... }

// Lấy tất cả checkbox đang tick
const daChon = [...fm.querySelectorAll("input[name=mon]:checked")]
                 .map(c => c.value);

// Radio: cả nhóm cùng tên, đọc thẳng .value của nhóm
const trinhDo = fm.tr.value;
```

`.value` của một checkbox **luôn trả về chuỗi trong thuộc tính `value`**, bất kể
nó đang được tick hay không. Đọc `.value` để biết đã tick chưa là lỗi kinh
điển — phải đọc `.checked`.

## 5. ComboBox / Đối tượng Select

Theo slide:

> Đối tượng ComboBox trong form HTML xuất hiện giống như một danh mục sổ xuống
> hoặc danh mục cuộn của các tuỳ chọn. Có thể dùng thanh cuộn để thay đổi hiển
> thị danh sách. ComboBox hỗ trợ các sự kiện `onBlur`, `onFocus` và `onChange`.

<CodePlayground title="Select" :html="ex5.html" :js="ex5.js" :height="360" />

| Thuộc tính | Cho biết |
|---|---|
| `select.value` | `value` của option đang chọn |
| `select.selectedIndex` | Chỉ số option đang chọn (`-1` nếu không có) |
| `select.options` | Danh sách tất cả option |
| `select.options[i].text` | Chữ **hiển thị** của option (khác `value`) |
| `select.selectedOptions` | Các option đang chọn (dùng với `multiple`) |

Thêm và xoá option lúc chạy:

```js
sel.add(new Option("Chữ hiển thị", "gia-tri"));
sel.remove(i);
sel.options.length = 0;   // xoá sạch
```

Ứng dụng thường gặp: select "Tỉnh/Thành" đổi thì nạp lại danh sách
"Quận/Huyện" — chính là `onChange` trên select thứ nhất.

## 6. Kiểm tra tính hợp lệ của Form

Theo slide:

> Việc kiểm tra rất quan trọng, vì có thể có trường không chứa dữ liệu. Cũng có
> thể có trường chứa dữ liệu không hợp lệ.

### Ví dụ đầy đủ của giáo trình

Đây là bài lab cuối của toàn khoá — form "Handling Form Events" với các hàm
`validateFirstName`, `validateLastName`, `validateEmail`, `processForm`:

<CodePlayground title="Form Events (bản gốc, đã sửa lỗi)" :html="ex6.html" :js="ex6.js" :height="420" />

Hai điều đáng nói về code gốc:

**Lỗi trong slide:** `validateEmail()` kiểm tra rỗng và `return false`, nhưng
**quên `return true`** ở nhánh hợp lệ — nên khi e-mail *có* dữ liệu, hàm trả về
`undefined`, tức là "sai". Nếu `processForm` dựa vào kết quả này để quyết định
gửi thì form hợp lệ cũng không bao giờ gửi được. Bản trên đã bổ sung.

**`open("", "result")` + `document.write`:** bản gốc mở cửa sổ mới rồi ghi kết
quả vào đó. Cách này ngày nay hầu như không dùng được — trình duyệt **chặn
popup** không do người dùng chủ động mở, và `document.write` thì đã bàn ở bài 8.
Bản trên in kết quả ngay trong trang.

### Bản viết lại theo lối hiện đại

Cùng bài toán, nhưng tổ chức lại: mỗi luật là một hàm nhỏ, thông báo lỗi hiện
ngay cạnh ô thay vì `alert`, và ô sai được tô viền đỏ.

<CodePlayground title="Validation hiện đại" :html="ex7.html" :css="ex7.css" :js="ex7.js" :height="460" />

Những điểm khác biệt đáng học từ bản này:

| Bản giáo trình | Bản viết lại | Vì sao |
|---|---|---|
| `alert("...")` | Chữ đỏ cạnh ô | `alert` chặn cả trang, và người dùng mất thông báo ngay khi bấm OK |
| Một hàm cho mỗi trường | Một **bảng luật** `LUAT` | Thêm trường mới chỉ cần thêm một dòng |
| Chỉ kiểm tra khi `blur` | `blur` + kiểm lại khi `input` nếu đang sai | Người dùng thấy lỗi biến mất ngay khi sửa đúng |
| Dừng ở lỗi đầu tiên | Kiểm tra **tất cả** rồi hiện hết | Đỡ phải sửa – bấm – sửa – bấm |
| — | `.focus()` vào ô sai đầu tiên | Người dùng biết phải sửa ở đâu |

Chú ý một chi tiết nhỏ nhưng quan trọng trong code:

```js
const ketQua = Object.keys(LUAT).map(kiemTra);   // chạy HẾT
const hopLe = ketQua.every(Boolean);

// KHÔNG viết: Object.keys(LUAT).every(kiemTra)
// every dừng ngay ở phần tử đầu tiên trả về false
// → các ô sau không được kiểm tra, người dùng chỉ thấy một lỗi
```

### Ba tầng kiểm tra

Ứng dụng thật cần cả ba, mỗi tầng một mục đích khác nhau:

| Tầng | Công cụ | Mục đích |
|---|---|---|
| **1. HTML** | `required`, `type="email"`, `pattern`, `min`/`max` | Miễn phí, chạy cả khi JS lỗi |
| **2. JavaScript** | Code như trên | Luật phức tạp (hai mật khẩu khớp nhau), thông báo đẹp |
| **3. Server** | Bất kể ngôn ngữ gì | **Tầng duy nhất thật sự bảo vệ dữ liệu** |

::: danger Nhắc lại lần cuối
Tầng 1 và 2 **không phải bảo mật**. Chúng chạy trên máy người dùng, và người
dùng toàn quyền tắt JavaScript, sửa HTML bằng DevTools, hoặc bỏ qua trang web
mà gửi thẳng request bằng `curl`.

Chúng tồn tại để **giúp người dùng** biết mình gõ sai chỗ nào ngay lập tức, thay
vì đợi server trả lời. Đó là trải nghiệm, không phải phòng thủ.

**Server phải kiểm tra lại toàn bộ. Không có ngoại lệ.**
:::

### Constraint Validation API

HTML5 cho phép dùng chính hệ thống báo lỗi của trình duyệt với luật của mình:

```js
const o = document.getElementById("mk2");

o.addEventListener("input", function () {
  if (o.value !== document.getElementById("mk").value) {
    o.setCustomValidity("Hai mật khẩu không khớp");
  } else {
    o.setCustomValidity("");    // chuỗi rỗng = hợp lệ
  }
});

// Các thuộc tính đọc được
o.validity.valueMissing    // bỏ trống ô required
o.validity.typeMismatch    // sai định dạng của type
o.validity.patternMismatch // không khớp pattern
o.validity.tooShort        // ngắn hơn minlength
o.checkValidity()          // true/false, không hiện thông báo
o.reportValidity()         // kiểm tra VÀ hiện bong bóng lỗi
```

### Gửi form bằng fetch

Giáo trình dừng ở chỗ form được gửi đi và trang tải lại. Ngày nay thường gửi
ngầm, không rời trang:

```js
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!kiemTraTatCa()) return;

  const duLieu = new FormData(form);    // gom mọi trường có name

  try {
    const res = await fetch("/api/dang-ky", { method: "POST", body: duLieu });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const kq = await res.json();
    hienThongBao("Đăng ký thành công: " + kq.id);
  } catch (err) {
    hienThongBao("Lỗi: " + err.message);
  }
});
```

`new FormData(form)` gom hết các trường có thuộc tính `name` — không phải liệt
kê từng ô.

## Tóm tắt

| Chủ đề | Điểm cần nhớ |
|---|---|
| Truy cập trường | `querySelector` thay cho `forms[0].elements[0]` |
| `onChange` | Chỉ chạy khi **đổi giá trị + rời ô**; dùng `input` để bắt từng phím |
| `input.value` | **Luôn là chuỗi** — ép kiểu trước khi tính toán |
| Checkbox | Đọc `.checked`, không đọc `.value` |
| Radio | Cả nhóm cùng `name`, đọc `form.tenNhom.value` |
| Select | `.value`, `.selectedIndex`, `.options[i].text` |
| `<button>` | Mặc định `type="submit"` |
| Validation | HTML → JavaScript → **Server**; hai tầng đầu chỉ là trải nghiệm |
| Kiểm tra hết | Dùng `map` rồi `every`, không dùng `every` trực tiếp |

## Bài tập

### Bài 9.1

Form đổi đơn vị: ô nhập độ C, ô hiển thị độ F, cập nhật **ngay khi gõ**. Nhập
không phải số thì báo lỗi và để trống ô kết quả.

### Bài 9.2

Form đặt hàng: chọn sản phẩm (select có giá kèm theo), nhập số lượng, checkbox
"Giao nhanh (+20.000đ)". Tự tính và hiển thị tổng tiền mỗi khi có thay đổi.
Định dạng tiền theo kiểu Việt Nam.

### Bài 9.3

Form đăng nhập tự viết validation đầy đủ: username (5–20 ký tự, chỉ chữ, số và
`_`), mật khẩu (≥ 8 ký tự), checkbox "Đồng ý điều khoản" (bắt buộc tick). Hiện
lỗi cạnh từng ô, nút Đăng nhập chỉ bật khi mọi thứ hợp lệ.

### Bài 9.4

Code dưới đây luôn báo "chưa chọn" dù người dùng đã tick. Sai ở đâu?

```js
const cb = document.getElementById("dongy");
if (cb.value) {
  console.log("đã đồng ý");
} else {
  console.log("chưa chọn");
}
```

### Bài 9.5

Form có ô "Số lượng" và ô "Đơn giá". Code sau cho ra `"105"` thay vì `15`. Sửa,
và giải thích.

```js
const tong = form.soLuong.value + form.donGia.value;
```

<CodePlayground title="Chỗ làm bài" :html="bt.html" :js="bt.js" :height="380" :console="true" />

::: details Lời giải 9.1
```html
<form id="fm">
  <p>Độ C: <input type="text" id="c" size="10"></p>
  <p>Độ F: <input type="text" id="f" size="10" readonly></p>
  <p id="loi" style="color:#d64545"></p>
</form>

<script>
const c = document.getElementById("c");
const f = document.getElementById("f");
const loi = document.getElementById("loi");

c.addEventListener("input", function () {
  const v = c.value.trim();

  if (v === "") { f.value = ""; loi.textContent = ""; return; }

  const so = Number(v);          // Number chặt hơn parseFloat
  if (isNaN(so)) {
    f.value = "";
    loi.textContent = "Vui lòng nhập một con số";
    return;
  }

  loi.textContent = "";
  f.value = (so * 9 / 5 + 32).toFixed(2);
});
</script>
```
Dùng `Number("12abc")` cho `NaN`, còn `parseFloat("12abc")` cho `12` — ở đây ta
muốn báo lỗi nên `Number` đúng hơn.
:::

::: details Lời giải 9.2
```html
<form id="dh">
  <p>
    Sản phẩm:
    <select id="sp">
      <option value="0">-- Chọn --</option>
      <option value="450000">Bàn phím — 450.000đ</option>
      <option value="250000">Chuột — 250.000đ</option>
      <option value="800000">Tai nghe — 800.000đ</option>
    </select>
  </p>
  <p>Số lượng: <input type="number" id="sl" value="1" min="1" max="99"></p>
  <p><label><input type="checkbox" id="nhanh"> Giao nhanh (+20.000đ)</label></p>
  <p id="tong" style="font-size:1.2rem;font-weight:bold"></p>
</form>

<script>
const dh = document.getElementById("dh");

const dinhDang = n =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function tinh() {
  // .value LUÔN là chuỗi — phải ép về số
  const gia = Number(document.getElementById("sp").value);
  const sl  = Number(document.getElementById("sl").value) || 0;
  const phi = document.getElementById("nhanh").checked ? 20000 : 0;

  const tong = gia * sl + (gia > 0 ? phi : 0);
  document.getElementById("tong").textContent = "Tổng: " + dinhDang(tong);
}

dh.addEventListener("change", tinh);
dh.addEventListener("input", tinh);
tinh();
</script>
```
`Intl.NumberFormat` lo hết phần dấu chấm ngăn cách và ký hiệu tiền tệ.
:::

::: details Lời giải 9.3
```html
<form id="dn" novalidate>
  <p>
    <label for="u">Tên đăng nhập</label><br>
    <input type="text" id="u"><span class="e" id="e-u"></span>
  </p>
  <p>
    <label for="p">Mật khẩu</label><br>
    <input type="password" id="p"><span class="e" id="e-p"></span>
  </p>
  <p>
    <label><input type="checkbox" id="dk"> Tôi đồng ý điều khoản</label>
    <span class="e" id="e-dk"></span>
  </p>
  <p><button type="submit" id="nut" disabled>Đăng nhập</button></p>
</form>

<style>
  .e { color: #d64545; font-size: 13px; display: block; min-height: 1.2em; }
</style>

<script>
const LUAT = {
  u: () => {
    const v = document.getElementById("u").value;
    if (!/^[A-Za-z0-9_]{5,20}$/.test(v))
      return "5–20 ký tự, chỉ gồm chữ, số và dấu gạch dưới";
    return "";
  },
  p: () => document.getElementById("p").value.length < 8
           ? "Mật khẩu phải từ 8 ký tự" : "",
  dk: () => document.getElementById("dk").checked
            ? "" : "Bạn phải đồng ý điều khoản"
};

function kiemTra(hienLoi) {
  let hopLe = true;
  for (const id in LUAT) {
    const loi = LUAT[id]();
    if (loi) hopLe = false;
    if (hienLoi) document.getElementById("e-" + id).textContent = loi;
  }
  document.getElementById("nut").disabled = !hopLe;
  return hopLe;
}

// Kiểm tra ngầm khi gõ (chỉ bật/tắt nút), hiện lỗi khi rời ô
document.getElementById("dn").addEventListener("input",  () => kiemTra(false));
document.getElementById("dn").addEventListener("change", () => kiemTra(true));
document.getElementById("dn").addEventListener("submit", function (e) {
  e.preventDefault();
  if (kiemTra(true)) console.log("Đăng nhập hợp lệ");
});

kiemTra(false);
</script>
```

Một lưu ý về trải nghiệm: nút `disabled` cho tới khi form hợp lệ nghe có vẻ hay,
nhưng người dùng có thể không hiểu **vì sao** nút không bấm được. Nhiều thiết kế
hiện đại để nút luôn bấm được và hiện lỗi khi bấm — dễ hiểu hơn.
:::

::: details Lời giải 9.4
Đọc nhầm thuộc tính. Với checkbox:

- **`.value`** là chuỗi trong thuộc tính `value` của thẻ — mặc định là `"on"`
  nếu không khai báo. Nó **không đổi** theo trạng thái tick.
- **`.checked`** mới là boolean cho biết đã tick hay chưa.

Vì `"on"` là chuỗi khác rỗng nên nó luôn *truthy* — điều kiện luôn đúng. (Ví dụ
trong đề bài lại báo "chưa chọn", nghĩa là thẻ đó có `value=""`, cũng là hệ quả
của cùng một nhầm lẫn.)

```js
const cb = document.getElementById("dongy");
if (cb.checked) {
  console.log("đã đồng ý");
} else {
  console.log("chưa chọn");
}
```

`.value` của checkbox vẫn có việc của nó: nó là **giá trị gửi lên server** khi ô
được tick.
:::

::: details Lời giải 9.5
`input.value` **luôn là chuỗi**, kể cả với `type="number"`. Toán tử `+` gặp
chuỗi thì nối chuỗi: `"10" + "5"` ra `"105"`.

```js
// Cách rõ ràng nhất
const tong = Number(form.soLuong.value) * Number(form.donGia.value);

// Nếu thật sự muốn cộng
const tong2 = Number(form.soLuong.value) + Number(form.donGia.value);

// parseInt cho số nguyên — nhớ truyền cơ số 10
const sl = parseInt(form.soLuong.value, 10);

// Phòng ô rỗng (Number("") ra 0, nhưng Number("abc") ra NaN)
const gia = Number(form.donGia.value) || 0;
```

Vì sao `-`, `*`, `/` lại không dính lỗi này? Vì chúng không có nghĩa nào khác
cho chuỗi, nên JavaScript ép cả hai toán hạng về số. Chỉ riêng `+` là quá tải
giữa "cộng số" và "nối chuỗi" — và nối chuỗi thắng khi có mặt một chuỗi.
:::

---

## Hết loạt bài

Bạn đã đi qua toàn bộ 9 bài. Nhìn lại chặng đường:

| Bài | Học được |
|---|---|
| 1–4 | **HTML** — cấu trúc, liên kết, bảng, form |
| 5 | **CSS** — tách hình thức khỏi cấu trúc |
| 6–9 | **JavaScript** — cú pháp, đối tượng, DOM, sự kiện, validation |

### Đi tiếp từ đây

Giáo trình này dừng ở khoảng năm 2005. Những gì nên học tiếp, theo thứ tự:

| Chủ đề | Vì sao |
|---|---|
| **Flexbox & CSS Grid** | Dàn trang hiện đại, thay hẳn table layout và frameset |
| **Responsive design** | Điện thoại chiếm hơn nửa lượt truy cập web |
| **ES6+** | `let`/`const`, arrow, destructuring, module, class |
| **`fetch` & async/await** | Gọi API, cập nhật trang không tải lại |
| **Git** | Không có nó thì không làm việc nhóm được |
| **Một framework** | Vue hoặc React, khi đã chắc JavaScript thuần |
| **Accessibility** | Trang dùng được cho tất cả mọi người |

Ghi chép liên quan trong site này: [JavaScript](/notes/javascript/) ·
[Sân chơi tự do](./playground)

---

[← Bài 8](./08-doi-tuong-trinh-duyet) · [Về lộ trình](./)
