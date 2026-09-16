-- Bảng xếp hạng.
--
-- Điểm đã được grade_attempt ghi vào attempts từ trước; file này chỉ thêm cách
-- đọc nó theo chiều "ai hơn ai". Ba điều chi phối:
--
-- 1. Chỉ xếp hạng đề công khai do site tạo (source = 'auto'). Đề riêng của một
--    người mà cũng có bảng xếp hạng thì hoá ra ai cũng biết người khác làm gì.
-- 2. Mỗi người tính bằng LẦN LÀM TỐT NHẤT, không phải lần gần nhất. Làm lại để
--    ôn là việc nên khuyến khích, không phải việc bị phạt điểm.
-- 3. Hàm là security definer vì RLS của attempts chỉ cho đọc dòng của chính
--    mình — đúng như vậy. Thứ đi ra khỏi hàm chỉ là tên hiển thị và số liệu
--    tổng hợp của đề công khai, không có đáp án và không có dòng attempt nào.

-- Bằng điểm thì ai đạt trước đứng trên: thời điểm là tiêu chí khách quan duy
-- nhất còn lại, và nó thưởng cho người làm sớm thay vì người làm nhiều lần.
create or replace function public.leaderboard(p_quiz uuid, p_limit int default 20)
returns table (
  rank int,
  user_id uuid,
  display_name text,
  score numeric,
  correct_count int,
  question_count int,
  attempts int,
  achieved_at timestamptz
)
language sql security definer stable set search_path = public as $$
  with best as (
    select distinct on (a.user_id)
      a.user_id, a.score, a.correct_count, a.question_count, a.created_at
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where a.quiz_id = p_quiz
      and q.visibility = 'public'
      and q.source = 'auto'
    order by a.user_id, a.score desc, a.created_at asc
  ),
  tries as (
    select a.user_id, count(*)::int as n
    from public.attempts a
    where a.quiz_id = p_quiz
    group by a.user_id
  )
  select
    rank() over (order by b.score desc, b.created_at asc)::int,
    b.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Ẩn danh'),
    b.score,
    b.correct_count,
    b.question_count,
    t.n,
    b.created_at
  from best b
  join tries t on t.user_id = b.user_id
  left join public.profiles p on p.id = b.user_id
  order by b.score desc, b.created_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- Xếp hạng chung: xếp theo TỔNG SỐ CÂU ĐÚNG chứ không theo điểm trung bình.
-- Điểm trung bình thưởng cho người chỉ làm đúng một đề dễ rồi dừng; tổng số câu
-- đúng thưởng cho người học hết bank đề — đó mới là cái muốn khuyến khích.
create or replace function public.leaderboard_overall(p_limit int default 20)
returns table (
  rank int,
  user_id uuid,
  display_name text,
  quizzes_done int,
  total_correct int,
  total_questions int,
  avg_score numeric,
  last_at timestamptz
)
language sql security definer stable set search_path = public as $$
  with best as (
    select distinct on (a.user_id, a.quiz_id)
      a.user_id, a.quiz_id, a.score, a.correct_count, a.question_count, a.created_at
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where q.visibility = 'public' and q.source = 'auto'
    order by a.user_id, a.quiz_id, a.score desc, a.created_at asc
  ),
  agg as (
    select
      b.user_id,
      count(*)::int as quizzes_done,
      sum(b.correct_count)::int as total_correct,
      sum(b.question_count)::int as total_questions,
      round(avg(b.score), 2) as avg_score,
      max(b.created_at) as last_at
    from best b
    group by b.user_id
  )
  select
    rank() over (order by a.total_correct desc, a.avg_score desc, a.last_at asc)::int,
    a.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Ẩn danh'),
    a.quizzes_done,
    a.total_correct,
    a.total_questions,
    a.avg_score,
    a.last_at
  from agg a
  left join public.profiles p on p.id = a.user_id
  order by a.total_correct desc, a.avg_score desc, a.last_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- Hạng của chính mình, cần riêng một hàm vì người đứng thứ 300 không xuất hiện
-- trong top 20 — mà đó lại chính là người cần nhìn thấy hạng của mình nhất.
create or replace function public.my_rank(p_quiz uuid)
returns table (rank int, total int, score numeric, attempts int)
language sql security definer stable set search_path = public as $$
  with best as (
    select distinct on (a.user_id) a.user_id, a.score, a.created_at
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where a.quiz_id = p_quiz and q.visibility = 'public' and q.source = 'auto'
    order by a.user_id, a.score desc, a.created_at asc
  ),
  ranked as (
    select user_id, score,
           rank() over (order by score desc, created_at asc)::int as rank,
           count(*) over ()::int as total
    from best
  )
  select r.rank, r.total, r.score,
         (select count(*)::int from public.attempts a
          where a.quiz_id = p_quiz and a.user_id = auth.uid())
  from ranked r
  where r.user_id = auth.uid();
$$;

create or replace function public.my_rank_overall()
returns table (rank int, total int, total_correct int, avg_score numeric)
language sql security definer stable set search_path = public as $$
  with best as (
    select distinct on (a.user_id, a.quiz_id)
      a.user_id, a.quiz_id, a.score, a.correct_count, a.created_at
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where q.visibility = 'public' and q.source = 'auto'
    order by a.user_id, a.quiz_id, a.score desc, a.created_at asc
  ),
  agg as (
    select user_id,
           sum(correct_count)::int as total_correct,
           round(avg(score), 2) as avg_score,
           max(created_at) as last_at
    from best group by user_id
  ),
  ranked as (
    select user_id, total_correct, avg_score,
           rank() over (order by total_correct desc, avg_score desc, last_at asc)::int as rank,
           count(*) over ()::int as total
    from agg
  )
  select r.rank, r.total, r.total_correct, r.avg_score
  from ranked r
  where r.user_id = auth.uid();
$$;

revoke all on function public.leaderboard(uuid, int) from public;
revoke all on function public.leaderboard_overall(int) from public;
revoke all on function public.my_rank(uuid) from public;
revoke all on function public.my_rank_overall() from public;

-- Khách chưa đăng nhập vẫn xem được bảng xếp hạng: nhìn thấy có người đang thi
-- đua là một lý do để đăng nhập. Nhưng hạng "của mình" thì phải có mình đã.
grant execute on function public.leaderboard(uuid, int) to anon, authenticated;
grant execute on function public.leaderboard_overall(int) to anon, authenticated;
grant execute on function public.my_rank(uuid) to authenticated;
grant execute on function public.my_rank_overall() to authenticated;

-- Tên hiển thị là thứ duy nhất người khác nhìn thấy của mình trên bảng xếp
-- hạng, nên phải đổi được, và phải có giới hạn để không ai chiếm cả dòng.
alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or length(btrim(display_name)) between 1 and 40);

-- Lấy hạng theo đề thì phải quét attempts của đề đó; chỉ mục hiện có bắt đầu
-- bằng user_id nên không dùng được cho truy vấn này.
create index if not exists attempts_quiz_score_idx
  on public.attempts (quiz_id, score desc, created_at asc);
