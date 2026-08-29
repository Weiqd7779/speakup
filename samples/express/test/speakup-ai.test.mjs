import test from "node:test";
import assert from "node:assert/strict";
import { applyOutcome, instructionsFor, parseModelResult, responseSchema, validateSelection } from "../speakup-ai.mjs";

test("shared instructions preserve the selected style and prohibit empathy drift", () => {
  const prompt = instructionsFor({ scenario: "overtime", style: "calm_authority" });
  assert.match(prompt, /冷靜權威/);
  assert.match(prompt, /我能理解/);
});

test("valid structured result is parsed", () => {
  const result = parseModelResult(JSON.stringify({
    manager_text: "請說明你明早能完成的具體安排。",
    termination_reason: "none",
    ineffective_refusal: false,
  }));
  assert.equal(result.termination_reason, "none");
});

test("role-breaking empathy response is rejected", () => {
  assert.throws(() => parseModelResult(JSON.stringify({
    manager_text: "我能理解你的感受，請慢慢說。",
    termination_reason: "none",
    ineffective_refusal: false,
  })));
});

test("alternative and emotion finish immediately", () => {
  for (const reason of ["alternative", "emotional_distress"]) {
    const outcome = applyOutcome({ ineffectiveRefusalCount: 0 }, {
      manager_text: "本次對話到此為止。",
      termination_reason: reason,
      ineffective_refusal: false,
    });
    assert.equal(outcome.ended, true);
    assert.equal(outcome.reason, reason);
  }
});

test("third ineffective refusal finishes the conversation", () => {
  let state = { ineffectiveRefusalCount: 0 };
  for (let turn = 1; turn <= 3; turn += 1) {
    const outcome = applyOutcome(state, { termination_reason: "none", ineffective_refusal: true });
    state = outcome;
    assert.equal(outcome.ended, turn === 3);
  }
});

test("selection and JSON schema cover both engines", () => {
  validateSelection({ engine: "perxona_chatbot", scenario: "deadline", style: "results_driven" });
  validateSelection({ engine: "openai", scenario: "risky_release", style: "aggressive" });
  assert.deepEqual(responseSchema.required, ["manager_text", "termination_reason", "ineffective_refusal"]);
});
