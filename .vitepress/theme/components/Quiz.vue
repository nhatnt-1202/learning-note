<script setup>
import {computed, ref, onMounted} from "vue";
import {useData} from "vitepress";
import QuizRunner from "./QuizRunner.vue";
import {hasSupabase} from "../lib/supabase";
import {
  fromPageData,
  loadForLesson,
  gradeLocal,
  gradeRemote,
  gradeOneLocal,
  gradeOneRemote,
  recordAttempt
} from "../lib/quiz";

// Component không nhận prop nào: mỗi bài chỉ cần một dòng <Quiz /> ở cuối trang.
// Việc duy nhất ở đây là tìm ra quiz của bài này đến từ đâu.
const {frontmatter, page} = useData();

const lessonPath = computed(() =>
  String(page.value.relativePath || "").replace(/\.md$/, "")
);

// Nguồn static (.quiz.yml nhúng vào page data) có sẵn từ lúc SSR nên quiz nằm
// luôn trong HTML; nguồn DB phải chờ mount mới fetch được.
const quiz = ref(frontmatter.value.quiz ? fromPageData(frontmatter.value.quiz) : null);
const status = ref(quiz.value ? "ready" : hasSupabase ? "loading" : "empty");
const failure = ref("");

async function load() {
  status.value = "loading";
  failure.value = "";
  try {
    const found = await loadForLesson(lessonPath.value);
    if (found && found.questions.length) {
      quiz.value = found;
      status.value = "ready";
    } else {
      status.value = "empty";
    }
  } catch (e) {
    failure.value = String(e?.message || e);
    status.value = "error";
  }
}

onMounted(() => {
  if (!quiz.value && hasSupabase) load();
});

function grade(picks, {drill}) {
  return quiz.value.origin === "db"
    ? gradeRemote(quiz.value, picks, !drill)
    : Promise.resolve(gradeLocal(quiz.value, picks));
}

function gradeOne(q, given) {
  return quiz.value.origin === "db"
    ? gradeOneRemote(q.id, given)
    : Promise.resolve(gradeOneLocal(q, given));
}

// Nguồn "static" chấm ở client nên không có điểm để ghi — chế độ từng câu vẫn
// dùng được, chỉ là không vào bảng xếp hạng. Đúng như chế độ làm cả bài.
function finish(picks) {
  return quiz.value.origin === "db"
    ? recordAttempt(quiz.value, picks)
    : Promise.resolve();
}
</script>

<template>
  <div v-if="status === 'loading'" class="qz-shell">Đang tải câu hỏi…</div>

  <div v-else-if="status === 'error'" class="qz-shell">
    Không tải được quiz: {{ failure }}
    <button class="qz-retry" @click="load">Thử lại</button>
  </div>

  <QuizRunner
    v-else-if="quiz"
    :title="quiz.title"
    :pass="quiz.pass"
    :questions="quiz.questions"
    :generated="quiz.generated"
    :reviewed="quiz.reviewed"
    :shuffle="quiz.shuffle"
    :store-key="`quiz:${lessonPath}`"
    :grade="grade"
    :grade-one="gradeOne"
    :finish="finish" />
</template>

<style scoped>
.qz-shell {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 32px 0;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.qz-retry {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.qz-retry:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
</style>
