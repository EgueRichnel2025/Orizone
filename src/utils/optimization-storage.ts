import type {
  ConstraintOperator,
  OptimizationProblem,
  OptimizationVariable,
  VariableType,
} from "../types/optimization";

export const OPTIMIZATION_PROBLEM_STORAGE_KEY = "orizone-current-problem";
export const OPTIMIZATION_RUN_ID_STORAGE_KEY = "orizone-current-problem-run-id";

let memoryFallback: OptimizationProblem | null = null;
let memoryRunId: string | null = null;

function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Identifiant stable de la validation courante, partagé par les pages de résolution. */
export function getOrCreateOptimizationRunId(): string {
  if (memoryRunId) return memoryRunId;
  try {
    const stored = window.localStorage.getItem(OPTIMIZATION_RUN_ID_STORAGE_KEY);
    if (stored) { memoryRunId = stored; return stored; }
  } catch {
    // Le repli mémoire permet de continuer pendant la session courante.
  }
  memoryRunId = createRunId();
  try { window.localStorage.setItem(OPTIMIZATION_RUN_ID_STORAGE_KEY, memoryRunId); } catch { /* repli mémoire */ }
  return memoryRunId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isVariableType(value: unknown): value is VariableType {
  return value === "continuous" || value === "integer" || value === "binary";
}

function isOperator(value: unknown): value is ConstraintOperator {
  return value === "<=" || value === ">=" || value === "=";
}

function isOptimizationProblem(value: unknown): value is OptimizationProblem {
  if (!isRecord(value)) return false;
  if (value.direction !== "max" && value.direction !== "min") return false;
  if (!Array.isArray(value.objective) || !value.objective.every(isFiniteNumber)) return false;
  if (!Array.isArray(value.variables) || value.variables.length !== value.objective.length) return false;
  if (!Array.isArray(value.constraints)) return false;

  const variableCount = value.variables.length;

  const variablesValid = value.variables.every((item): item is OptimizationVariable => {
    if (!isRecord(item)) return false;
    return (
      typeof item.name === "string" &&
      isVariableType(item.type) &&
      isNullableFiniteNumber(item.lowerBound) &&
      isNullableFiniteNumber(item.upperBound)
    );
  });

  if (!variablesValid) return false;

  return value.constraints.every((item) => {
    if (!isRecord(item) || !Array.isArray(item.coefficients)) return false;
    return (
      item.coefficients.length === variableCount &&
      item.coefficients.every(isFiniteNumber) &&
      isOperator(item.operator) &&
      isFiniteNumber(item.rhs)
    );
  });
}

/**
 * Enregistre le dernier modèle validé. Le stockage mémoire sert de repli
 * si le navigateur désactive localStorage pendant la session courante.
 */
export function saveOptimizationProblem(problem: OptimizationProblem): boolean {
  memoryFallback = problem;
  memoryRunId = createRunId();

  try {
    window.localStorage.setItem(
      OPTIMIZATION_PROBLEM_STORAGE_KEY,
      JSON.stringify(problem),
    );
    window.localStorage.setItem(OPTIMIZATION_RUN_ID_STORAGE_KEY, memoryRunId);
    return true;
  } catch {
    return false;
  }
}

export function loadOptimizationProblem(): OptimizationProblem | null {
  try {
    const serialized = window.localStorage.getItem(OPTIMIZATION_PROBLEM_STORAGE_KEY);
    if (serialized) {
      const parsed: unknown = JSON.parse(serialized);
      if (isOptimizationProblem(parsed)) {
        memoryFallback = parsed;
        return parsed;
      }
    }
  } catch {
    // La copie en mémoire peut encore être utilisée pendant cette session.
  }

  return memoryFallback;
}

export function clearStoredOptimizationProblem(): void {
  memoryFallback = null;
  memoryRunId = null;

  try {
    window.localStorage.removeItem(OPTIMIZATION_PROBLEM_STORAGE_KEY);
    window.localStorage.removeItem(OPTIMIZATION_RUN_ID_STORAGE_KEY);
  } catch {
    // Le formulaire reste utilisable même si localStorage est indisponible.
  }
}
