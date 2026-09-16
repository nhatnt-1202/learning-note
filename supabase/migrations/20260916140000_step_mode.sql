-- Chế độ làm từng câu: chấm ngay sau mỗi câu thay vì chấm cả bài lúc nộp.
--
-- Không dùng lại grade_attempt được, và lý do là điều quan trọng nhất ở file
-- này: grade_attempt trả về đáp án của TOÀN BỘ đề. Gọi nó sau câu đầu tiên là
-- đưa luôn cả đáp án còn lại xuống trình duyệt — người học chỉ cần mở tab
-- Network là thấy hết.
--
-- Nên tách làm hai hàm:
--   grade_one     — chấm đúng một câu, chỉ trả đáp án của câu đó.
--   record_attempt — cuối lượt mới ghi điểm, và KHÔNG đụng vào hàng đợi ôn tập
--                    vì grade_one đã cập nhật sau từng câu rồi.

-- Chấm một câu và cập nhật lịch ôn của riêng câu đó.
--
-- Về việc lộ đáp án: hàm này không yếu hơn grade_attempt. Muốn moi cả bộ đáp án
-- thì grade_attempt cho hết trong một lần gọi, còn đây phải gọi từng câu. Điều
-- kiện vẫn như cũ — phải nộp một câu trả lời mới biết đáp án của câu ấy.
create or replace function public.grade_one(p_question uuid, p_given jsonb)
returns table (correct boolean, answer jsonb, explanation text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_q public.questions%rowtype;
  v_ok boolean;
begin
  select q.* into v_q
  from public.questions q
  join public.quizzes z on z.id = q.quiz_id
  where q.id = p_question
    and (z.visibility in ('public', 'unlisted') or z.owner_id = v_uid);

  if not found then
    raise exception 'không có quyền với câu hỏi này' using errcode = '42501';
  end if;

  v_ok := public.answer_matches(v_q.type, v_q.answer, p_given);

  -- Khách chưa đăng nhập vẫn được chấm, chỉ là không lưu tiến độ.
  if v_uid is not null then
    insert into public.review_items
      (user_id, question_id, seen_count, wrong_count, last_correct, due_at)
    values
      (v_uid, p_question, 1, case when v_ok then 0 else 1 end, v_ok,
       now() + case when v_ok then interval '3 days' else interval '1 day' end)
    on conflict (user_id, question_id) do update set
      seen_count = review_items.seen_count + 1,
      wrong_count = review_items.wrong_count + case when v_ok then 0 else 1 end,
      last_correct = v_ok,
      due_at = case
        when v_ok then now() + make_interval(days => least(30,
          greatest(1, (review_items.seen_count + 1 - review_items.wrong_count) * 3)))
        else now() + interval '1 day'
      end;
  end if;

  return query select v_ok, v_q.answer, v_q.explanation;
end $$;

revoke all on function public.grade_one(uuid, jsonb) from public;
grant execute on function public.grade_one(uuid, jsonb) to anon, authenticated;

-- Ghi điểm cuối lượt làm từng câu.
--
-- Điểm vẫn do server tính từ đáp án đã lưu, y như grade_attempt — client gửi
-- lên những gì mình đã chọn, không gửi lên điểm của mình.
--
-- Không cập nhật review_items: grade_one đã làm sau từng câu. Gọi lại ở đây sẽ
-- đội seen_count lên gấp đôi và làm lịch ôn giãn ra sớm hơn thực tế.
create or replace function public.record_attempt(p_quiz uuid, p_answers jsonb)
returns table (question_count int, correct_count int, score numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_total int;
  v_ok int;
begin
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then
    raise exception 'p_answers phải là object {question_id: đáp án}';
  end if;

  if not exists (
    select 1 from public.quizzes q
    where q.id = p_quiz
      and (q.visibility in ('public', 'unlisted') or q.owner_id = v_uid)
  ) then
    raise exception 'không có quyền với đề này' using errcode = '42501';
  end if;

  select count(*),
         count(*) filter (
           where public.answer_matches(q.type, q.answer, p_answers -> q.id::text)
         )
    into v_total, v_ok
  from public.questions q
  where q.quiz_id = p_quiz;

  if v_uid is not null and v_total > 0 then
    insert into public.attempts
      (quiz_id, user_id, answers, question_count, correct_count, score)
    values
      (p_quiz, v_uid, p_answers, v_total, v_ok, round(100.0 * v_ok / v_total, 2));
  end if;

  return query
  select v_total, v_ok,
         case when v_total > 0 then round(100.0 * v_ok / v_total, 2) else 0::numeric end;
end $$;

revoke all on function public.record_attempt(uuid, jsonb) from public;
grant execute on function public.record_attempt(uuid, jsonb) to anon, authenticated;
