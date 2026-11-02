/** Shared evaluator helpers (safe for browser and server). */

export const EVALUATOR_EMAIL = "evaluator@fresh-track.in";

/** localStorage key that marks an unlocked evaluator session. */
export const EVALUATOR_FLAG = "freshtrack.evaluator";

export function isEvaluatorUser(email?: string | null) {
  return Boolean(email) && email!.toLowerCase() === EVALUATOR_EMAIL;
}

export function isEvaluatorSession() {
  try {
    return localStorage.getItem(EVALUATOR_FLAG) === "1";
  } catch {
    return false;
  }
}

export function markEvaluatorSession() {
  try {
    localStorage.setItem(EVALUATOR_FLAG, "1");
  } catch {
    /* private browsing - ignore */
  }
}

export function clearEvaluatorSession() {
  try {
    localStorage.removeItem(EVALUATOR_FLAG);
  } catch {
    /* ignore */
  }
}
