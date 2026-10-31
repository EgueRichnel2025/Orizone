import test from "node:test";
import assert from "node:assert/strict";
import { solveSimplex } from "../src/engine/simplex.ts";

function makeProblem({
  direction = "max",
  objective,
  constraints = [],
  bounds = [],
  types = [],
}) {
  return {
    direction,
    objective,
    constraints,
    variables: objective.map((_, index) => ({
      name: `x${index + 1}`,
      type: types[index] ?? "continuous",
      lowerBound: bounds[index]?.lowerBound ?? null,
      upperBound: bounds[index]?.upperBound ?? null,
    })),
  };
}

test("maximise 3x1 + 5x2 et retrouver Z = 21", () => {
  const problem = makeProblem({
    objective: [3, 5],
    bounds: [{ lowerBound: 0 }, { lowerBound: 0 }],
    constraints: [
      { coefficients: [1, 2], operator: "<=", rhs: 8 },
      { coefficients: [3, 2], operator: "<=", rhs: 12 },
    ],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.objectiveValue, 21);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) - 2) < 1e-8);
  assert.ok(Math.abs((result.variableValues?.x2 ?? NaN) - 3) < 1e-8);
  assert.ok(result.iterations.length > 0);
  assert.ok(result.iterations.some((step) => step.phase === 2 && step.enteringVariable));
});

test("gère une minimisation avec une contrainte supérieure ou égale", () => {
  const problem = makeProblem({
    direction: "min",
    objective: [1],
    constraints: [{ coefficients: [1], operator: ">=", rhs: 2 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.objectiveValue, 2);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) - 2) < 1e-8);
});

test("utilise la phase I pour détecter un modèle irréalisable", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 0 }],
    constraints: [
      { coefficients: [1], operator: "<=", rhs: 1 },
      { coefficients: [1], operator: ">=", rhs: 2 },
    ],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "infeasible", result.message);
  assert.ok(result.iterations.some((step) => step.phase === 1));
});

test("détecte un objectif non borné", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 0 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "unbounded", result.message);
});

test("respecte une borne supérieure sans borne inférieure explicite", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ upperBound: 3 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.objectiveValue, 3);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) - 3) < 1e-8);
});

test("gère une égalité par la phase I", () => {
  const problem = makeProblem({
    objective: [2],
    bounds: [{ lowerBound: 0 }],
    constraints: [{ coefficients: [1], operator: "=", rhs: 4 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.objectiveValue, 8);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) - 4) < 1e-8);
});

test("refuse explicitement les variables entières dans le Simplexe continu", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 0 }],
    types: ["integer"],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "unsupported_domain");
  assert.match(result.message, /Branch & Bound/);
});

test("signale une borne incompatible comme modèle invalide", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 5, upperBound: 2 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "invalid_model");
});

test("retourne une solution vérifiée avec une variable libre", () => {
  const problem = makeProblem({
    objective: [1],
    direction: "min",
    constraints: [{ coefficients: [1], operator: ">=", rhs: -2 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.objectiveValue, -2);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) + 2) < 1e-8);
});


test("gère une variable avec deux bornes explicites", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 2, upperBound: 5 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.ok(Math.abs((result.variableValues?.x1 ?? NaN) - 5) < 1e-8);
  assert.ok(Math.abs((result.objectiveValue ?? NaN) - 5) < 1e-8);
});

test("gère une contrainte <= avec un second membre négatif", () => {
  const problem = makeProblem({
    objective: [-1],
    bounds: [{ lowerBound: 0 }],
    constraints: [{ coefficients: [1], operator: "<=", rhs: -2 }],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "infeasible", result.message);
});

test("gère une ligne d'égalité redondante", () => {
  const problem = makeProblem({
    objective: [1],
    bounds: [{ lowerBound: 0 }],
    constraints: [
      { coefficients: [1], operator: "=", rhs: 2 },
      { coefficients: [2], operator: "=", rhs: 4 },
    ],
  });

  const result = solveSimplex(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.ok(Math.abs((result.objectiveValue ?? NaN) - 2) < 1e-8);
});
