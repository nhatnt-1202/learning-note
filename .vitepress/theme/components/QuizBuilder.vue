<script setup>
import {ref, computed, onMounted} from "vue";
import {validateDraft, saveDraft, loadDraft} from "../lib/quiz";

const props = defineProps({
  quizId: {type: String, default: null},
  ownerId: {type: String, required: true},
  // Gợi ý sẵn bài học khi tạo đề từ một trang bài cụ thể
  lessonPath: {type: String, default: ""}
});
const emit = defineEmits(["saved", "cancel"]);

const TYPES = [
  {key: "single", label: "Một đáp án"},
  {key: "multi", label: "Nhiều đáp án"},
  {key: "truefalse", label: "Đúng / Sai"},
  {key: "fill", label: "Điền chữ"},
  {key: "output", label: "Đoán output"}
];

function blank() {
  return {
    key: "",
    type: "single",
    prompt: "",
    options: ["", ""],
    answer: [],
    explanation: "",
    tags: [],
    caseSensitive: false
  };
}

const draft = ref({
  title: "",
  lessonPath: props.lessonPath,
  visibility: "private",
  passScore: 70,
  questions: [blank()]
});

const errors = ref([]);
const busy = ref(false);
const loading = ref(false);

onMounted(async () => {
  if (!props.quizId) return;
  loading.value = true;
  try {
    const found = await loadDraft(props.quizId);
    if (found) draft.value = found.draft;
  } catch (e) {
    errors.value = [String(e?.message || e)];
  } finally {
    loading.value = false;
  }
});

function addQuestion() {
  draft.value.questions.push(blank());
}
function removeQuestion(i) {
  draft.value.questions.splice(i, 1);
}
function move(i, delta) {
  const list = draft.value.questions;
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

// Đổi loại câu thì đáp án cũ vô nghĩa: chỉ số của câu chọn không dùng được cho
// câu điền và ngược lại.
function onTypeChange(q) {
  q.answer = [];
  if (q.type === "fill" || q.type === "output") q.options = [];
  else if (!q.options.length) q.options = ["", ""];
}

function isTextType(q) {
  return q.type === "fill" || q.type === "output";
}

function toggleAnswer(q, i) {
  const cur = q.answer;
  if (q.type === "multi") {
    q.answer = cur.includes(i) ? cur.filter((v) => v !== i) : [...cur, i].sort((a, b) => a - b);
  } else {
    q.answer = [i];
  }
}

function tagsText(q) {
  return q.tags.join(", ");
}
function setTags(q, value) {
  q.tags = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function answersText(q) {
  return (q.answer || []).join("\n");
}
function setAnswersText(q, value) {
  q.answer = value.split("\n");
}

const canSave = computed(() => !busy.value && !loading.value);

async function save() {
  errors.value = validateDraft(draft.value);
  if (errors.value.length) return;

  busy.value = true;
  try {
    const id = await saveDraft(draft.value, props.ownerId, props.quizId);
    emit("saved", id);
  } catch (e) {
    // Trigger trong DB cũng kiểm tra lần nữa — lỗi ở đây thường là thứ mà
    // validateDraft chưa bắt được.
    errors.value = [String(e?.message || e)];
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="qb">
    <div class="qb-head">
      <b>{{ quizId ? "Sửa đề" : "Đề mới" }}</b>
      <span v-if="loading" class="qb-dim">đang nạp…</span>
      <span class="qb-grow"></span>
      <button class="qb-btn" @click="emit('cancel')">Đóng</button>
      <button class="qb-btn primary" :disabled="!canSave" @click="save">
        {{ busy ? "Đang lưu…" : "Lưu đề" }}
      </button>
    </div>

    <ul v-if="errors.length" class="qb-errors">
      <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
    </ul>

    <div class="qb-grid">
      <label class="qb-field">
        <span>Tiêu đề</span>
        <input v-model="draft.title" placeholder="Kiểm tra bài 6 — Nền tảng cú pháp" />
      </label>
      <label class="qb-field">
        <span>Gắn với bài học</span>
        <input v-model="draft.lessonPath" placeholder="notes/web/06-javascript-can-ban" />
      </label>
      <label class="qb-field">
        <span>Ai xem được</span>
        <select v-model="draft.visibility">
          <option value="private">Chỉ tôi</option>
          <option value="unlisted">Ai có link</option>
          <option value="public">Công khai</option>
        </select>
      </label>
      <label class="qb-field">
        <span>Điểm đạt (%)</span>
        <input v-model.number="draft.passScore" type="number" min="0" max="100" />
      </label>
    </div>

    <ol class="qb-list">
      <li v-for="(q, i) in draft.questions" :key="i" class="qb-q">
        <div class="qb-q-head">
          <b>Câu {{ i + 1 }}</b>
          <select v-model="q.type" @change="onTypeChange(q)">
            <option v-for="t in TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
          <input v-model="q.key" class="qb-key" placeholder="mã câu (tuỳ chọn)" />
          <span class="qb-grow"></span>
          <button class="qb-icon" title="Lên" @click="move(i, -1)">↑</button>
          <button class="qb-icon" title="Xuống" @click="move(i, 1)">↓</button>
          <button class="qb-icon" title="Xoá" @click="removeQuestion(i)">✕</button>
        </div>

        <textarea
          v-model="q.prompt"
          class="qb-area"
          rows="3"
          placeholder="Nội dung câu hỏi. Dùng được `code`, **đậm** và khối ```code```."></textarea>

        <template v-if="q.type === 'truefalse'">
          <div class="qb-tf">
            <label>
              <input type="radio" :checked="q.answer[0] === 0" @change="q.answer = [0]" />
              Đúng
            </label>
            <label>
              <input type="radio" :checked="q.answer[0] === 1" @change="q.answer = [1]" />
              Sai
            </label>
          </div>
        </template>

        <template v-else-if="isTextType(q)">
          <textarea
            class="qb-area mono"
            rows="3"
            :value="answersText(q)"
            placeholder="Mỗi dòng là một cách trả lời được tính đúng"
            @input="setAnswersText(q, $event.target.value)"></textarea>
          <label class="qb-check">
            <input v-model="q.caseSensitive" type="checkbox" />
            Phân biệt hoa thường
          </label>
        </template>

        <template v-else>
          <div class="qb-opts">
            <div v-for="(_, oi) in q.options" :key="oi" class="qb-opt">
              <input
                :type="q.type === 'multi' ? 'checkbox' : 'radio'"
                :name="`ans-${i}`"
                :checked="q.answer.includes(oi)"
                title="Đánh dấu là đáp án đúng"
                @change="toggleAnswer(q, oi)" />
              <input v-model="q.options[oi]" :placeholder="`Phương án ${oi + 1}`" />
              <button
                class="qb-icon"
                title="Bỏ phương án"
                @click="q.options.splice(oi, 1); q.answer = q.answer.filter((v) => v !== oi).map((v) => (v > oi ? v - 1 : v))">
                ✕
              </button>
            </div>
            <button class="qb-btn" @click="q.options.push('')">+ phương án</button>
          </div>
        </template>

        <textarea
          v-model="q.explanation"
          class="qb-area"
          rows="2"
          placeholder="Vì sao đáp án đó đúng — phần này mới là chỗ người học nhận ra mình sai ở đâu"></textarea>

        <input
          class="qb-tags"
          :value="tagsText(q)"
          placeholder="thẻ, cách nhau bằng dấu phẩy"
          @input="setTags(q, $event.target.value)" />
      </li>
    </ol>

    <button class="qb-btn" @click="addQuestion">+ Thêm câu hỏi</button>
  </div>
</template>

<style scoped>
.qb {
  margin: 20px 0;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  font-size: 14px;
}
.qb-head {display: flex; gap: 8px; align-items: center; margin-bottom: 10px;}
.qb-grow {flex: 1;}
.qb-dim {color: var(--vp-c-text-3); font-size: 13px;}
.qb-errors {
  margin: 0 0 12px;
  padding: 8px 12px 8px 28px;
  border-radius: 6px;
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
  font-size: 13px;
}
.qb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.qb-field {display: flex; flex-direction: column; gap: 4px;}
.qb-field > span {font-size: 12px; color: var(--vp-c-text-3);}
.qb-list {list-style: none; margin: 0; padding: 0;}
.qb-q {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
}
.qb-q-head {display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px;}
.qb-key {max-width: 160px;}
.qb-area {width: 100%; margin-bottom: 8px; resize: vertical;}
.qb-area.mono {font-family: var(--vp-font-family-mono); font-size: 13px;}
.qb-opts {display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;}
.qb-opt {display: flex; gap: 8px; align-items: center;}
.qb-opt > input[type="text"], .qb-opt > input:not([type]) {flex: 1;}
.qb-tf {display: flex; gap: 16px; margin-bottom: 8px;}
.qb-tf label, .qb-check {display: flex; gap: 6px; align-items: center; font-size: 13px;}
.qb-check {margin-bottom: 8px; color: var(--vp-c-text-2);}
.qb-tags {width: 100%;}
.qb input, .qb select, .qb textarea {
  padding: 5px 9px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
}
.qb input[type="radio"], .qb input[type="checkbox"] {
  padding: 0;
  accent-color: var(--vp-c-brand-1);
}
.qb input:focus, .qb select:focus, .qb textarea:focus {border-color: var(--vp-c-brand-1);}
.qb-btn {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.qb-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.qb-btn:disabled {opacity: .6; cursor: default;}
.qb-btn.primary {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600;}
.qb-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 12px;
  line-height: 1;
}
.qb-icon:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
</style>
