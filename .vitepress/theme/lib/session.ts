// Phiên đăng nhập, dùng chung cho mọi component.
//
// Ref để ở cấp module nên chỉ có một chỗ theo dõi session, và mọi component
// cùng thấy trạng thái đó. Client Supabase vốn cũng là singleton.

import {ref} from "vue";
import {getSupabase, hasSupabase} from "./supabase";

const user = ref<{id: string; email?: string} | null>(null);
const ready = ref(false);
let started = false;

export function useSession() {
  if (!started) {
    started = true;
    const pending = getSupabase();
    if (!pending) {
      ready.value = true;
    } else {
      pending.then(async (sb) => {
        const {data} = await sb.auth.getSession();
        user.value = (data.session?.user as any) ?? null;
        ready.value = true;
        // Magic link quay về sẽ phát sự kiện này sau khi supabase-js đọc token.
        sb.auth.onAuthStateChange((_event, session) => {
          user.value = (session?.user as any) ?? null;
        });
      });
    }
  }
  return {user, ready, hasSupabase};
}

export async function signInWithEmail(email: string, redirectTo: string) {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");
  const {error} = await sb.auth.signInWithOtp({
    email,
    options: {emailRedirectTo: redirectTo}
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut();
}
