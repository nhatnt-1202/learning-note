-- Cho phép một đề tắt việc trộn thứ tự đáp án.
--
-- Trộn đáp án là mặc định đúng: làm lại lần hai mà thứ tự y hệt thì rất dễ nhớ
-- "câu này chọn ô thứ ba" thay vì nhớ kiến thức.
--
-- Nhưng có loại đề mà thứ tự là một phần của nội dung: ngân hàng câu hỏi in ra
-- giấy, nơi người học tra chéo với bản gốc và nói chuyện với nhau bằng "câu 7
-- chọn A". Trộn thứ tự ở đó làm chữ cái hiển thị lệch khỏi chữ cái trong đề,
-- và như vậy còn hại hơn là lợi.
alter table public.quizzes
  add column shuffle_options boolean not null default true;

comment on column public.quizzes.shuffle_options is
  'false khi thứ tự đáp án là một phần của đề (đề in sẵn, tra chéo theo chữ cái)';
