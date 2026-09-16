<script setup>
import {ref} from "vue";
import {useSession, signInWithEmail, signOut} from "../lib/session";

// Đăng nhập bằng magic link: không mật khẩu để quản, và không cần cấu hình
// OAuth app. Đổi lại phải chờ mail.
const {user, ready, hasSupabase} = useSession();

const email = ref("");
const state = ref("idle"); // idle | sending | sent | error
const message = ref("");

async function send() {
  const addr = email.value.trim();
  if (!addr) return;
  state.value = "sending";
  message.value = "";
  try {
    // Quay về đúng trang đang mở — URL này phải nằm trong Redirect URLs của
    // project, nếu không Supabase sẽ từ chối.
    await signInWithEmail(addr, window.location.href);
    state.value = "sent";
  } catch (e) {
    state.value = "error";
    message.value = String(e?.message || e);
  }
}
</script>

<template>
  <ClientOnly>
    <div v-if="hasSupabase" class="au">
      <span v-if="!ready" class="au-dim">Đang kiểm tra phiên…</span>

      <template v-else-if="user">
        <span class="au-who">{{ user.email }}</span>
        <button class="au-btn" @click="signOut()">Đăng xuất</button>
      </template>

      <span v-else-if="state === 'sent'" class="au-dim">
        Đã gửi liên kết đăng nhập tới <b>{{ email }}</b>. Mở mail và bấm vào đó —
        trang này sẽ tự nhận phiên.
      </span>

      <template v-else>
        <input
          v-model="email"
          class="au-input"
          type="email"
          autocomplete="email"
          placeholder="email của bạn"
          @keydown.enter="send" />
        <button class="au-btn" :disabled="state === 'sending'" @click="send">
          {{ state === "sending" ? "Đang gửi…" : "Gửi liên kết" }}
        </button>
        <span v-if="message" class="au-err">{{ message }}</span>
      </template>
    </div>

    <div v-else class="au au-off">
      Chưa cấu hình Supabase nên phần đăng nhập và đề tự tạo đang tắt. Cần
      <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> lúc build.
    </div>
  </ClientOnly>
</template>

<style scoped>
.au {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  font-size: 14px;
}
.au-off {color: var(--vp-c-text-3); font-size: 13px; display: block;}
.au-dim {color: var(--vp-c-text-3);}
.au-who {font-weight: 600;}
.au-input {
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  outline: none;
  min-width: 220px;
}
.au-input:focus {border-color: var(--vp-c-brand-1);}
.au-btn {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.au-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.au-btn:disabled {opacity: .6; cursor: default;}
.au-err {font-size: 12.5px; color: var(--vp-c-danger-1);}
</style>
