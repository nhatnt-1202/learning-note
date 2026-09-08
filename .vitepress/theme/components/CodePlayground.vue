<script setup>
import {ref, computed, watch, onMounted, onBeforeUnmount, nextTick} from "vue";

const props = defineProps({
  html: {type: String, default: ""},
  css: {type: String, default: ""},
  js: {type: String, default: ""},
  title: {type: String, default: "Thử ngay"},
  height: {type: [String, Number], default: 260},
  // "web"  -> hiện khung xem trước (mặc định)
  // "js"   -> chỉ hiện console, dùng cho bài JavaScript thuần
  mode: {type: String, default: "web"},
  console: {type: Boolean, default: null}
});

const initial = {html: props.html, css: props.css, js: props.js};
const code = ref({...initial});

// Chỉ hiện tab của những ngôn ngữ thực sự có nội dung ban đầu.
// Bài JS thuần thì luôn cho sửa cả HTML để học viên tự thêm phần tử.
const tabs = computed(() => {
  const t = [];
  if (initial.html || props.mode === "web") t.push({key: "html", label: "HTML"});
  if (initial.css) t.push({key: "css", label: "CSS"});
  if (initial.js || props.mode === "js") t.push({key: "js", label: "JavaScript"});
  return t.length ? t : [{key: "html", label: "HTML"}];
});
const active = ref(tabs.value[0].key);

const showConsole = computed(() =>
  props.console === null ? props.mode === "js" : props.console
);
const showPreview = computed(() => props.mode !== "js");

const frame = ref(null);
const logs = ref([]);
const runId = ref(0);
const dirty = ref(false);
const boxHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height
);

// Cầu nối console/error từ iframe về trang. iframe chạy trong sandbox không có
// allow-same-origin nên chỉ nói chuyện được qua postMessage.
const BRIDGE = `<script>
(function () {
  var send = function (level, args) {
    try {
      parent.postMessage({__playground: true, level: level, text: Array.prototype.map.call(args, function (a) {
        if (a instanceof Error) return a.stack || (a.name + ': ' + a.message);
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(' ')}, '*');
    } catch (e) {}
  };
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var original = console[level];
    console[level] = function () { send(level, arguments); original.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) { send('error', [e.message + ' (dòng ' + e.lineno + ')']); });
  window.addEventListener('unhandledrejection', function (e) { send('error', ['Promise bị reject: ' + e.reason]); });
})();
<\/script>`;

function buildDoc(c) {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${BRIDGE}
<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:12px;color:#213547;background:#fff}</style>
<style>${c.css}</style>
</head>
<body>
${c.html}
<script>${c.js}<\/script>
</body>
</html>`;
}

const srcdoc = ref("");

function run() {
  logs.value = [];
  runId.value++;
  srcdoc.value = buildDoc(code.value);
  dirty.value = false;
}

function reset() {
  code.value = {...initial};
  run();
}

function openInNewTab() {
  const blob = new Blob([buildDoc(code.value)], {type: "text/html"});
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function onMessage(e) {
  const d = e.data;
  if (d && d.__playground) logs.value.push({level: d.level, text: d.text});
}

// Tab trong textarea phải chèn 2 dấu cách chứ không nhảy focus — nếu không thì
// không gõ nổi code lồng nhau.
function onKeydown(e) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const el = e.target;
  const {selectionStart: s, selectionEnd: en, value} = el;
  el.value = value.slice(0, s) + "  " + value.slice(en);
  el.selectionStart = el.selectionEnd = s + 2;
  code.value[active.value] = el.value;
}

watch(code, () => (dirty.value = true), {deep: true});

onMounted(() => {
  window.addEventListener("message", onMessage);
  run();
});
onBeforeUnmount(() => window.removeEventListener("message", onMessage));
</script>

<template>
  <div class="pg">
    <div class="pg-bar">
      <div class="pg-tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="pg-tab"
          :class="{on: active === t.key}"
          @click="active = t.key">
          {{ t.label }}
        </button>
      </div>
      <div class="pg-actions">
        <span class="pg-title">{{ title }}</span>
        <button class="pg-btn primary" :class="{pulse: dirty}" @click="run">▶ Chạy</button>
        <button class="pg-btn" @click="reset">↺ Đặt lại</button>
        <button class="pg-btn" @click="openInNewTab">↗ Tab mới</button>
      </div>
    </div>

    <div class="pg-body" :class="{split: showPreview}">
      <textarea
        class="pg-editor"
        :style="{height: boxHeight}"
        spellcheck="false"
        v-model="code[active]"
        @keydown="onKeydown"></textarea>

      <div v-if="showPreview" class="pg-preview" :style="{height: boxHeight}">
        <ClientOnly>
          <iframe
            ref="frame"
            :key="runId"
            :srcdoc="srcdoc"
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            title="Kết quả"></iframe>
        </ClientOnly>
      </div>
    </div>

    <div v-if="showConsole" class="pg-console">
      <div class="pg-console-head">Console</div>
      <div class="pg-console-body">
        <ClientOnly>
          <iframe
            v-if="!showPreview"
            :key="'js-' + runId"
            :srcdoc="srcdoc"
            sandbox="allow-scripts allow-modals"
            class="pg-hidden-frame"
            title="Runner"></iframe>
        </ClientOnly>
        <p v-if="!logs.length" class="pg-empty">Chưa có output. Dùng <code>console.log(...)</code> rồi bấm Chạy.</p>
        <pre v-for="(l, i) in logs" :key="i" class="pg-log" :class="l.level">{{ l.text }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg {
  margin: 20px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}
.pg-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.pg-tabs {display: flex; gap: 4px;}
.pg-tab {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 5px;
  color: var(--vp-c-text-2);
  transition: color .2s, background-color .2s;
}
.pg-tab.on {color: var(--vp-c-brand-1); background: var(--vp-c-default-soft);}
.pg-actions {display: flex; gap: 6px; align-items: center;}
.pg-title {font-size: 12px; color: var(--vp-c-text-3); margin-right: 4px;}
.pg-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.pg-btn:hover {border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1);}
.pg-btn.primary {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pg-btn.pulse {background: var(--vp-c-brand-soft);}
.pg-body {display: grid; grid-template-columns: 1fr;}
.pg-body.split {grid-template-columns: 1fr 1fr;}
@media (max-width: 720px) {
  .pg-body.split {grid-template-columns: 1fr;}
}
.pg-editor {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  resize: vertical;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
}
.pg-preview {border-left: 1px solid var(--vp-c-divider); background: #fff;}
@media (max-width: 720px) {
  .pg-preview {border-left: 0; border-top: 1px solid var(--vp-c-divider);}
}
.pg-preview iframe {width: 100%; height: 100%; border: 0; display: block;}
.pg-hidden-frame {width: 0; height: 0; border: 0; position: absolute;}
.pg-console {border-top: 1px solid var(--vp-c-divider);}
.pg-console-head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--vp-c-text-3);
  padding: 5px 12px;
  background: var(--vp-c-bg-alt);
}
.pg-console-body {
  position: relative;
  max-height: 200px;
  overflow: auto;
  padding: 8px 12px;
  background: var(--vp-c-bg);
}
.pg-empty {font-size: 12px; color: var(--vp-c-text-3); margin: 0;}
.pg-log {
  margin: 0 0 2px;
  padding: 0;
  background: none;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--vp-c-text-1);
}
.pg-log.warn {color: #b8860b;}
.pg-log.error {color: var(--vp-c-danger-1);}
</style>
