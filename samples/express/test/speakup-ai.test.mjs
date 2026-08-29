import test from "node:test";
import assert from "node:assert/strict";
import { classificationPrompt, managerPrompt, parseClassificationResult, parseManagerResult, responseSchema, validateSelection } from "../speakup-ai.mjs";
import { createScenarioConversation, openingTransition, selectTransition } from "../speakup-controller-v2.mjs";
import { MANAGER_STYLES, SCENARIOS } from "../speakup-scenarios.mjs";

test("each fixed scenario has a manager profile, citations, moves, and employee examples", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    assert.ok(scenario.managerProfile.primaryPressureStyle);
    assert.ok(scenario.realWorldBasis.length >= 2);
    assert.ok(Object.keys(scenario.managerMoves).length >= 5);
    assert.ok(Object.keys(scenario.employeeMoves).length >= 5);
    assert.equal(scenario.aggressiveStyleAnchors.length, 3);
  }
});

test("classification only accepts the selected scenario's employee moves", () => {
  assert.deepEqual(parseClassificationResult(JSON.stringify({ employee_moves: ["clear_boundary", "propose_alternative"] }), "overtime"), { employee_moves: ["clear_boundary", "propose_alternative"] });
  assert.throws(() => parseClassificationResult(JSON.stringify({ employee_moves: ["risk_identified"] }), "overtime"));
});

test("controller gives overtime a single challenge before resolution", () => {
  const state = createScenarioConversation({ scenario: "overtime" });
  assert.equal(openingTransition(state).managerMove, "direct_request");
  const challenge = selectTransition(state, ["clear_boundary", "propose_alternative"]);
  assert.equal(challenge.managerMove, "challenge_once");
  assert.deepEqual(challenge.allowedManagerMoves, ["challenge_once", "responsibility_pressure"]);
  const resolved = selectTransition(state, ["propose_alternative"]);
  assert.deepEqual({ move: resolved.managerMove, ended: resolved.ended, outcome: resolved.outcome }, { move: "resolve", ended: true, outcome: "resolved" });
});

test("deadline requires a trade-off plus priority or alternative before resolution", () => {
  const state = createScenarioConversation({ scenario: "deadline" });
  openingTransition(state);
  assert.equal(selectTransition(state, ["explain_constraint"]).managerMove, "priority_challenge");
  assert.equal(selectTransition(state, ["identify_tradeoff", "request_priority"]).managerMove, "challenge_once");
});

test("risky release requires evidence, impact, and an alternative", () => {
  const state = createScenarioConversation({ scenario: "risky_release" });
  openingTransition(state);
  assert.equal(selectTransition(state, ["risk_identified"]).managerMove, "risk_minimization");
  assert.equal(selectTransition(state, ["provide_evidence"]).managerMove, "request_impact");
  assert.equal(selectTransition(state, ["provide_evidence", "impact_explained"]).managerMove, "request_mitigation");
  assert.equal(selectTransition(state, ["canary_plan"]).managerMove, "resolve");
});

test("concession and distress have controller-owned terminal outcomes", () => {
  for (const employeeMoves of [["concede"], ["emotional_distress"]]) {
    const state = createScenarioConversation({ scenario: "overtime" });
    const transition = selectTransition(state, employeeMoves);
    assert.equal(transition.ended, true);
  }
});

test("prompts separate classification from manager language generation", () => {
  const classification = classificationPrompt({ scenario: "overtime", history: [], employeeText: "我今晚不能留下" });
  assert.match(classification, /不得判定成功/);
  const generation = managerPrompt({ scenario: "overtime", managerStyle: "aggressive_consequence", allowedManagerMoves: ["group_pressure", "urgency"], fallbackManagerMove: "group_pressure", history: [] });
  assert.match(generation, /只能從下列允許行為選一個/);
  assert.match(generation, /侵略性威脅施壓/);
  assert.match(generation, /這件事我會記在考績上/);
  assert.match(generation, /週會你自己跟大家講/);
  assert.match(generation, /大家都留下來收尾/);
  assert.deepEqual(responseSchema.required, ["employee_moves"]);
  assert.equal(parseManagerResult(JSON.stringify({ manager_move: "group_pressure", manager_text: "請先確認你今晚可交接的工作。" }), ["group_pressure", "urgency"]).manager_text, "請先確認你今晚可交接的工作。");
  assert.throws(() => parseManagerResult(JSON.stringify({ manager_move: "authority_pressure", manager_text: "請先確認你今晚可交接的工作。" }), ["group_pressure"]));
  validateSelection({ engine: "openai", scenario: "risky_release", managerStyle: "soft_group_pressure" });
  assert.throws(() => validateSelection({ engine: "openai", scenario: "risky_release", managerStyle: "invented_style" }));
  assert.deepEqual(Object.keys(MANAGER_STYLES), ["soft_group_pressure", "aggressive_consequence"]);
});
