#!/usr/bin/env bash
# Áp dụng các migration chưa chạy lên một Postgres thật, rồi nạp đề.
#
#   npm run db:push            # chạy migration còn thiếu + nạp đề
#   npm run db:push -- --dry   # chỉ xem sẽ chạy những file nào
#
# Cần SUPABASE_DB_URL trong .env.local — connection string Postgres, lấy ở
# Supabase Dashboard → Settings → Database → Connection string → URI.
# Đây là thứ DUY NHẤT chạy được DDL: service role key đi qua PostgREST nên
# không `create table` hay `alter table` được.
#
# Khác với db:sql/schema.sql (chỉ dùng cho DB trống), script này ghi lại từng
# migration đã chạy vào bảng schema_migrations nên chạy lại bao nhiêu lần cũng
# được, và chỉ chạy đúng phần còn thiếu.
set -euo pipefail

cd "$(dirname "$0")/.."

DRY=false
[[ "${1:-}" == "--dry" ]] && DRY=true

# .env.local không phải file shell (có thể có dấu nháy, ký tự lạ), nên đọc bằng
# grep thay vì `source` — source một file lạ là mời nó chạy code tuỳ ý.
if [[ -z "${SUPABASE_DB_URL:-}" && -f .env.local ]]; then
  # `|| true`: pipefail biến việc grep không tìm thấy thành lỗi làm chết script,
  # trong khi "chưa khai biến" mới đúng là trường hợp cần báo tử tế ở dưới.
  SUPABASE_DB_URL=$(grep -E '^SUPABASE_DB_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'' || true)
fi

if [[ -z "${SUPABASE_URL:-}" && -f .env.local ]]; then
  SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'' || true)
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  cat >&2 <<'EOF'
Thiếu SUPABASE_DB_URL.

  Supabase Dashboard → Settings → Database → Connection string → URI
  Dán vào .env.local (file này đã nằm trong .gitignore):

    SUPABASE_DB_URL=postgresql://postgres:<mật-khẩu>@db.<ref>.supabase.co:5432/postgres

Không đặt tiền tố VITE_ — mọi biến VITE_* đều đi vào bundle của trình duyệt.
EOF
  exit 2
fi

# Hai biến, hai đường đi khác nhau: migration đi thẳng vào Postgres qua
# SUPABASE_DB_URL, còn đề đi qua PostgREST bằng SUPABASE_URL. Trỏ nhầm một
# trong hai là chạy migration lên project này rồi nạp đề lên project kia — và
# không có thông báo lỗi nào, chỉ có kết quả sai ở nơi không ai nhìn.
REF_DB=$(sed -E 's#.*[@/.]([a-z]{20})\.(supabase|pooler)\..*#\1#;t;s#.*postgres\.([a-z]{20}).*#\1#;t;s#.*##' <<<"$SUPABASE_DB_URL")
REF_API=$(sed -E 's#https?://([a-z]{20})\.supabase\.co.*#\1#;t;s#.*##' <<<"${SUPABASE_URL:-}")
if [[ -n "$REF_DB" && -n "$REF_API" && "$REF_DB" != "$REF_API" ]]; then
  echo "SUPABASE_DB_URL trỏ project '$REF_DB' nhưng SUPABASE_URL trỏ '$REF_API'." >&2
  echo "Sửa .env.local cho hai biến cùng một project rồi chạy lại." >&2
  exit 2
fi

PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q)

echo "→ kiểm tra kết nối"
"${PSQL[@]}" -tAc 'select 1' >/dev/null

# Bảng theo dõi migration. Không có nó thì mỗi lần chạy lại phải đoán xem file
# nào đã chạy — và đoán sai ở DDL thì hoặc mất dữ liệu hoặc kẹt giữa chừng.
"${PSQL[@]}" -c "
  create table if not exists public.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  );" >/dev/null

APPLIED=$("${PSQL[@]}" -tAc 'select version from public.schema_migrations')

# Migration đầu tiên có thể đã được chạy tay trước khi có script này. Nhận ra
# bằng dấu vết của chính nó thay vì hỏi người dùng.
if ! grep -qx '20260909120000_quiz.sql' <<<"$APPLIED"; then
  if "${PSQL[@]}" -tAc "select to_regclass('public.quizzes') is not null" | grep -qx t; then
    echo "· bảng quizzes đã tồn tại → đánh dấu 20260909120000_quiz.sql là đã chạy"
    $DRY || "${PSQL[@]}" -c "insert into public.schema_migrations (version)
      values ('20260909120000_quiz.sql') on conflict do nothing;" >/dev/null
    APPLIED=$'20260909120000_quiz.sql\n'"$APPLIED"
  fi
fi
if ! grep -qx '20260916120000_ranking.sql' <<<"$APPLIED"; then
  if "${PSQL[@]}" -tAc "select to_regprocedure('public.leaderboard_overall(int)') is not null" \
     | grep -qx t; then
    echo "· hàm leaderboard_overall đã tồn tại → đánh dấu 20260916120000_ranking.sql là đã chạy"
    $DRY || "${PSQL[@]}" -c "insert into public.schema_migrations (version)
      values ('20260916120000_ranking.sql') on conflict do nothing;" >/dev/null
    APPLIED=$'20260916120000_ranking.sql\n'"$APPLIED"
  fi
fi

RAN=0
for f in supabase/migrations/*.sql; do
  v=$(basename "$f")
  if grep -qx "$v" <<<"$APPLIED"; then
    echo "· $v — đã chạy, bỏ qua"
    continue
  fi
  if $DRY; then
    echo "→ $v — SẼ chạy"
    RAN=$((RAN + 1))
    continue
  fi
  echo "→ $v — đang chạy"
  # Một file, một transaction: hỏng giữa chừng thì không để lại schema nửa vời.
  "${PSQL[@]}" -1 -f "$f" >/dev/null
  "${PSQL[@]}" -c "insert into public.schema_migrations (version) values ('$v');" >/dev/null
  RAN=$((RAN + 1))
done

if $DRY; then
  echo "(chế độ thử — chưa chạy gì; $RAN file còn thiếu)"
  exit 0
fi

echo "✓ $RAN migration vừa chạy"

# PostgREST giữ một bản cache của schema; thêm cột xong mà không báo thì nó vẫn
# trả "column does not exist" cho tới lần reload sau.
"${PSQL[@]}" -c "notify pgrst, 'reload schema';" >/dev/null
echo "→ đã báo PostgREST nạp lại schema"

echo "→ nạp đề từ notes/**/*.quiz.yml"
npm run --silent quiz:import
