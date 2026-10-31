import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Lightbulb,
  ListOrdered,
  RefreshCw,
  Table2,
  Trophy,
} from "lucide-react";
import { Link } from "react-router";

import { solveSimplex, type SimplexIteration, type SimplexResult } from "../engine/simplex";
import { loadOptimizationProblem } from "../utils/optimization-storage";
import "../styles/algorithm-pages.css";
import "../styles/simplex-live.css";

const EPSILON = 1e-9;

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) < EPSILON ? 0 : value;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 }).format(normalized);
}

function getStatusLabel(result: SimplexResult): string {
  switch (result.status) {
    case "optimal": return "Solution optimale vérifiée";
    case "infeasible": return "Modèle irréalisable";
    case "unbounded": return "Objectif non borné";
    case "iteration_limit": return "Limite d’itérations atteinte";
    case "unsupported_domain": return "Domaine non pris en charge par le Simplexe continu";
    case "invalid_model": return "Modèle invalide";
    case "numerical_issue": return "Vérification numérique nécessaire";
  }
}

function getStatusClass(result: SimplexResult): string {
  if (result.status === "optimal") return "is-optimal";
  if (result.status === "infeasible" || result.status === "invalid_model" || result.status === "unsupported_domain") return "is-error";
  return "is-warning";
}

function getStatusIcon(result: SimplexResult) {
  if (result.status === "optimal") return <CheckCircle2 size={19} />;
  if (result.status === "infeasible" || result.status === "invalid_model" || result.status === "unsupported_domain") return <AlertCircle size={19} />;
  return <Info size={19} />;
}

function pivotRowIndex(iteration: SimplexIteration): number {
  if (!iteration.leavingVariable) return -1;
  return iteration.basis.indexOf(iteration.leavingVariable);
}

function pivotColumnIndex(iteration: SimplexIteration): number {
  if (!iteration.enteringVariable) return -1;
  return iteration.columns.indexOf(iteration.enteringVariable);
}

function iterationTitle(iteration: SimplexIteration, globalIndex: number, total: number): string {
  if (globalIndex === 0) return "Tableau initial";
  if (globalIndex === total - 1 && !iteration.enteringVariable) return "Tableau final";
  if (!iteration.enteringVariable) return `Vérification · fin de phase ${iteration.phase}`;
  return `Tableau avant pivot ${globalIndex + 1}`;
}

function buildRowOperations(iteration: SimplexIteration): string[] {
  const pivotRow = pivotRowIndex(iteration);
  const pivotColumn = pivotColumnIndex(iteration);
  const pivotValue = iteration.pivotValue;

  if (pivotRow < 0 || pivotColumn < 0 || pivotValue === null || Math.abs(pivotValue) <= EPSILON) {
    return [];
  }

  const operations = [
    `L${pivotRow + 1} ← L${pivotRow + 1} / ${formatNumber(pivotValue)}`,
  ];

  iteration.tableau.forEach((row, rowIndex) => {
    if (rowIndex === pivotRow) return;
    const factor = row[pivotColumn];
    if (Math.abs(factor) <= EPSILON) return;

    if (factor > 0) {
      operations.push(`L${rowIndex + 1} ← L${rowIndex + 1} − ${formatNumber(factor)} × L${pivotRow + 1}`);
    } else {
      operations.push(`L${rowIndex + 1} ← L${rowIndex + 1} + ${formatNumber(Math.abs(factor))} × L${pivotRow + 1}`);
    }
  });

  return operations;
}

function SimplexTable({ iteration }: { iteration: SimplexIteration }) {
  const pivotRow = pivotRowIndex(iteration);

  return (
    <div className="simplex-live-table-wrap" tabIndex={0} aria-label="Tableau du Simplexe, défilement horizontal disponible">
      <table className="simplex-live-table">
        <thead>
          <tr>
            <th scope="col">Base</th>
            {iteration.columns.map((column) => (
              <th
                scope="col"
                key={column}
                className={iteration.enteringVariable === column ? "is-pivot-column-header" : undefined}
              >
                {column}
              </th>
            ))}
            <th scope="col">Sol.</th>
            <th scope="col">Rapport</th>
          </tr>
        </thead>
        <tbody>
          {iteration.tableau.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <th scope="row" className={pivotRow === rowIndex ? "is-pivot-row-header" : undefined}>
                {iteration.basis[rowIndex] ?? `L${rowIndex + 1}`}
              </th>
              {iteration.columns.map((column, columnIndex) => {
                const isPivotRow = pivotRow === rowIndex;
                const isPivotColumn = iteration.enteringVariable === column;
                const isPivotCell = isPivotRow && isPivotColumn;
                const cellClasses = [
                  isPivotRow ? "is-pivot-row" : "",
                  isPivotColumn ? "is-pivot-column" : "",
                  isPivotCell ? "is-pivot-cell" : "",
                ].filter(Boolean).join(" ");

                return (
                  <td className={cellClasses || undefined} key={column}>
                    {formatNumber(row[columnIndex])}
                  </td>
                );
              })}
              <td className={pivotRow === rowIndex ? "is-pivot-row" : undefined}>
                {formatNumber(row[iteration.columns.length])}
              </td>
              <td className="simplex-ratio-cell">
                {formatNumber(iteration.ratioTests[rowIndex])}
              </td>
            </tr>
          ))}
          <tr className="simplex-reduced-cost-row">
            <th scope="row">Cⱼ − Zⱼ</th>
            {iteration.columns.map((column, columnIndex) => (
              <td
                key={column}
                className={iteration.enteringVariable === column ? "is-pivot-column" : undefined}
              >
                {formatNumber(iteration.reducedCosts[columnIndex])}
              </td>
            ))}
            <td>—</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PivotDecision({ iteration }: { iteration: SimplexIteration }) {
  const pivotRow = pivotRowIndex(iteration);
  const pivotColumn = pivotColumnIndex(iteration);

  if (pivotColumn < 0 || !iteration.enteringVariable) {
    return (
      <div className="simplex-decision-empty">
        <CheckCircle2 size={17} />
        <p>{iteration.explanation}</p>
      </div>
    );
  }

  const reducedCost = iteration.reducedCosts[pivotColumn];

  return (
    <div className="simplex-decision-grid">
      <section className="simplex-decision-block">
        <span className="simplex-decision-step">1</span>
        <div>
          <small>Choix de la variable entrante</small>
          <strong>{iteration.enteringVariable}</strong>
          <p>
            Son coût réduit vaut <b>{formatNumber(reducedCost)}</b>. Le moteur applique la règle de Bland :
            il retient la première variable non basique admissible dont Cⱼ − Zⱼ est positif.
          </p>
        </div>
      </section>

      <section className="simplex-decision-block">
        <span className="simplex-decision-step">2</span>
        <div>
          <small>Test des rapports</small>
          <strong>{iteration.leavingVariable ? `${iteration.leavingVariable} sort de la base` : "Aucune ligne sortante"}</strong>
          <p>
            On calcule Sol. / coefficient de la colonne entrante uniquement lorsque ce coefficient est strictement positif.
            Le plus petit rapport admissible détermine la ligne sortante.
          </p>
        </div>
      </section>

      <section className="simplex-decision-block">
        <span className="simplex-decision-step">3</span>
        <div>
          <small>Élément pivot</small>
          <strong>{formatNumber(iteration.pivotValue)}</strong>
          <p>
            {pivotRow >= 0
              ? `Le pivot se trouve sur L${pivotRow + 1}, à l’intersection avec la colonne ${iteration.enteringVariable}.`
              : "Aucun pivot n’est disponible pour cette étape."}
          </p>
        </div>
      </section>
    </div>
  );
}

function RatioDetails({ iteration }: { iteration: SimplexIteration }) {
  const pivotColumn = pivotColumnIndex(iteration);
  const pivotRow = pivotRowIndex(iteration);

  if (pivotColumn < 0) return null;

  return (
    <div className="simplex-ratio-analysis">
      <div className="simplex-subsection-heading">
        <span className="card-kicker">TEST DES RAPPORTS</span>
        <h3>Pourquoi cette ligne sort-elle de la base ?</h3>
      </div>
      <div className="simplex-ratio-list">
        {iteration.tableau.map((row, rowIndex) => {
          const coefficient = row[pivotColumn];
          const rhs = row[iteration.columns.length];
          const ratio = iteration.ratioTests[rowIndex];
          const selected = rowIndex === pivotRow;
          return (
            <div className={`simplex-ratio-item${selected ? " is-selected" : ""}`} key={`ratio-${rowIndex}`}>
              <span className="simplex-ratio-base">{iteration.basis[rowIndex] ?? `L${rowIndex + 1}`}</span>
              <code>
                {coefficient > EPSILON
                  ? `${formatNumber(rhs)} / ${formatNumber(coefficient)} = ${formatNumber(ratio)}`
                  : `coefficient ${formatNumber(coefficient)} → non admissible`}
              </code>
              <strong>{selected ? "minimum retenu" : ratio === null ? "écarté" : "admissible"}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RowOperations({ iteration }: { iteration: SimplexIteration }) {
  const operations = buildRowOperations(iteration);
  if (operations.length === 0) return null;

  return (
    <div className="simplex-operations">
      <div className="simplex-subsection-heading">
        <span className="card-kicker">PASSAGE AU TABLEAU SUIVANT</span>
        <h3>Opérations de pivot</h3>
      </div>
      <ol>
        {operations.map((operation, index) => (
          <li key={`${index}-${operation}`}><code>{operation}</code></li>
        ))}
      </ol>
      <p>
        La première opération normalise la ligne du pivot. Les suivantes annulent la colonne entrante dans toutes les autres lignes.
      </p>
    </div>
  );
}

function IterationExplanation({ iteration }: { iteration: SimplexIteration }) {
  return (
    <article className="simplex-explanation simplex-live-explanation simplex-pedagogy-card">
      <div className="simplex-explanation-icon"><Lightbulb size={21} /></div>
      <div className="simplex-live-explanation-copy">
        <span className="card-kicker">LECTURE DE L’ITÉRATION</span>
        <h2>{iteration.phase === 1 ? "Phase I · recherche de faisabilité" : "Phase II · optimisation"}</h2>
        <p>{iteration.explanation}</p>
        <div className="simplex-pivot-facts">
          <span><small>Variable entrante</small><strong>{iteration.enteringVariable ?? "Aucune"}</strong></span>
          <span><small>Variable sortante</small><strong>{iteration.leavingVariable ?? "Aucune"}</strong></span>
          <span><small>Élément pivot</small><strong>{formatNumber(iteration.pivotValue)}</strong></span>
          <span><small>Valeur de l’objectif du tableau</small><strong>{formatNumber(iteration.objectiveValue)}</strong></span>
        </div>
        <PivotDecision iteration={iteration} />
        <RatioDetails iteration={iteration} />
        <RowOperations iteration={iteration} />
      </div>
    </article>
  );
}

function IterationBlock({
  iteration,
  index,
  total,
}: {
  iteration: SimplexIteration;
  index: number;
  total: number;
}) {
  return (
    <section className="simplex-iteration-block" id={`simplex-iteration-${index + 1}`}>
      <div className="simplex-iteration-block-heading">
        <div>
          <span className="card-kicker">ÉTAPE {index + 1} / {total} · PHASE {iteration.phase}</span>
          <h2>{iterationTitle(iteration, index, total)}</h2>
        </div>
        <span className={`simplex-stage-badge${iteration.enteringVariable ? " is-pivoting" : " is-check"}`}>
          {iteration.enteringVariable ? "Pivot à effectuer" : "Contrôle d’optimalité"}
        </span>
      </div>

      <article className="workspace-card simplex-table-card simplex-live-table-card">
        <div className="workspace-card-heading">
          <div>
            <span className="card-kicker">TABLEAU DU SIMPLEXE</span>
            <h2>{iteration.enteringVariable ? `Entrée ${iteration.enteringVariable} · sortie ${iteration.leavingVariable ?? "—"}` : "Tableau de vérification"}</h2>
          </div>
          <span className="pending-badge simplex-computed-badge"><span /> Calcul réel</span>
        </div>
        <SimplexTable iteration={iteration} />
        <div className="pivot-legend simplex-live-legend">
          <span><i className="legend-pivot-column" /> Colonne entrante</span>
          <span><i className="legend-pivot-row" /> Ligne sortante</span>
          <span><i className="legend-pivot-cell" /> Élément pivot</span>
        </div>
      </article>

      <IterationExplanation iteration={iteration} />
    </section>
  );
}

function ResultSummary({ result }: { result: SimplexResult }) {
  return (
    <article className={`workspace-card simplex-result-summary simplex-final-result ${getStatusClass(result)}`} aria-live="polite">
      <div className="simplex-result-icon">
        {result.status === "optimal" ? <Trophy size={20} /> : getStatusIcon(result)}
      </div>
      <div className="simplex-result-copy">
        <span className="card-kicker">CONCLUSION DE LA RÉSOLUTION</span>
        <h2>{getStatusLabel(result)}</h2>
        <p>{result.message}</p>
        {result.status === "optimal" && result.objectiveValue !== undefined && result.variableValues && (
          <div className="simplex-optimal-values">
            <span>
              <small>Valeur optimale</small>
              <strong>{result.direction === "max" ? "Z max" : "Z min"} = {formatNumber(result.objectiveValue)}</strong>
            </span>
            {Object.entries(result.variableValues).map(([name, value]) => (
              <span key={name}>
                <small>{name}</small>
                <strong>{formatNumber(value)}</strong>
              </span>
            ))}
            <span>
              <small>Pivots effectués</small>
              <strong>{result.totalPivots}</strong>
            </span>
          </div>
        )}
        {result.notes.length > 0 && (
          <ul className="simplex-result-notes">
            {result.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
          </ul>
        )}
        {result.status === "unsupported_domain" && (
          <Link to="/branch-bound" className="text-action">
            Examiner Branch &amp; Bound <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function SimplexPage() {
  const problem = useMemo(() => loadOptimizationProblem(), []);
  const result = useMemo(() => problem ? solveSimplex(problem) : null, [problem]);
  const [activeIterationIndex, setActiveIterationIndex] = useState(0);
  const [showAllTables, setShowAllTables] = useState(true);

  const iterations = result?.iterations ?? [];
  const activeIndex = Math.min(activeIterationIndex, Math.max(0, iterations.length - 1));
  const activeIteration = iterations[activeIndex];

  if (!problem) {
    return (
      <section className="result-page algorithm-page algorithm-page-simplex">
        <div className="result-page-heading algorithm-page-heading">
          <div className="algorithm-heading-copy">
            <span className="section-eyebrow">ÉTAPE 03 · RÉSOUDRE</span>
            <h1>Méthode du <em>Simplexe.</em></h1>
            <p>Le moteur est prêt à calculer les tableaux et à expliquer les pivots à partir de votre modèle.</p>
          </div>
          <div className="algorithm-heading-art algorithm-heading-art-simplex" aria-hidden="true">
            <div className="simplex-art-matrix">{Array.from({ length: 12 }, (_, index) => <span key={index} className={index === 5 ? "simplex-art-cell is-pivot" : "simplex-art-cell"} />)}</div>
            <span className="simplex-art-icon"><Table2 size={28} strokeWidth={1.5} /></span>
            <span className="algorithm-art-caption">TABLEAU · PIVOT</span>
            <span className="algorithm-art-index">03</span>
          </div>
        </div>
        <article className="workspace-card simplex-no-model">
          <div className="empty-state-icon"><Table2 size={22} /></div>
          <h2>Aucun modèle validé à résoudre</h2>
          <p>Commencez par créer un problème continu dans le formulaire. Après validation, revenez ici pour examiner toutes les itérations réelles du Simplexe.</p>
          <Link to="/solve" className="button button-primary">Définir un problème <ArrowRight size={16} /></Link>
        </article>
      </section>
    );
  }

  return (
    <section className="result-page algorithm-page algorithm-page-simplex simplex-live-page">
      <div className="result-page-heading algorithm-page-heading">
        <div className="algorithm-heading-copy">
          <span className="section-eyebrow">ÉTAPE 03 · RÉSOUDRE</span>
          <h1>Méthode du <em>Simplexe.</em></h1>
          <p>Suivez le calcul complet : tableau initial, choix du pivot, opérations de ligne, tableaux intermédiaires et solution finale.</p>
          <div className="algorithm-heading-meta">
            <span className="algorithm-heading-chip"><Table2 size={14} strokeWidth={1.9} /> Programmation linéaire continue</span>
            <span className="algorithm-heading-note">{problem.variables.length} variable(s) · {problem.constraints.length} contrainte(s)</span>
          </div>
        </div>
        <div className="algorithm-heading-art algorithm-heading-art-simplex" aria-hidden="true">
          <div className="simplex-art-matrix">{Array.from({ length: 12 }, (_, index) => <span key={index} className={index === 5 ? "simplex-art-cell is-pivot" : index === 4 || index === 6 || index === 7 ? "simplex-art-cell is-highlighted" : "simplex-art-cell"} />)}</div>
          <span className="simplex-art-icon"><Table2 size={28} strokeWidth={1.5} /></span>
          <span className="algorithm-art-caption">TABLEAU · PIVOT</span>
          <span className="algorithm-art-index">03</span>
        </div>
      </div>

      {result && iterations.length > 0 && (
        <>
          <div className="simplex-learning-banner">
            <Lightbulb size={18} />
            <div>
              <strong>Résolution détaillée</strong>
              <span>{iterations.length} tableau(x) enregistré(s) · {result.totalPivots} pivot(s). Chaque tableau ci-dessous provient réellement du moteur.</span>
            </div>
          </div>

          <div className="iteration-toolbar simplex-live-toolbar simplex-view-toolbar">
            <div className="iteration-counter">
              <span className="card-kicker">PARCOURS DU CALCUL</span>
              <strong>{showAllTables ? "Tous les tableaux" : `Tableau ${activeIndex + 1}`} <span>/ {iterations.length}</span></strong>
              <small>{showAllTables ? "Vue complète de la résolution" : activeIteration?.phase === 1 ? "Phase I · faisabilité" : "Phase II · optimisation"}</small>
            </div>
            <div className="iteration-actions">
              {!showAllTables && (
                <>
                  <button type="button" className="icon-button" disabled={activeIndex === 0} onClick={() => setActiveIterationIndex((index) => Math.max(0, index - 1))} aria-label="Tableau précédent"><ChevronLeft size={17} /></button>
                  <button type="button" className="icon-button" disabled={activeIndex >= iterations.length - 1} onClick={() => setActiveIterationIndex((index) => Math.min(iterations.length - 1, index + 1))} aria-label="Tableau suivant"><ChevronRight size={17} /></button>
                </>
              )}
              <button type="button" className={`button ${showAllTables ? "button-primary" : "button-secondary"}`} onClick={() => setShowAllTables(true)}>
                <ListOrdered size={15} /> Tous les tableaux
              </button>
              <button type="button" className={`button ${!showAllTables ? "button-primary" : "button-secondary"}`} onClick={() => setShowAllTables(false)}>
                <Table2 size={15} /> Vue guidée
              </button>
            </div>
          </div>

          <article className="workspace-card simplex-timeline-card">
            <div className="workspace-card-heading">
              <div><span className="card-kicker">HISTORIQUE</span><h2>Étapes de la résolution</h2></div>
              <ListOrdered size={19} className="card-heading-icon" />
            </div>
            <div className="simplex-timeline" aria-label="Historique des tableaux">
              {iterations.map((iteration, index) => (
                <button
                  type="button"
                  key={`${iteration.phase}-${iteration.iteration}-${index}`}
                  className={`simplex-timeline-step${index === activeIndex && !showAllTables ? " is-current" : ""}${!iteration.enteringVariable ? " is-check" : ""}`}
                  onClick={() => {
                    setActiveIterationIndex(index);
                    setShowAllTables(false);
                  }}
                >
                  <span>{index + 1}</span>
                  <strong>{iterationTitle(iteration, index, iterations.length)}</strong>
                  <small>Phase {iteration.phase}</small>
                </button>
              ))}
            </div>
          </article>

          {showAllTables ? (
            <div className="simplex-all-tables">
              {iterations.map((iteration, index) => (
                <IterationBlock
                  key={`${iteration.phase}-${iteration.iteration}-${index}`}
                  iteration={iteration}
                  index={index}
                  total={iterations.length}
                />
              ))}
            </div>
          ) : activeIteration ? (
            <IterationBlock iteration={activeIteration} index={activeIndex} total={iterations.length} />
          ) : null}
        </>
      )}

      {result && iterations.length === 0 && (
        <article className="workspace-card simplex-no-iterations">
          <div className="empty-state-icon"><Info size={22} /></div>
          <h2>Aucun tableau exploitable n'a été produit</h2>
          <p>Le moteur a terminé sans produire d'itération affichable. Consultez la conclusion ci-dessous et vérifiez la nature du modèle.</p>
        </article>
      )}

      {result && <ResultSummary result={result} />}

      <div className="result-page-footer-actions">
        <Link to="/analysis" className="button button-secondary"><ArrowLeft size={16} /> Retour à l’analyse</Link>
        <Link to="/solve" className="button button-secondary"><RefreshCw size={15} /> Modifier le modèle</Link>
        <Link to="/branch-bound" className="button button-primary">Voir Branch &amp; Bound <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}
