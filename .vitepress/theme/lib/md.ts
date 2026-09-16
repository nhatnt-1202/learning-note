// Renderer markdown tối giản cho nội dung câu hỏi lấy từ DB.
//
// Vì sao không dùng markdown-it: nội dung này do người dùng khác viết. Quy tắc
// bất di bất dịch ở đây là **escape trước, chèn thẻ sau** — không có đường nào
// để HTML người viết gõ vào chui được ra DOM. Đổi lại chỉ hỗ trợ đúng những gì
// câu hỏi cần: đoạn văn, code block, code inline, đậm, nghiêng, link http.
//
// Hệ quả đã biết: code trong câu hỏi không có shiki highlight như code trong
// bài học — shiki chỉ chạy lúc build, không có trong bundle client.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Ký tự không bao giờ có trong văn bản thật, dùng làm chỗ giữ chỗ cho những
// đoạn đã render xong để bước xử lý inline không chạm vào chúng nữa.
const MARK = "\u0001";

function inline(text: string, slots: string[]): string {
  let s = esc(text);

  // Code inline đi trước mọi thứ khác: `**a**` trong code phải giữ nguyên.
  s = s.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    slots.push("<code>" + code + "</code>");
    return MARK + (slots.length - 1) + MARK;
  });

  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  // Chỉ nhận http(s) và đường dẫn tuyệt đối trong site — chặn javascript:
  s = s.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
    '<a href="$2" rel="noopener">$1</a>'
  );

  return s.replace(/\n/g, "<br>");
}

// Khôi phục nhiều lượt vì chỗ giữ chỗ có thể lồng trong chỗ giữ chỗ khác.
function restore(html: string, slots: string[]): string {
  const anySlot = new RegExp(MARK + "(\\d+)" + MARK, "g");
  let out = html;
  for (let i = 0; i < 3 && out.includes(MARK); i++) {
    out = out.replace(anySlot, (_m, n: string) => slots[+n] ?? "");
  }
  return out;
}

/**
 * Như renderMd nhưng KHÔNG bọc <p>. Dùng cho nội dung nằm gọn một dòng như
 * phương án trả lời.
 *
 * Lý do phải có hàm riêng: VitePress đặt `.vp-doc p { line-height: 28px }` —
 * pixel cứng, nên một <p> lọt vào giữa dòng sẽ mang theo line-height của nó và
 * lệch khỏi phần chữ xung quanh. Chữ cái A/B/C/D đứng cạnh đáp án là chỗ nhìn
 * thấy rõ nhất: nó bị đẩy lên vài pixel so với nội dung.
 */
export function renderMdInline(src: string): string {
  const slots: string[] = [];
  return restore(inline(String(src ?? ""), slots), slots);
}

export function renderMd(src: string): string {
  const slots: string[] = [];

  // Tách code fence ra trước khi cắt đoạn, vì bên trong nó có dòng trống.
  const staged = String(src ?? "").replace(
    /```([\w-]*)\n([\s\S]*?)```/g,
    (_m, lang: string, code: string) => {
      const cls = lang ? ' class="language-' + esc(lang) + '"' : "";
      slots.push(
        '<pre class="qz-code"><code' + cls + ">" + esc(code.replace(/\n$/, "")) + "</code></pre>"
      );
      return "\n\n" + MARK + (slots.length - 1) + MARK + "\n\n";
    }
  );

  const onlySlot = new RegExp("^" + MARK + "\\d+" + MARK + "$");

  const html = staged
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (onlySlot.test(t)) return t; // đoạn chỉ có code block thì không bọc <p>
      return "<p>" + inline(t, slots) + "</p>";
    })
    .join("");

  return restore(html, slots);
}
