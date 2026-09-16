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
  // async (question, given) => {correct, answer, explanationHtml}
  // Thiếu hàm này thì không có chế độ làm từng câu — vì chấm một câu bằng
  // `grade` sẽ kéo về đáp án của cả đề.
  gradeOne: {type: Function, default: null},
  // async (picks) => void — ghi điểm sau khi làm xong lượt từng câu.
  finish: {type: Function, default: null},
  generated: {type: String, default: null},
  reviewed: {type: Boolean, default: false},
  // Khoá localStorage để nhớ câu sai; để trống thì không nhớ gì.
  storeKey: {type: String, default: ""},
  emptyText: {type: String, default: ""}
});

const emit = defineEmits(["graded"]);

const all = computed(() => props.questions);

// "all" = hiện cả bài rồi chấm một lượt; "step" = mỗi lần một câu, chấm ngay.
const mode = ref("all");
const cursor = ref(0);
// Đã đi hết lượt từng câu: lúc này hiện lại toàn bộ để xem lại.
const finished = ref(false);

// null = làm cả bài; mảng id = đang luyện lại riêng những câu đã sai.
const drill = ref(null);
const shown = computed(() =>
  drill.value ? all.value.filter((q) => drill.value.includes(q.id)) : all.value
);

const picks = ref({});
const order = ref({});     // {id: number[]} — thứ tự đáp án đang hiển thị
const results = ref({});   // {id: {correct, answer, explanationHtml}}

// Ở chế độ từng câu, mỗi câu được chấm vào một thời điểm khác nhau, nên "đã
// chấm" phải hỏi theo từng câu chứ không còn là một cờ chung của cả bài.
function isGraded(q) {
  return results.value[q.id] !== undefined;
}
const allGraded = computed(
  () => shown.value.length > 0 && shown.value.every(isGraded)
);

const stepMode = computed(() => mode.value === "step" && Boolean(props.gradeOne));
// Đã chấm câu nào thì khoá việc đổi chế độ: đổi là làm lại từ đầu, và mất bài
// đang làm dở mà không báo trước là chuyện không nên xảy ra.
const started = computed(() => Object.keys(results.value).length > 0);
const current = computed(() => shown.value[cursor.value] ?? null);
// Đang đi từng câu thì chỉ hiện câu hiện tại; đi hết rồi thì hiện lại cả bài.
const visible = computed(() =>
  stepMode.value && !finished.value ? (current.value ? [current.value] : []) : shown.value
);
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
  cursor.value = 0;
  finished.value = false;
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
  if (isGraded(q)) return;
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
  if (!isGraded(q)) return chosen(q, i) ? "on" : "";
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

const wrong = computed(() =>
  shown.value.filter((q) => isGraded(q) && !isCorrect(q)).map((q) => q.id)
);
const rightCount = computed(() => shown.value.filter((q) => isCorrect(q)).length);
// Mẫu số là cả lượt, không phải số câu đã chấm: bỏ dở nửa chừng thì điểm phải
// phản ánh việc bỏ dở, không được làm tròn thành "đúng hết phần đã làm".
const score = computed(() =>
  shown.value.length
    ? Math.round(
        (shown.value.filter((q) => isCorrect(q)).length / shown.value.length) * 100
      )
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

// ── Chế độ làm từng câu ─────────────────────────────────────────────────────

function pickOf(q) {
  return picks.value[q.id] ?? null;
}

function answered(q) {
  const p = pickOf(q);
  return q.type === "fill" || q.type === "output"
    ? String(p || "").trim() !== ""
    : Array.isArray(p) && p.length > 0;
}

/** Chấm câu đang hiện. Bỏ trống vẫn chấm được — và vẫn tính là sai. */
async function checkOne() {
  const q = current.value;
  if (!q || busy.value || isGraded(q)) return;
  busy.value = true;
  failure.value = "";
  try {
    results.value = {...results.value, [q.id]: await props.gradeOne(q, pickOf(q))};
  } catch (e) {
    failure.value = "Không chấm được câu này: " + String(e?.message || e);
  } finally {
    busy.value = false;
  }
}

async function next() {
  if (cursor.value < shown.value.length - 1) {
    cursor.value += 1;
    return;
  }
  // Câu cuối: chốt lượt. Điểm ghi một lần ở đây chứ không ghi sau mỗi câu —
  // một lượt làm bài là một attempt, dù nó được chấm làm bao nhiêu lần.
  finished.value = true;
  save();
  // Luyện lại một phần bài thì không ghi điểm: điểm của vài câu không nói lên
  // gì về cả đề. Giống hệt cách chế độ làm cả bài xử lý drill.
  if (props.finish && !drill.value) {
    busy.value = true;
    try {
      await props.finish(picks.value);
    } catch (e) {
      failure.value = "Không lưu được điểm: " + String(e?.message || e);
    } finally {
      busy.value = false;
    }
  }
  emit("graded", {score: score.value, passed: passed.value});
}

function setMode(m) {
  if (mode.value === m) return;
  mode.value = m;
  start(drill.value, mounted.value);
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
      <div class="qz-head-right">
        <div v-if="mounted && gradeOne" class="qz-modes" role="group">
          <button
            class="qz-mode"
            :class="{on: !stepMode}"
            :aria-pressed="!stepMode"
            :disabled="started"
            :title="started ? 'Làm lại cả bài trước khi đổi chế độ' : ''"
            @click="setMode('all')">
            Cả bài
          </button>
          <button
            class="qz-mode"
            :class="{on: stepMode}"
            :aria-pressed="stepMode"
            :disabled="started"
            :title="started ? 'Làm lại cả bài trước khi đổi chế độ' : ''"
            @click="setMode('step')">
            Từng câu
          </button>
        </div>
        <button
          v-if="mounted && !allGraded && !drill && last && last.wrong.length"
          class="qz-btn"
          @click="start(last.wrong)">
          Luyện {{ last.wrong.length }} câu sai
        </button>
      </div>
    </div>

    <!-- Thanh tiến độ chỉ có nghĩa khi đi từng câu: ở chế độ cả bài thì cuộn
         trang đã cho biết mình đang ở đâu rồi. -->
    <div v-if="stepMode && !finished && shown.length" class="qz-progress">
      <div class="qz-progress-bar">
        <span :style="{width: `${(cursor / shown.length) * 100}%`}"></span>
      </div>
      <div class="qz-progress-text">
        Câu {{ cursor + 1 }}/{{ shown.length }}
        <span v-if="rightCount" class="ok">· đúng {{ rightCount }}</span>
        <span v-if="wrong.length" class="bad">· sai {{ wrong.length }}</span>
      </div>
    </div>

    <p v-if="!shown.length" class="qz-state">{{ emptyText || "Đề này chưa có câu hỏi." }}</p>

    <ol v-else class="qz-list">
      <li
        v-for="q in visible"
        :key="q.id"
        class="qz-q"
        :class="isGraded(q) ? (isCorrect(q) ? 'ok' : 'bad') : ''">
        <div class="qz-num">Câu {{ shown.indexOf(q) + 1 }}</div>
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
              :disabled="isGraded(q)"
              @change="toggle(q, i)" />
            <span v-html="q.optionsHtml[i]"></span>
          </label>
        </div>

        <textarea
          v-else
          class="qz-input"
          :class="{mono: q.type === 'output'}"
          :rows="q.type === 'output' ? 3 : 1"
          :disabled="isGraded(q)"
          spellcheck="false"
          :placeholder="q.type === 'output' ? 'Output bạn nghĩ sẽ in ra…' : 'Câu trả lời…'"
          :value="picks[q.id] || ''"
          @input="picks[q.id] = $event.target.value"></textarea>

        <div v-if="isGraded(q)" class="qz-why">
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
      <!-- Làm từng câu: chấm câu đang hiện, rồi mới sang câu sau -->
      <template v-if="stepMode && !finished">
        <button
          v-if="current && !isGraded(current)"
          class="qz-btn primary"
          :disabled="busy"
          @click="checkOne">
          {{ busy ? "Đang chấm…" : "Kiểm tra câu này" }}
        </button>
        <button v-else class="qz-btn primary" :disabled="busy" @click="next">
          {{ cursor < shown.length - 1 ? "Câu tiếp →" : "Xem kết quả" }}
        </button>
        <span v-if="current && !isGraded(current) && !answered(current)" class="qz-note">
          chưa chọn đáp án — kiểm tra luôn thì tính là sai
        </span>
      </template>

      <!-- Làm cả bài: một nút nộp cho toàn bộ -->
      <button
        v-else-if="!allGraded"
        class="qz-btn primary"
        :disabled="busy"
        @click="submit">
        {{ busy ? "Đang chấm…" : "Kiểm tra" }}
      </button>

      <template v-if="allGraded || finished">
        <span class="qz-score" :class="passed ? 'ok' : 'bad'">
          {{ score }}% — {{ passed ? "đạt" : "chưa đạt" }}
        </span>
        <button class="qz-btn" @click="start(null)">Làm lại cả bài</button>
        <button v-if="wrong.length" class="qz-btn" @click="start(wrong)">
          Luyện {{ wrong.length }} câu sai
        </button>
      </template>

      <span v-if="!stepMode && !allGraded && unanswered" class="qz-note">
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
.qz-head-right {display: flex; gap: 8px; align-items: center;}

/* Nút đổi chế độ: hai ô dính nhau để thấy ngay đây là một lựa chọn hai đường,
   không phải hai hành động rời. */
.qz-modes {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}
.qz-mode {
  padding: 4px 10px;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.qz-mode + .qz-mode {border-left: 1px solid var(--vp-c-divider);}
.qz-mode:hover {color: var(--vp-c-brand-1);}
.qz-mode.on {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.qz-mode:disabled {opacity: 0.45; cursor: not-allowed;}
.qz-mode:disabled:hover {color: var(--vp-c-text-3);}
.qz-mode.on:disabled:hover {color: var(--vp-c-brand-1);}

.qz-progress {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.qz-progress-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--vp-c-default-soft);
  overflow: hidden;
}
.qz-progress-bar span {
  display: block;
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.2s ease;
}
.qz-progress-text {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.qz-progress-text .ok {color: var(--vp-c-green-1);}
.qz-progress-text .bad {color: var(--vp-c-red-1);}

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
