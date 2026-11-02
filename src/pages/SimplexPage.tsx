import { useEffect, useMemo, useState } from "react";
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
import { SimplexTableau } from "../components/algorithm/SimplexTableau";
import { getOrCreateOptimizationRunId, loadOptimizationProblem } from "../utils/optimization-storage";
import { saveResolutionHistory } from "../utils/resolution-history";
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

interface RowOperation {
  formula: string;
  explanation: string;
}

function buildRowOperations(iteration: SimplexIteration): RowOperation[] {
  const pivotRow = pivotRowIndex(iteration);
  const pivotColumn = pivotColumnIndex(iteration);
  const pivotValue = iteration.pivotValue;

  if (
    pivotRow < 0 ||
    pivotColumn < 0 ||
    pivotValue === null ||
    Math.abs(pivotValue) <= EPSILON
  ) {
    return [];
  }

  const pivotLabel = `L${pivotRow + 1}`;
  const pivotVariable = iteration.enteringVariable ?? "la variable choisie";
  const operations: RowOperation[] = [];

  operations.push({
    formula: `${pivotLabel} ← ${pivotLabel} / ${formatNumber(pivotValue)}`,
    explanation:
      `Nous divisons tous les nombres de cette ligne par ${formatNumber(pivotValue)}. ` +
      `Le but est de transformer le nombre situé dans la colonne ${pivotVariable} en 1. ` +
      `Cette ligne servira ensuite à modifier les autres lignes.`,
  });

  const objectiveFactor = iteration.reducedCosts[pivotColumn] ?? 0;

  if (Math.abs(objectiveFactor) > EPSILON) {
    const sign = objectiveFactor > 0 ? "−" : "+";

    operations.push({
      formula:
        `Lz ← Lz ${sign} ${formatNumber(Math.abs(objectiveFactor))} × ${pivotLabel}`,
      explanation:
        `Cette ligne représente notre objectif. Nous la modifions pour obtenir 0 ` +
        `dans la colonne ${pivotVariable}. Cela permet de conserver un tableau ` +
        `cohérent après le changement de variable.`,
    });
  }

  iteration.tableau.forEach((row, rowIndex) => {
    if (rowIndex === pivotRow) return;

    const factor = row[pivotColumn];

    if (Math.abs(factor) <= EPSILON) return;

    const rowLabel = `L${rowIndex + 1}`;
    const sign = factor > 0 ? "−" : "+";

    operations.push({
      formula:
        `${rowLabel} ← ${rowLabel} ${sign} ${formatNumber(Math.abs(factor))} × ${pivotLabel}`,
      explanation:
        `Nous modifions cette ligne pour obtenir également 0 dans la colonne ` +
        `${pivotVariable}. De cette manière, cette variable n'apparaît plus ` +
        `dans les autres lignes du tableau.`,
    });
  });

  return operations;
}

function getIterationNarrative(iteration: SimplexIteration): string {
  if (iteration.enteringVariable && !iteration.leavingVariable) {
    return (
      `Le calcul montre que nous pouvons encore améliorer le résultat en faisant évoluer ` +
      `${iteration.enteringVariable}. Mais aucune contrainte ne vient limiter cette évolution. ` +
      `Le problème ne possède donc pas de meilleur résultat fini dans cette direction.`
    );
  }

  if (iteration.phase === 1 && !iteration.enteringVariable) {
    if (Math.abs(iteration.objectiveValue) <= EPSILON) {
      return (
        "La première vérification est terminée. Son résultat est égal à zéro : " +
        "cela signifie que nous avons trouvé une manière de respecter toutes les contraintes " +
        "en même temps. Nous pouvons maintenant chercher le meilleur résultat."
      );
    }

    return (
      "La première vérification n'a pas réussi à satisfaire toutes les contraintes. " +
      "Certaines conditions du problème sont incompatibles entre elles. " +
      "Il n'existe donc pas de solution qui respecte toutes les contraintes."
    );
  }

  if (iteration.phase === 1) {
    return (
      "Nous commençons par vérifier qu'il est possible de respecter toutes les limites " +
      "du problème. Cette première partie utilise temporairement des variables " +
      "supplémentaires pour construire un point de départ valide."
    );
  }

  if (!iteration.enteringVariable) {
    return (
      "Nous avons comparé les possibilités d'amélioration. Aucune variable ne permet " +
      "encore d'améliorer le résultat. Le calcul a atteint son optimum : " +
      "nous avons trouvé la meilleure valeur possible pour le modèle."
    );
  }

  return (
    "Nous cherchons maintenant à améliorer le résultat. Le tableau nous indique " +
    "quelle variable choisir, puis quelle contrainte risque d'être atteinte en premier. " +
    "Nous allons utiliser ces informations pour construire le tableau suivant."
  );
}

function PivotDecision({ iteration }: { iteration: SimplexIteration }) {
  const pivotRow = pivotRowIndex(iteration);
  const pivotColumn = pivotColumnIndex(iteration);

  if (!iteration.enteringVariable || pivotColumn < 0) return null;

  const reducedCost = iteration.reducedCosts[pivotColumn];

  const candidates = iteration.columns
    .map((name, index) => ({
      name,
      value: iteration.reducedCosts[index] ?? 0,
    }))
    .filter((candidate) => candidate.value > EPSILON)
    .sort((left, right) => right.value - left.value);

  const candidatesText = candidates
    .map((candidate) => `${candidate.name} : ${formatNumber(candidate.value)}`)
    .join(" ; ");

  return (
    <div className="simplex-decision-grid">
      <section className="simplex-decision-block">
        <span className="simplex-decision-step">1</span>
        <div>
          <small>Quelle variable choisir ?</small>
          <strong>Nous choisissons {iteration.enteringVariable}</strong>
          <p>
            Nous comparons les possibilités indiquées dans la ligne de l'objectif.
            {candidatesText ? ` Voici les valeurs positives : ${candidatesText}.` : ""}
            {" "}La meilleure valeur est {formatNumber(reducedCost)} pour
            {" "}{iteration.enteringVariable}. Nous choisissons donc cette variable
            pour essayer d'améliorer le résultat.
          </p>
        </div>
      </section>

      <section className="simplex-decision-block">
        <span className="simplex-decision-step">2</span>
        <div>
          <small>Quelle limite sera atteinte en premier ?</small>
          <strong>
            {iteration.leavingVariable
              ? `${iteration.leavingVariable} correspond à la première limite atteinte`
              : "Aucune limite ne bloque cette évolution"}
          </strong>
          <p>
            Nous calculons combien de fois nous pouvons augmenter
            {" "}{iteration.enteringVariable} sans dépasser chaque contrainte.
            La plus petite quantité calculée indique la limite que nous atteindrons
            en premier.
          </p>
        </div>
      </section>

      <section className="simplex-decision-block">
        <span className="simplex-decision-step">3</span>
        <div>
          <small>Quel nombre va transformer le tableau ?</small>
          <strong>
            {iteration.pivotValue === null
              ? "Aucun pivot disponible"
              : formatNumber(iteration.pivotValue)}
          </strong>
          <p>
            Ce nombre se trouve au croisement de la ligne choisie et de la colonne
            {" "}{iteration.enteringVariable}. Nous allons nous en servir pour
            transformer les lignes et préparer le prochain tableau.
            {pivotRow >= 0 ? ` Il se trouve sur la ligne ${pivotRow + 1}.` : ""}
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
        <span className="card-kicker">COMPARAISON DES LIMITES</span>
        <h3>Jusqu'où pouvons-nous augmenter {iteration.enteringVariable} ?</h3>
      </div>

      <p className="simplex-pedagogy-intro">
        Chaque contrainte impose une limite. Nous divisons la quantité disponible
        par le coefficient de la variable choisie. Le plus petit résultat positif
        indique la contrainte qui sera atteinte en premier.
      </p>

      <div className="simplex-ratio-list">
        {iteration.tableau.map((row, rowIndex) => {
          const coefficient = row[pivotColumn];
          const rhs = row[iteration.columns.length];
          const ratio = iteration.ratioTests[rowIndex];
          const selected = rowIndex === pivotRow;
          const admissible = coefficient > EPSILON && ratio !== null;

          return (
            <div
              className={`simplex-ratio-item${selected ? " is-selected" : ""}`}
              key={`ratio-${rowIndex}`}
            >
              <span className="simplex-ratio-base">
                {iteration.basis[rowIndex] ?? `L${rowIndex + 1}`}
              </span>

              <div className="simplex-ratio-calculation">
                {admissible ? (
                  <>
                    <code>
                      {formatNumber(rhs)} ÷ {formatNumber(coefficient)} = {formatNumber(ratio)}
                    </code>
                    <p>
                      Cette limite serait atteinte après {formatNumber(ratio)} unité(s)
                      supplémentaires.
                    </p>
                  </>
                ) : (
                  <p>
                    Cette contrainte ne limite pas l'augmentation de
                    {" "}{iteration.enteringVariable} dans le sens choisi.
                  </p>
                )}
              </div>

              <strong>
                {selected
                  ? "Première limite atteinte"
                  : admissible
                    ? "Autre limite"
                    : "Ne bloque pas"}
              </strong>
            </div>
          );
        })}
      </div>

      {iteration.leavingVariable && (
        <p className="simplex-ratio-conclusion">
          <strong>Conclusion :</strong> la limite associée à {iteration.leavingVariable}
          {" "}sera atteinte avant les autres. C'est pour cette raison que nous
          retenons cette ligne pour le prochain calcul.
        </p>
      )}
    </div>
  );
}

function RowOperations({ iteration }: { iteration: SimplexIteration }) {
  const operations = buildRowOperations(iteration);

  if (operations.length === 0) return null;

  return (
    <div className="simplex-operations">
      <div className="simplex-subsection-heading">
        <span className="card-kicker">CONSTRUCTION DU TABLEAU SUIVANT</span>
        <h3>Comment effectuons-nous les changements ?</h3>
      </div>

      <p className="simplex-operations-intro">
        Nous voulons obtenir 1 dans la colonne de la variable choisie, sur la ligne
        du pivot, et 0 dans cette même colonne sur toutes les autres lignes.
        Voici comment nous y arrivons.
      </p>

      <ol>
        {operations.map((operation, index) => (
          <li key={`${index}-${operation.formula}`}>
            <div>
              <code>{operation.formula}</code>
              <p>{operation.explanation}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="simplex-operations-result">
        Une fois ces opérations terminées, nous obtenons un nouveau tableau.
        Il représente le même problème, mais avec une nouvelle variable dans
        la solution actuelle. Nous pouvons alors recommencer le raisonnement.
      </p>
    </div>
  );
}

function IterationExplanation({ iteration }: { iteration: SimplexIteration }) {
  return (
    <article className="simplex-explanation simplex-live-explanation simplex-pedagogy-card">
      <div className="simplex-explanation-icon">
        <Lightbulb size={21} />
      </div>

      <div className="simplex-live-explanation-copy">
        <span className="card-kicker">COMPRENDRE LE CALCUL</span>

        <h2>
          {iteration.phase === 1
            ? "Vérifier que toutes les règles peuvent être respectées"
            : iteration.enteringVariable
              ? "Chercher une meilleure solution"
              : "La meilleure solution a été trouvée"}
        </h2>

        <p>{getIterationNarrative(iteration)}</p>

        {iteration.enteringVariable &&
        iteration.leavingVariable &&
        iteration.pivotValue !== null ? (
          <div className="simplex-pivot-facts">
            <span>
              <small>Variable que nous allons faire évoluer</small>
              <strong>{iteration.enteringVariable}</strong>
            </span>

            <span>
              <small>Contrainte atteinte en premier</small>
              <strong>{iteration.leavingVariable}</strong>
            </span>

            <span>
              <small>Nombre utilisé pour transformer le tableau</small>
              <strong>{formatNumber(iteration.pivotValue)}</strong>
            </span>

            <span>
              <small>Valeur actuelle de l'objectif</small>
              <strong>{formatNumber(iteration.objectiveValue)}</strong>
            </span>
          </div>
        ) : (
          <div className="simplex-completion-card">
            <div>
              <small>ÉTAT DU CALCUL</small>

              <strong>
                {iteration.phase === 1
                  ? Math.abs(iteration.objectiveValue) <= EPSILON
                    ? "Vérification terminée"
                    : "Les contraintes ne sont pas toutes compatibles"
                  : iteration.enteringVariable
                    ? "Amélioration possible sans limite"
                    : "Résolution terminée"}
              </strong>

              <p>
                {iteration.phase === 1
                  ? Math.abs(iteration.objectiveValue) <= EPSILON
                    ? "Nous avons trouvé un point de départ qui respecte toutes les contraintes. Nous pouvons maintenant chercher le meilleur résultat."
                    : "La vérification montre que toutes les contraintes ne peuvent pas être respectées simultanément."
                  : iteration.enteringVariable
                    ? "Nous pouvons encore améliorer le résultat, mais aucune contrainte ne vient limiter cette évolution."
                    : "Nous avons vérifié les possibilités d'amélioration. Aucune ne permet d'obtenir un meilleur résultat tout en respectant les contraintes. Nous pouvons arrêter les calculs."}
              </p>
            </div>

            <div className="simplex-completion-value">
              <small>
                {iteration.phase === 1
                  ? "Résultat de la vérification"
                  : "Valeur de l'objectif"}
              </small>
              <strong>{formatNumber(iteration.objectiveValue)}</strong>
            </div>
          </div>
        )}

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
            <h2>
              {iteration.enteringVariable && iteration.leavingVariable
                ? `Nous faisons évoluer ${iteration.enteringVariable} : la limite ${iteration.leavingVariable} est atteinte en premier`
                : iteration.phase === 1
                  ? "Vérification des contraintes"
                  : "Aucune amélioration supplémentaire possible"}
            </h2>
          </div>
          <span className="pending-badge simplex-computed-badge"><span /> Calcul réel</span>
        </div>
        <SimplexTableau iteration={iteration} />
        {iteration.enteringVariable &&
          iteration.leavingVariable &&
          iteration.pivotValue !== null && (
            <div className="pivot-legend simplex-live-legend">
              <span><i className="legend-pivot-column" /> Variable que nous allons faire évoluer</span>
              <span><i className="legend-pivot-row" /> Contrainte atteinte en premier</span>
              <span><i className="legend-pivot-cell" /> Nombre utilisé pour transformer le tableau</span>
            </div>
          )}
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

  useEffect(() => {
    if (!problem || !result) return;
    const runId = getOrCreateOptimizationRunId();
    void saveResolutionHistory({
      id: `${runId}:simplex`,
      runId,
      method: "simplex",
      createdAt: new Date().toISOString(),
      problem,
      result,
    }).catch((error: unknown) => console.error("Orizone : sauvegarde de la résolution Simplexe impossible.", error));
  }, [problem, result]);
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
