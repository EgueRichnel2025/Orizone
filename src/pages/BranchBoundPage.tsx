import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  GitBranch,
  Info,
  Layers3,
  Scissors,
  Target,
  Trophy,
} from "lucide-react";
import { Link } from "react-router";

import { solveBranchBound } from "../engine/branch-bound";
import type {
  BranchBoundNode,
  BranchBoundNodeStatus,
  BranchBoundResult,
  BranchBoundStatus,
} from "../engine/branch-bound";
import type { SimplexIteration } from "../engine/simplex";
import { SimplexTableau } from "../components/algorithm/SimplexTableau";
import type { OptimizationProblem } from "../types/optimization";
import { getOrCreateOptimizationRunId, loadOptimizationProblem } from "../utils/optimization-storage";
import { saveResolutionHistory } from "../utils/resolution-history";
import "../styles/algorithm-pages.css";
import "../styles/branch-bound-live.css";

interface TreePoint {
  node: BranchBoundNode;
  x: number;
  y: number;
}

interface TreeLayout {
  points: TreePoint[];
  width: number;
  height: number;
}

const NODE_STATUS_META: Record<BranchBoundNodeStatus, { label: string; tone: string }> = {
  pending: { label: "Non exploré", tone: "pending" },
  branched: { label: "Branché", tone: "branched" },
  integer: { label: "Solution entière", tone: "integer" },
  pruned_bound: { label: "Élagué par borne", tone: "pruned" },
  pruned_infeasible: { label: "Irréalisable", tone: "infeasible" },
  unbounded_relaxation: { label: "Relaxation non bornée", tone: "warning" },
  iteration_limit: { label: "Limite d’itérations", tone: "warning" },
  numerical_issue: { label: "Incident numérique", tone: "warning" },
};

const RESULT_STATUS_META: Record<BranchBoundStatus, { label: string; tone: string }> = {
  optimal: { label: "Optimalité certifiée", tone: "success" },
  infeasible: { label: "Aucune solution entière admissible", tone: "infeasible" },
  node_limit: { label: "Limite de nœuds atteinte", tone: "warning" },
  unbounded_relaxation: { label: "Relaxation non bornée", tone: "warning" },
  iteration_limit: { label: "Limite d’itérations atteinte", tone: "warning" },
  numerical_issue: { label: "Incident numérique", tone: "warning" },
  unsupported_domain: { label: "Domaine non pris en charge", tone: "neutral" },
  invalid_model: { label: "Modèle invalide", tone: "infeasible" },
};

function numberText(value: number): string {
  const rounded = Math.abs(value) < 1e-10 ? 0 : value;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 }).format(rounded);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${numberText(milliseconds)} ms`;
  return `${numberText(milliseconds / 1_000)} s`;
}

function objectiveExpression(problem: OptimizationProblem): string {
  const terms: string[] = [];

  problem.objective.forEach((coefficient, index) => {
    if (Math.abs(coefficient) < 1e-10) return;
    const variable = problem.variables[index]?.name ?? `x${index + 1}`;
    const magnitude = Math.abs(coefficient);
    const factor = Math.abs(magnitude - 1) < 1e-10 ? "" : numberText(magnitude);
    const term = `${factor}${variable}`;

    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `−${term}` : term);
    } else {
      terms.push(coefficient < 0 ? ` − ${term}` : ` + ${term}`);
    }
  });

  return terms.join("") || "0";
}

const TREE_NODE_WIDTH = 230;
const TREE_LEAF_GAP = 310;
const TREE_LEVEL_GAP = 96;

function getNodeVariableValues(
  node: BranchBoundNode,
): Array<[string, number]> {
  if (
    node.relaxation?.status !== "optimal" ||
    !node.relaxation.variableValues
  ) {
    return [];
  }

  return Object.entries(node.relaxation.variableValues);
}

function getNodeCardHeight(node: BranchBoundNode): number {
  const variableCount = getNodeVariableValues(node).length;
  return 94 + Math.max(variableCount, 1) * 19;
}

function buildTreeLayout(nodes: BranchBoundNode[]): TreeLayout {
  if (nodes.length === 0) {
    return { points: [], width: 760, height: 210 };
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const positions = new Map<string, { x: number; y: number }>();

  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const levelHeights = Array.from(
    { length: maxDepth + 1 },
    (_, depth) => Math.max(
      110,
      ...nodes
        .filter((node) => node.depth === depth)
        .map(getNodeCardHeight),
    ),
  );

  const levelCenters: number[] = [];
  let nextTop = 42;

  levelHeights.forEach((height, depth) => {
    levelCenters[depth] = nextTop + height / 2;
    nextTop += height + TREE_LEVEL_GAP;
  });

  let nextLeaf = 0;

  const assign = (node: BranchBoundNode): number => {
    const children = node.children
      .map((childId) => byId.get(childId))
      .filter((child): child is BranchBoundNode => child !== undefined);

    let x: number;

    if (children.length === 0) {
      x = 160 + nextLeaf * TREE_LEAF_GAP;
      nextLeaf += 1;
    } else {
      const childPositions = children.map(assign);

      x = childPositions.reduce(
        (sum, value) => sum + value,
        0,
      ) / childPositions.length;
    }

    positions.set(node.id, {
      x,
      y: levelCenters[node.depth] ?? 80,
    });

    return x;
  };

  const root = nodes.find((node) => node.parentId === null) ?? nodes[0];
  assign(root);

  // Afficher aussi les nœuds éventuellement non reliés.
  nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: 160 + nextLeaf * TREE_LEAF_GAP,
        y: levelCenters[node.depth] ?? 80,
      });

      nextLeaf += 1;
    }
  });

  const points = nodes.map((node) => {
    const position = positions.get(node.id) ?? { x: 160, y: 80 };

    return {
      node,
      ...position,
    };
  });

  return {
    points,
    width: Math.max(760, nextLeaf * TREE_LEAF_GAP + 170),
    height: Math.max(210, nextTop - TREE_LEVEL_GAP + 45),
  };
}

function nodeSecondaryLabel(node: BranchBoundNode): string {
  const values = getNodeVariableValues(node);
  const objective = node.relaxation?.objectiveValue;

  if (values.length > 0 && objective !== undefined) {
    return [
      ...values.map(([name, value]) => `${name} = ${numberText(value)}`),
      `Z = ${numberText(objective)}`,
    ].join(", ");
  }

  if (node.addedConstraint) {
    return node.addedConstraint.label;
  }

  if (node.status === "pending") {
    return "Résolution en attente";
  }

  return NODE_STATUS_META[node.status].label;
}

function TreeView({
  result,
  selectedNodeId,
  onSelect,
}: {
  result: BranchBoundResult;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const layout = useMemo(
    () => buildTreeLayout(result.nodes),
    [result.nodes],
  );

  const pointsById = new Map(
    layout.points.map((point) => [point.node.id, point]),
  );

  return (
    <div
      className="bnb-live-tree-scroll"
      role="region"
      aria-label="Arbre Branch and Bound, défilement horizontal possible"
      tabIndex={0}
    >
      {layout.points.length > 0 ? (
        <svg
          className="bnb-live-tree-svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label="Arbre de recherche interactif"
        >
          {/* Liaisons entre les nœuds */}
          <g className="bnb-live-tree-edges">
            {layout.points.map(({ node, x, y }) =>
              node.children.map((childId) => {
                const child = pointsById.get(childId);

                if (!child) return null;

                const parentBottom = y + getNodeCardHeight(node) / 2;
                const childTop =
                  child.y - getNodeCardHeight(child.node) / 2;

                const middleY = (parentBottom + childTop) / 2;
                const middleX = (x + child.x) / 2;
                const constraint = child.node.addedConstraint;

                const label = constraint?.label ?? "";
                const labelWidth = Math.min(
                  190,
                  Math.max(82, label.length * 7 + 22),
                );

                return (
                  <g key={`${node.id}-${childId}`}>
                    <path
                      d={`M ${x} ${parentBottom} C ${x} ${middleY}, ${child.x} ${middleY}, ${child.x} ${childTop}`}
                    />

                    {constraint && (
                      <g
                        className={`bnb-live-edge-label ${
                          constraint.operator === "<="
                            ? "is-left-branch"
                            : "is-right-branch"
                        }`}
                        transform={`translate(${middleX}, ${middleY})`}
                        role="img"
                        aria-label={`Contrainte de branchement : ${label}`}
                      >
                        <rect
                          x={-labelWidth / 2}
                          y={-14}
                          width={labelWidth}
                          height="28"
                          rx="7"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              }),
            )}
          </g>

          {/* Contenu des nœuds */}
          {layout.points.map(({ node, x, y }) => {
            const meta = NODE_STATUS_META[node.status];
            const selected = selectedNodeId === node.id;

            const variableValues = getNodeVariableValues(node);
            const objectiveValue = node.relaxation?.objectiveValue;

            const hasObjective =
              node.relaxation?.status === "optimal" &&
              typeof objectiveValue === "number";

            const cardHeight = getNodeCardHeight(node);
            const top = y - cardHeight / 2;

            const valuesDescription = nodeSecondaryLabel(node);

            let unavailableText = "Valeurs non disponibles";

            if (node.status === "pending") {
              unavailableText = "Calcul en attente";
            } else if (node.status === "pruned_infeasible") {
              unavailableText = "Aucune solution réalisable";
            } else if (!node.relaxation) {
              unavailableText = "Relaxation non calculée";
            }

            return (
              <g
                key={node.id}
                className={`bnb-live-tree-node is-${meta.tone}${
                  selected ? " is-selected" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-label={`${node.id}, ${meta.label}. ${valuesDescription}. Afficher le détail.`}
                aria-pressed={selected}
                onClick={() => onSelect(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(node.id);
                  }
                }}
              >
                <rect
                  x={x - TREE_NODE_WIDTH / 2}
                  y={top}
                  width={TREE_NODE_WIDTH}
                  height={cardHeight}
                  rx="12"
                />

                <text
                  className="bnb-live-node-id"
                  x={x}
                  y={top + 23}
                  textAnchor="middle"
                >
                  {node.id}
                </text>

                <text
                  className="bnb-live-node-status"
                  x={x}
                  y={top + 42}
                  textAnchor="middle"
                >
                  {meta.label}
                </text>

                {variableValues.length > 0 ? (
                  variableValues.map(([name, value], index) => (
                    <text
                      key={`${node.id}-${name}`}
                      className="bnb-live-node-variable"
                      x={x}
                      y={top + 64 + index * 19}
                      textAnchor="middle"
                    >
                      {name} = {numberText(value)}
                    </text>
                  ))
                ) : (
                  <text
                    className="bnb-live-node-empty"
                    x={x}
                    y={top + 70}
                    textAnchor="middle"
                  >
                    {unavailableText}
                  </text>
                )}

                {hasObjective && (
                  <text
                    className="bnb-live-node-objective"
                    x={x}
                    y={top + cardHeight - 13}
                    textAnchor="middle"
                  >
                    {node.status === "integer" ? "Z (entier)" : "Z (relaxation)"}
                    {" = "}
                    {numberText(objectiveValue)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="bnb-live-no-tree">
          <CircleHelp size={23} />
          <span>Aucun arbre n’a été construit pour ce modèle.</span>
        </div>
      )}
    </div>
  );
}function BranchBoundSimplexStep({ iteration, index }: { iteration: SimplexIteration; index: number }) {


  return (
    <article className="bnb-live-simplex-step">
      <div className="bnb-live-simplex-step-heading">
        <div>
          <span className="card-kicker">TABLEAU {index + 1}</span>
          <h4>Phase {iteration.phase} · Itération {iteration.iteration}</h4>
        </div>
        <span className="bnb-live-phase-badge">{iteration.phase === 1 ? "Phase I · Faisabilité" : "Phase II · Optimisation"}</span>
      </div>

      <SimplexTableau iteration={iteration} />

      <div className="bnb-live-pivot-grid">
        <div><span>Variable entrante</span><strong>{iteration.enteringVariable ?? "Aucune · optimalité de la phase"}</strong></div>
        <div><span>Variable sortante</span><strong>{iteration.leavingVariable ?? "Aucune"}</strong></div>
        <div><span>Élément pivot</span><strong>{iteration.pivotValue === null ? "—" : numberText(iteration.pivotValue)}</strong></div>
      </div>

      {iteration.ratioTests.length > 0 && (
        <div className="bnb-live-ratio-tests">
          <strong>Test des rapports</strong>
          <div>
            {iteration.ratioTests.map((ratio, ratioIndex) => (
              <span key={`ratio-${ratioIndex}`}>
                {iteration.basis[ratioIndex] ?? `L${ratioIndex + 1}`} : {ratio === null ? "non admissible" : numberText(ratio)}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="bnb-live-iteration-explanation"><Info size={15} />{iteration.explanation}</p>
    </article>
  );
}

function NodeDetail({ node, problem }: { node: BranchBoundNode; problem: OptimizationProblem }) {
  const status = NODE_STATUS_META[node.status];
  const relaxation = node.relaxation;

  return (
    <article className="workspace-card bnb-live-detail-card">
      <div className="workspace-card-heading">
        <div>
          <span className="card-kicker">DÉTAIL DU SOUS-PROBLÈME · PROFONDEUR {node.depth}</span>
          <h2>{node.id} <em>— {status.label}</em></h2>
        </div>
        <span className={`bnb-live-status-badge is-${status.tone}`}>{status.label}</span>
      </div>

      {node.branchPath.length > 0 ? (
        <div className="bnb-live-branch-path">
          <strong><GitBranch size={15} /> Contraintes héritées sur ce chemin</strong>
          <ol>
            {node.branchPath.map((constraint, index) => (
              <li key={`${node.id}-path-${index}`}><code>{constraint.label}</code></li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="bnb-live-root-note"><Info size={15} /> Nœud racine : il reprend le modèle initial sans contrainte de branchement supplémentaire.</p>
      )}

      {node.addedConstraint && (
        <div className="bnb-live-added-constraint">
          <span>Décision qui a créé ce nœud</span>
          <strong>{node.addedConstraint.label}</strong>
        </div>
      )}

      {node.branchingVariable && node.branchingValue !== null && (
        <div className="bnb-live-branch-decision">
          <span className="card-kicker">BRANCHEMENT EFFECTUÉ DEPUIS CE NŒUD</span>
          <p>
            La relaxation donne {node.branchingVariable} = <strong>{numberText(node.branchingValue)}</strong>, une valeur fractionnaire.
            Le moteur crée les sous-problèmes {node.branchingVariable} ≤ {Math.floor(node.branchingValue)} et {node.branchingVariable} ≥ {Math.ceil(node.branchingValue)}.
          </p>
        </div>
      )}

      {relaxation ? (
        <>
          <div className="bnb-live-relaxation-summary">
            <div>
              <span>Statut de la relaxation</span>
              <strong>{relaxation.status === "optimal" ? "Optimum continu trouvé" : relaxation.status}</strong>
            </div>
            <div>
              <span>Valeur de l’objectif continu</span>
              <strong>{relaxation.objectiveValue === undefined ? "—" : numberText(relaxation.objectiveValue)}</strong>
            </div>
            <div>
              <span>Pivots Simplexe</span>
              <strong>{relaxation.totalPivots}</strong>
            </div>
          </div>

          {relaxation.variableValues && (
            <div className="bnb-live-relaxation-values">
              <strong>Valeurs obtenues dans la relaxation</strong>
              <div>
                {problem.variables.map((variable) => (
                  <span key={variable.name}><b>{variable.name}</b> = {numberText(relaxation.variableValues?.[variable.name] ?? 0)}</span>
                ))}
              </div>
            </div>
          )}

          <p className="bnb-live-relaxation-message">{relaxation.message}</p>
          {node.bound !== null && (
            <p className="bnb-live-bound-note"><Target size={15} /> Borne utilisée pour ce sous-problème : <strong>{numberText(node.bound)}</strong>.</p>
          )}

          <section className="bnb-live-relaxation-history">
            <div className="bnb-live-history-heading">
              <div>
                <span className="card-kicker">HISTORIQUE NUMÉRIQUE COMPLET</span>
                <h3>Tableaux Simplexe de cette relaxation</h3>
              </div>
              <span className="bnb-live-history-count">{relaxation.iterations.length} tableau(x)</span>
            </div>
            {relaxation.iterations.length > 0 ? (
              <div className="bnb-live-simplex-history">
                {relaxation.iterations.map((iteration, index) => (
                  <BranchBoundSimplexStep
                    key={`${node.id}-phase-${iteration.phase}-iteration-${iteration.iteration}-${index}`}
                    iteration={iteration}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <p className="bnb-live-no-iterations">Le moteur Simplexe n’a enregistré aucun tableau pour cette relaxation.</p>
            )}
            {relaxation.notes.length > 0 && (
              <div className="bnb-live-engine-notes">
                <strong>Notes du moteur Simplexe</strong>
                {relaxation.notes.map((note, index) => <p key={`${node.id}-note-${index}`}>{note}</p>)}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="bnb-live-relaxation-pending">
          <Clock3 size={18} />
          <div>
            <strong>Relaxation non calculée</strong>
            <p>Ce nœud a été créé, mais aucune résolution Simplexe ne lui a encore été affectée. Cela peut arriver lorsque la limite de nœuds interrompt l’exploration.</p>
          </div>
        </div>
      )}

      {node.pruningReason && (
        <div className="bnb-live-pruning-reason">
          <Scissors size={17} />
          <div><strong>Décision de l’algorithme</strong><p>{node.pruningReason}</p></div>
        </div>
      )}

      {node.children.length > 0 && (
        <div className="bnb-live-child-list">
          <strong><GitBranch size={15} /> Sous-problèmes créés</strong>
          <div>{node.children.map((childId) => <span key={childId}>{childId}</span>)}</div>
        </div>
      )}
    </article>
  );
}

function ResultSummary({ result, problem }: { result: BranchBoundResult; problem: OptimizationProblem }) {
  const meta = RESULT_STATUS_META[result.status];
  const certified = result.status === "optimal" && result.incumbent !== null;
  const hasIncumbent = result.incumbent !== null;

  return (
    <article className={`workspace-card bnb-live-result-card is-${meta.tone}`}>
      <div className="bnb-live-result-icon">
        {certified ? <Trophy size={22} /> : result.status === "infeasible" ? <Scissors size={21} /> : <AlertTriangle size={21} />}
      </div>
      <div className="bnb-live-result-copy">
        <span className="card-kicker">RÉSULTAT GLOBAL</span>
        <h2>{certified ? "Solution entière optimale certifiée" : hasIncumbent ? "Meilleure solution admissible connue" : meta.label}</h2>
        <p>{result.message}</p>
        {hasIncumbent && result.incumbent && (
          <>
            <div className="bnb-live-incumbent-objective">
              <span>{problem.direction === "max" ? "Valeur maximale" : "Valeur minimale"} connue</span>
              <strong>{numberText(result.incumbent.objectiveValue)}</strong>
              <small>Découverte au nœud {result.incumbent.nodeId}</small>
            </div>
            <div className="bnb-live-incumbent-values">
              {problem.variables.map((variable) => (
                <span key={variable.name}><b>{variable.name}</b> = {numberText(result.incumbent?.variableValues[variable.name] ?? 0)}</span>
              ))}
            </div>
            {!certified && <p className="bnb-live-not-certified"><Info size={15} /> Cette solution est admissible, mais l’optimalité globale n’est pas certifiée.</p>}
          </>
        )}
      </div>
    </article>
  );
}

function EmptyModelState() {
  return (
    <article className="workspace-card bnb-live-empty-state">
      <div className="empty-state-icon"><GitBranch size={23} /></div>
      <h2>Aucun modèle à explorer</h2>
      <p>Renseignez un problème contenant au moins une variable entière ou binaire, puis validez-le avant de lancer Branch &amp; Bound.</p>
      <Link to="/solve" className="button button-primary">Créer un problème <ArrowRight size={16} /></Link>
    </article>
  );
}

function Statistics({ result }: { result: BranchBoundResult }) {
  const stats = [
    { label: "Nœuds créés", value: String(result.statistics.nodesCreated), icon: GitBranch },
    { label: "Nœuds traités", value: String(result.statistics.nodesProcessed), icon: Layers3 },
    { label: "Nœuds élagués", value: String(result.statistics.nodesPruned), icon: Scissors },
    { label: "Pivots Simplexe", value: String(result.statistics.totalSimplexPivots), icon: Target },
    { label: "Solutions entières", value: String(result.statistics.integerSolutionsFound), icon: CheckCircle2 },
    { label: "Temps de calcul", value: formatDuration(result.statistics.elapsedMilliseconds), icon: Clock3 },
  ];

  return (
    <div className="bnb-live-stat-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article className="bnb-live-stat-card" key={stat.label}>
            <span className="bnb-live-stat-icon"><Icon size={16} /></span>
            <div><small>{stat.label}</small><strong>{stat.value}</strong></div>
          </article>
        );
      })}
    </div>
  );
}

export default function BranchBoundPage() {
  const [problem] = useState<OptimizationProblem | null>(() => loadOptimizationProblem());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const result = useMemo(() => (problem ? solveBranchBound(problem) : null), [problem]);

  useEffect(() => {
    if (!problem || !result) return;
    const runId = getOrCreateOptimizationRunId();
    void saveResolutionHistory({
      id: `${runId}:branch-bound`,
      runId,
      method: "branch-bound",
      createdAt: new Date().toISOString(),
      problem,
      result,
    }).catch((error: unknown) => console.error("Orizone : sauvegarde de la résolution Branch & Bound impossible.", error));
  }, [problem, result]);
  const selectedNode = result?.nodes.find((node) => node.id === selectedNodeId)
    ?? result?.nodes.find((node) => node.id === result.rootId)
    ?? null;
  const resultMeta = result ? RESULT_STATUS_META[result.status] : null;

  return (
    <section className="result-page algorithm-page algorithm-page-bnb bnb-live-page">
      <div className="result-page-heading algorithm-page-heading">
        <div className="algorithm-heading-copy">
          <span className="section-eyebrow">ÉTAPE 05 · EXPLORER</span>
          <h1>Arbre de recherche <em>Branch &amp; Bound.</em></h1>
          <p>
            Suivez chaque sous-problème, examinez sa relaxation Simplexe et comprenez pourquoi l’algorithme branche ou élague un nœud.
          </p>
          <div className="algorithm-heading-meta">
            <span className="algorithm-heading-chip algorithm-heading-chip-copper"><GitBranch size={14} /> Programmation en nombres entiers</span>
            <span className="algorithm-heading-note">Arbre réel · relaxations · décisions justifiées</span>
          </div>
        </div>
        <div className="algorithm-heading-art algorithm-heading-art-bnb" aria-hidden="true">
          <svg className="bnb-art-tree" viewBox="0 0 180 108" fill="none">
            <path d="M90 21 L47 52 M90 21 L133 52 M47 62 L24 88 M47 62 L69 88 M133 62 L111 88 M133 62 L156 88" />
            <circle className="bnb-art-node bnb-art-root" cx="90" cy="17" r="9" />
            <circle className="bnb-art-node bnb-art-branch" cx="47" cy="57" r="8" />
            <circle className="bnb-art-node bnb-art-branch" cx="133" cy="57" r="8" />
            <circle className="bnb-art-node bnb-art-leaf" cx="24" cy="92" r="6" />
            <circle className="bnb-art-node bnb-art-leaf" cx="69" cy="92" r="6" />
            <circle className="bnb-art-node bnb-art-leaf" cx="111" cy="92" r="6" />
            <circle className="bnb-art-node bnb-art-leaf" cx="156" cy="92" r="6" />
          </svg>
          <span className="algorithm-art-caption">ARBRE · EXPLORATION</span>
          <span className="algorithm-art-index">05</span>
        </div>
      </div>

      {!problem ? (
        <EmptyModelState />
      ) : result ? (
        <>
          <article className="bnb-live-problem-strip">
            <div>
              <span className="card-kicker">MODÈLE TRANSMIS</span>
              <strong>{problem.direction === "max" ? "Maximiser" : "Minimiser"} Z = {objectiveExpression(problem)}</strong>
            </div>
            <div className="bnb-live-problem-meta">
              <span>{problem.variables.length} variable(s)</span>
              <span>{problem.constraints.length} contrainte(s)</span>
              <span>{problem.variables.filter((variable) => variable.type !== "continuous").length} variable(s) discrète(s)</span>
            </div>
          </article>

          <div className={`bnb-live-overall-status is-${resultMeta?.tone ?? "neutral"}`}>
            {result.status === "optimal" ? <CheckCircle2 size={17} /> : <Info size={17} />}
            <strong>{resultMeta?.label}</strong>
            <span>{result.message}</span>
          </div>

          <Statistics result={result} />
          <ResultSummary result={result} problem={problem} />

          {result.notes.length > 0 && (
            <div className="bnb-live-engine-notes bnb-live-global-notes">
              <strong>Notes du moteur</strong>
              {result.notes.map((note, index) => <p key={`global-note-${index}`}>{note}</p>)}
            </div>
          )}

          <article className="workspace-card bnb-live-tree-card">
            <div className="workspace-card-heading">
              <div>
                <span className="card-kicker">ARBRE DE DÉCISION CALCULÉ</span>
                <h2>Explorer les nœuds</h2>
              </div>
              <span className={`bnb-live-status-badge is-${resultMeta?.tone ?? "neutral"}`}>{result.nodes.length} nœud(s)</span>
            </div>
            <p className="bnb-live-tree-instruction">Sélectionnez un nœud dans l’arbre pour afficher son sous-problème, sa relaxation et tous les tableaux Simplexe associés.</p>
            <TreeView result={result} selectedNodeId={selectedNode?.id ?? null} onSelect={setSelectedNodeId} />
            <div className="bnb-live-legend" aria-label="Légende des statuts des nœuds">
              {Object.entries(NODE_STATUS_META).map(([key, meta]) => (
                <span key={key}><i className={`is-${meta.tone}`} />{meta.label}</span>
              ))}
            </div>
          </article>

          {selectedNode ? (
            <NodeDetail node={selectedNode} problem={problem} />
          ) : (
            <article className="workspace-card bnb-live-detail-empty"><Info size={19} /><p>Le moteur n’a pas produit de nœud à détailler pour ce modèle. Consultez le statut global ci-dessus.</p></article>
          )}
        </>
      ) : null}

      <div className="result-page-footer-actions">
        <Link to="/analysis" className="button button-secondary"><ArrowLeft size={16} /> Retour à l’analyse</Link>
        <Link to="/solve" className="button button-secondary">Modifier le modèle</Link>
      </div>
    </section>
  );
}
