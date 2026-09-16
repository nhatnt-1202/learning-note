-- Kiểm tra quyền: mỗi khối tự raise nếu sai. Chạy được cả trên Postgres thuần
-- (sau 00-stub-auth.sql) và trên `supabase db reset` với project thật.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set auto_quiz 'aaaaaaaa-0000-0000-0000-000000000000'
\set user_quiz 'bbbbbbbb-0000-0000-0000-000000000000'

-- 1. Khách chỉ thấy đề công khai
begin;
set local role anon;
do $$
begin
  if (select count(*) from public.quizzes) <> 1 then
    raise exception 'khách phải thấy đúng 1 đề công khai, thấy %',
      (select count(*) from public.quizzes);
  end if;
  if exists (select 1 from public.quizzes where visibility = 'private') then
    raise exception 'RÒ: khách đọc được đề private';
  end if;
end $$;
rollback;

-- 2. Khách đọc được câu hỏi của đề công khai qua view, nhưng KHÔNG đọc được đáp án
begin;
set local role anon;
do $$
begin
  if (select count(*) from public.questions_public
      where quiz_id = 'aaaaaaaa-0000-0000-0000-000000000000') <> 2 then
    raise exception 'khách phải đọc được 2 câu qua questions_public';
  end if;

  begin
    perform answer from public.questions limit 1;
    raise exception 'RÒ: khách đọc được cột answer';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.questions limit 1;
    raise exception 'RÒ: select * trên questions không bị chặn';
  exception when insufficient_privilege then null;
  end;

  begin
    perform explanation from public.questions limit 1;
    raise exception 'RÒ: khách đọc được lời giải trước khi nộp bài';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 3. Câu hỏi của đề private không lộ qua view cho người khác
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  if exists (select 1 from public.questions_public
             where quiz_id = 'bbbbbbbb-0000-0000-0000-000000000000') then
    raise exception 'RÒ: u2 đọc được câu hỏi trong đề private của u1';
  end if;
  if exists (select 1 from public.quizzes
             where id = 'bbbbbbbb-0000-0000-0000-000000000000') then
    raise exception 'RÒ: u2 đọc được đề private của u1';
  end if;
end $$;
rollback;

-- 4. Chủ đề vẫn đọc được đề của mình, và đọc được đáp án qua RPC
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$
begin
  if not exists (select 1 from public.quizzes
                 where id = 'bbbbbbbb-0000-0000-0000-000000000000') then
    raise exception 'u1 phải đọc được đề của chính mình';
  end if;
  if (select count(*) from public.quiz_for_edit('bbbbbbbb-0000-0000-0000-000000000000')) <> 1 then
    raise exception 'quiz_for_edit phải trả câu hỏi cho chủ đề';
  end if;
end $$;
rollback;

-- 5. quiz_for_edit không trả gì cho người không phải chủ
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  if (select count(*) from public.quiz_for_edit('bbbbbbbb-0000-0000-0000-000000000000')) <> 0 then
    raise exception 'RÒ: quiz_for_edit trả đáp án cho người ngoài';
  end if;
end $$;
rollback;

-- 6. Không thể tạo đề đứng tên người khác, cũng không thể tự nhận là đề auto
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  begin
    insert into public.quizzes (title, source, owner_id)
    values ('mạo danh', 'user', '11111111-1111-1111-1111-111111111111');
    raise exception 'RÒ: tạo được đề đứng tên người khác';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.quizzes (title, source, visibility, owner_id)
    values ('giả đề hệ thống', 'auto', 'public', null);
    raise exception 'RÒ: người dùng tạo được đề source=auto';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
rollback;

-- 7. Không thể sửa câu hỏi trong đề của người khác
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
declare v int;
begin
  update public.questions set prompt = 'phá' where quiz_id = 'bbbbbbbb-0000-0000-0000-000000000000';
  get diagnostics v = row_count;
  if v <> 0 then raise exception 'RÒ: u2 sửa được câu hỏi của u1 (% dòng)', v; end if;
end $$;
rollback;

-- 8. Client không tự khai điểm được
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$
begin
  begin
    insert into public.attempts (quiz_id, user_id, question_count, correct_count, score)
    values ('aaaaaaaa-0000-0000-0000-000000000000',
            '11111111-1111-1111-1111-111111111111', 2, 2, 100);
    raise exception 'RÒ: client tự ghi được điểm';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 9. Trigger chặn answer trỏ ra ngoài options
begin;
do $$
begin
  begin
    insert into public.questions (quiz_id, position, type, prompt, options, answer)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 99, 'single', 'x',
            '["a","b"]'::jsonb, '[9]'::jsonb);
    raise exception 'trigger phải chặn answer nằm ngoài options';
  exception when raise_exception then null;
  end;

  begin
    insert into public.questions (quiz_id, position, type, prompt, options, answer)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 98, 'single', 'x',
            '["a","b"]'::jsonb, '[0,1]'::jsonb);
    raise exception 'trigger phải chặn câu single có 2 đáp án';
  exception when raise_exception then null;
  end;
end $$;
rollback;

-- 10. Khách chấm được đề công khai, và không có gì được lưu
begin;
set local role anon;
do $$
declare v_ok int; v_wrong int;
begin
  select count(*) filter (where correct), count(*) filter (where not correct)
    into v_ok, v_wrong
  from public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000', jsonb_build_object(
    'a1000000-0000-0000-0000-000000000000', '[1]'::jsonb,      -- đúng
    'a2000000-0000-0000-0000-000000000000', '"  ?? "'::jsonb    -- đúng, thừa khoảng trắng
  ));
  if v_ok <> 2 or v_wrong <> 0 then
    raise exception 'chấm sai: % đúng / % sai', v_ok, v_wrong;
  end if;
end $$;
reset role;   -- anon vốn không có quyền đọc attempts, kiểm tra bằng quyền chủ DB
do $$
begin
  if (select count(*) from public.attempts) <> 0 then
    raise exception 'khách chưa đăng nhập mà vẫn ghi attempt';
  end if;
end $$;
rollback;

-- 11. Chấm sai thì phải báo sai, và trả về đáp án + lời giải
begin;
set local role anon;
do $$
declare r record;
begin
  select * into r from public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000',
    jsonb_build_object('a1000000-0000-0000-0000-000000000000', '[0]'::jsonb))
  where question_id = 'a1000000-0000-0000-0000-000000000000';

  if r.correct then raise exception 'đáp án 0 phải bị tính là sai'; end if;
  if r.answer <> '[1]'::jsonb then raise exception 'phải trả về đáp án đúng'; end if;
  if r.explanation is null then raise exception 'phải trả về lời giải'; end if;
end $$;
rollback;

-- 12. Người đã đăng nhập: attempt và hàng đợi ôn tập được ghi
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$
begin
  perform public.grade_attempt('bbbbbbbb-0000-0000-0000-000000000000',
    jsonb_build_object('b1000000-0000-0000-0000-000000000000', '[0]'::jsonb));  -- thiếu 3 -> sai

  if (select score from public.attempts where user_id = '11111111-1111-1111-1111-111111111111') <> 0 then
    raise exception 'điểm phải là 0';
  end if;
  if (select wrong_count from public.review_items
      where question_id = 'b1000000-0000-0000-0000-000000000000') <> 1 then
    raise exception 'câu sai phải vào hàng đợi ôn tập';
  end if;

  -- làm lại và đúng: hàng đợi phải giãn ra chứ không xoá
  perform public.grade_attempt('bbbbbbbb-0000-0000-0000-000000000000',
    jsonb_build_object('b1000000-0000-0000-0000-000000000000', '[3,0]'::jsonb));
  if not (select last_correct from public.review_items
          where question_id = 'b1000000-0000-0000-0000-000000000000') then
    raise exception 'chọn đủ [0,3] phải là đúng, thứ tự không quan trọng';
  end if;
  if (select due_at from public.review_items
      where question_id = 'b1000000-0000-0000-0000-000000000000') <= now() + interval '2 days' then
    raise exception 'trả lời đúng thì lịch ôn phải giãn ra';
  end if;
end $$;
rollback;

-- 13. Không chấm được đề mình không có quyền đọc
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  begin
    perform public.grade_attempt('bbbbbbbb-0000-0000-0000-000000000000', '{}'::jsonb);
    raise exception 'RÒ: chấm được đề private của người khác';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 14. Không đọc được attempt của người khác
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin perform public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000', '{}'::jsonb); end $$;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  if (select count(*) from public.attempts) <> 0 then
    raise exception 'RÒ: u2 đọc được attempt của u1';
  end if;
end $$;
rollback;

\echo 'MỌI KIỂM TRA QUYỀN ĐẠT'

-- 15. Luyện lại một phần bài: không ghi attempt, và câu bỏ trống không bị tính sai
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$
begin
  -- làm cả bài trước để có sẵn hàng đợi
  perform public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000', jsonb_build_object(
    'a1000000-0000-0000-0000-000000000000', '[0]'::jsonb,   -- sai
    'a2000000-0000-0000-0000-000000000000', '"??"'::jsonb   -- đúng
  ));
  if (select count(*) from public.attempts) <> 1 then
    raise exception 'làm cả bài phải ghi đúng 1 attempt';
  end if;

  -- luyện lại riêng câu sai
  perform public.grade_attempt(
    'aaaaaaaa-0000-0000-0000-000000000000',
    jsonb_build_object('a1000000-0000-0000-0000-000000000000', '[1]'::jsonb),
    false
  );

  if (select count(*) from public.attempts) <> 1 then
    raise exception 'luyện một phần bài không được ghi thêm attempt';
  end if;
  if not (select last_correct from public.review_items
          where question_id = 'a1000000-0000-0000-0000-000000000000') then
    raise exception 'luyện lại đúng thì hàng đợi ôn tập phải cập nhật';
  end if;
  if (select seen_count from public.review_items
      where question_id = 'a2000000-0000-0000-0000-000000000000') <> 1 then
    raise exception 'câu không nằm trong lượt luyện lại không được đếm thêm';
  end if;
end $$;
rollback;

\echo 'KIỂM TRA LUYỆN LẠI ĐẠT'

-- 16. Ôn tập chéo: chấm theo danh sách câu hỏi, không ghi attempt, và không
--     chạm được vào câu hỏi của đề mình không có quyền đọc
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
declare v_rows int;
begin
  select count(*) into v_rows from public.grade_review(jsonb_build_object(
    'a1000000-0000-0000-0000-000000000000', '[1]'::jsonb,   -- đề công khai, đúng
    'b1000000-0000-0000-0000-000000000000', '[0,3]'::jsonb  -- đề private của u1
  ));
  if v_rows <> 1 then
    raise exception 'chỉ được chấm 1 câu (câu của đề private phải bị bỏ), chấm %', v_rows;
  end if;
  if exists (select 1 from public.review_items
             where question_id = 'b1000000-0000-0000-0000-000000000000'
               and user_id = '22222222-2222-2222-2222-222222222222') then
    raise exception 'RÒ: câu của đề private lọt vào hàng đợi của người ngoài';
  end if;
  if (select count(*) from public.attempts) <> 0 then
    raise exception 'ôn tập chéo không được ghi attempt';
  end if;
end $$;
rollback;

-- 17. Khách chưa đăng nhập không dùng được ôn tập chéo
begin;
set local role anon;
do $$
begin
  begin
    perform public.grade_review('{}'::jsonb);
    raise exception 'khách phải bị từ chối';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo 'KIỂM TRA ÔN TẬP CHÉO ĐẠT'

-- ── Bảng xếp hạng ───────────────────────────────────────────────────────────
--
-- Các hàm leaderboard* là security definer nên chúng đi xuyên qua RLS của
-- attempts. Đó là chủ ý — nhưng nghĩa là phải chứng minh chúng chỉ nhả ra số
-- liệu tổng hợp của đề công khai, chứ không phải mọi thứ chúng nhìn thấy.

-- 18. Xếp hạng theo đề: tính lần làm TỐT NHẤT, và ai đạt trước đứng trên
begin;
set local role authenticated;

-- u1 làm 2 lần: lần đầu sai hết, lần sau đúng hết. Hạng phải theo lần sau.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $g$ begin perform public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000',
  '{"a1000000-0000-0000-0000-000000000000": [0],
    "a2000000-0000-0000-0000-000000000000": "sai"}'::jsonb); end $g$;
do $g$ begin perform public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000',
  '{"a1000000-0000-0000-0000-000000000000": [1],
    "a2000000-0000-0000-0000-000000000000": "??"}'::jsonb); end $g$;

-- u2 đúng 1/2.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $g$ begin perform public.grade_attempt('aaaaaaaa-0000-0000-0000-000000000000',
  '{"a1000000-0000-0000-0000-000000000000": [1],
    "a2000000-0000-0000-0000-000000000000": "sai"}'::jsonb); end $g$;

do $$
declare
  v_top record;
begin
  select * into v_top
  from public.leaderboard('aaaaaaaa-0000-0000-0000-000000000000', 10)
  order by rank limit 1;

  if v_top.user_id <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'u1 phải đứng đầu, đang là %', v_top.user_id;
  end if;
  if v_top.score <> 100 then
    raise exception 'phải lấy lần làm tốt nhất (100), lấy %', v_top.score;
  end if;
  if v_top.attempts <> 2 then
    raise exception 'u1 làm 2 lượt, đếm ra %', v_top.attempts;
  end if;

  if (select count(*) from public.leaderboard('aaaaaaaa-0000-0000-0000-000000000000', 10)) <> 2 then
    raise exception 'mỗi người đúng một dòng — đang ra % dòng',
      (select count(*) from public.leaderboard('aaaaaaaa-0000-0000-0000-000000000000', 10));
  end if;
end $$;

-- 19. Hoạt động trên đề private không lọt vào bảng xếp hạng chung
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $g$ begin perform public.grade_attempt('bbbbbbbb-0000-0000-0000-000000000000',
  '{"b1000000-0000-0000-0000-000000000000": [0,3]}'::jsonb); end $g$;

do $$
declare
  v record;
begin
  select * into v from public.leaderboard_overall(10)
  where user_id = '11111111-1111-1111-1111-111111111111';

  if v.quizzes_done <> 1 then
    raise exception 'RÒ: đề private lọt vào bảng xếp hạng (quizzes_done = %)', v.quizzes_done;
  end if;
  if (select count(*) from public.leaderboard('bbbbbbbb-0000-0000-0000-000000000000', 10)) <> 0 then
    raise exception 'RÒ: đề private có bảng xếp hạng riêng';
  end if;
end $$;

-- 20. my_rank chỉ trả về dòng của chính người gọi
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.my_rank('aaaaaaaa-0000-0000-0000-000000000000');
  if v_n <> 1 then
    raise exception 'my_rank phải trả đúng 1 dòng của mình, trả %', v_n;
  end if;
  if (select rank from public.my_rank('aaaaaaaa-0000-0000-0000-000000000000')) <> 1 then
    raise exception 'u1 đang hạng 1 mà my_rank không nói vậy';
  end if;
  if (select total from public.my_rank('aaaaaaaa-0000-0000-0000-000000000000')) <> 2 then
    raise exception 'total phải là 2 người';
  end if;
end $$;
rollback;

-- 21. Khách xem được bảng xếp hạng nhưng không hỏi được hạng "của mình"
begin;
set local role anon;
do $$
begin
  perform public.leaderboard_overall(10);   -- phải chạy được
  begin
    perform public.my_rank_overall();
    raise exception 'khách không có "mình" để mà xếp hạng — phải bị từ chối';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo 'KIỂM TRA BẢNG XẾP HẠNG ĐẠT'

-- ── Chế độ làm từng câu ─────────────────────────────────────────────────────

-- 22. grade_one chỉ nhả đáp án của ĐÚNG câu được hỏi
--
-- Đây là cả lý do hàm này tồn tại: grade_attempt trả đáp án của cả đề, nên gọi
-- nó sau câu đầu tiên là đưa luôn đáp án còn lại xuống trình duyệt.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
declare
  v_n int;
  v_ok boolean;
begin
  select count(*) into v_n
  from public.grade_one('a1000000-0000-0000-0000-000000000000', '[1]'::jsonb);
  if v_n <> 1 then
    raise exception 'RÒ: grade_one trả % dòng, phải đúng 1 (chỉ câu được hỏi)', v_n;
  end if;

  select correct into v_ok
  from public.grade_one('a1000000-0000-0000-0000-000000000000', '[1]'::jsonb);
  if not v_ok then raise exception 'đáp án [1] phải được tính là đúng'; end if;

  select correct into v_ok
  from public.grade_one('a1000000-0000-0000-0000-000000000000', '[0]'::jsonb);
  if v_ok then raise exception 'đáp án [0] phải được tính là sai'; end if;

  -- Câu thuộc đề private của u1 thì u2 không được chấm, cũng không được thấy.
  begin
    perform public.grade_one('b1000000-0000-0000-0000-000000000000', '[0,3]'::jsonb);
    raise exception 'RÒ: chấm được câu của đề private người khác';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 23. grade_one cập nhật hàng đợi ôn tập ngay, không đợi hết bài
do $$
declare
  v record;
begin
  select * into v from public.review_items
  where user_id = '22222222-2222-2222-2222-222222222222'
    and question_id = 'a1000000-0000-0000-0000-000000000000';
  if not found then
    raise exception 'grade_one phải đưa câu vừa làm vào hàng đợi ôn tập';
  end if;
  -- 3 lần gọi ở trên: đúng, đúng, sai.
  if v.seen_count <> 3 or v.wrong_count <> 1 or v.last_correct then
    raise exception 'đếm sai: seen=% wrong=% last_correct=%',
      v.seen_count, v.wrong_count, v.last_correct;
  end if;
  -- Vừa sai thì phải hẹn lại sớm.
  if v.due_at > now() + interval '2 days' then
    raise exception 'câu vừa sai phải được hẹn ôn trong vòng 1 ngày';
  end if;
end $$;

-- 24. record_attempt ghi điểm do SERVER tính, và không đụng hàng đợi ôn tập
do $$
declare
  v record;
  v_seen_before int;
  v_seen_after int;
begin
  select seen_count into v_seen_before from public.review_items
  where user_id = '22222222-2222-2222-2222-222222222222'
    and question_id = 'a1000000-0000-0000-0000-000000000000';

  select * into v from public.record_attempt(
    'aaaaaaaa-0000-0000-0000-000000000000',
    '{"a1000000-0000-0000-0000-000000000000": [1],
      "a2000000-0000-0000-0000-000000000000": "sai"}'::jsonb
  );
  if v.question_count <> 2 or v.correct_count <> 1 or v.score <> 50 then
    raise exception 'điểm sai: %/% = %', v.correct_count, v.question_count, v.score;
  end if;

  if (select score from public.attempts
      where user_id = '22222222-2222-2222-2222-222222222222'
      order by created_at desc limit 1) <> 50 then
    raise exception 'attempt phải được ghi với đúng điểm server tính';
  end if;

  select seen_count into v_seen_after from public.review_items
  where user_id = '22222222-2222-2222-2222-222222222222'
    and question_id = 'a1000000-0000-0000-0000-000000000000';
  if v_seen_after <> v_seen_before then
    raise exception 'record_attempt không được đụng hàng đợi ôn tập (grade_one đã làm): % -> %',
      v_seen_before, v_seen_after;
  end if;
end $$;
rollback;

-- 25. Khách chưa đăng nhập vẫn chấm được từng câu, chỉ không lưu gì
begin;
set local role anon;
do $$
declare
  v_ok boolean;
begin
  select correct into v_ok
  from public.grade_one('a1000000-0000-0000-0000-000000000000', '[1]'::jsonb);
  if not v_ok then raise exception 'khách vẫn phải được chấm'; end if;

  perform public.record_attempt('aaaaaaaa-0000-0000-0000-000000000000', '{}'::jsonb);
end $$;

-- Đếm phải làm ở vai khác: anon vốn không có quyền đọc hai bảng này, và giữ
-- nguyên như vậy mới đúng.
reset role;
do $$
begin
  if (select count(*) from public.review_items) <> 0 then
    raise exception 'khách không có tài khoản thì không ghi hàng đợi ôn tập';
  end if;
  if (select count(*) from public.attempts) <> 0 then
    raise exception 'khách không được ghi attempt';
  end if;
end $$;
rollback;

\echo 'KIỂM TRA LÀM TỪNG CÂU ĐẠT'
