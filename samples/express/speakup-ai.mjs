import { MANAGER_STYLES, MANAGER_STYLE_IDS, SCENARIOS, SCENARIO_IDS } from "./speakup-scenarios.mjs";

export const ENGINES = Object.freeze(["perxona_chatbot", "openai"]);
// OpenAI strict JSON Schema does not support `uniqueItems`; duplicate labels
// are normalised by parseClassificationResult after generation instead.
export const responseSchema = { type: "object", additionalProperties: false, required: ["employee_moves"], properties: { employee_moves: { type: "array", minItems: 1, items: { type: "string" } } } };
export const managerResponseSchema = { type: "object", additionalProperties: false, required: ["manager_move", "manager_text"], properties: { manager_move: { type: "string" }, manager_text: { type: "string", minLength: 8, maxLength: 50 } } };

export function validateSelection({ engine, scenario, managerStyle = "soft_group_pressure" }) {
  if (!ENGINES.includes(engine)) throw new Error("Unsupported conversation engine");
  if (!SCENARIO_IDS.includes(scenario)) throw new Error("Unsupported scenario");
  if (!MANAGER_STYLE_IDS.includes(managerStyle)) throw new Error("Unsupported manager style");
}

function labelsFor(scenario) {
  return Object.entries(SCENARIOS[scenario].employeeMoves).map(([label, examples]) => `- ${label}：${examples.join("；")}`).join("\n");
}

export function classificationPrompt({ scenario, history, employeeText }) {
  const transcript = history.map(({ role, text }) => `${role === "user" ? "員工" : "主管"}：${text}`).join("\n");
  return `你是 SpeakUp POC 的語句分類器。情境是「${SCENARIOS[scenario].label}」。只根據使用者最新訊息，選出所有貼近的 employee_moves。不得判定成功、失敗、主管下一步或結束對話。\n\n可用標籤與例句：\n${labelsFor(scenario)}\n\n既有對話：\n${transcript || "（尚無）"}\n\n使用者最新訊息：${employeeText}`;
}

export function managerPrompt({ scenario, managerStyle = "soft_group_pressure", allowedManagerMoves, fallbackManagerMove, history }) {
  const config = SCENARIOS[scenario];
  const style = MANAGER_STYLES[managerStyle];
  const transcript = history.slice(-6).map(({ role, text }) => `${role === "user" ? "員工" : "主管"}：${text}`).join("\n");
  const moveOptions = allowedManagerMoves.map((move) => `- ${move}：${config.managerMoves[move].join("／")}`).join("\n");
  const styleAnchors = managerStyle === "aggressive_consequence" ? `\n此情境的侵略型口語參考（只能自然改寫，不可逐句照抄）：${config.aggressiveStyleAnchors.join("／")}` : "";
  return `你是 SpeakUp POC 的虛擬主管，請全程使用自然、專業的台灣職場繁體中文。\n\n固定情境：${config.label}\n主管角色：${config.managerProfile.role}\n主要壓力模式：${config.managerProfile.primaryPressureStyle}\n主管風格：${style.label}\n風格指引：${style.promptGuide}${styleAnchors}\n\n本回合只能從下列允許行為選一個；請依最近對話選最貼近的一個，而不是機械重複 seed：\n${moveOptions}\n若上下文不足，選 ${fallbackManagerMove}。\n\n輸出單一 JSON，包含 chosen manager_move 與 manager_text。manager_text 必須 8–50 個中文字、最多兩句。用一個具體工作錨點（如交接、時程、客戶、scope、測試或風險），回應員工剛說的重點；可以反駁、追問或施壓，但不要重複整段員工原話。侵略性威脅施壓必須像人在當面說話：短句、口語、可有不耐煩或反問；不要用「責任風險」「納入紀錄」「照實記錄」「重新評估」等抽象行政語。除非 manager_move 是 resolve 或 confirm_commitment，主管仍維持原本要求：不得自行同意延期、暫停、縮小範圍或接受替代方案；可以要求員工提出可驗證的條件。侵略性威脅施壓可直接質疑能力、態度與責任，並提出考績、升遷、職務調整、續任、向上回報或去留相關的後果；不得使用與工作無關的特定身分歧視、性羞辱或肢體暴力恐嚇。禁止「我能理解」、「我理解你的感受」、「你的感受很重要」、「謝謝你願意分享」等安慰式話術。不得自行結束對話或接受未完成的方案。\n\n最近對話：\n${transcript || "（這是開場）"}`;
}

function parseJson(raw, errorMessage) {
  try { return JSON.parse(String(raw ?? "").trim().replace(/^```json\s*|\s*```$/g, "")); } catch { throw new Error(errorMessage); }
}

export function parseClassificationResult(raw, scenario) {
  const result = parseJson(raw, "引擎未回傳有效的分類結果。");
  const allowed = new Set(Object.keys(SCENARIOS[scenario].employeeMoves));
  if (!Array.isArray(result?.employee_moves) || result.employee_moves.length === 0 || result.employee_moves.some((move) => !allowed.has(move))) throw new Error("引擎回傳了不支援的使用者行為標籤。");
  return { employee_moves: [...new Set(result.employee_moves)] };
}

export function parseManagerResult(raw, allowedManagerMoves) {
  const result = parseJson(raw, "引擎未回傳有效的主管回覆。");
  if (!allowedManagerMoves.includes(result?.manager_move) || typeof result?.manager_text !== "string" || !result.manager_text.trim() || result.manager_text.length > 50) throw new Error("引擎回傳的主管回覆不完整或超出允許策略。");
  if (/我能理解|我理解你的感受|你的感受很重要|謝謝你願意分享/.test(result.manager_text)) throw new Error("引擎回覆不符合主管角色契約。");
  return { manager_move: result.manager_move, manager_text: result.manager_text.trim() };
}
