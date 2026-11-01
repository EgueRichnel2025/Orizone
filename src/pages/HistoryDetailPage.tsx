import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GitBranch,
  Info,
  Table2,
  Trophy,
} from "lucide-react";
import { Link, useParams } from "react-router";

import type { ResolutionHistoryEntry } from "../types/history";
import type { SimplexIteration } from "../engine/simplex";
import { getResolutionHistoryEntry } from "../utils/resolution-history";
import "../styles/history.css";

const EPSILON = 1e-9;

function numberText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) < EPSILON ? 0 : value;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 }).format(normalized);
}

function objectiveExpression(coefficients: number[]): string {
  return coefficients.map((value, index) => {
    const sign = value < 0 ? "−" : index === 0 ? "" : "+";
    return `${sign}${numberText(Math.abs(value))}x${index + 1}`;
  }).join(" ");
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    optimal: "Solution optimale certifiée",
    infeasible: "Problème irréalisable",
    unbounded: "Problème non borné",
    unbounded_relaxation: "Relaxation non bornée",
    iteration_limit: "Limite d'itérations atteinte",
    node_limit: "Limite de nœuds atteinte",
    numerical_issue: "Difficulté numérique",
    unsupported_domain: "Domaine non pris en charge",
    invalid_model: "Modèle invalide",
    pending: "En attente",
    branched: "Nœud développé",
    integer: "Solution entière",
    pruned_bound: "Élagué par borne",
    pruned_infeasible: "Élagué : irréalisable",
  };
  return labels[status] ?? status;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(date);
}

function ModelCard({ entry }: { entry: ResolutionHistoryEntry }) {
  return (
    <article className="workspace-card history-detail-model">
      <div className="workspace-card-heading">
        <div><span className="card-kicker">MODÈLE CONSERVÉ</span><h2>Formulation initiale</h2></div>
        <span className="history-status is-optimal">Données originales</span>
      </div>
      <div className="history-math-block">
        <strong>{entry.problem.direction === "max" ? "Maximiser" : "Minimiser"} Z = {objectiveExpression(entry.problem.objective)}</strong>
        <span>Sous contraintes</span>
        {entry.problem.constraints.map((constraint, index) => (
          <code key={`constraint-${index}`}>
            {objectiveExpression(constraint.coefficients)} {constraint.operator === "<=" ? "≤" : constraint.operator === ">=" ? "≥" : "="} {numberText(constraint.rhs)}
          </code>
        ))}
        <span>Domaines des variables</span>
        {entry.problem.variables.map((variable, index) => (
          <code key={variable.name}>
            x{index + 1} · {variable.type === "binary" ? "binaire {0, 1}" : variable.type === "integer" ? "entière" : "continue"}
            {variable.lowerBound !== null ? ` · borne inférieure ${numberText(variable.lowerBound)}` : ""}
            {variable.upperBound !== null ? ` · borne supérieure ${numberText(variable.upperBound)}` : ""}
          </code>
        ))}
      </div>
    </article>
  );
}

function IterationTable({ iteration, index }: { iteration: SimplexIteration; index: number }) {
  const enteringColumn = iteration.enteringVariable
    ? iteration.columns.indexOf(iteration.enteringVariable)
    : -1;
  const leavingRow = iteration.leavingVariable
    ? iteration.basis.indexOf(iteration.leavingVariable)
    : -1;

  return (
    <article className="history-iteration-card">
      <div className="history-iteration-heading">
        <div><span className="card-kicker">PHASE {iteration.phase}</span><h4>Tableau {index + 1} · Itération {iteration.iteration}</h4></div>
        <span className="history-iteration-objective">Z = {numberText(iteration.objectiveValue)}</span>
      </div>
      <div className="history-table-scroll">
        <table className="history-simplex-table">
          <thead><tr><th>Base</th>{iteration.columns.map((column) => <th key={column}>{column}</th>)}<th>Sol.</th><th>Rapport</th></tr></thead>
          <tbody>
            {iteration.tableau.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={rowIndex === leavingRow ? "is-leaving-row" : ""}>
                <th>{iteration.basis[rowIndex] ?? `L${rowIndex + 1}`}</th>
                {iteration.columns.map((column, columnIndex) => (
                  <td
                    key={`${column}-${columnIndex}`}
                    className={[
                      columnIndex === enteringColumn ? "is-entering-column" : "",
                      rowIndex === leavingRow && columnIndex === enteringColumn ? "is-pivot-cell" : "",
                    ].filter(Boolean).join(" ")}
                  >{numberText(row[columnIndex])}</td>
                ))}
                <td>{numberText(row[iteration.columns.length])}</td>
                <td>{iteration.ratioTests[rowIndex] === null || iteration.ratioTests[rowIndex] === undefined ? "—" : numberText(iteration.ratioTests[rowIndex])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th>Cj − Zj</th>{iteration.reducedCosts.map((value, columnIndex) => <td key={`cost-${columnIndex}`} className={columnIndex === enteringColumn ? "is-entering-column" : ""}>{numberText(value)}</td>)}<td>—</td><td>—</td></tr></tfoot>
        </table>
      </div>
      <div className="history-iteration-explanation">
        <Info size={15} />
        <p>{iteration.explanation}</p>
      </div>
      <div className="history-iteration-pivot-meta">
        <span>Entrante : <strong>{iteration.enteringVariable ?? "Aucune"}</strong></span>
        <span>Sortante : <strong>{iteration.leavingVariable ?? "Aucune"}</strong></span>
        <span>Pivot : <strong>{numberText(iteration.pivotValue)}</strong></span>
      </div>
    </article>
  );
}

function SimplexDetail({ entry }: { entry: Extract<ResolutionHistoryEntry, { method: "simplex" }> }) {
  const result = entry.result;
  return (
    <>
      <div className="history-detail-result-grid">
        <article className="workspace-card"><span className="card-kicker">STATUT</span><strong>{statusLabel(result.status)}</strong><small>{result.message}</small></article>
        <article className="workspace-card"><span className="card-kicker">VALEUR DE L'OBJECTIF</span><strong>{numberText(result.objectiveValue)}</strong><small>{result.direction === "max" ? "Maximisation" : "Minimisation"}</small></article>
        <article className="workspace-card"><span className="card-kicker">ITÉRATIONS</span><strong>{result.iterations.length}</strong><small>{result.totalPivots} pivot(s) exécuté(s)</small></article>
      </div>
      {result.variableValues && <article className="workspace-card history-solution-card"><div className="workspace-card-heading"><div><span className="card-kicker">SOLUTION CONSERVÉE</span><h2>Valeurs des variables</h2></div><Trophy size={19} /></div><div className="history-variable-values">{Object.entries(result.variableValues).map(([name, value]) => <span key={name}><strong>{name}</strong><b>{numberText(value)}</b></span>)}</div></article>}
      <section className="history-iterations-section"><div className="history-section-heading"><div><span className="card-kicker">TRACE DE CALCUL</span><h2>Tous les tableaux Simplexe</h2></div><span>{result.iterations.length} tableau(x) conservé(s)</span></div>{result.iterations.length > 0 ? result.iterations.map((iteration, index) => <IterationTable key={`${iteration.phase}-${iteration.iteration}-${index}`} iteration={iteration} index={index} />) : <p className="history-detail-note">Le moteur n'a enregistré aucun tableau pour cette résolution.</p>}</section>
      {result.notes.length > 0 && <article className="workspace-card history-notes-card"><h3>Notes du moteur</h3><ul>{result.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul></article>}
    </>
  );
}

function BranchBoundDetail({ entry }: { entry: Extract<ResolutionHistoryEntry, { method: "branch-bound" }> }) {
  const result = entry.result;
  return (
    <>
      <div className="history-detail-result-grid">
        <article className="workspace-card"><span className="card-kicker">STATUT</span><strong>{statusLabel(result.status)}</strong><small>{result.message}</small></article>
        <article className="workspace-card"><span className="card-kicker">MEILLEURE SOLUTION</span><strong>{numberText(result.incumbent?.objectiveValue)}</strong><small>{result.incumbent ? "Valeur de la solution entière" : "Aucune solution entière certifiée"}</small></article>
        <article className="workspace-card"><span className="card-kicker">NŒUDS TRAITÉS</span><strong>{result.statistics.nodesProcessed}</strong><small>{result.statistics.nodesCreated} nœud(s) créé(s) · {result.statistics.nodesPruned} élagué(s)</small></article>
      </div>
      {result.incumbent && <article className="workspace-card history-solution-card"><div className="workspace-card-heading"><div><span className="card-kicker">MEILLEURE SOLUTION ENTIÈRE</span><h2>Incumbent final</h2></div><Trophy size={19} /></div><div className="history-variable-values">{Object.entries(result.incumbent.variableValues).map(([name, value]) => <span key={name}><strong>{name}</strong><b>{numberText(value)}</b></span>)}</div><p>Nœud d'origine : {result.incumbent.nodeId}</p></article>}
      <section className="history-iterations-section"><div className="history-section-heading"><div><span className="card-kicker">TRACE DE RECHERCHE</span><h2>Tous les sous-problèmes</h2></div><span>{result.nodes.length} nœud(s) conservé(s)</span></div>
        {result.nodes.map((node) => (
          <article className="workspace-card history-node-card" key={node.id}>
            <div className="history-node-heading"><div><span className="card-kicker">NŒUD · PROFONDEUR {node.depth}</span><h3>{node.id}</h3></div><span className={`history-node-status status-${node.status}`}>{statusLabel(node.status)}</span></div>
            <div className="history-node-facts"><span>Parent : <strong>{node.parentId ?? "Racine"}</strong></span><span>Borne : <strong>{numberText(node.bound ?? undefined)}</strong></span><span>Branchement : <strong>{node.branchingVariable ? `${node.branchingVariable} = ${numberText(node.branchingValue)}` : "Aucun"}</strong></span></div>
            {node.branchPath.length > 0 && <div className="history-branch-path"><strong>Contraintes du chemin</strong>{node.branchPath.map((branch, index) => <code key={`${node.id}-path-${index}`}>{branch.variableName} {branch.operator === "<=" ? "≤" : "≥"} {numberText(branch.rhs)}</code>)}</div>}
            {node.pruningReason && <p className="history-pruning-reason"><Info size={14} /> {node.pruningReason}</p>}
            {node.relaxation ? <>
              <div className="history-relaxation-heading"><strong>Relaxation Simplexe</strong><span>{statusLabel(node.relaxation.status)} · {node.relaxation.iterations.length} tableau(x)</span></div>
              <p className="history-relaxation-message">{node.relaxation.message}</p>
              {node.relaxation.variableValues && <div className="history-variable-values">{Object.entries(node.relaxation.variableValues).map(([name, value]) => <span key={`${node.id}-${name}`}><strong>{name}</strong><b>{numberText(value)}</b></span>)}</div>}
              {node.relaxation.iterations.map((iteration, index) => <IterationTable key={`${node.id}-${iteration.phase}-${iteration.iteration}-${index}`} iteration={iteration} index={index} />)}
            </> : <p className="history-detail-note">Aucune relaxation n'a été exécutée pour ce nœud.</p>}
          </article>
        ))}
      </section>
      {result.notes.length > 0 && <article className="workspace-card history-notes-card"><h3>Notes du moteur</h3><ul>{result.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul></article>}
    </>
  );
}

export default function HistoryDetailPage() {
  const { id } = useParams();
  const [entry, setEntry] = useState<ResolutionHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return;
    getResolutionHistoryEntry(decodeURIComponent(id))
      .then((loaded) => { if (active) setEntry(loaded); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Impossible de charger cette résolution."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <section className="result-page history-detail-page"><div className="workspace-card history-empty"><Clock3 size={22} /><h2>Chargement de la résolution…</h2></div></section>;
  if (error || !entry) return <section className="result-page history-detail-page"><Link to="/history" className="back-link"><ArrowLeft size={16} /> Retour à l'historique</Link><div className="workspace-card history-empty"><Info size={22} /><h2>Résolution introuvable</h2><p>{error ?? "Cette résolution a été supprimée ou n'existe plus dans le stockage local."}</p></div></section>;

  return (
    <section className="result-page history-detail-page">
      <Link to="/history" className="back-link"><ArrowLeft size={16} /> Retour à l'historique</Link>
      <div className="result-page-heading history-heading">
        <div><span className="section-eyebrow">ARCHIVES · DÉTAIL D'UNE RÉSOLUTION</span><h1>Résolution <em>{entry.method === "simplex" ? "Simplexe." : "Branch & Bound."}</em></h1><p><Clock3 size={14} /> Enregistrée le {formatDate(entry.createdAt)}</p></div>
        <span className="history-detail-method">{entry.method === "simplex" ? <Table2 size={17} /> : <GitBranch size={17} />}{entry.method === "simplex" ? "Simplexe" : "Branch & Bound"}</span>
      </div>
      <ModelCard entry={entry} />
      {entry.method === "simplex" ? <SimplexDetail entry={entry} /> : <BranchBoundDetail entry={entry} />}
      <div className="history-detail-footer"><CheckCircle2 size={16} /><span>Cette consultation utilise les résultats sauvegardés. Aucun calcul n'a été relancé.</span></div>
    </section>
  );
}
