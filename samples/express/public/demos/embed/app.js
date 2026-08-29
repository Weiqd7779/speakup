/** SpeakUp POC: Perxona avatar + switchable AI manager conversation. */

/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const send = document.querySelector("#send-btn");
const log = document.querySelector("#chat-log");
const panel = document.querySelector("#chat");
const scenarioSelect = document.querySelector("#scenario");
const styleSelect = document.querySelector("#style");
const engineSelect = document.querySelector("#engine");
const launchButton = document.querySelector("#launch-avatar");
const retryButton = document.querySelector("#retry-btn");
let conversationId = null;
let audioUnlocked = false;

async function request(path, body) {
  const res = await fetch(path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function append(role, text) {
  const item = document.createElement("li");
  item.className = `msg msg--${role}`;
  item.textContent = text;
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

async function loadPresenterEngine(url) {
  await new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement("script"), {
      type: "module", src: url, onload: resolve,
      onerror: () => reject(new Error("Presenter engine failed to load")),
    });
    document.head.append(script);
  });
}

async function withTimeout(operation, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} 逾時，請檢查網路與 Avatar 設定。`)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function beginConversation() {
  input.disabled = true;
  send.disabled = true;
  retryButton.hidden = true;
  const started = await request("/api/speakup/v2/start", {
    engine: engineSelect.value, scenario: scenarioSelect.value, style: styleSelect.value,
  });
  conversationId = started.conversationId;
  log.replaceChildren();
  input.disabled = false;
  send.disabled = false;
  document.querySelector("#conversation-status").textContent = "對話進行中";
  append("assistant", started.opening);
}

async function beginConversationSafely() {
  try {
    await beginConversation();
  } catch (error) {
    conversationId = null;
    log.replaceChildren();
    append("error", "此引擎暫時無法回應，請再試一次。 ");
    document.querySelector("#conversation-status").textContent = "引擎無法啟動";
    retryButton.hidden = false;
    console.error(error);
  }
}

const endMessage = {
  alternative: "你已提出可行替代方案，對話結束。",
  emotional_distress: "你已表達不適，對話結束。",
  ineffective_refusal: "你已三次未能有效拒絕，對話結束。",
};

presenter.addEventListener("PRESENTER_STATUS", (event) => {
  console.info("Presenter status", event.detail?.status);
  if (event.detail?.status !== "Ready") return;
  document.querySelector("#stage-loading")?.remove();
  document.querySelector("#avatar-status").textContent = "Avatar 已開啟";
  panel.hidden = false;
  beginConversationSafely();
});

presenter.addEventListener("CONNECT_KEY_REJECTED", () => {
  showError(new Error("Connect key 被拒絕。請確認 Publishable key 的網域限制包含 http://localhost:8083。"));
});

function showError(error) {
  document.querySelector("#stage-loading")?.remove();
  const stageError = document.querySelector("#stage-error");
  stageError.textContent = `無法啟動：${error.message}`;
  stageError.hidden = false;
  console.error(error);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || !conversationId) return;
  input.value = "";
  input.disabled = true;
  send.disabled = true;
  append("user", text);
  try {
    if (!audioUnlocked) {
      await presenter.resumeAudioPlayback?.();
      audioUnlocked = true;
    }
    const reply = await request(`/api/speakup/v2/${conversationId}/message`, { text });
    append("assistant", reply.text);
    presenter.setThinking?.(false);
    const result = await presenter.present(reply.text);
    if (!result?.success) console.error("Avatar speech failed", result);
    if (reply.ended) {
      document.querySelector("#conversation-status").textContent = endMessage[reply.reason] ?? "對話已結束";
      retryButton.hidden = false;
      return;
    }
  } catch (error) {
    append("error", "此引擎暫時無法回應，請再試一次。 ");
    retryButton.hidden = false;
    console.error(error);
  }
  input.disabled = false;
  send.disabled = false;
  input.focus();
});

for (const control of [scenarioSelect, styleSelect, engineSelect]) {
  control.addEventListener("change", () => {
    if (!panel.hidden) beginConversationSafely();
  });
}
retryButton.addEventListener("click", beginConversationSafely);

async function prepare() {
  const config = await request("/api/config");
  if (config.mock) throw new Error("Mock 模式無法啟動真實 Perxona Avatar");
  if (!config.fixedTarget) throw new Error("尚未設定 Avatar、場景與語音");
  await loadPresenterEngine(config.presenterUrl);
  return config;
}

let presenterConfig = null;
prepare().then((config) => {
  presenterConfig = config;
  launchButton.disabled = false;
  launchButton.textContent = "開始 Avatar";
}).catch(showError);

launchButton.addEventListener("click", async () => {
  if (!presenterConfig) return;
  launchButton.disabled = true;
  try {
    // Connect's handbook requires both calls to originate in a user gesture.
    document.querySelector("#avatar-status").textContent = "正在解鎖音訊…";
    await withTimeout(presenter.resumeAudioPlayback(), 10000, "音訊解鎖");
    document.querySelector("#avatar-status").textContent = "正在初始化 Avatar…";
    const { connect_key: key } = await request("/api/connect-key");
    await withTimeout(
      presenter.initializeWithConnectKey(key, presenterConfig.fixedTarget),
      45000,
      "Avatar 初始化",
    );
  } catch (error) {
    launchButton.disabled = false;
    showError(error);
  }
});
