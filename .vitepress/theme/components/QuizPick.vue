<script setup>
// Làm một đề "trích" — tập hợp câu hỏi có key cho trước (id ổn định trong
// YAML, ví dụ "ktct-002"), lấy từ nhiều chương khác nhau (ví dụ đề giữa kỳ).
// Đọc lại chính các câu đã có, không phải bản sao: bản sao sẽ mang key khác
// nên hàng đợi ôn tập coi chúng là câu khác và bảng xếp hạng đếm hai lần cùng
// một kiến thức. Giống hệt lý do của QuizBank, chỉ khác là danh sách câu cố
// định thay vì gộp theo tiền tố rồi rút ngẫu nhiên.
import {ref, watch} from "vue";
import QuizRunner from "./QuizRunner.vue";
import {useSession} from "../lib/session";
import {loadByKeys, gradeReview, gradeOneRemote} from "../lib/quiz";

const props = defineProps({
  keys: {type: Array, required: true},
  title: {type: String, required: true},
  pass: {type: Number, default: 70}
});

const {ready, hasSupabase} = useSession();

const questions = ref([]);
const loading = ref(false);
const failure = ref("");

async function load() {
  if (!hasSupabase) return;
  loading.value = true;
  failure.value = "";
  try {
    questions.value = await loadByKeys(props.keys);
  } catch (e) {
    failure.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

watch([ready, () => props.keys], () => ready.value && load(), {immediate: true});
</script>

<template>
  <div class="pick">
    <ClientOnly>
      <template v-if="hasSupabase">
        <p v-if="failure" class="pick-err">{{ failure }}</p>
        <p v-else-if="loading" class="pick-dim">Đang nạp đề…</p>
        <p v-else-if="!questions.length" class="pick-dim">Chưa nạp được câu nào.</p>
        <template v-else>
          <p v-if="questions.length < keys.length" class="pick-warn">
            Thiếu {{ keys.length - questions.length }}/{{ keys.length }} câu — có thể vài câu
            trong đề chưa được nạp vào cơ sở dữ liệu.
          </p>
          <QuizRunner
            :title="title"
            :pass="pass"
            :questions="questions"
            :shuffle="false"
            :grade="(picks) => gradeReview(picks)"
            :grade-one="(q, given) => gradeOneRemote(q.id, given)" />
        </template>
      </template>
      <p v-else class="pick-dim">Chưa cấu hình Supabase nên chưa làm được bài ở đây.</p>
    </ClientOnly>
  </div>
</template>

<style scoped>
.pick {margin: 24px 0;}
.pick-dim {color: var(--vp-c-text-3); font-size: 14px;}
.pick-err {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
  font-size: 13px;
}
.pick-warn {
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: var(--vp-c-yellow-soft, var(--vp-c-warning-soft));
  color: var(--vp-c-text-2);
  font-size: 12.5px;
}
</style>
