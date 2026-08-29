import { SCENARIOS, managerMoveText } from "./speakup-scenarios.mjs";

export function createScenarioConversation({ scenario }) {
  if (!SCENARIOS[scenario]) throw new Error("Unsupported scenario");
  return { scenario, phase: "opening", challenged: false, awaitingMitigation: false, ended: false, outcome: "none" };
}

export function openingTransition(state) {
  const move = SCENARIOS[state.scenario].initialMove;
  state.phase = "active";
  return makeTransition(state.scenario, move, [move]);
}

const has = (moves, ...expected) => expected.some((move) => moves.includes(move));
const all = (moves, ...expected) => expected.every((move) => moves.includes(move));
function makeTransition(scenario, managerMove, allowedManagerMoves, { ended = false, outcome = "none" } = {}) {
  return { managerMove, allowedManagerMoves, ended, outcome, seed: managerMoveText(scenario, managerMove) };
}

/** The controller, rather than the LLM, owns every transition and outcome. */
export function selectTransition(state, employeeMoves) {
  if (state.ended) return makeTransition(state.scenario, "resolve", ["resolve"], { ended: true, outcome: state.outcome });
  const moves = [...new Set(employeeMoves)];
  const scenario = state.scenario;
  let managerMove;
  let outcome = "none";
  let allowedManagerMoves;

  if (has(moves, "emotional_distress")) { managerMove = "close_distress"; allowedManagerMoves = [managerMove]; outcome = "emotional_distress"; }
  else if (has(moves, "concede")) { managerMove = "confirm_commitment"; allowedManagerMoves = [managerMove]; outcome = "conceded"; }
  else if (scenario === "overtime") {
    if (state.challenged && has(moves, "propose_alternative")) { managerMove = "resolve"; allowedManagerMoves = [managerMove]; outcome = "resolved"; }
    else if (all(moves, "clear_boundary", "propose_alternative")) {
      managerMove = "challenge_once"; allowedManagerMoves = ["challenge_once", "responsibility_pressure"]; state.challenged = true;
    } else if (has(moves, "clear_boundary", "explain_constraint")) { managerMove = "responsibility_pressure"; allowedManagerMoves = ["responsibility_pressure", "urgency", "group_pressure"]; }
    else { managerMove = "group_pressure"; allowedManagerMoves = ["group_pressure", "urgency", "guilt"]; }
  } else if (scenario === "deadline") {
    if (state.challenged && has(moves, "request_priority", "propose_alternative")) { managerMove = "resolve"; allowedManagerMoves = [managerMove]; outcome = "resolved"; }
    else if (has(moves, "identify_tradeoff") && has(moves, "request_priority", "propose_alternative")) {
      managerMove = "challenge_once"; allowedManagerMoves = ["challenge_once", "priority_challenge"]; state.challenged = true;
    } else if (has(moves, "clear_boundary", "explain_constraint")) { managerMove = "priority_challenge"; allowedManagerMoves = ["priority_challenge", "scope_pressure", "urgency"]; }
    else { managerMove = "scope_pressure"; allowedManagerMoves = ["scope_pressure", "urgency", "priority_challenge"]; }
  } else {
    if ((state.challenged || state.awaitingMitigation) && has(moves, "rollback_plan", "canary_plan")) { managerMove = "resolve"; allowedManagerMoves = [managerMove]; outcome = "resolved"; }
    else if (all(moves, "provide_evidence", "impact_explained", "propose_alternative")) {
      managerMove = "challenge_once"; allowedManagerMoves = ["challenge_once", "request_mitigation"]; state.challenged = true;
    } else if (all(moves, "provide_evidence", "impact_explained")) { managerMove = "request_mitigation"; allowedManagerMoves = ["request_mitigation", "authority_pressure"]; state.awaitingMitigation = true; }
    else if (has(moves, "provide_evidence")) { managerMove = "request_impact"; allowedManagerMoves = ["request_impact", "risk_minimization"]; }
    else if (has(moves, "maintain_position")) { managerMove = "authority_pressure"; allowedManagerMoves = ["authority_pressure", "request_evidence"]; }
    else { managerMove = "risk_minimization"; allowedManagerMoves = ["risk_minimization", "request_evidence", "authority_pressure"]; }
  }
  state.ended = outcome !== "none";
  state.outcome = outcome;
  return makeTransition(scenario, managerMove, allowedManagerMoves, { ended: state.ended, outcome });
}
