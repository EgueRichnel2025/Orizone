import { ArrowLeft, ArrowRight, Lightbulb, Table2 } from "lucide-react";
import { Link } from "react-router";

import "../styles/algorithm-pages.css";

const columns = ["Base", "x₁", "x₂", "s₁", "s₂", "Sol."];
const rows = ["s₁", "s₂", "Cⱼ − Zⱼ"];

export default function SimplexPage() {
  return (
    <section className="result-page algorithm-page algorithm-page-simplex">
      <div className="result-page-heading algorithm-page-heading">
        <div className="algorithm-heading-copy">
          <span className="section-eyebrow">ÉTAPE 03 · RÉSOUDRE</span>
          <h1>Méthode du <em>Simplexe.</em></h1>
          <p>
            Suivez les itérations du tableau, identifiez le pivot et comprenez
            chaque transformation.
          </p>
          <div className="algorithm-heading-meta">
            <span className="algorithm-heading-chip">
              <Table2 size={14} strokeWidth={1.9} />
              Programmation linéaire
            </span>
            <span className="algorithm-heading-note">Tableaux · pivots · itérations</span>
          </div>
        </div>

        <div className="algorithm-heading-art algorithm-heading-art-simplex" aria-hidden="true">
          <div className="simplex-art-matrix">
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                className={
                  index === 5
                    ? "simplex-art-cell is-pivot"
                    : index === 4 || index === 6 || index === 7
                      ? "simplex-art-cell is-highlighted"
                      : "simplex-art-cell"
                }
              />
            ))}
          </div>
          <span className="simplex-art-icon"><Table2 size={28} strokeWidth={1.5} /></span>
          <span className="algorithm-art-caption">TABLEAU · PIVOT</span>
          <span className="algorithm-art-index">03</span>
        </div>
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
