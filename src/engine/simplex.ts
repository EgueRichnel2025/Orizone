import type {
  ConstraintOperator,
  OptimizationProblem,
  OptimizationVariable,
} from "../types/optimization";

const DEFAULT_TOLERANCE = 1e-9;
const DEFAULT_MAX_ITERATIONS = 500;

export type SimplexStatus =
  | "optimal"
  | "infeasible"
  | "unbounded"
  | "iteration_limit"
  | "unsupported_domain"
  | "invalid_model"
  | "numerical_issue";

export interface SimplexOptions {
  maxIterations?: number;
  tolerance?: number;
}

export interface SimplexIteration {
  phase: 1 | 2;
  iteration: number;
  columns: string[];
  basis: string[];
  /** Each row contains one value per column, followed by the RHS. */
  tableau: number[][];
  /** Reduced costs c_j - z_j, in the same order as columns. */
  reducedCosts: number[];
  objectiveValue: number;
  enteringVariable: string | null;
  leavingVariable: string | null;
  pivotValue: number | null;
  /** Ratio test for each row; null means that the row is not eligible. */
  ratioTests: Array<number | null>;
  explanation: string;
}

export interface SimplexResult {
  status: SimplexStatus;
  message: string;
  direction: OptimizationProblem["direction"];
  objectiveValue?: number;
  variableValues?: Record<string, number>;
  iterations: SimplexIteration[];
  totalPivots: number;
  notes: string[];
}

interface Column {
  name: string;
  kind: "decision" | "slack" | "surplus" | "artificial";
  phaseTwoCost: number;
}

interface TransformationTerm {
  columnIndex: number;
  name: string;
  coefficient: number;
}

interface VariableTransformation {
  variable: OptimizationVariable;
  offset: number;
  terms: TransformationTerm[];
}

interface WorkingConstraint {
  coefficients: number[];
  operator: ConstraintOperator;
  rhs: number;
  label: string;
}

interface OptimizeOutcome {
  status: "optimal" | "unbounded" | "iteration_limit";
  pivots: number;
}

function nearZero(value: number, tolerance: number): number {
  return Math.abs(value) <= tolerance ? 0 : value;
}

function cleanNumber(value: number, tolerance: number): number {
  const threshold = Math.max(tolerance * 10, 1e-10);
  return Math.abs(value) <= threshold ? 0 : value;
}

function flipOperator(operator: ConstraintOperator): ConstraintOperator {
  if (operator === "<=") return ">=";
  if (operator === ">=") return "<=";
  return "=";
}

function invalidResult(
  problem: OptimizationProblem,
  message: string,
  status: "invalid_model" | "unsupported_domain" = "invalid_model",
): SimplexResult {
  return {
    status,
    message,
    direction: problem.direction,
    iterations: [],
    totalPivots: 0,
    notes: [],
  };
}

function validateProblem(problem: OptimizationProblem): string | null {
  if (problem.direction !== "max" && problem.direction !== "min") {
    return "La direction doit être une maximisation ou une minimisation.";
  }
  if (!Array.isArray(problem.variables) || problem.variables.length === 0) {
    return "Le modèle doit contenir au moins une variable.";
  }
  if (!Array.isArray(problem.objective) || problem.objective.length !== problem.variables.length) {
    return "Le nombre de coefficients de la fonction objectif doit correspondre au nombre de variables.";
  }
  if (!problem.objective.every(Number.isFinite)) {
    return "La fonction objectif contient un coefficient qui n’est pas un nombre fini.";
  }
  if (!Array.isArray(problem.constraints)) {
    return "La liste des contraintes est invalide.";
  }

  for (const [index, variable] of problem.variables.entries()) {
    if (!variable.name || typeof variable.name !== "string") {
      return `La variable ${index + 1} ne possède pas de nom valide.`;
    }
    if (variable.type !== "continuous" && variable.type !== "integer" && variable.type !== "binary") {
      return `Le type de la variable ${variable.name} est inconnu.`;
    }
    if (variable.lowerBound !== null && !Number.isFinite(variable.lowerBound)) {
      return `La borne inférieure de ${variable.name} n’est pas finie.`;
    }
    if (variable.upperBound !== null && !Number.isFinite(variable.upperBound)) {
      return `La borne supérieure de ${variable.name} n’est pas finie.`;
    }
    if (
      variable.lowerBound !== null &&
      variable.upperBound !== null &&
      variable.lowerBound > variable.upperBound
    ) {
      return `La borne inférieure de ${variable.name} dépasse sa borne supérieure.`;
    }
  }

  for (const [index, constraint] of problem.constraints.entries()) {
    if (constraint.coefficients.length !== problem.variables.length) {
      return `La contrainte ${index + 1} ne possède pas le bon nombre de coefficients.`;
    }
    if (!constraint.coefficients.every(Number.isFinite) || !Number.isFinite(constraint.rhs)) {
      return `La contrainte ${index + 1} contient une valeur non finie.`;
    }
    if (constraint.operator !== "<=" && constraint.operator !== ">=" && constraint.operator !== "=") {
      return `L’opérateur de la contrainte ${index + 1} est invalide.`;
    }
  }

  return null;
}

function createTransformations(
  problem: OptimizationProblem,
  tolerance: number,
): { columns: Column[]; transformations: VariableTransformation[]; objectiveConstant: number; boundConstraints: WorkingConstraint[] } {
  const directionMultiplier = problem.direction === "max" ? 1 : -1;
  const columns: Column[] = [];
  const transformations: VariableTransformation[] = [];
  const boundConstraints: WorkingConstraint[] = [];
  let objectiveConstant = 0;

  problem.variables.forEach((variable, variableIndex) => {
    const objectiveCoefficient = problem.objective[variableIndex];
    let offset = 0;
    const terms: TransformationTerm[] = [];

    const addTerm = (name: string, coefficient: number) => {
      const columnIndex = columns.length;
      columns.push({
        name,
        kind: "decision",
        phaseTwoCost: directionMultiplier * objectiveCoefficient * coefficient,
      });
      terms.push({ columnIndex, name, coefficient });
    };

    if (variable.lowerBound !== null) {
      offset = variable.lowerBound;
      const name = Math.abs(variable.lowerBound) <= tolerance
        ? variable.name
        : `y${variableIndex + 1}`;
      addTerm(name, 1);

      if (variable.upperBound !== null) {
        const width = variable.upperBound - variable.lowerBound;
        if (width < -tolerance) {
          throw new Error(`Les bornes de ${variable.name} sont incompatibles.`);
        }
        boundConstraints.push({
          coefficients: Array.from({ length: problem.variables.length }, (_, index) => index === variableIndex ? 1 : 0),
          operator: "<=",
          rhs: Math.max(0, width),
          label: `Borne supérieure de ${variable.name}`,
        });
      }
    } else if (variable.upperBound !== null) {
      offset = variable.upperBound;
      addTerm(`y${variableIndex + 1}`, -1);
    } else {
      addTerm(`${variable.name}+`, 1);
      addTerm(`${variable.name}−`, -1);
    }

    objectiveConstant += directionMultiplier * objectiveCoefficient * offset;
    transformations.push({ variable, offset, terms });
  });

  // The stored bound rows are expressed in original-variable positions;
  // their coefficients are converted to transformed-variable columns below.
  return { columns, transformations, objectiveConstant, boundConstraints };
}

function transformConstraints(
  problem: OptimizationProblem,
  transformations: VariableTransformation[],
  decisionColumnCount: number,
): WorkingConstraint[] {
  const working: WorkingConstraint[] = [];

  problem.constraints.forEach((constraint, constraintIndex) => {
    const coefficients = Array.from({ length: decisionColumnCount }, () => 0);
    let rhs = constraint.rhs;

    transformations.forEach((transformation, originalIndex) => {
      const originalCoefficient = constraint.coefficients[originalIndex];
      rhs -= originalCoefficient * transformation.offset;
      transformation.terms.forEach((term) => {
        coefficients[term.columnIndex] += originalCoefficient * term.coefficient;
      });
    });

    working.push({
      coefficients,
      operator: constraint.operator,
      rhs,
      label: `Contrainte ${constraintIndex + 1}`,
    });
  });

  return working;
}

function transformBoundConstraints(
  boundConstraints: WorkingConstraint[],
  transformations: VariableTransformation[],
  decisionColumnCount: number,
): WorkingConstraint[] {
  return boundConstraints.map((bound) => {
    const coefficients = Array.from({ length: decisionColumnCount }, () => 0);
    bound.coefficients.forEach((originalCoefficient, originalIndex) => {
      transformations[originalIndex].terms.forEach((term) => {
        coefficients[term.columnIndex] += originalCoefficient * term.coefficient;
      });
    });
    return { ...bound, coefficients };
  });
}

function normalizeConstraints(
  constraints: WorkingConstraint[],
  tolerance: number,
): WorkingConstraint[] {
  return constraints.map((constraint) => {
    const coefficients = constraint.coefficients.map((value) => nearZero(value, tolerance));
    let rhs = nearZero(constraint.rhs, tolerance);
    let operator = constraint.operator;

    if (rhs < -tolerance) {
      rhs = -rhs;
      operator = flipOperator(operator);
      for (let index = 0; index < coefficients.length; index += 1) {
        coefficients[index] = -coefficients[index];
      }
    }

    return { ...constraint, coefficients, operator, rhs };
  });
}

function buildInitialTableau(
  constraints: WorkingConstraint[],
  columns: Column[],
): { tableau: number[][]; basis: number[]; columns: Column[] } {
  const matrix = constraints.map((constraint) => [...constraint.coefficients]);
  const rhs = constraints.map((constraint) => constraint.rhs);
  const basis: number[] = [];

  const addColumn = (name: string, kind: Column["kind"], cost = 0): number => {
    const newIndex = columns.length;
    columns.push({ name, kind, phaseTwoCost: cost });
    matrix.forEach((row) => row.push(0));
    return newIndex;
  };

  constraints.forEach((constraint, rowIndex) => {
    if (constraint.operator === "<=") {
      const slack = addColumn(`s${rowIndex + 1}`, "slack");
      matrix[rowIndex][slack] = 1;
      basis[rowIndex] = slack;
      return;
    }

    if (constraint.operator === ">=") {
      const surplus = addColumn(`e${rowIndex + 1}`, "surplus");
      matrix[rowIndex][surplus] = -1;
    }

    const artificial = addColumn(`a${rowIndex + 1}`, "artificial");
    matrix[rowIndex][artificial] = 1;
    basis[rowIndex] = artificial;
  });

  const tableau = matrix.map((row, index) => [...row, rhs[index]]);
  return { tableau, basis, columns };
}

function calculateReducedCosts(
  tableau: number[][],
  basis: number[],
  costs: number[],
  columnCount: number,
  tolerance: number,
): number[] {
  const reduced = costs.slice(0, columnCount);

  for (let rowIndex = 0; rowIndex < tableau.length; rowIndex += 1) {
    const basisCost = costs[basis[rowIndex]] ?? 0;
    if (Math.abs(basisCost) <= tolerance) continue;

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      reduced[columnIndex] -= basisCost * tableau[rowIndex][columnIndex];
    }
  }

  return reduced.map((value) => nearZero(value, tolerance));
}

function currentObjectiveValue(
  tableau: number[][],
  basis: number[],
  costs: number[],
  objectiveConstant: number,
): number {
  let value = objectiveConstant;
  tableau.forEach((row, rowIndex) => {
    value += (costs[basis[rowIndex]] ?? 0) * row[row.length - 1];
  });
  return value;
}

function appendSnapshot(
  iterations: SimplexIteration[],
  phase: 1 | 2,
  tableau: number[][],
  basis: number[],
  columns: Column[],
  costs: number[],
  objectiveConstant: number,
  tolerance: number,
  enteringIndex: number | null,
  leavingRow: number | null,
  ratioTests: Array<number | null>,
  explanation: string,
): void {
  const reducedCosts = calculateReducedCosts(
    tableau,
    basis,
    costs,
    columns.length,
    tolerance,
  );

  iterations.push({
    phase,
    iteration: iterations.filter((item) => item.phase === phase).length + 1,
    columns: columns.map((column) => column.name),
    basis: basis.map((index) => columns[index]?.name ?? "?"),
    tableau: tableau.map((row) => row.map((value) => cleanNumber(value, tolerance))),
    reducedCosts: reducedCosts.map((value) => cleanNumber(value, tolerance)),
    objectiveValue: cleanNumber(
      currentObjectiveValue(tableau, basis, costs, objectiveConstant),
      tolerance,
    ),
    enteringVariable: enteringIndex === null ? null : columns[enteringIndex]?.name ?? null,
    leavingVariable: leavingRow === null ? null : columns[basis[leavingRow]]?.name ?? null,
    pivotValue:
      enteringIndex === null || leavingRow === null
        ? null
        : cleanNumber(tableau[leavingRow][enteringIndex], tolerance),
    ratioTests: ratioTests.map((value) => value === null ? null : cleanNumber(value, tolerance)),
    explanation,
  });
}

function pivotTableau(
  tableau: number[][],
  basis: number[],
  pivotRow: number,
  pivotColumn: number,
  tolerance: number,
): void {
  const pivot = tableau[pivotRow][pivotColumn];
  if (Math.abs(pivot) <= tolerance) {
    throw new Error("Pivot numériquement nul.");
  }

  for (let column = 0; column < tableau[pivotRow].length; column += 1) {
    tableau[pivotRow][column] /= pivot;
  }

  for (let row = 0; row < tableau.length; row += 1) {
    if (row === pivotRow) continue;
    const factor = tableau[row][pivotColumn];
    if (Math.abs(factor) <= tolerance) {
      tableau[row][pivotColumn] = 0;
      continue;
    }

    for (let column = 0; column < tableau[row].length; column += 1) {
      tableau[row][column] -= factor * tableau[pivotRow][column];
    }
  }

  basis[pivotRow] = pivotColumn;

  for (const row of tableau) {
    for (let column = 0; column < row.length; column += 1) {
      row[column] = nearZero(row[column], tolerance * 0.1);
    }
  }
}

function optimizeTableau(
  tableau: number[][],
  basis: number[],
  columns: Column[],
  costs: number[],
  phase: 1 | 2,
  objectiveConstant: number,
  iterations: SimplexIteration[],
  maxIterations: number,
  tolerance: number,
): OptimizeOutcome {
  let pivots = 0;

  while (true) {
    const reducedCosts = calculateReducedCosts(
      tableau,
      basis,
      costs,
      columns.length,
      tolerance,
    );

    const basicSet = new Set(basis);
    // Bland's rule: choose the first eligible non-basic column.
    const enteringIndex = columns.findIndex(
      (_, index) => !basicSet.has(index) && reducedCosts[index] > tolerance,
    );

    if (enteringIndex < 0) {
      appendSnapshot(
        iterations,
        phase,
        tableau,
        basis,
        columns,
        costs,
        objectiveConstant,
        tolerance,
        null,
        null,
        tableau.map(() => null),
        phase === 1
          ? "La phase I a atteint son optimum : on vérifie si toutes les variables artificielles peuvent être annulées."
          : "Aucun coût réduit positif ne subsiste : le tableau est optimal pour le modèle transformé.",
      );
      return { status: "optimal", pivots };
    }

    if (pivots >= maxIterations) {
      appendSnapshot(
        iterations,
        phase,
        tableau,
        basis,
        columns,
        costs,
        objectiveConstant,
        tolerance,
        enteringIndex,
        null,
        tableau.map(() => null),
        `La limite de ${maxIterations} pivots a été atteinte. La résolution doit être poursuivie ou examinée.`,
      );
      return { status: "iteration_limit", pivots };
    }

    const ratios = tableau.map((row) => {
      const coefficient = row[enteringIndex];
      if (coefficient <= tolerance) return null;
      return Math.max(0, row[row.length - 1]) / coefficient;
    });

    const eligibleRows = ratios
      .map((ratio, rowIndex) => ({ ratio, rowIndex }))
      .filter((item): item is { ratio: number; rowIndex: number } => item.ratio !== null);

    if (eligibleRows.length === 0) {
      appendSnapshot(
        iterations,
        phase,
        tableau,
        basis,
        columns,
        costs,
        objectiveConstant,
        tolerance,
        enteringIndex,
        null,
        ratios,
        `La variable ${columns[enteringIndex].name} peut augmenter sans qu’aucune contrainte de base ne limite son mouvement : l’objectif est non borné dans cette direction.`,
      );
      return { status: "unbounded", pivots };
    }

    const minimumRatio = Math.min(...eligibleRows.map((item) => item.ratio));
    const tiedRows = eligibleRows.filter(
      (item) => Math.abs(item.ratio - minimumRatio) <= tolerance,
    );
    // Bland tie-breaker helps avoid cycling in degenerate tableaux.
    tiedRows.sort((left, right) => basis[left.rowIndex] - basis[right.rowIndex]);
    const leavingRow = tiedRows[0].rowIndex;
    const leavingVariable = columns[basis[leavingRow]].name;
    const pivotValue = tableau[leavingRow][enteringIndex];

    appendSnapshot(
      iterations,
      phase,
      tableau,
      basis,
      columns,
      costs,
      objectiveConstant,
      tolerance,
      enteringIndex,
      leavingRow,
      ratios,
      `La variable entrante est ${columns[enteringIndex].name}. Le test des rapports positifs fait sortir ${leavingVariable} ; le pivot vaut ${cleanNumber(pivotValue, tolerance)}.`,
    );

    pivotTableau(tableau, basis, leavingRow, enteringIndex, tolerance);
    pivots += 1;
  }
}

function removeArtificialBasics(
  tableau: number[][],
  basis: number[],
  columns: Column[],
  phaseOneCosts: number[],
  iterations: SimplexIteration[],
  notes: string[],
  tolerance: number,
): { tableau: number[][]; basis: number[]; columns: Column[] } | null {
  for (let rowIndex = 0; rowIndex < basis.length;) {
    const basicColumn = columns[basis[rowIndex]];
    if (basicColumn?.kind !== "artificial") {
      rowIndex += 1;
      continue;
    }

    const rhs = tableau[rowIndex][tableau[rowIndex].length - 1];
    if (Math.abs(rhs) > tolerance * 10) return null;

    const basicSet = new Set(basis);
    let replacement = -1;

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      if (columns[columnIndex].kind === "artificial" || basicSet.has(columnIndex)) continue;
      if (Math.abs(tableau[rowIndex][columnIndex]) > tolerance) {
        replacement = columnIndex;
        break;
      }
    }

    if (replacement >= 0) {
      appendSnapshot(
        iterations,
        1,
        tableau,
        basis,
        columns,
        phaseOneCosts,
        0,
        tolerance,
        replacement,
        rowIndex,
        tableau.map(() => null),
        `La variable artificielle ${basicColumn.name} vaut zéro et sort de la base pour préparer la phase II ; ${columns[replacement].name} la remplace.`,
      );
      pivotTableau(tableau, basis, rowIndex, replacement, tolerance);
      rowIndex += 1;
    } else {
      notes.push(`La ligne liée à ${basicColumn.name} est redondante après la phase I ; elle est retirée du tableau.`);
      tableau.splice(rowIndex, 1);
      basis.splice(rowIndex, 1);
    }
  }

  const retainedIndices = columns
    .map((column, index) => ({ column, index }))
    .filter((item) => item.column.kind !== "artificial");
  const oldToNew = new Map<number, number>();
  retainedIndices.forEach((item, newIndex) => oldToNew.set(item.index, newIndex));

  const newTableau = tableau.map((row) => [
    ...retainedIndices.map((item) => row[item.index]),
    row[row.length - 1],
  ]);
  const newBasis = basis.map((index) => oldToNew.get(index) ?? -1);

  if (newBasis.some((index) => index < 0)) return null;

  return {
    tableau: newTableau,
    basis: newBasis,
    columns: retainedIndices.map((item) => item.column),
  };
}

function calculateOriginalValues(
  problem: OptimizationProblem,
  transformations: VariableTransformation[],
  tableau: number[][],
  basis: number[],
  columns: Column[],
  tolerance: number,
): Record<string, number> {
  const transformedValues = Array.from({ length: columns.length }, () => 0);

  basis.forEach((columnIndex, rowIndex) => {
    if (columns[columnIndex]?.kind === "decision") {
      transformedValues[columnIndex] = Math.max(
        0,
        tableau[rowIndex][tableau[rowIndex].length - 1],
      );
    }
  });

  const values: Record<string, number> = {};
  transformations.forEach((transformation) => {
    const value = transformation.offset + transformation.terms.reduce(
      (sum, term) => sum + term.coefficient * (transformedValues[term.columnIndex] ?? 0),
      0,
    );
    values[transformation.variable.name] = cleanNumber(value, tolerance);
  });

  // Keep the original variable order and names even if names are repeated in malformed input.
  problem.variables.forEach((variable, index) => {
    if (!(variable.name in values)) values[variable.name] = cleanNumber(transformations[index].offset, tolerance);
  });

  return values;
}

/**
 * Résout un problème de programmation linéaire continue par Simplexe à deux phases.
 * Les domaines entiers/binaires sont volontairement refusés : ils relèvent de Branch & Bound.
 * Les bornes continues peuvent être absentes, simples, ou doubles.
 */
export function solveSimplex(
  problem: OptimizationProblem,
  options: SimplexOptions = {},
): SimplexResult {
  const validationMessage = validateProblem(problem);
  if (validationMessage) return invalidResult(problem, validationMessage);

  const discreteVariable = problem.variables.find((variable) => variable.type !== "continuous");
  if (discreteVariable) {
    return invalidResult(
      problem,
      `La variable ${discreteVariable.name} est ${discreteVariable.type === "integer" ? "entière" : "binaire"}. Le Simplexe continu ne garantit pas une solution entière ; utilisez le moteur Branch & Bound.`,
      "unsupported_domain",
    );
  }

  const tolerance = Number.isFinite(options.tolerance) && (options.tolerance ?? 0) > 0
    ? options.tolerance as number
    : DEFAULT_TOLERANCE;
  const maxIterations = Number.isInteger(options.maxIterations) && (options.maxIterations ?? 0) > 0
    ? options.maxIterations as number
    : DEFAULT_MAX_ITERATIONS;

  const iterations: SimplexIteration[] = [];
  const notes: string[] = [];
  let totalPivots = 0;

  try {
    const transformed = createTransformations(problem, tolerance);
    const decisionColumnCount = transformed.columns.length;
    const transformedUserConstraints = transformConstraints(
      problem,
      transformed.transformations,
      decisionColumnCount,
    );
    const transformedBounds = transformBoundConstraints(
      transformed.boundConstraints,
      transformed.transformations,
      decisionColumnCount,
    );
    const normalized = normalizeConstraints(
      [...transformedUserConstraints, ...transformedBounds],
      tolerance,
    );
    const built = buildInitialTableau(normalized, transformed.columns);
    let tableau = built.tableau;
    let basis = built.basis;
    let columns = built.columns;

    const phaseOneCosts = columns.map((column) => column.kind === "artificial" ? -1 : 0);
    const phaseOne = optimizeTableau(
      tableau,
      basis,
      columns,
      phaseOneCosts,
      1,
      0,
      iterations,
      maxIterations,
      tolerance,
    );
    totalPivots += phaseOne.pivots;

    if (phaseOne.status === "iteration_limit") {
      return {
        status: "iteration_limit",
        message: "La limite d’itérations a été atteinte pendant la phase I ; la faisabilité n’a pas pu être établie.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    if (phaseOne.status === "unbounded") {
      return {
        status: "numerical_issue",
        message: "La phase I a rencontré un comportement inattendu. Vérifiez les coefficients et la tolérance numérique.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    const phaseOneObjective = currentObjectiveValue(tableau, basis, phaseOneCosts, 0);
    if (phaseOneObjective < -tolerance * 10) {
      return {
        status: "infeasible",
        message: "Le modèle ne possède pas de solution réalisable : la phase I n’a pas pu annuler toutes les variables artificielles.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    const cleaned = removeArtificialBasics(
      tableau,
      basis,
      columns,
      phaseOneCosts,
      iterations,
      notes,
      tolerance,
    );

    if (!cleaned) {
      return {
        status: "numerical_issue",
        message: "Une variable artificielle reste non nulle après la phase I. Le modèle doit être vérifié numériquement.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    tableau = cleaned.tableau;
    basis = cleaned.basis;
    columns = cleaned.columns;

    const phaseTwoCosts = columns.map((column) => column.phaseTwoCost);
    const phaseTwo = optimizeTableau(
      tableau,
      basis,
      columns,
      phaseTwoCosts,
      2,
      transformed.objectiveConstant,
      iterations,
      maxIterations,
      tolerance,
    );
    totalPivots += phaseTwo.pivots;

    if (phaseTwo.status === "unbounded") {
      return {
        status: "unbounded",
        message: "La fonction objectif peut s’améliorer sans limite tout en respectant les contraintes du modèle.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    if (phaseTwo.status === "iteration_limit") {
      return {
        status: "iteration_limit",
        message: "La limite d’itérations a été atteinte avant de certifier l’optimalité.",
        direction: problem.direction,
        iterations,
        totalPivots,
        notes,
      };
    }

    const variableValues = calculateOriginalValues(
      problem,
      transformed.transformations,
      tableau,
      basis,
      columns,
      tolerance,
    );
    const objectiveValue = cleanNumber(
      problem.objective.reduce(
        (sum, coefficient, index) => sum + coefficient * (variableValues[problem.variables[index].name] ?? 0),
        0,
      ),
      tolerance,
    );

    // Explicitly check the returned solution against the original model.
    for (const constraint of problem.constraints) {
      const lhs = constraint.coefficients.reduce(
        (sum, coefficient, index) => sum + coefficient * (variableValues[problem.variables[index].name] ?? 0),
        0,
      );
      const violation = constraint.operator === "<="
        ? lhs - constraint.rhs
        : constraint.operator === ">="
          ? constraint.rhs - lhs
          : Math.abs(lhs - constraint.rhs);

      if (violation > tolerance * 100) {
        return {
          status: "numerical_issue",
          message: "Le résultat calculé ne satisfait pas toutes les contraintes à la tolérance définie. Aucun optimum n’est certifié.",
          direction: problem.direction,
          iterations,
          totalPivots,
          notes: [...notes, "La vérification finale des contraintes a détecté une violation numérique."],
        };
      }
    }

    return {
      status: "optimal",
      message: "Une solution optimale a été obtenue et vérifiée sur les contraintes du modèle original.",
      direction: problem.direction,
      objectiveValue,
      variableValues,
      iterations,
      totalPivots,
      notes,
    };
  } catch (error) {
    return {
      status: "numerical_issue",
      message: error instanceof Error
        ? `La résolution a été interrompue : ${error.message}`
        : "La résolution a été interrompue en raison d’un problème numérique.",
      direction: problem.direction,
      iterations,
      totalPivots,
      notes,
    };
  }
}
