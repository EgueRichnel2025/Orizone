import { ArrowLeft, ArrowRight, Lightbulb, Table2 } from "lucide-react";
import { Link } from "react-router";

const columns = ["Base", "x₁", "x₂", "s₁", "s₂", "Sol."];
const rows = ["s₁", "s₂", "Cⱼ − Zⱼ"];

export default function SimplexPage() {
  return (
    <section className="result-page">
      <div className="result-page-heading">
        <span className="section-eyebrow">ÉTAPE 03 · RÉSOUDRE</span>
        <h1>Méthode du <em>Simplexe.</em></h1>
        <p>Suivez les itérations du tableau, identifiez le pivot et comprenez chaque transformation.</p>
      </div>

      <div className="iteration-toolbar">
        <div className="iteration-counter">
          <span className="card-kicker">PROGRESSION</span>
          <strong>Itération <span>—</span></strong>
          <small>Aucune itération calculée</small>
        </div>
        <div className="iteration-actions">
          <button type="button" className="icon-button" disabled aria-label="Itération précédente"><ArrowLeft size={17} /></button>
          <button type="button" className="icon-button" disabled aria-label="Itération suivante"><ArrowRight size={17} /></button>
          <button type="button" className="button button-secondary" disabled>Voir toutes les étapes</button>
        </div>
      </div>

      <article className="workspace-card simplex-table-card">
        <div className="workspace-card-heading">
          <div>
            <span className="card-kicker">TABLEAU DU SIMPLEXE</span>
            <h2>Tableau d’itération</h2>
          </div>
          <span className="pending-badge"><span /> Non calculé</span>
        </div>
        <div className="simplex-table-wrap">
          <table className="simplex-table">
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row}>
                  <th scope="row">{row}</th>
                  {columns.slice(1).map((column) => <td key={`${row}-${column}`}>—</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pivot-legend">
          <span><i className="legend-pivot-column" /> Colonne pivot</span>
          <span><i className="legend-pivot-row" /> Ligne pivot</span>
          <span><i className="legend-pivot-cell" /> Élément pivot</span>
        </div>
        <p className="card-footnote">Le tableau sera rempli à partir des itérations réellement produites par l’algorithme.</p>
      </article>

      <article className="simplex-explanation">
        <div className="simplex-explanation-icon"><Lightbulb size={21} /></div>
        <div>
          <span className="card-kicker">EXPLICATION DE L’ÉTAPE</span>
          <h2>Chaque pivot sera justifié.</h2>
          <p>Lorsqu’un tableau sera calculé, Orizone expliquera le choix de la variable entrante, de la variable sortante, l’élément pivot et les opérations de ligne effectuées.</p>
        </div>
        <Table2 className="explanation-decoration" size={30} />
      </article>

      <div className="result-page-footer-actions">
        <Link to="/analysis" className="button button-secondary"><ArrowLeft size={16} /> Retour à l’analyse</Link>
        <Link to="/branch-bound" className="button button-primary">Voir Branch &amp; Bound <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}
