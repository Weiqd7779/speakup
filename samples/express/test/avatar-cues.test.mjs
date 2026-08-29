import test from "node:test";
import assert from "node:assert/strict";
import { avatarCueFor } from "../public/demos/embed/avatar-cues.js";

test("aggressive pressure maps to a high-intensity annoyed presentation", () => {
  assert.deepEqual(avatarCueFor({ managerMove: "scope_pressure", managerStyle: "aggressive_consequence" }), {
    emotion: "annoyance", intensity: "high", motionId: "01K4M9HB21PSQSYPKKF4CJHTPH", label: "不耐與施壓・搖頭否定",
  });
});

test("soft pressure maps to a restrained disappointed presentation", () => {
  assert.deepEqual(avatarCueFor({ managerMove: "group_pressure", managerStyle: "soft_group_pressure" }), {
    emotion: "disappointment", intensity: "neutral", motionId: "01KZAH6THJWB3FYB6EY03D7A9H", label: "團隊施壓・交談手勢",
  });
});

test("questions and resolutions receive context-appropriate expressions", () => {
  assert.equal(avatarCueFor({ managerMove: "request_evidence", managerStyle: "aggressive_consequence" }).emotion, "annoyance");
  assert.equal(avatarCueFor({ managerMove: "request_evidence", managerStyle: "soft_group_pressure" }).emotion, "curiosity");
  assert.equal(avatarCueFor({ managerMove: "resolve" }).emotion, "admiration");
});

test("aggressive conversations visibly escalate from the opening request", () => {
  const opening = avatarCueFor({ managerMove: "direct_request", managerStyle: "aggressive_consequence" });
  const pressure = avatarCueFor({ managerMove: "group_pressure", managerStyle: "aggressive_consequence" });
  assert.equal(opening.motionId, "01KZAH6THJWB3FYB6EY03D7A9H");
  assert.equal(opening.emotion, "disappointment");
  assert.equal(opening.intensity, "high");
  assert.equal(pressure.motionId, "01K4M9HB21PSQSYPKKF4CJHTPH");
  assert.equal(pressure.intensity, "high");
});

test("every supported manager move has an Avatar cue for both styles", () => {
  const moves = ["direct_request", "urgency", "group_pressure", "guilt", "responsibility_pressure", "challenge_once", "scope_pressure", "priority_challenge", "risk_minimization", "request_evidence", "request_impact", "request_mitigation", "authority_pressure", "resolve", "confirm_commitment", "close_distress"];
  for (const managerStyle of ["soft_group_pressure", "aggressive_consequence"]) {
    for (const managerMove of moves) {
      const cue = avatarCueFor({ managerMove, managerStyle });
      assert.ok(cue.emotion && cue.intensity && cue.motionId && cue.label);
    }
  }
});
