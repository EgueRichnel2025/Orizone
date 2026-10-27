import { ArrowRight, CheckCircle2, CircleHelp, GitBranch, LineChart, ScanSearch } from "lucide-react";
import { Link } from "react-router";

const summaryItems = [
  { label: "Nature du problème", value: "En attente d’analyse" },
  { label: "Faisabilité", value: "À déterminer" },
  { label: "Méthode recommandée", value: "À déterminer" },
];

export default function AnalysisPage() {
  return (
    <section className="result-page">
      <div className="result-page-heading">
        <span className="section-eyebrow">ÉTAPE 02 · COMPRENDRE</span>
        <h1>Analyse du <em>problème.</em></h1>
        <p>Examinez la structure du modèle avant de lancer une méthode de résolution.</p>
      </div>

      <div className="result-tabs" role="tablist" aria-label="Sections de l’analyse">
        <span className="result-tab is-active"><ScanSearch size={16} /> Résumé</span>
        <span className="result-tab"><CircleHelp size={16} /> Caractéristiques</span>
        <span className="result-tab"><LineChart size={16} /> Graphique</span>
      </div>

      <div className="analysis-summary-grid">
        {summaryItems.map((item) => (
          <article className="analysis-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="analysis-content-grid">
        <article className="workspace-card formulation-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">MODÈLE MATHÉMATIQUE</span>
              <h2>Formulation du problème</h2>
            </div>
            <span className="pending-badge"><span /> En attente</span>
          </div>
          <div className="result-empty-state compact-empty-state">
            <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
            <h3>Aucun modèle analysé</h3>
            <p>Validez d’abord votre problème. La fonction objectif, les contraintes et le domaine des variables apparaîtront ici à partir des données saisies.</p>
            <Link to="/solve" className="text-action">Retourner au formulaire <ArrowRight size={15} /></Link>
          </div>
        </article>

        <article className="workspace-card geometry-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">VISUALISATION</span>
              <h2>Région réalisable</h2>
            </div>
            <LineChart size={19} className="card-heading-icon" />
          </div>
          <div className="geometry-empty-plot" role="img" aria-label="Graphique en attente de contraintes à représenter">
            <div className="plot-axis plot-axis-x"><span>x₁</span></div>
            <div className="plot-axis plot-axis-y"><span>x₂</span></div>
            <div className="plot-empty-label">Le graphique apparaîtra<br />après l’analyse du modèle.</div>
          </div>
          <p className="card-footnote">La représentation 2D est pertinente pour les modèles à deux variables.</p>
        </article>
      </div>

      <article className="workspace-card recommendation-card">
        <div className="recommendation-icon"><GitBranch size={21} /></div>
        <div>
          <span className="card-kicker">PROCHAINE ÉTAPE</span>
          <h2>La méthode sera déterminée à partir du modèle.</h2>
          <p>Orizone ne recommandera une méthode qu’après avoir examiné le type de variables, les contraintes et les propriétés du problème.</p>
        </div>
      </article>
    </section>
  );
}
