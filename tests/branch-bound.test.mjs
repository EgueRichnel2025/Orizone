import test from "node:test";
import assert from "node:assert/strict";
import { solveBranchBound } from "../src/engine/branch-bound.ts";

function makeProblem({
  direction = "max",
  objective,
  constraints = [],
  variables,
}) {
  return {
    direction,
    objective,
    constraints,
    variables: variables ?? objective.map((_, index) => ({
      name: `x${index + 1}`,
      type: "integer",
      lowerBound: 0,
      upperBound: null,
    })),
  };
}

test("maximise deux variables entières et conserve l’arbre ainsi que les relaxations Simplexe", () => {
  const problem = makeProblem({
    objective: [1, 1],
    constraints: [
      { coefficients: [2, 1], operator: "<=", rhs: 4 },
      { coefficients: [1, 2], operator: "<=", rhs: 4 },
    ],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.incumbent?.objectiveValue, 2);
  assert.ok(result.incumbent?.variableValues.x1 !== undefined);
  assert.ok(result.incumbent?.variableValues.x2 !== undefined);
  assert.ok(result.statistics.nodesBranched > 0);
  assert.ok(result.nodes.some((node) => node.parentId !== null));
  assert.ok(result.nodes[0].relaxation?.iterations.length > 0);
  assert.ok(result.nodes.every((node) => node.status !== "pending"));
});

test("résout une minimisation entière et renvoie le minimum 9", () => {
  const problem = makeProblem({
    direction: "min",
    objective: [2, 3],
    constraints: [
      { coefficients: [1, 2], operator: ">=", rhs: 5 },
      { coefficients: [3, 1], operator: ">=", rhs: 6 },
    ],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.incumbent?.objectiveValue, 9);
  assert.equal(result.incumbent?.variableValues.x1, 3);
  assert.equal(result.incumbent?.variableValues.x2, 1);
});

test("respecte le domaine binaire {0, 1} et les bornes du sac à dos", () => {
  const problem = makeProblem({
    objective: [7, 4, 5],
    constraints: [
      { coefficients: [4, 3, 2], operator: "<=", rhs: 6 },
    ],
    variables: [0, 1, 2].map((index) => ({
      name: `x${index + 1}`,
      type: "binary",
      lowerBound: null,
      upperBound: null,
    })),
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.incumbent?.objectiveValue, 12);
  assert.deepEqual(
    [1, 2, 3].map((index) => result.incumbent?.variableValues[`x${index}`]),
    [1, 0, 1],
  );
});

test("détecte l’absence de solution entière dans un intervalle sans entier", () => {
  const problem = makeProblem({
    objective: [1],
    constraints: [],
    variables: [{
      name: "x1",
      type: "integer",
      lowerBound: 0.2,
      upperBound: 0.8,
    }],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "infeasible", result.message);
  assert.equal(result.incumbent, null);
  assert.ok(result.nodes.some((node) => node.status === "pruned_infeasible"));
});

test("renvoie unsupported_domain pour un modèle entièrement continu", () => {
  const problem = makeProblem({
    objective: [1],
    variables: [{
      name: "x1",
      type: "continuous",
      lowerBound: 0,
      upperBound: null,
    }],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "unsupported_domain");
  assert.equal(result.nodes.length, 0);
});

test("respecte la limite de nœuds sans prétendre avoir certifié l’optimum", () => {
  const problem = makeProblem({
    objective: [1, 1],
    constraints: [
      { coefficients: [2, 1], operator: "<=", rhs: 4 },
      { coefficients: [1, 2], operator: "<=", rhs: 4 },
    ],
  });

  const result = solveBranchBound(problem, { maxNodes: 1 });
  assert.equal(result.status, "node_limit");
  assert.equal(result.statistics.nodesProcessed, 1);
  assert.ok(result.nodes.some((node) => node.status === "pending"));
  assert.match(result.message, /optimalité globale n’est pas certifiée/);
});

test("accepte une solution entière directement à la racine", () => {
  const problem = makeProblem({
    objective: [2],
    constraints: [
      { coefficients: [1], operator: "<=", rhs: 4 },
    ],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "optimal", result.message);
  assert.equal(result.incumbent?.objectiveValue, 8);
  assert.equal(result.incumbent?.variableValues.x1, 4);
  assert.equal(result.statistics.nodesCreated, 1);
  assert.equal(result.statistics.nodesBranched, 0);
});

test("refuse des noms de variables dupliqués", () => {
  const problem = makeProblem({
    objective: [1, 1],
    variables: [
      { name: "x", type: "integer", lowerBound: 0, upperBound: null },
      { name: "x", type: "continuous", lowerBound: 0, upperBound: null },
    ],
  });

  const result = solveBranchBound(problem);
  assert.equal(result.status, "invalid_model");
  assert.match(result.message, /nom x est utilisé par plusieurs variables/);
});

test("compte les relaxations et les pivots Simplexe de chaque nœud", () => {
  const problem = makeProblem({
    objective: [1, 1],
    constraints: [
      { coefficients: [2, 1], operator: "<=", rhs: 4 },
      { coefficients: [1, 2], operator: "<=", rhs: 4 },
    ],
  });

  const result = solveBranchBound(problem);
  const pivotsFromNodes = result.nodes.reduce(
    (sum, node) => sum + (node.relaxation?.totalPivots ?? 0),
    0,
  );
  assert.equal(result.statistics.totalSimplexPivots, pivotsFromNodes);
  assert.equal(result.statistics.nodesProcessed, result.nodes.filter((node) => node.relaxation !== null).length);
});
