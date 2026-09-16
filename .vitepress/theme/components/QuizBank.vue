<script setup>
// Làm cả ngân hàng câu hỏi trong một lượt, thay vì từng chương một.
//
// Câu hỏi đọc lại từ chính các đề đã có, không phải bản sao: bản sao sẽ mang id
// khác, nên hàng đợi ôn tập coi chúng là câu khác và cùng một kiến thức bị đếm
// hai lần trên bảng xếp hạng.
//
// Hệ quả của việc đó: một lượt ở đây trải trên nhiều đề nên không có đề nào để
// ghi điểm — giống hệt ôn tập chéo. Điểm vẫn hiện ngay sau khi chấm, chỉ là
// không vào bảng xếp hạng; muốn lên hạng thì làm từng chương.
import {ref, computed, watch} from "vue";
import QuizRunner from "./QuizRunner.vue";
import {useSession} from "../lib/session";
import {loadBank, gradeReview, gradeOneRemote} from "../lib/quiz";

const props = defineProps({
  // Tiền tố slug của các đề gộp vào, ví dụ "notes/ktct/".
  prefix: {type: String, required: true},
  title: {type: String, default: "Làm cả bộ đề"}
});

const {ready, hasSupabase} = useSession();

const pool = ref([]);
const loading = ref(false);
const failure = ref("");

// null = tất cả. Các mốc còn lại để thi thử cho vừa một buổi.
const size = ref(null);
const running = ref(false);
const picked = ref([]);
const seed = ref(0);

const sizes = computed(() => [30, 50, 100].filter((n) => n < pool.value.length));

async function load() {
  if (!hasSupabase) return;
  loading.value = true;
  failure.value = "";
  try {
    pool.value = await loadBank(props.prefix);
  } catch (e) {
    failure.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

watch([ready, () => props.prefix], () => ready.value && load(), {immediate: true});

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function start() {
  // Làm tất cả thì giữ nguyên thứ tự đề gốc để còn dò ngược được; rút một phần
  // thì phải trộn, nếu không lần nào cũng đúng 30 câu đầu của chương đầu.
  picked.value = size.value ? shuffled(pool.value).slice(0, size.value) : pool.value;
  seed.value += 1;
  running.value = true;
}
</script>

<template>
  <div class="bank">
    <ClientOnly>
      <template v-if="hasSupabase">
        <p v-if="failure" class="bank-err">{{ failure }}</p>
        <p v-else-if="loading" class="bank-dim">Đang nạp ngân hàng câu hỏi…</p>
        <p v-else-if="!pool.length" class="bank-dim">
          Chưa nạp đề nào vào cơ sở dữ liệu.
        </p>

        <template v-else>
          <div v-if="!running" class="bank-setup">
            <div class="bank-count">
              <b>{{ pool.length }}</b> câu trong ngân hàng
            </div>
            <div class="bank-sizes" role="group" aria-label="Số câu mỗi lượt">
              <button
                v-for="n in sizes"
                :key="n"
                class="bank-size"
                :class="{on: size === n}"
                @click="size = n">
                {{ n }} câu
              </button>
              <button class="bank-size" :class="{on: size === null}" @click="size = null">
                Tất cả
              </button>
            </div>
            <button class="bank-go" @click="start">Bắt đầu</button>
            <p class="bank-note">
              Rút ngẫu nhiên thì câu được trộn từ mọi chương; làm tất cả thì giữ
              nguyên thứ tự đề gốc. Câu sai vẫn được hẹn ôn lại như thường, nhưng
              lượt ở đây <b>không tính vào bảng xếp hạng</b> vì nó trải trên
              nhiều đề — muốn lên hạng thì làm theo từng chương.
            </p>
          </div>

          <template v-else>
            <div class="bank-bar">
              <b>{{ picked.length }} câu</b>
              <span class="bank-grow"></span>
              <button class="bank-btn" @click="running = false">← Chọn lại số câu</button>
            </div>
            <!-- key đổi mỗi lượt để QuizRunner dựng lại từ đầu, không giữ kết
                 quả của lượt trước. -->
            <QuizRunner
              :key="seed"
              :title="title"
              :pass="70"
              :questions="picked"
              :shuffle="false"
              :grade="(picks) => gradeReview(picks)"
              :grade-one="(q, given) => gradeOneRemote(q.id, given)" />
          </template>
        </template>
      </template>
      <p v-else class="bank-dim">Chưa cấu hình Supabase nên chưa làm được bài ở đây.</p>
    </ClientOnly>
  </div>
</template>

<style scoped>
.bank {margin: 24px 0;}
.bank-dim {color: var(--vp-c-text-3); font-size: 14px;}
.bank-err {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
  font-size: 13px;
}
.bank-setup {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}
.bank-count {font-size: 14px; color: var(--vp-c-text-2);}
.bank-count b {color: var(--vp-c-brand-1); font-size: 16px;}
.bank-sizes {display: inline-flex; border: 1px solid var(--vp-c-divider); border-radius: 6px; overflow: hidden;}
.bank-size {padding: 5px 12px; font-size: 13px; color: var(--vp-c-text-3); white-space: nowrap;}
.bank-size + .bank-size {border-left: 1px solid var(--vp-c-divider);}
.bank-size:hover {color: var(--vp-c-brand-1);}
.bank-size.on {background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600;}
.bank-go {
  padding: 5px 16px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
}
.bank-go:hover {background: var(--vp-c-brand-soft);}
.bank-note {
  flex-basis: 100%;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}
.bank-bar {display: flex; gap: 8px; align-items: center; margin-bottom: 8px;}
.bank-grow {flex: 1;}
.bank-btn {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.bank-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
</style>
