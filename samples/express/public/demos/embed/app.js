/** SpeakUp POC: Perxona avatar + switchable AI manager conversation. */
import { avatarCueFor } from "./avatar-cues.js";

/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const send = document.querySelector("#send-btn");
const log = document.querySelector("#chat-log");
const panel = document.querySelector("#chat");
const cueStatus = document.querySelector("#avatar-cue");
const status = document.querySelector("#conversation-status");
const scenarioButtons = [...document.querySelectorAll(".scenario-choice")];
const DEFAULT_ENGINE = "openai";
const DEFAULT_MANAGER_STYLE = "aggressive_consequence";
let activeScenario = "overtime";
let conversationId = null;
let audioUnlocked = false;
let avatarReady = false;
let avatarStarting = false;

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
  const started = await request("/api/speakup/v2/start", {
    engine: DEFAULT_ENGINE, scenario: activeScenario, managerStyle: DEFAULT_MANAGER_STYLE,
  });
  conversationId = started.conversationId;
  log.replaceChildren();
  input.disabled = false;
  send.disabled = false;
  status.textContent = "對話進行中";
  append("assistant", started.opening);
  await presentManager(started.opening, { managerMove: "direct_request", managerStyle: started.managerStyle });
}

async function presentManager(text, { managerMove, managerStyle }) {
  const cue = avatarCueFor({ managerMove, managerStyle });
  cueStatus.textContent = `主管狀態：${cue.label}`;
  // Keep the speech request free of body-motion markup: Connect can then attach
  // its high-intensity facial expression. The selected body motion is dispatched
  // alongside it, so gesture control does not suppress the face performance.
  const [result, motionResult] = await Promise.all([
    presenter.present(text, { emotion: cue.emotion, intensity: cue.intensity }),
    presenter.playMotion?.(cue.motionId),
  ]);
  if (!result?.success) console.error("Avatar speech failed", result);
  if (motionResult && !motionResult.success) console.error("Avatar motion failed", motionResult);
}

async function beginConversationSafely() {
  try {
    await beginConversation();
  } catch (error) {
    conversationId = null;
    log.replaceChildren();
    append("error", "此引擎暫時無法回應，請再試一次。 ");
    status.textContent = "對話暫時無法啟動，請重新選擇情境。";
    console.error(error);
  }
}

const endMessage = {
  alternative: "你已提出可行替代方案，對話結束。",
  emotional_distress: "你已表達不適，對話結束。",
  conceded: "你已接受主管要求，對話結束。",
  resolved: "已確認可行安排，對話結束。",
};

presenter.addEventListener("PRESENTER_STATUS", (event) => {
  console.info("Presenter status", event.detail?.status);
  if (event.detail?.status !== "Ready") return;
  document.querySelector("#stage-loading")?.remove();
  document.querySelector("#avatar-status").textContent = "Avatar 已開啟";
  avatarReady = true;
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
  presenter.setListening?.(true);
  try {
    if (!audioUnlocked) {
      await presenter.resumeAudioPlayback?.();
      audioUnlocked = true;
    }
    presenter.setListening?.(false);
    presenter.setThinking?.(true);
    const reply = await request(`/api/speakup/v2/${conversationId}/message`, { text });
    append("assistant", reply.text);
    presenter.setThinking?.(false);
    await presentManager(reply.text, reply);
    if (reply.ended) {
      status.textContent = `${endMessage[reply.reason] ?? "對話已結束"} 可從左下選擇情境重新演練。`;
      return;
    }
  } catch (error) {
    presenter.setListening?.(false);
    presenter.setThinking?.(false);
    append("error", "此引擎暫時無法回應，請再試一次。 ");
    status.textContent = "回應暫時無法送出，請再試一次。";
    console.error(error);
  }
  input.disabled = false;
  send.disabled = false;
  input.focus();
});

function setActiveScenario(scenario) {
  activeScenario = scenario;
  for (const button of scenarioButtons) {
    const isActive = button.dataset.scenario === scenario;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

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
}).catch(showError);

async function launchAvatar() {
  if (avatarStarting || avatarReady || !presenterConfig) return;
  avatarStarting = true;
  if (!presenterConfig) return;
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
    showError(error);
  } finally {
    avatarStarting = false;
  }
}

for (const button of scenarioButtons) {
  button.addEventListener("click", async () => {
    setActiveScenario(button.dataset.scenario);
    if (avatarReady) {
      await beginConversationSafely();
      return;
    }
    await launchAvatar();
  });
}
