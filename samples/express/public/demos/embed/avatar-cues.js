/** Maps controller-owned manager moves to the Presenter SDK's emotion options. */
const MOTION = Object.freeze({
  talk: "01KZAH6THJWB3FYB6EY03D7A9H",
  point: "01KZAH87A457ASGBQKND4ZMN0P",
  shakeNo: "01K4M9HB21PSQSYPKKF4CJHTPH",
  confirm: "01K4M9NC4JRX44R08XP2YH2AC3",
});

export function avatarCueFor({ managerMove = "direct_request", managerStyle = "soft_group_pressure" } = {}) {
  if (managerMove === "close_distress") return { emotion: "caring", intensity: "low", motionId: MOTION.talk, label: "收斂・緩和手勢" };
  if (["resolve", "confirm_commitment"].includes(managerMove)) return { emotion: "admiration", intensity: "low", motionId: MOTION.confirm, label: "確認安排・拇指確認" };
  if (["direct_request", "urgency"].includes(managerMove)) {
    return { emotion: "disappointment", intensity: "high", motionId: MOTION.talk, label: managerStyle === "aggressive_consequence" ? "嚴肅開場・手勢要求" : "提出要求・交談手勢" };
  }
  if (["request_evidence", "request_impact", "request_mitigation", "challenge_once", "priority_challenge"].includes(managerMove)) {
    return { emotion: managerStyle === "aggressive_consequence" ? "annoyance" : "curiosity", intensity: managerStyle === "aggressive_consequence" ? "high" : "neutral", motionId: MOTION.point, label: managerStyle === "aggressive_consequence" ? "強勢追問・指向要求" : "追問確認・指向說明" };
  }
  if (managerStyle === "aggressive_consequence") return { emotion: "annoyance", intensity: "high", motionId: MOTION.shakeNo, label: "不耐與施壓・搖頭否定" };
  return { emotion: "disappointment", intensity: "neutral", motionId: MOTION.talk, label: "團隊施壓・交談手勢" };
}
