# Ngân hàng câu hỏi KTCT — cách bộ đề được dựng

`data/KTCT ngan hang cau hoi cho sinh vien (303 câu) 1.pdf` là đề cương ôn tập
của trường: 303 câu trắc nghiệm A–D, chia ba phần, **không kèm đáp án**. Bốn
script dưới đây biến nó thành `notes/ktct/*.quiz.yml`.

Bước giải đáp án không chạy bằng script — nó cần model. Vì vậy quy trình là
"script → model → script", không phải một lệnh duy nhất.

```
PDF ──parse──▶ bank.json ──▶ chunks/*.txt
                                  │
                       3 model giải độc lập
                                  ▼
                           solve/<model>-<chunk>.json
                                  │
                                merge
                                  ▼
                    merged.json  +  disputes.txt
                                       │
                              model phân xử
                                       ▼
                                 verdicts.json
                                  │
                                build
                                  ▼
                        notes/ktct/*.md + *.quiz.yml
```

## 1. Bóc tách

```bash
npm run ktct:parse > "$WORK/bank.json"
```

Dùng `pdftotext -layout`, không phải chế độ mặc định: bản gốc xếp đáp án thành
2–4 cột trên cùng một dòng, chỉ chế độ `-layout` mới giữ đủ khoảng trắng để tách
cột. Script tự báo câu nào thiếu phương án — không câu nào được đi tiếp khi còn
thiếu, vì model sẽ phải chọn trong 3 phương án và chắc chắn sai.

## 2. Giải bằng nhiều model

Chia `bank.json` thành các chunk ~50 câu, rồi giao mỗi chunk cho **ba model
khác nhau giải độc lập** (ở lần dựng này: Opus 5, Sonnet 5, Haiku 4.5 — Fable
5.1 thay Haiku ở hai chunk cuối khi Haiku hết hạn mức). Hướng dẫn cho model nằm
ở `SOLVE.md` trong thư mục làm việc.

Điều kiện bắt buộc: model **không được đọc kết quả của model khác**. Ba phiếu
phụ thuộc nhau thì việc đối chiếu chéo không còn nghĩa gì.

## 3. Gộp phiếu

```bash
npm run ktct:merge "$WORK"
```

Nguyên tắc: **nhất trí tuyệt đối mới được đi thẳng**. Đa số 2/3 vẫn phải phân
xử. Lý do nằm ở chính bộ đề này — rất nhiều câu hỏi "chọn đáp án SAI", và khi
một model đọc nhầm chiều câu hỏi thì hai model còn lại cũng nhầm y hệt. Đa số ở
đây không phải bằng chứng đủ mạnh.

Câu nào có model tự nhận `confidence: low` cũng bị đẩy sang phân xử, kể cả khi
cả ba chọn giống nhau.

## 4. Phân xử

Giao `disputes.txt` cho một model mạnh, hướng dẫn ở `ADJUDICATE.md`. Hồ sơ phân
xử gồm câu hỏi **và lập luận của từng model** — người phân xử cần thấy vì sao
chúng lệch nhau, không chỉ thấy chúng chọn gì. Phán quyết được phép trái với cả
ba phiếu.

## 5. Dựng đề

```bash
npm run ktct:build "$WORK"
npm run quiz:check
```

Chia 303 câu về 8 chương theo giáo trình, mỗi chương một bài + một `.quiz.yml`.
Chương dưới 5 câu bị gộp vào chương hàng hoá.

Mỗi câu mang tag để tra ngược: `phan-i|ii|iii`, `goc-cau-<số>` (số câu trong đề
gốc), và `nhat-tri` hoặc `phan-xu`. Câu do người phân xử đánh dấu đề có vấn đề
mang thêm tag `de-co-van-de`.

## Vì sao `shuffle: false`

Các đề khác trộn thứ tự đáp án mỗi lần làm, để làm lại lần hai không nhớ được
"câu này chọn ô thứ ba" thay vì nhớ kiến thức.

Bộ này thì không, vì thứ tự là một phần của đề: người học tra chéo với bản in
và nói chuyện với nhau bằng "câu 7 chọn A". Trộn thứ tự ở đây sẽ làm chữ cái
hiển thị lệch khỏi chữ cái trong đề — và lỗi đó nhìn giao diện không thấy, nó
chỉ hiện ra khi ai đó đối chiếu với bản gốc.

## Vì sao `serve: db`

Bộ đề này dùng để tính điểm và xếp hạng, nên **phải** chấm ở server. Quiz nhúng
vào page data (`serve: static`) được chấm ở client: đáp án nằm trong bundle, và
không có attempt nào được ghi — tức là không có điểm, không có hàng đợi ôn tập,
không có bảng xếp hạng. Xem `.vitepress/quiz/quiz-data.mjs`.

Kiểm chứng sau khi build:

```bash
grep -rl "ktct-0" .vitepress/dist/    # phải không ra gì
```

## Giới hạn cần biết

Đáp án do model suy ra, **không phải đáp án chính thức của trường**. Ba model
nhất trí là bằng chứng tốt, không phải bảo chứng. Trang của mỗi chương nói rõ
điều này với người học. Câu nào thấy nghi ngờ thì đối chiếu giáo trình, sửa
thẳng vào `.quiz.yml` rồi `npm run quiz:import` lại.
