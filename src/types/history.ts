import type { BranchBoundResult } from "../engine/branch-bound";
import type { SimplexResult } from "../engine/simplex";
import type { OptimizationProblem } from "./optimization";

interface ResolutionHistoryBase {
  id: string;
  runId: string;
  createdAt: string;
  problem: OptimizationProblem;
}

export interface SimplexHistoryEntry extends ResolutionHistoryBase {
  method: "simplex";
  result: SimplexResult;
}

export interface BranchBoundHistoryEntry extends ResolutionHistoryBase {
  method: "branch-bound";
  result: BranchBoundResult;
}

export type ResolutionHistoryEntry = SimplexHistoryEntry | BranchBoundHistoryEntry;
