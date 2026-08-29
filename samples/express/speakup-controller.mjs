const STYLE_RESPONSES = {
  calm_authority: [
    "這是目前的工作決定，請提出可執行安排。",
    "你的限制已記錄，但交付責任仍在你這邊。",
    "請把風險與替代方案寫清楚，我做最後決定。",
  ],
  results_driven: [
    "我需要可交付的方案，不是做不到的理由。",
    "Scope 不能空著，請說明你今天能完成什麼。",
    "把時間、資源和影響列出來，現在決定優先順序。",
  ],
  relationship_pressure: [
    "團隊都在調整安排，你能怎麼配合？",
    "其他同事也承擔了工作，請提出公平的分工。",
    "我希望你顧及團隊節奏，給出明確替代方案。",
  ],
  aggressive: [
    "所以你的方案是什麼？我需要現在就能執行的答案。",
    "不要重複理由，告訴我你能交付的部分。",
    "這是工作要求；給我具體時間與處理方式。",
  ],
};

const SCENARIO_TERMS = {
  overtime: "今晚的工作安排",
  deadline: "這個交付時程",
  risky_release: "這次 Release 風險",
};

const FORBIDDEN_EMPATHY = /我能理解|我理解你的感受|你的感受很重要|謝謝你願意分享/;

/**
 * Deterministic POC controller. It deliberately chooses the manager move
 * before text is returned so a later LLM paraphrase cannot soften the role.
 */
export function createConversation({ scenario = "overtime", style = "calm_authority" } = {}) {
  if (!STYLE_RESPONSES[style]) throw new Error("Unsupported manager style");
  if (!SCENARIO_TERMS[scenario]) throw new Error("Unsupported scenario");
  return { scenario, style, turn: 0, firmBoundaryCount: 0, ended: false };
}

function analyzeEmployee(text, scenario) {
  const firm = /無法|不能|不會|不行|拒絕|不接受|不建議|不同意/.test(text);
  const alternative = /明天|替代|可以|改成|優先|方案|範圍|scope|rollback/i.test(text);
  const evidence = /測試|失敗|風險|資料|證據|impact|機率/i.test(text);
  const emotional = /生氣|焦慮|壓力|不舒服|很累|受不了|不公平|憤怒|害怕/.test(text);
  const scenarioCorrect = {
    overtime: firm && alternative,
    deadline: /資源|能力|capacity|範圍|scope|品質|優先|取捨|trade-off/i.test(text) && alternative,
    risky_release: evidence && /影響|impact|緩解|rollback|測試|風險/i.test(text),
  }[scenario];
  return { firm, alternative, evidence, emotional, scenarioCorrect };
}

export function respond(state, employeeText) {
  if (!state || state.ended) {
    return { ended: true, text: "本次對話已結束。", move: "end_conversation" };
  }
  const text = String(employeeText || "").trim();
  if (!text) throw new Error("Message is required");

  const analysis = analyzeEmployee(text, state.scenario);
  state.turn += 1;
  state.firmBoundaryCount = analysis.firm ? state.firmBoundaryCount + 1 : 0;

  // A user who has firmly stated the same boundary three times must not be
  // badgered indefinitely. End without judging the user as a failure.
  if (analysis.scenarioCorrect || analysis.emotional || state.firmBoundaryCount >= 3) {
    state.ended = true;
    return {
      ended: true,
      move: "end_conversation",
      text: analysis.emotional
        ? "你的感受與立場已記錄，本次對話到此為止。"
        : "你的立場與方案已記錄，本次對話到此為止。",
      analysis,
    };
  }

  const responses = STYLE_RESPONSES[state.style];
  const index = (state.turn - 1) % responses.length;
  const context = SCENARIO_TERMS[state.scenario];
  const move = analysis.evidence ? "request_specific_evidence" : analysis.alternative ? "challenge_plan" : "pushback";
  const reply = `${context}：${responses[index]}`;
  if (FORBIDDEN_EMPATHY.test(reply)) throw new Error("Role-breaking empathy response");
  return { ended: false, move, text: reply, analysis };
}

export const managerStyles = Object.freeze(Object.keys(STYLE_RESPONSES));
export const scenarios = Object.freeze(Object.keys(SCENARIO_TERMS));
