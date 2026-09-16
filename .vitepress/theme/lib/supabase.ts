// Client Supabase, tạo trễ và chỉ ở phía trình duyệt.
//
// Hai lý do phải dùng import động: SSR không có window/localStorage, và
// @supabase/supabase-js nặng ~40KB gzip — không đáng nằm trong chunk chung của
// mọi trang bài học khi phần lớn lượt xem là đọc bài, không đăng nhập.

import type {SupabaseClient} from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Thiếu env thì site vẫn chạy, chỉ ẩn phần đăng nhập và đề tự tạo. Nhờ vậy
// build GitHub Pages không cần secret cũng không vỡ.
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

let pending: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> | null {
  if (!hasSupabase || typeof window === "undefined") return null;
  pending ??= import("@supabase/supabase-js").then(({createClient}) =>
    createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Magic link quay về kèm token trong URL — để supabase-js tự đọc và dọn.
        detectSessionInUrl: true
      }
    })
  );
  return pending;
}
