-- Quiz: đề sinh tự động (source = 'auto', do script import) và đề do người dùng
-- tự tạo (source = 'user'). DB là nguồn sự thật duy nhất.
--
-- Hai điều chi phối toàn bộ file này:
--
-- 1. Đáp án không được rời khỏi server. Client đọc câu hỏi qua view
--    questions_public (không có cột answer/explanation) và chấm bằng RPC
--    grade_attempt. Cột answer bị chặn ở tầng quyền cột, không chỉ ở RLS.
-- 2. Điểm phải do server tính. Client không có quyền INSERT vào attempts, nên
--    không tự khai điểm được.

create extension if not exists pgcrypto;

-- ── Tiện ích ────────────────────────────────────────────────────────────────

-- Chuẩn hoá câu trả lời dạng chữ trước khi so: cái cần kiểm tra là nội dung,
-- không phải cách gõ khoảng trắng.
create or replace function public.norm_text(p text)
returns text language sql immutable as $$
  select lower(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')));
$$;

-- Tập chỉ số đáp án, đã sắp và bỏ trùng. Phần tử không phải số bị bỏ qua để
-- dữ liệu rác từ client không làm hàm chấm nổ exception.
create or replace function public.jsonb_int_set(p jsonb)
returns int[] language sql immutable as $$
  select coalesce(array_agg(v order by v), '{}'::int[])
  from (
    select distinct (e #>> '{}')::int as v
    from jsonb_array_elements(
      case jsonb_typeof(p) when 'array' then p else '[]'::jsonb end
    ) e
    where jsonb_typeof(e) = 'number'
  ) s;
$$;

create or replace function public.answer_matches(p_type text, p_answer jsonb, p_given jsonb)
returns boolean language sql immutable as $$
  select case
    when p_given is null then false
    when p_type in ('fill', 'output') then exists (
      select 1 from jsonb_array_elements_text(p_answer) a
      where public.norm_text(a) = public.norm_text(p_given #>> '{}')
    )
    -- câu chọn: tập chỉ số phải khớp hoàn toàn, thiếu một ô cũng là sai
    else public.jsonb_int_set(p_answer) = public.jsonb_int_set(p_given)
  end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Bảng ────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                       -- 'notes/web/06-…' với đề auto
  lesson_path text,                       -- null nếu đề không gắn bài nào
  title text not null check (length(btrim(title)) between 1 and 200),
  source text not null default 'user' check (source in ('auto', 'user')),
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  owner_id uuid references public.profiles on delete cascade,
  pass_score int not null default 70 check (pass_score between 0 and 100),
  model text,                             -- model đã sinh, nếu source = 'auto'
  source_hash text,                       -- hash bài học lúc sinh
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Đề auto là nội dung của site nên không thuộc về ai; đề user buộc phải có
  -- chủ. Ràng buộc này cũng chặn luôn việc client tự nhận đề auto là của mình.
  constraint quizzes_owner_rule check (
    (source = 'auto' and owner_id is null) or (source = 'user' and owner_id is not null)
  )
);

create index quizzes_lesson_idx on public.quizzes (lesson_path)
  where visibility <> 'private';
create index quizzes_owner_idx on public.quizzes (owner_id);

create trigger quizzes_touch before update on public.quizzes
  for each row execute function public.touch_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  position int not null check (position >= 0),
  key text,                               -- id ổn định trong đề, giữ tiến độ khi sửa
  type text not null check (type in ('single', 'multi', 'truefalse', 'fill', 'output')),
  prompt text not null check (length(btrim(prompt)) > 0),
  options jsonb,                          -- mảng chuỗi, null với fill/output
  answer jsonb not null,
  explanation text,
  tags text[] not null default '{}',
  case_sensitive boolean not null default false,
  unique (quiz_id, position),
  unique (quiz_id, key),
  constraint questions_shape check (
    case
      when type in ('fill', 'output')
        then options is null and jsonb_typeof(answer) = 'array'
      else jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2
       and jsonb_typeof(answer) = 'array' and jsonb_array_length(answer) >= 1
    end
  )
);

create index questions_quiz_idx on public.questions (quiz_id, position);

-- CHECK không truy vấn được bảng khác nên phải dùng trigger: đây đúng chỗ hay
-- sai nhất — answer trỏ ra ngoài danh sách options thì quiz dạy sai kiến thức.
create or replace function public.questions_validate()
returns trigger language plpgsql as $$
declare
  v_n int;
  v_i int;
begin
  if new.options is not null then
    v_n := jsonb_array_length(new.options);

    if new.type = 'single' and jsonb_array_length(new.answer) <> 1 then
      raise exception 'câu single phải có đúng một answer, đang có %',
        jsonb_array_length(new.answer);
    end if;

    foreach v_i in array public.jsonb_int_set(new.answer) loop
      if v_i < 0 or v_i >= v_n then
        raise exception 'answer % nằm ngoài options (0..%)', v_i, v_n - 1;
      end if;
    end loop;

    if public.jsonb_int_set(new.answer) = '{}'::int[] then
      raise exception 'answer phải là mảng chỉ số (số nguyên)';
    end if;
  else
    if exists (
      select 1 from jsonb_array_elements(new.answer) e where jsonb_typeof(e) <> 'string'
    ) or jsonb_array_length(new.answer) = 0 then
      raise exception 'câu % cần answer là mảng chuỗi không rỗng', new.type;
    end if;
  end if;
  return new;
end $$;

create trigger questions_validate before insert or update on public.questions
  for each row execute function public.questions_validate();

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  question_count int not null,
  correct_count int not null,
  score numeric(5, 2) not null,
  created_at timestamptz not null default now()
);

create index attempts_user_idx on public.attempts (user_id, quiz_id, created_at desc);

-- Hàng đợi ôn tập — thay cho localStorage, và là cái làm nên trang ôn tập chéo.
create table public.review_items (
  user_id uuid not null references public.profiles on delete cascade,
  question_id uuid not null references public.questions on delete cascade,
  seen_count int not null default 0,
  wrong_count int not null default 0,
  last_correct boolean,
  due_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index review_due_idx on public.review_items (user_id, due_at);

-- ── Tự tạo profile khi có người đăng ký ─────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.review_items enable row level security;

-- Tên hiện trên đề công khai nên profile để đọc chung.
create policy profiles_read on public.profiles for select using (true);
create policy profiles_write_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy quizzes_read on public.quizzes for select using (
  visibility in ('public', 'unlisted') or owner_id = auth.uid()
);
create policy quizzes_insert_own on public.quizzes for insert to authenticated
  with check (owner_id = auth.uid() and source = 'user');
create policy quizzes_update_own on public.quizzes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and source = 'user');
create policy quizzes_delete_own on public.quizzes for delete to authenticated
  using (owner_id = auth.uid());

create policy questions_read on public.questions for select using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id
      and (q.visibility in ('public', 'unlisted') or q.owner_id = auth.uid())
  )
);
create policy questions_write_own on public.questions for all to authenticated
  using (
    exists (select 1 from public.quizzes q
            where q.id = questions.quiz_id and q.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.quizzes q
            where q.id = questions.quiz_id and q.owner_id = auth.uid())
  );

create policy attempts_read_own on public.attempts for select
  using (user_id = auth.uid());
create policy review_read_own on public.review_items for select
  using (user_id = auth.uid());

-- ── Cái client được nhìn thấy ───────────────────────────────────────────────

-- security_invoker: view chạy với quyền người gọi nên RLS ở bảng questions vẫn
-- áp dụng. Không có nó thì view chạy bằng quyền owner và bỏ qua RLS.
create view public.questions_public
  with (security_invoker = true) as
  select id, quiz_id, position, key, type, prompt, options, tags, case_sensitive
  from public.questions;

-- Quyền cột là thứ thật sự giấu đáp án: dù client gọi thẳng /rest/v1/questions
-- thì answer và explanation vẫn không đọc được.
revoke all on public.questions from anon, authenticated;
grant select (id, quiz_id, position, key, type, prompt, options, tags, case_sensitive)
  on public.questions to anon, authenticated;
grant insert, update, delete on public.questions to authenticated;

grant select on public.questions_public to anon, authenticated;
grant select on public.quizzes to anon, authenticated;
grant insert, update, delete on public.quizzes to authenticated;
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select on public.attempts to authenticated;
grant select on public.review_items to authenticated;

-- Người tạo đề cần đọc lại đáp án đề của chính mình để sửa — quyền cột không
-- diễn tả được "chỉ dòng của tôi", nên phần này đi qua RPC.
create or replace function public.quiz_for_edit(p_quiz uuid)
returns setof public.questions
language sql security definer set search_path = public as $$
  select q.*
  from public.questions q
  join public.quizzes z on z.id = q.quiz_id
  where q.quiz_id = p_quiz and z.owner_id = auth.uid()
  order by q.position;
$$;

revoke all on function public.quiz_for_edit(uuid) from public, anon;
grant execute on function public.quiz_for_edit(uuid) to authenticated;

-- ── Chấm bài ────────────────────────────────────────────────────────────────

-- p_answers: {"<question_id>": [0,2] | "chuỗi"}
-- Trả về đúng-sai từng câu kèm đáp án và lời giải — đây là lần duy nhất đáp án
-- đi ra khỏi server, và chỉ sau khi người học đã nộp bài.
--
-- p_record = false khi người học chỉ luyện lại vài câu sai: lúc đó không ghi
-- attempts (điểm của một phần bài không nói lên gì về cả bài), nhưng hàng đợi
-- ôn tập vẫn cập nhật — đó chính là mục đích của việc luyện lại.
create or replace function public.grade_attempt(
  p_quiz uuid, p_answers jsonb, p_record boolean default true
)
returns table (question_id uuid, correct boolean, answer jsonb, explanation text)
language plpgsql security definer set search_path = public as $$
-- Tên cột trả về (question_id, correct, answer…) trùng tên cột của review_items
-- nên phải nói rõ: trong thân hàm, tên trùng thì hiểu là cột của bảng.
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
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

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'question_id', q.id,
               'correct', public.answer_matches(q.type, q.answer, p_answers -> q.id::text),
               'answer', q.answer,
               'explanation', q.explanation
             )
             order by q.position
           ),
           '[]'::jsonb
         )
    into v_res
  from public.questions q
  where q.quiz_id = p_quiz;

  v_total := jsonb_array_length(v_res);
  select count(*) into v_ok
  from jsonb_array_elements(v_res) e
  where (e ->> 'correct')::boolean;

  -- Khách chưa đăng nhập vẫn làm và vẫn được chấm, chỉ là không lưu tiến độ.
  if v_uid is not null and v_total > 0 and p_record then
    insert into public.attempts
      (quiz_id, user_id, answers, question_count, correct_count, score)
    values
      (p_quiz, v_uid, p_answers, v_total, v_ok, round(100.0 * v_ok / v_total, 2));
  end if;

  -- Hàng đợi ôn tập cập nhật cả khi p_record = false: luyện lại câu sai chính
  -- là lúc lịch ôn cần đổi.
  if v_uid is not null then
    insert into public.review_items
      (user_id, question_id, seen_count, wrong_count, last_correct, due_at)
    select
      v_uid,
      (e ->> 'question_id')::uuid,
      1,
      case when (e ->> 'correct')::boolean then 0 else 1 end,
      (e ->> 'correct')::boolean,
      now() + case when (e ->> 'correct')::boolean
                   then interval '3 days' else interval '1 day' end
    from jsonb_array_elements(v_res) e
    -- Chỉ những câu thật sự có trả lời: câu bỏ trống khi đang luyện một phần
    -- bài không được tính là làm sai.
    where p_answers ? (e ->> 'question_id')
    on conflict (user_id, question_id) do update set
      seen_count = review_items.seen_count + 1,
      wrong_count = review_items.wrong_count
                    + case when excluded.last_correct then 0 else 1 end,
      last_correct = excluded.last_correct,
      -- Đúng thì giãn khoảng ôn theo số lần đúng liên tiếp (chặn ở 30 ngày),
      -- sai thì kéo về mai. Đủ dùng, và không cần thư viện SRS nào.
      due_at = case
        when excluded.last_correct then now() + make_interval(days => least(30,
          greatest(1, (review_items.seen_count + 1 - review_items.wrong_count) * 3)))
        else now() + interval '1 day'
      end;
  end if;

  return query
  select (e ->> 'question_id')::uuid,
         (e ->> 'correct')::boolean,
         e -> 'answer',
         e ->> 'explanation'
  from jsonb_array_elements(v_res) e;
end $$;

revoke all on function public.grade_attempt(uuid, jsonb, boolean) from public;
grant execute on function public.grade_attempt(uuid, jsonb, boolean)
  to anon, authenticated;

-- Chấm một lượt ôn tập chéo: các câu hỏi có thể thuộc nhiều đề khác nhau, nên
-- không có quiz nào để ghi attempt — chỉ cập nhật hàng đợi ôn tập.
-- p_answers: {"<question_id>": [0,2] | "chuỗi"}
create or replace function public.grade_review(p_answers jsonb)
returns table (question_id uuid, correct boolean, answer jsonb, explanation text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'phải đăng nhập để ôn tập' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then
    raise exception 'p_answers phải là object {question_id: đáp án}';
  end if;

  -- Chỉ chấm những câu người gọi có quyền đọc; id lạ bị bỏ qua im lặng.
  select coalesce(
           jsonb_agg(jsonb_build_object(
             'question_id', q.id,
             'correct', public.answer_matches(q.type, q.answer, p_answers -> q.id::text),
             'answer', q.answer,
             'explanation', q.explanation
           )),
           '[]'::jsonb
         )
    into v_res
  from public.questions q
  join public.quizzes z on z.id = q.quiz_id
  where q.id::text in (select jsonb_object_keys(p_answers))
    and (z.visibility in ('public', 'unlisted') or z.owner_id = v_uid);

  insert into public.review_items
    (user_id, question_id, seen_count, wrong_count, last_correct, due_at)
  select
    v_uid,
    (e ->> 'question_id')::uuid,
    1,
    case when (e ->> 'correct')::boolean then 0 else 1 end,
    (e ->> 'correct')::boolean,
    now() + case when (e ->> 'correct')::boolean
                 then interval '3 days' else interval '1 day' end
  from jsonb_array_elements(v_res) e
  on conflict (user_id, question_id) do update set
    seen_count = review_items.seen_count + 1,
    wrong_count = review_items.wrong_count
                  + case when excluded.last_correct then 0 else 1 end,
    last_correct = excluded.last_correct,
    due_at = case
      when excluded.last_correct then now() + make_interval(days => least(30,
        greatest(1, (review_items.seen_count + 1 - review_items.wrong_count) * 3)))
      else now() + interval '1 day'
    end;

  return query
  select (e ->> 'question_id')::uuid,
         (e ->> 'correct')::boolean,
         e -> 'answer',
         e ->> 'explanation'
  from jsonb_array_elements(v_res) e;
end $$;

revoke all on function public.grade_review(jsonb) from public, anon;
grant execute on function public.grade_review(jsonb) to authenticated;
