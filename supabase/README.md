# Quiz backend (Supabase)

DB là nguồn sự thật của cả đề sinh tự động (`source = 'auto'`) và đề người dùng
tự tạo (`source = 'user'`).

## Hai bất biến của schema

1. **Đáp án không rời server.** Client đọc câu hỏi qua view `questions_public`
   (không có `answer`, `explanation`) và chấm bằng RPC `grade_attempt`. Cột
   `answer` bị chặn ở tầng **quyền cột**, nên gọi thẳng `/rest/v1/questions`
   cũng không lấy được — không phụ thuộc việc client có ngoan hay không.
2. **Điểm do server tính.** `anon`/`authenticated` không có quyền `INSERT` vào
   `attempts`; chỉ `grade_attempt` (security definer) ghi được.

Chủ đề cần đọc lại đáp án của chính mình để sửa — quyền cột không diễn tả được
"chỉ dòng của tôi", nên phần đó đi qua RPC `quiz_for_edit(quiz_id)`.

## Kiểm tra

```bash
npm run db:test        # Postgres tạm trong docker, không cần Supabase CLI
```

Ngoài phần quyền, lệnh này còn nạp quiz thật từ `notes/**/*.quiz.yml` vào DB và
kiểm tra vòng khép kín: nhập lại đúng đáp án đã lưu thì phải được tính là đúng.

`supabase/tests/20-rls.sql` chứng minh: khách không đọc được đề private, không
đọc được cột `answer`, không tự khai điểm; không ai tạo được đề đứng tên người
khác hay đề `source = 'auto'`; `grade_attempt` từ chối đề mình không có quyền
đọc; và câu sai được đưa vào hàng đợi ôn tập.

Thêm ràng buộc mới thì **thêm test vào file đó trước**, rồi mới sửa migration.

## Đưa lên project thật

```bash
npm i -D supabase
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push            # áp dụng supabase/migrations/
```

Bật provider đăng nhập trong dashboard (GitHub OAuth hoặc magic link), rồi đặt
biến môi trường cho site:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Đặt ở `.env.local` khi chạy máy, và ở Vercel → Settings → Environment Variables
khi deploy. Anon key vốn để lộ ra client — an toàn của hệ thống nằm ở RLS, không
nằm ở việc giấu key. **Service role key thì không bao giờ được đặt vào biến có
tiền tố `VITE_`** vì mọi biến `VITE_*` đều đi vào bundle của trình duyệt; nó chỉ
dùng cho script import chạy ở máy.

Thiếu hai biến trên thì site vẫn build và chạy bình thường, chỉ ẩn phần đăng
nhập và phần đề tự tạo. Lưu ý: biến `VITE_*` được nhúng vào bundle **lúc build**,
nên đổi env thì phải build lại.

Với magic link, thêm mọi URL mà người dùng có thể bấm liên kết từ đó vào
**Authentication → URL Configuration → Redirect URLs**, ít nhất là trang
`/notes/quiz/` và `http://localhost:5173/**` khi chạy máy.

## Dựng DB lần đầu

Chưa có bảng nào thì bắt đầu ở đây. Publishable key không có quyền `CREATE
TABLE`, nên bước tạo bảng buộc phải qua Dashboard hoặc Supabase CLI.

```bash
npm run db:schema > schema.sql     # ~27KB, chỉ migration
```

Dán `schema.sql` vào **SQL Editor** → Run. Ra 5 bảng (`profiles`, `quizzes`,
`questions`, `attempts`, `review_items`) và các hàm chấm bài, ôn tập, xếp hạng.

Rồi nạp đề:

```bash
npm run quiz:import -- --dry-run   # xem sẽ đẩy gì, không cần key
npm run quiz:import                # cần SUPABASE_SERVICE_ROLE_KEY trong .env.local
```

`npm run db:sql` gộp cả hai bước thành một file, nhưng phần đề là ~250KB lệnh
`insert` — dán ngần ấy vào một ô textarea là chỗ trình duyệt hay nghẽn, nên chỉ
dùng khi nạp bằng `psql`.

## Nạp lại đề sau khi sửa

```bash
npm run quiz:import                 # cần service role key
npm run quiz:sql | psql "$DATABASE_URL"   # hoặc không cần key, qua psql
```

Cả hai đường đều upsert theo `slug` và thay toàn bộ câu hỏi của đề, nên chạy lại
bao nhiêu lần cũng được. Riêng `db:sql`/`schema.sql` thì **chỉ chạy được trên DB
trống** — migration nền dùng `create table` trần, và để nguyên như vậy là đúng:
một migration im lặng bỏ qua khi bảng đã tồn tại sẽ giấu mất việc schema trên
server đã lệch khỏi file.

## Bảng xếp hạng

`20260916120000_ranking.sql` thêm bốn hàm, không thêm bảng nào — điểm đã nằm sẵn
trong `attempts` từ trước, file này chỉ thêm cách đọc nó theo chiều "ai hơn ai".

| Hàm | Trả về |
|---|---|
| `leaderboard(quiz, limit)` | Top N của một đề |
| `leaderboard_overall(limit)` | Top N trên toàn bộ đề của site |
| `my_rank(quiz)` | Hạng của chính người gọi trong một đề |
| `my_rank_overall()` | Hạng của chính người gọi trên bảng chung |

Ba quyết định đáng nhớ:

1. **Chỉ đề `source = 'auto'` và `visibility = 'public'`.** Đề riêng của một
   người mà cũng có bảng xếp hạng thì hoá ra ai cũng biết người khác đang làm
   gì. Test 19 trong `20-rls.sql` chứng minh hoạt động trên đề private không lọt
   ra ngoài.
2. **Tính theo lần làm tốt nhất**, không phải lần gần nhất. Làm lại để ôn là
   việc nên khuyến khích chứ không phải việc bị phạt điểm. Bằng điểm thì ai đạt
   trước đứng trên.
3. **Bảng chung xếp theo tổng số câu đúng**, không theo điểm trung bình. Điểm
   trung bình thưởng cho người làm đúng một đề dễ rồi dừng.

Các hàm này là `security definer` nên đi xuyên qua RLS của `attempts` — đó là
chủ ý, và cũng là lý do test 18–21 tồn tại.

## Làm từng câu

`20260916140000_step_mode.sql` thêm hai hàm cho chế độ chấm ngay sau mỗi câu.

Không dùng lại `grade_attempt` được, và đây là điều quan trọng nhất cần nhớ:
**`grade_attempt` trả về đáp án của TOÀN BỘ đề.** Gọi nó sau câu đầu tiên là
đưa luôn đáp án còn lại xuống trình duyệt — mở tab Network là thấy hết.

| Hàm | Việc |
|---|---|
| `grade_one(question, given)` | Chấm một câu, chỉ trả đáp án của câu đó, cập nhật lịch ôn ngay |
| `record_attempt(quiz, answers)` | Cuối lượt mới ghi điểm; **không** đụng hàng đợi ôn tập |

Chia đôi như vậy vì hai việc có nhịp khác nhau: lịch ôn cần cập nhật ngay sau
từng câu (bỏ dở nửa chừng thì phần đã làm vẫn được ghi nhận), còn điểm thì một
lượt làm bài chỉ là một `attempt` dù nó được chấm làm bao nhiêu lần. Nếu
`record_attempt` cũng cập nhật `review_items` thì `seen_count` bị đội gấp đôi và
lịch ôn giãn ra sớm hơn thực tế — test 24 canh đúng chỗ đó.

Điểm vẫn do server tính từ đáp án đã lưu; client gửi lên những gì mình đã chọn,
không gửi lên điểm của mình.

## `supabase/tests/00-stub-auth.sql`

Chỉ dành cho test local bằng Postgres thuần. **Không chạy file này lên project
thật** — trên Supabase `auth.users` và `auth.uid()` đã có sẵn.
