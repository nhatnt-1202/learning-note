# Quiz

Nơi làm lại các đề đã có, tự tạo đề riêng, và ôn tập chéo những câu từng làm sai
— câu sai ở bất kể bài nào cũng được hẹn ôn lại tại đây.

Đề gắn với một bài học sẽ hiện luôn ở cuối bài đó; trang này là chỗ xem tất cả.

<QuizHub />

## Cách hoạt động

| Việc | Ghi chú |
|---|---|
| Làm bài mà chưa đăng nhập | Được, và vẫn được chấm — chỉ không lưu tiến độ |
| Đăng nhập | Nhập email, bấm liên kết trong mail, không cần mật khẩu |
| Đề tự tạo | Mặc định **chỉ tôi**; đổi sang *có link* hoặc *công khai* khi muốn chia sẻ |
| Ôn tập chéo | Câu trả lời sai được hẹn lại ngày mai, đúng thì giãn dần tới 30 ngày |
| Đáp án | Nằm lại trên server, chỉ trả về sau khi nộp bài |
| Hai cách làm | **Cả bài** — chấm một lượt lúc nộp. **Từng câu** — chấm ngay, biết đúng sai và đọc lời giải trước khi sang câu sau |
| Làm cả bộ đề | [Trang riêng](/notes/ktct/toan-bo) gom cả 303 câu KTCT, hoặc rút ngẫu nhiên để thi thử — có ôn tập, không có xếp hạng |
| Thứ tự đáp án | Mặc định trộn mỗi lần làm. Riêng đề bám sách in (như KTCT) giữ nguyên thứ tự để chữ cái A/B/C/D khớp với bản gốc |
| Xếp hạng | Tính theo **lần làm tốt nhất**, chỉ trên đề của site |

## Bảng xếp hạng

<Leaderboard :limit="20" />

Bảng chung xếp theo **tổng số câu đúng** trên toàn bộ đề của site, nên làm thêm
một đề mới ăn điểm hơn là làm lại mãi một đề. Mỗi đề còn có bảng riêng, hiện
ngay dưới bài khi bạn làm đề đó.
