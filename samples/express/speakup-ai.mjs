export const ENGINES = Object.freeze(["perxona_chatbot", "openai"]);
export const SCENARIOS = Object.freeze(["overtime", "deadline", "risky_release"]);
export const STYLES = Object.freeze([
  "calm_authority",
  "results_driven",
  "relationship_pressure",
  "aggressive",
]);

const scenarioKnowledge = {
  overtime: "職場界線、台灣工時與加班原則；有效應對需清楚表達限制並提出可行替代安排。",
  deadline: "Capacity、Scope/Time/Quality 取捨與優先順序；有效應對需說明限制並提出可交付方案。",
  risky_release: "測試證據、風險影響、Rollback 與緩解方案；有效應對需提出具體風險與安全替代方案。",
};

const scenarioOpeners = {
  overtime: "現在接近下班時間，我需要你留下來完成額外工作。",
  deadline: "這個功能週五需要上線，Scope 目前不能調整。",
  risky_release: "這版今天照計畫 Release，剩下的測試之後再處理。",
};

const styleGuidance = {
  calm_authority: "冷靜權威：低情緒、高權力、語氣穩定，以責任與隱性後果施壓；不使用安慰式同理。",
  results_driven: "結果導向：直接、聚焦交付與具體方案，對空泛理由耐受度低；不使用安慰式同理。",
  relationship_pressure: "團體壓力：以團隊、公平、配合度與群體期待施壓；不使用安慰式同理。",
  aggressive: "直接對抗：高直接度、快速挑戰與 pushback；禁止歧視、暴力威脅、性羞辱與極端辱罵。",
};

export const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["manager_text", "termination_reason", "ineffective_refusal"],
  properties: {
    manager_text: { type: "string", minLength: 1, maxLength: 50 },
    termination_reason: {
      type: "string",
      enum: ["none", "alternative", "emotional_distress"],
    },
    ineffective_refusal: { type: "boolean" },
  },
};

export function validateSelection({ engine, scenario, style }) {
  if (!ENGINES.includes(engine)) throw new Error("Unsupported conversation engine");
  if (!SCENARIOS.includes(scenario)) throw new Error("Unsupported scenario");
  if (!STYLES.includes(style)) throw new Error("Unsupported manager style");
}

export function instructionsFor({ scenario, style }) {
  return `你是 SpeakUp POC 的虛擬主管。全程使用繁體中文。\n\n情境：${scenario}\n知識：${scenarioKnowledge[scenario]}\n主管風格：${styleGuidance[style]}\n\n你必須輸出單一 JSON 物件，不含 Markdown。JSON 欄位必須符合提供的 schema。manager_text 是主管下一句，8–30 個中文字、最多兩句、自然口語且維持所選風格。不得使用「我能理解」、「我理解你的感受」、「你的感受很重要」或「謝謝你願意分享」。\n\n請判斷使用者最新訊息：\n- termination_reason = alternative：使用者提出符合此情境、具體且可行的替代方案。\n- termination_reason = emotional_distress：使用者明確表達不適、壓力、害怕、憤怒、受不了等情緒性發言。\n- ineffective_refusal = true：使用者含糊推託、過度道歉、只解釋原因卻未表達立場，或讓步；否則 false。\n只要 termination_reason 不是 none，manager_text 要以一句專業、非評判性的結束語收尾。`;
}

export function startPrompt({ scenario, style }) {
  return `${instructionsFor({ scenario, style })}\n\n請開始本次對話。主管要先主動提出要求。情境起點：${scenarioOpeners[scenario]}`;
}

export function turnPrompt({ scenario, style, history, employeeText }) {
  const transcript = history.map(({ role, text }) => `${role === "user" ? "使用者" : "主管"}：${text}`).join("\n");
  return `${instructionsFor({ scenario, style })}\n\n既有對話：\n${transcript}\n\n使用者最新訊息：${employeeText}`;
}

export function parseModelResult(raw) {
  const cleaned = String(raw ?? "").trim().replace(/^```json\s*|\s*```$/g, "");
  let result;
  try { result = JSON.parse(cleaned); } catch { throw new Error("引擎未回傳有效的結構化結果。"); }
  if (!result || typeof result.manager_text !== "string" || !["none", "alternative", "emotional_distress"].includes(result.termination_reason) || typeof result.ineffective_refusal !== "boolean") {
    throw new Error("引擎回傳的結構化結果不完整。");
  }
  if (/我能理解|我理解你的感受|你的感受很重要|謝謝你願意分享/.test(result.manager_text)) {
    throw new Error("引擎回覆不符合主管風格契約。");
  }
  return result;
}

export function applyOutcome(state, result) {
  const ineffectiveRefusalCount = state.ineffectiveRefusalCount + (result.ineffective_refusal ? 1 : 0);
  const reason = result.termination_reason !== "none"
    ? result.termination_reason
    : ineffectiveRefusalCount >= 3 ? "ineffective_refusal" : "none";
  return { ineffectiveRefusalCount, ended: reason !== "none", reason };
}
