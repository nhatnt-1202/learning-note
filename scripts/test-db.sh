#!/usr/bin/env bash
# Chạy test quyền của schema quiz trên một Postgres tạm trong docker.
#
#   npm run db:test
#
# Không cần Supabase CLI: supabase/tests/00-stub-auth.sql dựng bản rút gọn của
# schema auth (bảng users + hàm auth.uid()) để RLS chạy được như trên thật.
set -euo pipefail

NAME=${NAME:-quiz-pg-test}
IMAGE=${IMAGE:-postgres:16-alpine}

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

# Kiểm tra qua TCP, không qua unix socket: trong lúc initdb, image postgres bật
# một server tạm chỉ nghe socket rồi tắt đi — hỏi socket sẽ thấy "sẵn sàng" quá
# sớm rồi lệnh psql đầu tiên gặp "database system is shutting down".
docker exec "$NAME" sh -c \
  'n=0; for i in $(seq 90); do
     if pg_isready -q -h 127.0.0.1 -U postgres -d postgres; then n=$((n+1)); else n=0; fi
     [ "$n" -ge 2 ] && exit 0
     sleep 0.5
   done; exit 1'

for f in supabase/tests/00-stub-auth.sql supabase/migrations/*.sql supabase/tests/10-fixtures.sql; do
  echo "→ $f"
  docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -U postgres -q < "$f"
done

docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/20-rls.sql

# Dữ liệu thật từ notes/**/*.quiz.yml phải thoả được ràng buộc của schema —
# không chỉ thoả validator riêng của quiz-data.mjs.
echo "→ nạp quiz thật từ YAML"
node scripts/quiz-to-sql.mjs | docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -U postgres -q
# Vòng khép kín: nhập lại đúng đáp án đã lưu thì phải được tính là đúng. Đây là
# thứ bắt được lệch kiểu giữa cách lưu đáp án và cách hàm chấm so sánh.
docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -U postgres -q -c "
do \$\$
declare v_bad int; v_n int;
begin
  select count(*) into v_n from public.questions;
  if v_n = 0 then raise exception 'không nạp được câu hỏi nào từ YAML'; end if;

  select count(*) into v_bad
  from public.questions q
  where not public.answer_matches(
    q.type, q.answer,
    case when q.type in ('fill', 'output') then to_jsonb(q.answer ->> 0) else q.answer end
  );
  if v_bad > 0 then
    raise exception '% câu: nhập đúng đáp án đã lưu mà vẫn bị tính sai', v_bad;
  end if;
  raise notice '% câu hỏi nạp từ YAML, chấm đúng hết', v_n;
end \$\$;"
echo "→ quiz từ YAML nạp được và thoả ràng buộc"
