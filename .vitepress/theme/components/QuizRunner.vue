<script setup>
import {computed, ref, onMounted, watch} from "vue";

// Chỉ lo việc làm bài: hiện câu hỏi, thu câu trả lời, gọi hàm chấm được truyền
// vào, hiện kết quả. Không biết quiz đến từ file, từ DB hay từ hàng đợi ôn tập
// — nhờ vậy trang bài học và trang ôn tập chéo dùng chung một giao diện.
const props = defineProps({
  title: {type: String, required: true},
  pass: {type: Number, default: 70},
  questions: {type: Array, required: true},
  // async (picks, {drill}) => {[id]: {correct, answer, explanationHtml}}
  grade: {type: Function, required: true},
  generated: {type: String, default: null},
  reviewed: {type: Boolean, default: false},
  // Khoá localStorage để nhớ câu sai; để trống thì không nhớ gì.
  storeKey: {type: String, default: ""},
  emptyText: {type: String, default: ""}
});

const emit = defineEmits(["graded"]);

const all = computed(() => props.questions);

// null = làm cả bài; mảng id = đang luyện lại riêng những câu đã sai.
const drill = ref(null);
const shown = computed(() =>
  drill.value ? all.value.filter((q) => drill.value.includes(q.id)) : all.value
);

const picks = ref({});
const order = ref({});     // {id: number[]} — thứ tự đáp án đang hiển thị
const results = ref({});   // {id: {correct, answer, explanationHtml}}
const graded = computed(() => Object.keys(results.value).length > 0);
const last = ref(null);
const busy = ref(false);
const failure = ref("");
const mounted = ref(false);

function shuffle(n) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// mix=false cho lần render đầu: server và client phải ra cùng thứ tự, nếu không
// hydration sẽ lệch. Trộn thật diễn ra sau khi mount.
function start(ids = null, mix = true) {
  drill.value = ids;
  picks.value = {};
  results.value = {};
  failure.value = "";
  order.value = Object.fromEntries(
    shown.value.map((q) => [
      q.id,
      q.options ? (mix ? shuffle(q.options.length) : q.options.map((_, i) => i)) : []
    ])
  );
}

start(null, false);

function restore() {
  if (!props.storeKey) return;
  try {
    const raw = localStorage.getItem(props.storeKey);
    const rec = raw ? JSON.parse(raw) : null;
    if (!rec) return;
    // Đề sửa lại thì id câu hỏi có thể biến mất — bỏ id lạ đi.
    rec.wrong = (rec.wrong || []).filter((id) => all.value.some((q) => q.id === id));
    last.value = rec;
  } catch {}
}

onMounted(() => {
  mounted.value = true;
  restore();
  start(null, true);
});

// Danh sách câu hỏi đổi (ví dụ nạp lượt ôn tập mới) thì làm lại từ đầu.
watch(
  () => props.questions,
  () => {
    last.value = null;
    restore();
    start(null, mounted.value);
  }
);

function chosen(q, i) {
  return (picks.value[q.id] || []).includes(i);
}

function toggle(q, i) {
  if (graded.value) return;
  if (q.type === "multi") {
    const cur = picks.value[q.id] || [];
    picks.value[q.id] = cur.includes(i) ? cur.filter((v) => v !== i) : [...cur, i];
  } else {
    picks.value[q.id] = [i];
  }
}

function verdict(q) {
  return results.value[q.id] || null;
}
function isCorrect(q) {
  return verdict(q)?.correct === true;
}
function answerOf(q) {
  return verdict(q)?.answer ?? [];
}

function optClass(q, i) {
  if (!graded.value) return chosen(q, i) ? "on" : "";
  if (answerOf(q).includes(i)) return "key";
  return chosen(q, i) ? "miss" : "";
}

function keyOf(q) {
  const a = answerOf(q);
  return q.options ? a.map((i) => q.options[i]).join(" · ") : String(a[0] ?? "");
}

const unanswered = computed(
  () =>
    shown.value.filter((q) => {
      const p = picks.value[q.id];
      return q.type === "fill" || q.type === "output"
        ? !String(p || "").trim()
        : !(p && p.length);
    }).length
);

const wrong = computed(() => shown.value.filter((q) => !isCorrect(q)).map((q) => q.id));
const score = computed(() =>
  shown.value.length
    ? Math.round(((shown.value.length - wrong.value.length) / shown.value.length) * 100)
    : 0
);
const passed = computed(() => score.value >= props.pass);

function save() {
  if (!props.storeKey) return;
  // Đang luyện câu sai thì chỉ cập nhật những câu vừa làm, giữ nguyên phần còn
  // lại của danh sách — không "chữa" hộ câu chưa làm lại.
  const list = new Set(last.value?.wrong || []);
  if (drill.value) {
    for (const q of shown.value) {
      if (isCorrect(q)) list.delete(q.id);
      else list.add(q.id);
    }
  } else {
    list.clear();
    for (const id of wrong.value) list.add(id);
  }

  const rec = {
    score: drill.value ? (last.value?.score ?? score.value) : score.value,
    wrong: [...list],
    total: all.value.length,
    at: Date.now()
  };
  last.value = rec;
  try {
    localStorage.setItem(props.storeKey, JSON.stringify(rec));
  } catch {}
}

async function submit() {
  if (busy.value) return;
  busy.value = true;
  failure.value = "";
  try {
    // Câu bỏ trống vẫn gửi (giá trị null) để bị tính là sai; câu không thuộc
    // lượt luyện lại thì không có mặt trong payload.
    const payload = {};
    for (const q of shown.value) payload[q.id] = picks.value[q.id] ?? null;

    results.value = await props.grade(payload, {drill: Boolean(drill.value)});
    save();
    // Bài vừa chấm là lúc bảng xếp hạng đổi — báo ra ngoài để nơi nào đang
    // hiển thị nó biết mà nạp lại.
    emit("graded", {score: score.value, passed: passed.value});
  } catch (e) {
    failure.value = "Không chấm được bài: " + String(e?.message || e);
  } finally {
    busy.value = false;
  }
}

defineExpose({restart: () => start(null, mounted.value)});
</script>

<template>
  <div class="qz">
    <div class="qz-head">
      <div>
        <div class="qz-title">{{ title }}</div>
        <div class="qz-sub">
          {{ shown.length }} câu · đạt từ {{ pass }}%
          <span
            v-if="generated && !reviewed"
            class="qz-tag"
            :title="`Sinh bằng ${generated}, chưa ai duyệt lại`">
            máy sinh
          </span>
          <template v-if="mounted && last">
            · lần trước {{ last.score }}%<template v-if="last.wrong.length">, còn
              {{ last.wrong.length }} câu sai</template>
          </template>
        </div>
      </div>
      <button
        v-if="mounted && !graded && !drill && last && last.wrong.length"
        class="qz-btn"
        @click="start(last.wrong)">
        Luyện {{ last.wrong.length }} câu sai
      </button>
    </div>

    <p v-if="!shown.length" class="qz-state">{{ emptyText || "Đề này chưa có câu hỏi." }}</p>

    <ol v-else class="qz-list">
      <li
        v-for="(q, qi) in shown"
        :key="q.id"
        class="qz-q"
        :class="graded ? (isCorrect(q) ? 'ok' : 'bad') : ''">
        <div class="qz-num">Câu {{ qi + 1 }}</div>
        <div class="qz-prompt" v-html="q.promptHtml"></div>
        <div v-if="q.type === 'multi'" class="qz-hint">Chọn tất cả đáp án đúng</div>

        <div v-if="q.options" class="qz-opts">
          <label
            v-for="i in order[q.id] || []"
            :key="i"
            class="qz-opt"
            :class="optClass(q, i)">
            <input
              :type="q.type === 'multi' ? 'checkbox' : 'radio'"
              :name="`qz-${q.id}`"
              :checked="chosen(q, i)"
              :disabled="graded"
              @change="toggle(q, i)" />
            <span v-html="q.optionsHtml[i]"></span>
          </label>
        </div>

        <textarea
          v-else
          class="qz-input"
          :class="{mono: q.type === 'output'}"
          :rows="q.type === 'output' ? 3 : 1"
          :disabled="graded"
          spellcheck="false"
          :placeholder="q.type === 'output' ? 'Output bạn nghĩ sẽ in ra…' : 'Câu trả lời…'"
          :value="picks[q.id] || ''"
          @input="picks[q.id] = $event.target.value"></textarea>

        <div v-if="graded" class="qz-why">
          <div class="qz-verdict">
            <template v-if="isCorrect(q)">✓ Đúng</template>
            <template v-else>✗ Sai — đáp án: <b>{{ keyOf(q) }}</b></template>
          </div>
          <div
            v-if="verdict(q)?.explanationHtml"
            class="qz-why-body"
            v-html="verdict(q).explanationHtml"></div>
        </div>
      </li>
    </ol>

    <div v-if="shown.length" class="qz-foot">
      <button v-if="!graded" class="qz-btn primary" :disabled="busy" @click="submit">
        {{ busy ? "Đang chấm…" : "Kiểm tra" }}
      </button>
      <template v-else>
        <span class="qz-score" :class="passed ? 'ok' : 'bad'">
          {{ score }}% — {{ passed ? "đạt" : "chưa đạt" }}
        </span>
        <button class="qz-btn" @click="start(null)">Làm lại cả bài</button>
        <button v-if="wrong.length" class="qz-btn" @click="start(wrong)">
          Luyện {{ wrong.length }} câu sai
        </button>
      </template>
      <span v-if="!graded && unanswered" class="qz-note">
        còn {{ unanswered }} câu chưa trả lời
      </span>
      <span v-if="failure" class="qz-err">{{ failure }}</span>
    </div>
  </div>
</template>

<style scoped>
.qz {
  margin: 32px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}
.qz-state {padding: 14px; margin: 0; font-size: 14px; color: var(--vp-c-text-2);}
.qz-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.qz-title {font-weight: 600; font-size: 15px; color: var(--vp-c-text-1);}
.qz-sub {font-size: 12.5px; color: var(--vp-c-text-3); margin-top: 2px;}
.qz-tag {
  display: inline-block;
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  cursor: help;
}
.qz-list {list-style: none; margin: 0; padding: 0;}
.qz-q {
  padding: 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.qz-q:last-child {border-bottom: 0;}
.qz-q.ok {background: var(--vp-c-green-soft);}
.qz-q.bad {background: var(--vp-c-red-soft);}
.qz-num {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--vp-c-text-3);
  margin-bottom: 4px;
}
/* v-html không nhận thuộc tính scoped nên phải :deep() để chỉnh lề */
.qz-prompt :deep(p) {margin: 0 0 6px;}
.qz-prompt :deep(p:last-child) {margin-bottom: 0;}
.qz-prompt :deep(div[class*="language-"]) {margin: 8px 0;}
/* Code từ nguồn DB không qua shiki nên phải tự tạo khung cho nó */
.qz-prompt :deep(pre.qz-code),
.qz-why-body :deep(pre.qz-code) {
  margin: 8px 0;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: 6px;
  background: var(--vp-code-block-bg, var(--vp-c-bg-soft));
  font-size: 13px;
  line-height: 1.6;
}
.qz-prompt :deep(pre.qz-code code),
.qz-why-body :deep(pre.qz-code code) {
  padding: 0;
  background: none;
  font-family: var(--vp-font-family-mono);
}
.qz-hint {font-size: 12px; color: var(--vp-c-text-3); margin: 2px 0 0;}
.qz-opts {display: flex; flex-direction: column; gap: 4px; margin-top: 10px;}
.qz-opt {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: border-color .2s, background-color .2s;
}
.qz-opt:hover {border-color: var(--vp-c-brand-1);}
.qz-opt input {margin: 3px 0 0; flex: none; accent-color: var(--vp-c-brand-1);}
.qz-opt.on {border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft);}
.qz-opt.key {border-color: var(--vp-c-green-1); background: var(--vp-c-green-soft);}
.qz-opt.miss {border-color: var(--vp-c-red-1); background: var(--vp-c-red-soft);}
.qz-opt :deep(code) {font-size: 13px;}
.qz-opt :deep(p) {margin: 0;}
.qz-input {
  width: 100%;
  margin-top: 10px;
  padding: 7px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}
.qz-input:focus {border-color: var(--vp-c-brand-1);}
.qz-input.mono {font-family: var(--vp-font-family-mono); font-size: 13px; tab-size: 2;}
.qz-why {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider);
  font-size: 14px;
}
.qz-verdict {font-weight: 600; margin-bottom: 4px;}
.qz-q.ok .qz-verdict {color: var(--vp-c-green-1);}
.qz-q.bad .qz-verdict {color: var(--vp-c-red-1);}
.qz-why-body {color: var(--vp-c-text-2);}
.qz-why-body :deep(p) {margin: 0 0 6px;}
.qz-why-body :deep(p:last-child) {margin-bottom: 0;}
.qz-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid var(--vp-c-divider);
}
.qz-btn {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.qz-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.qz-btn:disabled {opacity: .6; cursor: default;}
.qz-btn.primary {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.qz-score {font-size: 14px; font-weight: 600; margin-right: 4px;}
.qz-score.ok {color: var(--vp-c-green-1);}
.qz-score.bad {color: var(--vp-c-red-1);}
.qz-note {font-size: 12.5px; color: var(--vp-c-text-3);}
.qz-err {font-size: 12.5px; color: var(--vp-c-danger-1);}
</style>
