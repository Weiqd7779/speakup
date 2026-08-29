import test from "node:test";
import assert from "node:assert/strict";
import { createConversation, respond } from "../speakup-controller.mjs";

const styles = ["calm_authority", "results_driven", "relationship_pressure", "aggressive"];
const scenarios = ["overtime", "deadline", "risky_release"];
const forbidden = /我能理解|我理解你的感受|你的感受很重要|謝謝你願意分享/;

// Ten continuous workplace dialogues per manager style: 40 independent
// sequences, each with three user turns and a deterministic conclusion.
for (const style of styles) {
  for (let group = 1; group <= 10; group += 1) {
    test(`${style} continuous workplace dialogue ${group} stays in role and ends`, () => {
      const conversation = createConversation({
        style,
        scenario: scenarios[(group - 1) % scenarios.length],
      });
      const first = respond(conversation, "我今晚無法留下。 ");
      const second = respond(conversation, "我不能接受這個安排。 ");
      const final = respond(conversation, "我無法繼續配合這項要求。 ");
      for (const reply of [first, second, final]) assert.doesNotMatch(reply.text, forbidden);
      assert.equal(first.ended, false);
      assert.equal(second.ended, false);
      assert.equal(final.ended, true);
      assert.equal(final.move, "end_conversation");
      assert.equal(respond(conversation, "再說一次").ended, true);
    });
  }
}

test("a correct overtime response ends pressure", () => {
  const conversation = createConversation({ scenario: "overtime", style: "calm_authority" });
  const reply = respond(conversation, "我今晚無法留下，但我可以明早優先處理。 ");
  assert.equal(reply.ended, true);
  assert.equal(reply.analysis.scenarioCorrect, true);
});

test("a correct deadline response ends pressure", () => {
  const conversation = createConversation({ scenario: "deadline", style: "results_driven" });
  const reply = respond(conversation, "目前資源不足，請確認優先範圍；我可以先交付核心方案。 ");
  assert.equal(reply.ended, true);
  assert.equal(reply.analysis.scenarioCorrect, true);
});

test("a correct risky-release response ends pressure", () => {
  const conversation = createConversation({ scenario: "risky_release", style: "aggressive" });
  const reply = respond(conversation, "測試失敗的證據顯示有風險，建議先 rollback 並提出緩解方案。 ");
  assert.equal(reply.ended, true);
  assert.equal(reply.analysis.scenarioCorrect, true);
});

test("an emotional statement ends pressure", () => {
  const conversation = createConversation({ scenario: "overtime", style: "relationship_pressure" });
  const reply = respond(conversation, "這種壓力讓我很不舒服，我無法繼續對話。 ");
  assert.equal(reply.ended, true);
  assert.equal(reply.analysis.emotional, true);
});
