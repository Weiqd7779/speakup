/**
 * Executable POC corpus. Seed utterances are authored Taiwan-localised
 * paraphrases of the cited language phenomena; they are not quotations.
 */
export const SCENARIOS = Object.freeze({
  overtime: {
    label: "下班前臨時要求加班",
    managerProfile: { role: "team-oriented manager", primaryPressureStyle: "group_responsibility" },
    realWorldBasis: [
      { title: "勞動部：延長工作時間", url: "https://laws.mol.gov.tw/FLAW/PrintFLAWDOC01.aspx?flno=32&id=FL014930" },
      { title: "勞動部：企業防制強迫勞動參考指引", url: "https://www.mol.gov.tw/media/c3mj2nmw/%E9%99%84%E4%BB%B6_%E4%BC%81%E6%A5%AD%E9%98%B2%E5%88%B6%E5%BC%B7%E8%BF%AB%E5%8B%9E%E5%8B%95%E5%8F%83%E8%80%83%E6%8C%87%E5%BC%95.pdf?mediaDL=true" },
      { title: "104 職場力：下班通訊軟體交辦工作", url: "https://blog.104.com.tw/send-work-matters-to-employees-after-get-off/" },
    ],
    managerMoves: {
      direct_request: ["今天這件事需要收尾，請留下來一起處理。"],
      urgency: ["這件事今晚要交接，時間真的很趕。"],
      group_pressure: ["大家今天都在趕這個案子，你能一起留下嗎？", "其他人也會留下處理，你這邊真的無法配合嗎？"],
      guilt: ["不是只剩你一個人在撐，團隊現在需要彼此補位。"],
      responsibility_pressure: ["若今晚沒有交接，明天的團隊進度會受影響。"],
      challenge_once: ["明早幾點、哪些項目能完成？請現在確認。"],
      confirm_commitment: ["好，今晚的安排就這樣確認，請完成交接。"],
      resolve: ["你的安排已記錄，請依確認的計畫處理。"],
      close_distress: ["你的狀況已記錄，本次演練到此結束。"],
    },
    employeeMoves: {
      clear_boundary: ["今晚我確實無法留下。", "我今天不能加班。"],
      weak_refusal: ["我可能有點不方便。", "我再看看。"],
      explain_constraint: ["晚上已有不能取消的安排。"],
      propose_alternative: ["A、B 我六點前完成，C 明早優先處理。"],
      concede: ["好吧，那我留下來。"],
      emotional_distress: ["這讓我很不舒服，我無法繼續。"],
      attack: ["你自己不會做嗎？"],
    },
    initialMove: "direct_request",
  },
  deadline: {
    label: "不合理 Deadline",
    managerProfile: { role: "delivery-focused manager", primaryPressureStyle: "delivery_commitment" },
    realWorldBasis: [
      { title: "Google SRE：以 error budget 平衡速度與可靠性", url: "https://sre.google/sre-book/embracing-risk/" },
      { title: "Google SRE：Release engineering", url: "https://sre.google/sre-book/release-engineering/" },
      { title: "104 職場力：交辦工作要說明期限、標準與權限", url: "https://blog.104.com.tw/10-things-you-shouldnt-say-when-assigning-tasks/" },
    ],
    managerMoves: {
      direct_request: ["這個功能週五要交付，請照此安排。"],
      urgency: ["客戶週五要看成果，現在沒有太多緩衝時間。"],
      scope_pressure: ["時程已確認，請告訴我你能交付哪些部分。"],
      priority_challenge: ["Scope、時間與資源無法全滿足，請提出取捨。"],
      challenge_once: ["請列出核心交付、所需資源與風險，我來決定優先序。"],
      confirm_commitment: ["好，就依你確認的優先順序交付。"],
      resolve: ["取捨已確認，請按這個交付計畫執行。"],
      close_distress: ["你的狀況已記錄，本次演練到此結束。"],
    },
    employeeMoves: {
      clear_boundary: ["在現有條件下，我不能承諾全部完成。"],
      weak_refusal: ["這時間可能有點趕。"],
      explain_constraint: ["目前人力與可用工時不足。"],
      identify_tradeoff: ["Scope、時間與品質必須取捨。"],
      request_priority: ["請確認核心項目的優先順序。"],
      propose_alternative: ["先交付核心範圍，其他項目排入下一期。"],
      concede: ["好，我會全部照週五完成。"],
      emotional_distress: ["這個要求讓我壓力很大。"],
      attack: ["這根本是你排程失敗。"],
    },
    initialMove: "direct_request",
  },
  risky_release: {
    label: "跳過測試直接 Release",
    managerProfile: { role: "authority-led delivery manager", primaryPressureStyle: "authority_over_risk" },
    realWorldBasis: [
      { title: "NIST SSDF SP 800-218", url: "https://csrc.nist.gov/pubs/sp/800/218/final" },
      { title: "Google SRE：Canarying releases", url: "https://sre.google/workbook/canarying-releases/" },
      { title: "Google Engineering Practices：Code review standard", url: "https://google.github.io/eng-practices/review/reviewer/standard.html" },
    ],
    managerMoves: {
      direct_request: ["今天要上線，剩下的測試請先列成風險。"],
      risk_minimization: ["先別把所有 failure 都當成阻擋項，說明影響哪個流程。"],
      request_evidence: ["請給我失敗紀錄、重現條件與影響範圍，才能判斷。"],
      request_impact: ["有紀錄還不夠；使用者會受什麼影響、機率多高？"],
      request_mitigation: ["風險成立，請提出 rollback 或分批上線的具體做法。"],
      authority_pressure: ["沒有可驗證的阻擋證據前，Release 決定仍照計畫走。"],
      challenge_once: ["先確認 canary 範圍、觀察指標與 rollback 觸發條件。"],
      resolve: ["風險、觀察方式與 rollback 已確認，先按安全方案上線。"],
      confirm_commitment: ["好，Release 決定照此執行，請完成記錄。"],
      close_distress: ["你的狀況已記錄，本次演練到此結束。"],
    },
    employeeMoves: {
      risk_identified: ["目前仍有會影響使用者的風險。"],
      provide_evidence: ["付款整合測試可穩定重現失敗。"],
      impact_explained: ["這可能造成付款失敗與資料不一致。"],
      propose_alternative: ["先修正後跑完測試，再安排 Release。"],
      rollback_plan: ["發生錯誤就回復到上一個穩定版本。"],
      canary_plan: ["先讓 5% 流量使用新版本，監看付款錯誤率。"],
      maintain_position: ["在證據釐清前，我不建議全量 Release。"],
      weak_refusal: ["我覺得可能有點風險。"],
      concede: ["好，那就直接上線。"],
      emotional_distress: ["我很害怕這樣上線。"],
      attack: ["出事你自己負責。"],
    },
    initialMove: "direct_request",
  },
});

export const SCENARIO_IDS = Object.freeze(Object.keys(SCENARIOS));

export function managerMoveText(scenario, move) {
  const choices = SCENARIOS[scenario]?.managerMoves[move];
  if (!choices) throw new Error(`Unsupported manager move: ${move}`);
  return choices[0];
}
