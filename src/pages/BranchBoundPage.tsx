import { ArrowLeft, GitBranch, Trophy } from "lucide-react";
import { Link } from "react-router";

import "../styles/algorithm-pages.css";

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
    <section className="result-page algorithm-page algorithm-page-bnb">
      <div className="result-page-heading algorithm-page-heading">
        <div className="algorithm-heading-copy">
          <span className="section-eyebrow">ÉTAPE 04 · EXPLORER</span>
          <h1>Arbre de recherche <em>Branch &amp; Bound.</em></h1>
          <p>
            Visualisez les branchements, les bornes et les raisons d’exploration
            ou d’élagage des nœuds.
          </p>
          <div className="algorithm-heading-meta">
            <span className="algorithm-heading-chip algorithm-heading-chip-copper">
              <GitBranch size={14} strokeWidth={1.9} />
              Programmation en nombres entiers
            </span>
            <span className="algorithm-heading-note">Branches · bornes · élagage</span>
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
          <span className="algorithm-art-index">04</span>
        </div>
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
