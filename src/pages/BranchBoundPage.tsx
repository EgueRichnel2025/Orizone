import { ArrowLeft, GitBranch, Trophy } from "lucide-react";
import { Link } from "react-router";

const nodeStatuses = [
  { className: "status-unexplored", label: "Non exploré" },
  { className: "status-active", label: "En cours" },
  { className: "status-fractional", label: "Fractionnaire" },
  { className: "status-integer", label: "Solution entière" },
  { className: "status-pruned", label: "Élagué" },
  { className: "status-infeasible", label: "Non réalisable" },
];

export default function BranchBoundPage() {
  return (
    <section className="result-page">
      <div className="result-page-heading">
        <span className="section-eyebrow">ÉTAPE 04 · EXPLORER</span>
        <h1>Arbre de recherche <em>Branch &amp; Bound.</em></h1>
        <p>Visualisez les branchements, les bornes et les raisons d’exploration ou d’élagage des nœuds.</p>
      </div>

      <article className="workspace-card bnb-tree-card">
        <div className="workspace-card-heading">
          <div>
            <span className="card-kicker">ARBRE DE DÉCISION</span>
            <h2>Exploration des sous-problèmes</h2>
          </div>
          <span className="pending-badge"><span /> En attente de résolution</span>
        </div>

        <div className="bnb-empty-tree" role="img" aria-label="Arbre Branch and Bound en attente des résultats de calcul">
          <svg className="bnb-connector-lines" viewBox="0 0 700 230" preserveAspectRatio="none" aria-hidden="true">
            <path d="M350 54 L180 110 M350 54 L520 110 M180 154 L100 205 M180 154 L260 205 M520 154 L440 205 M520 154 L600 205" />
          </svg>
          <div className="bnb-node bnb-root"><strong>Racine</strong><span>En attente</span></div>
          <div className="bnb-node bnb-child bnb-child-left"><strong>Nœud 1</strong><span>—</span></div>
          <div className="bnb-node bnb-child bnb-child-right"><strong>Nœud 2</strong><span>—</span></div>
          <div className="bnb-node bnb-leaf bnb-leaf-one"><span>À calculer</span></div>
          <div className="bnb-node bnb-leaf bnb-leaf-two"><span>À calculer</span></div>
          <div className="bnb-node bnb-leaf bnb-leaf-three"><span>À calculer</span></div>
          <div className="bnb-node bnb-leaf bnb-leaf-four"><span>À calculer</span></div>
        </div>

        <div className="bnb-legend" aria-label="Légende des statuts des nœuds">
          {nodeStatuses.map((status) => (
            <span key={status.className}><i className={status.className} />{status.label}</span>
          ))}
        </div>
        <p className="card-footnote">Les nœuds et leurs statuts seront générés par l’algorithme. Aucun coût, borne ou résultat fictif n’est affiché.</p>
      </article>

      <div className="bnb-bottom-grid">
        <article className="workspace-card bnb-result-card">
          <div className="result-trophy"><Trophy size={21} /></div>
          <span className="card-kicker">RÉSULTAT FINAL</span>
          <h2>La solution optimale apparaîtra ici.</h2>
          <p>La valeur de l’objectif et les variables optimales seront affichées lorsque Branch &amp; Bound aura réellement terminé son exploration.</p>
        </article>
        <article className="workspace-card bnb-stats-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">STATISTIQUES</span>
              <h2>Suivi de l’exploration</h2>
            </div>
            <GitBranch size={20} className="card-heading-icon" />
          </div>
          <div className="bnb-stat-row"><span>Nœuds explorés</span><strong>—</strong></div>
          <div className="bnb-stat-row"><span>Nœuds élagués</span><strong>—</strong></div>
          <div className="bnb-stat-row"><span>Temps de résolution</span><strong>—</strong></div>
        </article>
      </div>

      <div className="result-page-footer-actions">
        <Link to="/analysis" className="button button-secondary"><ArrowLeft size={16} /> Retour à l’analyse</Link>
      </div>
    </section>
  );
}
