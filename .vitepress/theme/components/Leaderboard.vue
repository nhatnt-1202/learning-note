<script setup>
// Bảng xếp hạng. Không có prop `quizId` thì xếp hạng chung trên toàn bộ đề của
// site; có thì xếp hạng riêng đề đó.
//
// Mọi con số đến từ RPC security definer, không từ bảng attempts: RLS chỉ cho
// mỗi người đọc lần làm bài của chính mình, và giữ nguyên như vậy là đúng.
import {ref, computed, watch} from "vue";
import {useSession} from "../lib/session";
import {
  leaderboard,
  leaderboardOverall,
  myRank,
  getDisplayName,
  setDisplayName
} from "../lib/quiz";

const props = defineProps({
  quizId: {type: String, default: null},
  limit: {type: Number, default: 20}
});

const {user, ready, hasSupabase} = useSession();

const rows = ref([]);
const me = ref(null);
const loading = ref(false);
const failure = ref("");

const name = ref("");
const savedName = ref("");
const savingName = ref(false);
const editingName = ref(false);

const perQuiz = computed(() => Boolean(props.quizId));
// Người đứng ngoài top vẫn phải thấy hạng của mình — đó là cả lý do có my_rank.
const meOutside = computed(
  () => me.value && !rows.value.some((r) => r.user_id === user.value?.id)
);

async function refresh() {
  if (!hasSupabase) return;
  loading.value = true;
  failure.value = "";
  try {
    rows.value = perQuiz.value
      ? await leaderboard(props.quizId, props.limit)
      : await leaderboardOverall(props.limit);
    me.value = user.value ? await myRank(props.quizId) : null;
  } catch (e) {
    failure.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

async function loadName() {
  if (!user.value) return;
  try {
    savedName.value = await getDisplayName(user.value.id);
    name.value = savedName.value;
  } catch {
    // Không đọc được tên thì bảng xếp hạng vẫn dùng được — bỏ qua.
  }
}

async function saveName() {
  if (!user.value) return;
  savingName.value = true;
  failure.value = "";
  try {
    await setDisplayName(user.value.id, name.value);
    savedName.value = name.value.trim();
    editingName.value = false;
    await refresh();
  } catch (e) {
    failure.value = String(e?.message || e);
  } finally {
    savingName.value = false;
  }
}

watch(
  [ready, user, () => props.quizId],
  () => {
    if (!ready.value) return;
    refresh();
    loadName();
  },
  {immediate: true}
);

defineExpose({refresh});

function pct(n) {
  return `${Number(n ?? 0).toFixed(Number(n) % 1 ? 1 : 0)}%`;
}

function day(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit"});
}

// Ba hạng đầu đủ ít để nhận ra bằng huy hiệu; từ hạng 4 trở đi thì con số rõ hơn.
const MEDAL = {1: "🥇", 2: "🥈", 3: "🥉"};
</script>

<template>
  <div class="lb">
    <ClientOnly>
      <template v-if="hasSupabase">
        <div class="lb-bar">
          <b>{{ perQuiz ? "Xếp hạng đề này" : "Bảng xếp hạng" }}</b>
          <span class="lb-grow"></span>
          <span v-if="loading" class="lb-dim">đang nạp…</span>
          <button v-else class="lb-btn" @click="refresh">Làm mới</button>
        </div>

        <p v-if="failure" class="lb-err">{{ failure }}</p>

        <!-- Tên hiển thị: thứ duy nhất người khác thấy của mình ở đây. -->
        <p v-if="user" class="lb-name">
          <template v-if="editingName">
            <input
              v-model="name"
              class="lb-input"
              maxlength="40"
              placeholder="Tên hiện trên bảng xếp hạng"
              @keyup.enter="saveName" />
            <button class="lb-btn" :disabled="savingName" @click="saveName">Lưu</button>
            <button class="lb-btn" @click="editingName = false; name = savedName">Huỷ</button>
          </template>
          <template v-else>
            Bạn đang hiện là <b>{{ savedName || "Ẩn danh" }}</b>
            <button class="lb-btn" @click="editingName = true">Đổi tên</button>
          </template>
        </p>

        <p v-if="!loading && !rows.length" class="lb-dim">
          Chưa ai làm bài. Làm xong một đề là bạn đứng đầu bảng.
        </p>

        <table v-else-if="rows.length" class="lb-table">
          <thead>
            <tr>
              <th class="lb-rank">#</th>
              <th>Tên</th>
              <template v-if="perQuiz">
                <th class="lb-num">Điểm</th>
                <th class="lb-num">Đúng</th>
                <th class="lb-num lb-hide">Lượt</th>
                <th class="lb-num lb-hide">Ngày</th>
              </template>
              <template v-else>
                <th class="lb-num">Câu đúng</th>
                <th class="lb-num">Đề</th>
                <th class="lb-num lb-hide">TB</th>
                <th class="lb-num lb-hide">Gần nhất</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.user_id"
              :class="{'lb-me': user && r.user_id === user.id}">
              <td class="lb-rank">{{ MEDAL[r.rank] ?? r.rank }}</td>
              <td class="lb-who">{{ r.display_name }}</td>
              <template v-if="perQuiz">
                <td class="lb-num lb-strong">{{ pct(r.score) }}</td>
                <td class="lb-num">{{ r.correct_count }}/{{ r.question_count }}</td>
                <td class="lb-num lb-hide">{{ r.attempts }}</td>
                <td class="lb-num lb-hide">{{ day(r.achieved_at) }}</td>
              </template>
              <template v-else>
                <td class="lb-num lb-strong">{{ r.total_correct }}</td>
                <td class="lb-num">{{ r.quizzes_done }}</td>
                <td class="lb-num lb-hide">{{ pct(r.avg_score) }}</td>
                <td class="lb-num lb-hide">{{ day(r.last_at) }}</td>
              </template>
            </tr>

            <!-- Hạng của mình khi đứng ngoài top. -->
            <tr v-if="meOutside" class="lb-me lb-gap">
              <td class="lb-rank">{{ me.rank }}</td>
              <td class="lb-who">{{ savedName || "Ẩn danh" }} (bạn)</td>
              <template v-if="perQuiz">
                <td class="lb-num lb-strong">{{ pct(me.score) }}</td>
                <td class="lb-num">—</td>
                <td class="lb-num lb-hide">{{ me.attempts }}</td>
                <td class="lb-num lb-hide"></td>
              </template>
              <template v-else>
                <td class="lb-num lb-strong">{{ me.total_correct }}</td>
                <td class="lb-num">—</td>
                <td class="lb-num lb-hide">{{ pct(me.avg_score) }}</td>
                <td class="lb-num lb-hide"></td>
              </template>
            </tr>
          </tbody>
        </table>

        <p class="lb-note">
          <template v-if="perQuiz">
            Tính theo <b>lần làm tốt nhất</b>; bằng điểm thì ai đạt trước đứng trên.
          </template>
          <template v-else>
            Xếp theo <b>tổng số câu đúng</b> trên các đề của site — làm nhiều đề
            thì lên hạng, không phải làm một đề thật nhiều lần.
          </template>
          <span v-if="!user"> Đăng nhập để tên bạn được ghi lại.</span>
        </p>
      </template>
      <p v-else class="lb-dim">Chưa cấu hình Supabase nên chưa có bảng xếp hạng.</p>
    </ClientOnly>
  </div>
</template>

<style scoped>
.lb {margin: 24px 0;}
.lb-bar {display: flex; gap: 8px; align-items: center; margin-bottom: 8px;}
.lb-grow {flex: 1;}
.lb-dim {color: var(--vp-c-text-3); font-size: 14px; margin: 8px 0 0;}
.lb-err {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
  font-size: 13px;
}
.lb-name {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.lb-input {
  flex: 1;
  min-width: 160px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 13px;
}
.lb-table {display: table; width: 100%; margin: 0; border-collapse: collapse;}
.lb-table th,
.lb-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13.5px;
}
.lb-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
}
.lb-table tr {background: transparent;}
.lb-rank {width: 2.5rem; text-align: center; color: var(--vp-c-text-3);}
.lb-who {font-weight: 500;}
.lb-num {width: 4.5rem; text-align: right; font-variant-numeric: tabular-nums;}
.lb-strong {font-weight: 600; color: var(--vp-c-brand-1);}
.lb-me {background: var(--vp-c-brand-soft);}
/* Dòng của mình khi đứng ngoài top: vạch đứt thay cho dấu "…" cho gọn. */
.lb-gap td {border-top: 2px dashed var(--vp-c-divider);}
.lb-note {margin: 8px 0 0; font-size: 12.5px; color: var(--vp-c-text-3);}
.lb-btn {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.lb-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.lb-btn:disabled {opacity: 0.5;}

@media (max-width: 640px) {
  .lb-hide {display: none;}
}
</style>
