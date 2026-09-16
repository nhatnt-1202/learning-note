<script setup>
import {ref, computed, watch} from "vue";
import {withBase} from "vitepress";
import Auth from "./Auth.vue";
import QuizRunner from "./QuizRunner.vue";
import QuizBuilder from "./QuizBuilder.vue";
import Leaderboard from "./Leaderboard.vue";
import {useSession} from "../lib/session";
import {
  listQuizzes,
  deleteQuiz,
  dueReview,
  gradeReview,
  loadById,
  gradeRemote
} from "../lib/quiz";

const {user, ready, hasSupabase} = useSession();

const view = ref("home"); // home | review | take | edit
const rows = ref([]);
const loading = ref(false);
const failure = ref("");

const reviewQuestions = ref([]);
const taking = ref(null);
const takingBoard = ref(null);
const editingId = ref(null);

const mine = computed(() =>
  rows.value.filter((r) => user.value && r.owner_id === user.value.id)
);
const others = computed(() =>
  rows.value.filter((r) => !user.value || r.owner_id !== user.value.id)
);

async function refresh() {
  if (!hasSupabase) return;
  loading.value = true;
  failure.value = "";
  try {
    rows.value = await listQuizzes();
  } catch (e) {
    failure.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

// Danh sách phụ thuộc RLS nên phải nạp lại mỗi khi phiên đổi: đăng nhập xong
// mới thấy đề riêng của mình.
watch([ready, user], () => {
  if (ready.value) refresh();
}, {immediate: true});

async function startReview() {
  failure.value = "";
  try {
    reviewQuestions.value = await dueReview(10);
    view.value = "review";
  } catch (e) {
    failure.value = String(e?.message || e);
  }
}

async function take(id) {
  failure.value = "";
  try {
    taking.value = await loadById(id);
    view.value = taking.value ? "take" : "home";
  } catch (e) {
    failure.value = String(e?.message || e);
  }
}

async function remove(row) {
  if (!confirm(`Xoá đề "${row.title}"? Không lấy lại được.`)) return;
  try {
    await deleteQuiz(row.id);
    await refresh();
  } catch (e) {
    failure.value = String(e?.message || e);
  }
}

function edit(id) {
  editingId.value = id;
  view.value = "edit";
}

async function onSaved() {
  view.value = "home";
  editingId.value = null;
  await refresh();
}

function lessonLink(path) {
  return withBase("/" + path);
}
</script>

<template>
  <div class="hub">
    <Auth />

    <p v-if="failure" class="hub-err">{{ failure }}</p>

    <ClientOnly>
      <template v-if="hasSupabase">
        <!-- Ôn tập chéo -->
        <section v-if="view === 'review'" class="hub-sec">
          <div class="hub-bar">
            <b>Ôn tập chéo</b>
            <span class="hub-grow"></span>
            <button class="hub-btn" @click="view = 'home'">← Về danh sách</button>
          </div>
          <QuizRunner
            v-if="reviewQuestions.length"
            title="Câu đến hạn ôn"
            :pass="70"
            :questions="reviewQuestions"
            :grade="(picks) => gradeReview(picks)"
            empty-text="Chưa có câu nào đến hạn ôn." />
          <p v-else class="hub-dim">
            Chưa có câu nào đến hạn. Làm vài bài quiz trước đã — câu nào sai sẽ
            được hẹn ôn lại vào ngày mai.
          </p>
        </section>

        <!-- Làm một đề cụ thể -->
        <section v-else-if="view === 'take' && taking" class="hub-sec">
          <div class="hub-bar">
            <b>{{ taking.title }}</b>
            <span class="hub-grow"></span>
            <button class="hub-btn" @click="view = 'home'">← Về danh sách</button>
          </div>
          <QuizRunner
            :title="taking.title"
            :pass="taking.pass"
            :questions="taking.questions"
            :generated="taking.generated"
            :reviewed="taking.reviewed"
            :store-key="`quiz-id:${taking.quizId}`"
            :grade="(picks, opts) => gradeRemote(taking, picks, !opts.drill)"
            @graded="takingBoard?.refresh()" />
          <Leaderboard ref="takingBoard" :quiz-id="taking.quizId" :limit="10" />
        </section>

        <!-- Soạn đề -->
        <QuizBuilder
          v-else-if="view === 'edit' && user"
          :quiz-id="editingId"
          :owner-id="user.id"
          @saved="onSaved"
          @cancel="view = 'home'" />

        <!-- Danh sách -->
        <template v-else>
          <div class="hub-actions">
            <button v-if="user" class="hub-btn primary" @click="edit(null)">
              + Tạo đề mới
            </button>
            <button v-if="user" class="hub-btn" @click="startReview">
              Ôn tập chéo
            </button>
            <span v-if="loading" class="hub-dim">đang nạp…</span>
          </div>

          <section v-if="user" class="hub-sec">
            <h3>Đề của tôi</h3>
            <p v-if="!mine.length" class="hub-dim">
              Chưa có đề nào. Bấm <b>Tạo đề mới</b> để thêm.
            </p>
            <ul v-else class="hub-list">
              <li v-for="row in mine" :key="row.id">
                <div class="hub-row">
                  <button class="hub-link" @click="take(row.id)">{{ row.title }}</button>
                  <span class="hub-meta">
                    <span class="hub-pill">{{
                      row.visibility === "private"
                        ? "chỉ tôi"
                        : row.visibility === "unlisted"
                          ? "có link"
                          : "công khai"
                    }}</span>
                    <a v-if="row.lesson_path" :href="lessonLink(row.lesson_path)">
                      {{ row.lesson_path }}
                    </a>
                  </span>
                  <span class="hub-grow"></span>
                  <button class="hub-btn" @click="edit(row.id)">Sửa</button>
                  <button class="hub-btn" @click="remove(row)">Xoá</button>
                </div>
              </li>
            </ul>
          </section>

          <section class="hub-sec">
            <h3>Đề của site và đề được chia sẻ</h3>
            <p v-if="!others.length" class="hub-dim">Chưa có đề nào.</p>
            <ul v-else class="hub-list">
              <li v-for="row in others" :key="row.id">
                <div class="hub-row">
                  <button class="hub-link" @click="take(row.id)">{{ row.title }}</button>
                  <span class="hub-meta">
                    <span v-if="row.source === 'auto'" class="hub-pill">của site</span>
                    <a v-if="row.lesson_path" :href="lessonLink(row.lesson_path)">
                      {{ row.lesson_path }}
                    </a>
                  </span>
                </div>
              </li>
            </ul>
          </section>

        </template>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.hub {margin: 24px 0;}
.hub-sec {margin-top: 24px;}
.hub-sec h3 {margin: 0 0 8px; font-size: 15px;}
.hub-bar {display: flex; gap: 8px; align-items: center; margin-bottom: 8px;}
.hub-actions {display: flex; gap: 8px; align-items: center; margin-top: 16px;}
.hub-grow {flex: 1;}
.hub-dim {color: var(--vp-c-text-3); font-size: 14px; margin: 0;}
.hub-err {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
  font-size: 13px;
}
.hub-list {list-style: none; margin: 0; padding: 0;}
.hub-list li {padding: 0; margin: 0;}
.hub-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.hub-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-align: left;
}
.hub-link:hover {text-decoration: underline;}
.hub-meta {display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--vp-c-text-3);}
.hub-pill {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-size: 11px;
}
.hub-btn {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.hub-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.hub-btn.primary {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600;}
</style>
