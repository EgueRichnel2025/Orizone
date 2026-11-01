import { solveSimplex } from "./simplex.ts";
import type { SimplexOptions, SimplexResult } from "./simplex.ts";
import type {
  LinearConstraint,
  OptimizationProblem,
  OptimizationVariable,
} from "../types/optimization";

const DEFAULT_TOLERANCE = 1e-7;
const DEFAULT_MAX_NODES = 1_000;

export type BranchBoundStatus =
  | "optimal"
  | "infeasible"
  | "node_limit"
  | "unbounded_relaxation"
  | "iteration_limit"
  | "numerical_issue"
  | "unsupported_domain"
  | "invalid_model";

export type BranchBoundNodeStatus =
  | "pending"
  | "branched"
  | "integer"
  | "pruned_bound"
  | "pruned_infeasible"
  | "unbounded_relaxation"
  | "iteration_limit"
  | "numerical_issue";

export interface BranchBoundOptions extends SimplexOptions {
  /** Maximum number of nodes for which an LP relaxation is solved. */
  maxNodes?: number;
}

export interface BranchConstraint {
  variableIndex: number;
  variableName: string;
  operator: "<=" | ">=";
  rhs: number;
  label: string;
}

export interface BranchBoundNode {
  id: string;
  parentId: string | null;
  depth: number;
  status: BranchBoundNodeStatus;
  /** Branch decisions inherited from the root path, in chronological order. */
  branchPath: BranchConstraint[];
  /** The decision that created this node; null for the root. */
  addedConstraint: BranchConstraint | null;
  children: string[];
  relaxation: SimplexResult | null;
  /** LP relaxation objective value; a bound for the integer subproblem. */
  bound: number | null;
  branchingVariable: string | null;
  branchingValue: number | null;
  pruningReason: string | null;
}

export interface BranchBoundIncumbent {
  objectiveValue: number;
  variableValues: Record<string, number>;
  nodeId: string;
}

export interface BranchBoundStatistics {
  nodesCreated: number;
  nodesProcessed: number;
  nodesBranched: number;
  nodesPruned: number;
  integerSolutionsFound: number;
  totalSimplexPivots: number;
  elapsedMilliseconds: number;
}

export interface BranchBoundResult {
  status: BranchBoundStatus;
  message: string;
  direction: OptimizationProblem["direction"];
  rootId: string | null;
  nodes: BranchBoundNode[];
  incumbent: BranchBoundIncumbent | null;
  statistics: BranchBoundStatistics;
  notes: string[];
}

interface FractionalVariable {
  index: number;
  name: string;
  value: number;
  fractionality: number;
}

interface ValidationResult {
  message: string | null;
  status?: "invalid_model" | "unsupported_domain" | "infeasible";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateProblem(problem: OptimizationProblem): ValidationResult {
  if (!problem || (problem.direction !== "max" && problem.direction !== "min")) {
    return { message: "La direction doit être une maximisation ou une minimisation." };
  }
  if (!Array.isArray(problem.variables) || problem.variables.length === 0) {
    return { message: "Le modèle doit contenir au moins une variable." };
  }
  if (!Array.isArray(problem.objective) || problem.objective.length !== problem.variables.length) {
    return { message: "Le nombre de coefficients de l’objectif doit correspondre au nombre de variables." };
  }
  if (!problem.objective.every(isFiniteNumber)) {
    return { message: "La fonction objectif contient une valeur non finie." };
  }
  if (!Array.isArray(problem.constraints)) {
    return { message: "La liste des contraintes est invalide." };
  }

  const names = new Set<string>();
  let hasDiscreteVariable = false;

  for (const [index, variable] of problem.variables.entries()) {
    if (!variable || typeof variable.name !== "string" || variable.name.trim() === "") {
      return { message: `La variable ${index + 1} ne possède pas de nom valide.` };
    }
    if (names.has(variable.name)) {
      return { message: `Le nom ${variable.name} est utilisé par plusieurs variables. Chaque variable doit avoir un nom unique.` };
    }
    names.add(variable.name);

    if (variable.type !== "continuous" && variable.type !== "integer" && variable.type !== "binary") {
      return { message: `Le type de la variable ${variable.name} est invalide.` };
    }
    if (variable.type !== "continuous") hasDiscreteVariable = true;

    if (variable.lowerBound !== null && !isFiniteNumber(variable.lowerBound)) {
      return { message: `La borne inférieure de ${variable.name} n’est pas finie.` };
    }
    if (variable.upperBound !== null && !isFiniteNumber(variable.upperBound)) {
      return { message: `La borne supérieure de ${variable.name} n’est pas finie.` };
    }
    if (
      variable.lowerBound !== null &&
      variable.upperBound !== null &&
      variable.lowerBound > variable.upperBound
    ) {
      return { message: `La borne inférieure de ${variable.name} dépasse sa borne supérieure.` };
    }

    if (variable.type === "binary") {
      const effectiveLower = Math.max(variable.lowerBound ?? 0, 0);
      const effectiveUpper = Math.min(variable.upperBound ?? 1, 1);
      if (effectiveLower > effectiveUpper) {
        return {
          status: "infeasible",
          message: `La variable binaire ${variable.name} ne peut prendre aucune valeur de son domaine {0, 1} compte tenu de ses bornes.`,
        };
      }
    }
  }

  if (!hasDiscreteVariable) {
    return {
      status: "unsupported_domain",
      message: "Branch & Bound nécessite au moins une variable entière ou binaire. Pour un modèle entièrement continu, utilisez le Simplexe.",
    };
  }

  for (const [index, constraint] of problem.constraints.entries()) {
    if (!constraint || !Array.isArray(constraint.coefficients) || constraint.coefficients.length !== problem.variables.length) {
      return { message: `La contrainte ${index + 1} ne possède pas le bon nombre de coefficients.` };
    }
    if (!constraint.coefficients.every(isFiniteNumber) || !isFiniteNumber(constraint.rhs)) {
      return { message: `La contrainte ${index + 1} contient une valeur non finie.` };
    }
    if (constraint.operator !== "<=" && constraint.operator !== ">=" && constraint.operator !== "=") {
      return { message: `L’opérateur de la contrainte ${index + 1} est invalide.` };
    }
  }

  return { message: null };
}

function emptyStatistics(startedAt: number): BranchBoundStatistics {
  return {
    nodesCreated: 0,
    nodesProcessed: 0,
    nodesBranched: 0,
    nodesPruned: 0,
    integerSolutionsFound: 0,
    totalSimplexPivots: 0,
    elapsedMilliseconds: Math.max(0, Date.now() - startedAt),
  };
}

function resultWithoutTree(
  problem: OptimizationProblem,
  status: BranchBoundStatus,
  message: string,
  startedAt: number,
): BranchBoundResult {
  return {
    status,
    message,
    direction: problem?.direction === "min" ? "min" : "max",
    rootId: null,
    nodes: [],
    incumbent: null,
    statistics: emptyStatistics(startedAt),
    notes: [],
  };
}

function effectiveVariable(variable: OptimizationVariable): OptimizationVariable {
  if (variable.type !== "binary") {
    return { ...variable, type: "continuous" };
  }

  return {
    ...variable,
    type: "continuous",
    lowerBound: Math.max(variable.lowerBound ?? 0, 0),
    upperBound: Math.min(variable.upperBound ?? 1, 1),
  };
}

function createRelaxationProblem(
  original: OptimizationProblem,
  branchPath: BranchConstraint[],
): OptimizationProblem {
  const branchRows: LinearConstraint[] = branchPath.map((branch) => ({
    coefficients: original.variables.map((_, index) => index === branch.variableIndex ? 1 : 0),
    operator: branch.operator,
    rhs: branch.rhs,
  }));

  return {
    direction: original.direction,
    objective: [...original.objective],
    variables: original.variables.map(effectiveVariable),
    constraints: [
      ...original.constraints.map((constraint) => ({
        ...constraint,
        coefficients: [...constraint.coefficients],
      })),
      ...branchRows,
    ],
  };
}

function getFractionalVariables(
  problem: OptimizationProblem,
  values: Record<string, number>,
  tolerance: number,
): FractionalVariable[] {
  const fractional: FractionalVariable[] = [];

  problem.variables.forEach((variable, index) => {
    if (variable.type === "continuous") return;
    const value = values[variable.name];
    if (!Number.isFinite(value)) return;

    const nearestInteger = Math.round(value);
    const fractionality = Math.abs(value - nearestInteger);
    if (fractionality > tolerance) {
      fractional.push({ index, name: variable.name, value, fractionality });
    }
  });

  // Most-fractional branching: select the value furthest from an integer.
  // A stable index tie-break makes the generated tree reproducible.
  fractional.sort((left, right) => {
    const difference = right.fractionality - left.fractionality;
    return Math.abs(difference) > tolerance ? difference : left.index - right.index;
  });

  return fractional;
}

function isBetterObjective(
  direction: OptimizationProblem["direction"],
  candidate: number,
  incumbent: number | null,
  tolerance: number,
): boolean {
  if (incumbent === null) return true;
  return direction === "max"
    ? candidate > incumbent + tolerance
    : candidate < incumbent - tolerance;
}

function isBoundDominated(
  direction: OptimizationProblem["direction"],
  nodeBound: number,
  incumbent: number,
  tolerance: number,
): boolean {
  return direction === "max"
    ? nodeBound <= incumbent + tolerance
    : nodeBound >= incumbent - tolerance;
}

function createNode(
  id: string,
  parentId: string | null,
  depth: number,
  branchPath: BranchConstraint[],
  addedConstraint: BranchConstraint | null,
): BranchBoundNode {
  return {
    id,
    parentId,
    depth,
    status: "pending",
    branchPath,
    addedConstraint,
    children: [],
    relaxation: null,
    bound: null,
    branchingVariable: null,
    branchingValue: null,
    pruningReason: null,
  };
}

function createBranchConstraint(
  problem: OptimizationProblem,
  variableIndex: number,
  operator: "<=" | ">=",
  rhs: number,
): BranchConstraint {
  const variableName = problem.variables[variableIndex].name;
  const relation = operator === "<=" ? "≤" : "≥";
  return {
    variableIndex,
    variableName,
    operator,
    rhs,
    label: `${variableName} ${relation} ${rhs}`,
  };
}

/**
 * Résout un problème linéaire mixte par Branch & Bound.
 * Chaque nœud est évalué par une relaxation continue résolue avec le moteur Simplexe.
 * Les relaxations et leurs tableaux complets sont conservés dans l'arbre retourné.
 *
 * Par prudence, une relaxation LP non bornée ou un incident numérique interrompt
 * la certification : cela n'est pas présenté à tort comme une preuve d'infaisabilité
 * ou de non-bornitude du problème entier.
 */
export function solveBranchBound(
  problem: OptimizationProblem,
  options: BranchBoundOptions = {},
): BranchBoundResult {
  const startedAt = Date.now();
  const validation = validateProblem(problem);
  if (validation.message) {
    const status = validation.status ?? "invalid_model";
    return resultWithoutTree(problem, status, validation.message, startedAt);
  }

  const tolerance = Number.isFinite(options.tolerance) && (options.tolerance ?? 0) > 0
    ? options.tolerance as number
    : DEFAULT_TOLERANCE;
  const maxNodes = Number.isInteger(options.maxNodes) && (options.maxNodes ?? 0) > 0
    ? options.maxNodes as number
    : DEFAULT_MAX_NODES;
  const simplexOptions: SimplexOptions = {
    ...(Number.isInteger(options.maxIterations) && (options.maxIterations ?? 0) > 0
      ? { maxIterations: options.maxIterations }
      : {}),
    tolerance,
  };

  const nodes: BranchBoundNode[] = [];
  const stack: BranchBoundNode[] = [];
  const notes: string[] = [];
  let incumbent: BranchBoundIncumbent | null = null;
  let abortStatus: BranchBoundStatus | null = null;
  let abortMessage: string | null = null;
  let nodesProcessed = 0;
  let nodesBranched = 0;
  let nodesPruned = 0;
  let integerSolutionsFound = 0;
  let totalSimplexPivots = 0;

  const root = createNode("N0", null, 0, [], null);
  nodes.push(root);
  stack.push(root);

  while (stack.length > 0) {
    if (nodesProcessed >= maxNodes) {
      abortStatus = "node_limit";
      abortMessage = `La limite de ${maxNodes} nœuds a été atteinte. La meilleure solution trouvée est conservée, mais l’optimalité globale n’est pas certifiée.`;
      break;
    }

    const node = stack.pop();
    if (!node) break;

    nodesProcessed += 1;
    const relaxationProblem = createRelaxationProblem(problem, node.branchPath);
    const relaxation = solveSimplex(relaxationProblem, simplexOptions);
    node.relaxation = relaxation;
    totalSimplexPivots += relaxation.totalPivots;

    if (relaxation.status === "infeasible") {
      node.status = "pruned_infeasible";
      node.pruningReason = "La relaxation continue de ce sous-problème est irréalisable ; le sous-problème entier l’est donc également.";
      nodesPruned += 1;
      continue;
    }

    if (relaxation.status === "unbounded") {
      node.status = "unbounded_relaxation";
      node.pruningReason = "La relaxation continue est non bornée. Cette information seule ne suffit pas à certifier le statut du problème entier.";
      abortStatus = "unbounded_relaxation";
      abortMessage = `La relaxation du nœud ${node.id} est non bornée. Le moteur s’arrête sans conclure abusivement que le problème en variables entières est lui-même non borné.`;
      break;
    }

    if (relaxation.status === "iteration_limit") {
      node.status = "iteration_limit";
      node.pruningReason = "La relaxation Simplexe a atteint sa limite d’itérations ; la borne de ce nœud n’est pas certifiée.";
      abortStatus = "iteration_limit";
      abortMessage = `La résolution de la relaxation du nœud ${node.id} a atteint sa limite d’itérations.`;
      break;
    }

    if (relaxation.status !== "optimal" || relaxation.objectiveValue === undefined || !relaxation.variableValues) {
      node.status = "numerical_issue";
      node.pruningReason = relaxation.message;
      abortStatus = "numerical_issue";
      abortMessage = `La relaxation du nœud ${node.id} n’a pas pu être certifiée : ${relaxation.message}`;
      break;
    }

    const bound = relaxation.objectiveValue;
    node.bound = bound;

    if (
      incumbent !== null &&
      isBoundDominated(problem.direction, bound, incumbent.objectiveValue, tolerance)
    ) {
      node.status = "pruned_bound";
      node.pruningReason = problem.direction === "max"
        ? `La borne supérieure ${bound} ne dépasse pas la meilleure solution entière connue (${incumbent.objectiveValue}).`
        : `La borne inférieure ${bound} ne peut améliorer la meilleure solution entière connue (${incumbent.objectiveValue}).`;
      nodesPruned += 1;
      continue;
    }

    const fractionalVariables = getFractionalVariables(
      problem,
      relaxation.variableValues,
      tolerance,
    );

    if (fractionalVariables.length === 0) {
      const candidate: BranchBoundIncumbent = {
        objectiveValue: bound,
        variableValues: { ...relaxation.variableValues },
        nodeId: node.id,
      };
      integerSolutionsFound += 1;

      if (isBetterObjective(problem.direction, candidate.objectiveValue, incumbent?.objectiveValue ?? null, tolerance)) {
        incumbent = candidate;
      }

      node.status = "integer";
      node.pruningReason = "Toutes les variables entières/binaires prennent une valeur entière dans la solution de la relaxation. Ce nœud fournit une solution admissible pour le problème initial.";
      continue;
    }

    const selected = fractionalVariables[0];
    node.status = "branched";
    node.branchingVariable = selected.name;
    node.branchingValue = selected.value;
    nodesBranched += 1;

    const floorValue = Math.floor(selected.value);
    const ceilValue = Math.ceil(selected.value);
    const leftConstraint = createBranchConstraint(problem, selected.index, "<=", floorValue);
    const rightConstraint = createBranchConstraint(problem, selected.index, ">=", ceilValue);
    const leftNode = createNode(
      `N${nodes.length}`,
      node.id,
      node.depth + 1,
      [...node.branchPath, leftConstraint],
      leftConstraint,
    );
    nodes.push(leftNode);
    const rightNode = createNode(
      `N${nodes.length}`,
      node.id,
      node.depth + 1,
      [...node.branchPath, rightConstraint],
      rightConstraint,
    );
    nodes.push(rightNode);
    node.children = [leftNode.id, rightNode.id];

    // DFS, left branch first: push right before left on the LIFO stack.
    stack.push(rightNode, leftNode);
  }

  const elapsedMilliseconds = Math.max(0, Date.now() - startedAt);
  const statistics: BranchBoundStatistics = {
    nodesCreated: nodes.length,
    nodesProcessed,
    nodesBranched,
    nodesPruned,
    integerSolutionsFound,
    totalSimplexPivots,
    elapsedMilliseconds,
  };

  if (abortStatus !== null) {
    return {
      status: abortStatus,
      message: abortMessage ?? "La recherche s’est arrêtée avant de pouvoir certifier l’optimalité.",
      direction: problem.direction,
      rootId: root.id,
      nodes,
      incumbent,
      statistics,
      notes,
    };
  }

  if (incumbent === null) {
    return {
      status: "infeasible",
      message: "Aucune solution entière ou binaire admissible n’a été trouvée après l’exploration complète de l’arbre.",
      direction: problem.direction,
      rootId: root.id,
      nodes,
      incumbent: null,
      statistics,
      notes,
    };
  }

  return {
    status: "optimal",
    message: "L’arbre a été exploré ou élagué par bornes. La meilleure solution entière trouvée est certifiée optimale.",
    direction: problem.direction,
    rootId: root.id,
    nodes,
    incumbent,
    statistics,
    notes,
  };
}
