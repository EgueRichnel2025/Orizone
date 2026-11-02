import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GitBranch,
  History,
  Info,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router";
import "../styles/learning-pages.css";

const guideSections = [
  { id: "start", label: "Commencer" },
  { id: "formulation", label: "Formuler le problème" },
  { id: "variables", label: "Configurer les variables" },
  { id: "constraints", label: "Ajouter les contraintes" },
  { id: "method", label: "Choisir une méthode" },
  { id: "results", label: "Lire les résultats" },
  { id: "history", label: "Historique et rapports" },
  { id: "errors", label: "Erreurs fréquentes" },
];

export default function DocumentationPage() {
  return (
    <main className="learn-page documentation-page">
      <header className="learn-hero">
        <span className="section-eyebrow">CENTRE D'AIDE · GUIDE D'UTILISATION</span>
        <h1>La documentation <em>d'Orizone.</em></h1>
        <p>
          Un guide pour apprendre à construire un problème d'optimisation,
          lancer sa résolution et comprendre les résultats affichés par Orizone.
          Vous pouvez suivre les sections dans l'ordre ou accéder directement
          à la question qui vous intéresse.
        </p>
        <div className="learn-hero-actions">
          <Link to="/solve" className="button button-primary">
            Créer mon premier problème <ArrowRight size={16} />
          </Link>
          <Link to="/methods" className="button button-secondary">
            Découvrir les méthodes <BookOpen size={16} />
          </Link>
        </div>
      </header>

      <div className="documentation-layout">
        <aside className="documentation-index">
          <span className="card-kicker">DANS CE GUIDE</span>
          <nav aria-label="Sommaire de la documentation">
            {guideSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="documentation-content">
          <section id="start" className="learn-doc-section">
            <span className="section-eyebrow">01 · PREMIERS PAS</span>
            <h2>Comment commencer ?</h2>
            <p>
              Orizone vous accompagne dans la résolution de problèmes
              d'optimisation. Le travail commence par la formulation du modèle :
              vous décrivez ce que vous cherchez, les décisions possibles et
              les limites à respecter.
            </p>
            <div className="learn-doc-callout">
              <Info size={18} />
              <p>
                Avant de lancer un algorithme, assurez-vous que les coefficients,
                les unités et les limites correspondent bien à votre problème réel.
              </p>
            </div>
            <Link to="/solve" className="learn-inline-link">
              Ouvrir le formulaire de modélisation <ArrowRight size={15} />
            </Link>
          </section>

          <section id="formulation" className="learn-doc-section">
            <span className="section-eyebrow">02 · FORMULATION</span>
            <h2>Définir le problème</h2>
            <p>Commencez par répondre à trois questions :</p>
            <ol className="learn-doc-list">
              <li><strong>Que voulez-vous optimiser ?</strong><span>Un bénéfice, un coût, un temps ou une autre quantité mesurable.</span></li>
              <li><strong>Quelles décisions pouvez-vous prendre ?</strong><span>Ce sont les variables, par exemple x₁ et x₂.</span></li>
              <li><strong>Quelles limites devez-vous respecter ?</strong><span>Ce sont les contraintes : budget, capacité, temps ou disponibilité.</span></li>
            </ol>
            <div className="learn-doc-example">
              <span className="card-kicker">EXEMPLE</span>
              <strong>Maximiser Z = 3x₁ + 5x₂</strong>
              <code>x₁ + 2x₂ ≤ 8</code>
              <code>3x₁ + 2x₂ ≤ 12</code>
              <code>x₁ ≥ 0 ; x₂ ≥ 0</code>
            </div>
          </section>

          <section id="variables" className="learn-doc-section">
            <span className="section-eyebrow">03 · VARIABLES</span>
            <h2>Configurer les variables</h2>
            <p>
              Chaque variable possède un type et éventuellement des bornes.
              Ces paramètres indiquent les valeurs qu'elle a le droit de prendre.
            </p>
            <div className="learn-doc-table-wrap">
              <table className="learn-doc-table">
                <thead><tr><th>Type</th><th>Signification</th><th>Exemple</th></tr></thead>
                <tbody>
                  <tr><td>Réelle</td><td>Peut prendre des valeurs décimales.</td><td>2,5</td></tr>
                  <tr><td>Entière</td><td>Doit prendre une valeur sans partie décimale.</td><td>0, 1, 2, 3…</td></tr>
                  <tr><td>Binaire</td><td>Ne peut prendre que 0 ou 1.</td><td>0 ou 1</td></tr>
                </tbody>
              </table>
            </div>
            <div className="learn-doc-callout">
              <Lightbulb size={18} />
              <p>
                Par défaut, une variable réelle ou entière est positive ou nulle
                dans le formulaire. Une borne inférieure vide signifie qu'elle
                peut aussi prendre des valeurs négatives. Une variable binaire
                possède automatiquement les bornes 0 et 1.
              </p>
            </div>
          </section>

          <section id="constraints" className="learn-doc-section">
            <span className="section-eyebrow">04 · CONTRAINTES</span>
            <h2>Ajouter les contraintes</h2>
            <p>
              Une contrainte traduit une limite de votre problème. Choisissez
              le bon signe et indiquez la quantité maximale, minimale ou exacte.
            </p>
            <div className="learn-operator-grid">
              <article><strong>≤</strong><span>Inférieur ou égal</span><p>La quantité ne doit pas dépasser une limite.</p></article>
              <article><strong>≥</strong><span>Supérieur ou égal</span><p>La quantité doit atteindre au moins un minimum.</p></article>
              <article><strong>=</strong><span>Égal</span><p>La quantité doit être exactement égale à la valeur fixée.</p></article>
            </div>
            <p>
              Vérifiez que chaque contrainte contient un coefficient pour chaque
              variable et un second membre cohérent avec les unités utilisées.
            </p>
          </section>

          <section id="method" className="learn-doc-section">
            <span className="section-eyebrow">05 · RÉSOLUTION</span>
            <h2>Choisir la méthode adaptée</h2>
            <div className="learn-doc-method">
              <div className="learn-method-icon"><CheckCircle2 size={21} /></div>
              <div><strong>Simplexe</strong><p>À utiliser lorsque toutes les variables sont continues. Le résultat peut contenir des valeurs décimales.</p><Link to="/simplex">Consulter la méthode <ArrowRight size={14} /></Link></div>
            </div>
            <div className="learn-doc-method">
              <div className="learn-method-icon"><GitBranch size={21} /></div>
              <div><strong>Branch &amp; Bound</strong><p>À utiliser lorsqu'au moins une variable est entière ou binaire. Les relaxations continues sont résolues avec le Simplexe.</p><Link to="/branch-bound">Consulter la méthode <ArrowRight size={14} /></Link></div>
            </div>
            <div className="learn-doc-callout">
              <Info size={18} />
              <p>
                Branch &amp; Bound n'est pas destiné aux modèles entièrement continus.
                Pour ces modèles, utilisez directement le Simplexe.
              </p>
            </div>
          </section>

          <section id="results" className="learn-doc-section">
            <span className="section-eyebrow">06 · INTERPRÉTATION</span>
            <h2>Comprendre les résultats</h2>
            <h3>Dans une résolution par Simplexe</h3>
            <ul className="learn-doc-bullets">
              <li><strong>La base :</strong> indique les variables qui occupent les lignes de contraintes.</li>
              <li><strong>La ligne objectif :</strong> permet de suivre les possibilités d'amélioration.</li>
              <li><strong>SOL :</strong> indique la quantité disponible ou le résultat associé à la ligne.</li>
              <li><strong>Le rapport :</strong> sert à déterminer quelle contrainte sera atteinte en premier.</li>
              <li><strong>Le pivot :</strong> est le nombre utilisé pour transformer le tableau.</li>
            </ul>
            <h3>Dans une résolution Branch &amp; Bound</h3>
            <ul className="learn-doc-bullets">
              <li><strong>Un nœud :</strong> représente un sous-problème.</li>
              <li><strong>Une branche :</strong> indique la contrainte ajoutée pour créer un sous-problème enfant.</li>
              <li><strong>La relaxation :</strong> autorise temporairement les variables discrètes à prendre des valeurs décimales.</li>
              <li><strong>Une borne :</strong> indique ce que le sous-problème pourrait atteindre au mieux.</li>
              <li><strong>L'élagage :</strong> signifie que l'exploration de ce sous-problème peut être arrêtée avec une justification.</li>
            </ul>
          </section>

          <section id="history" className="learn-doc-section">
            <span className="section-eyebrow">07 · SUIVI DES RÉSOLUTIONS</span>
            <h2>Historique et rapports</h2>
            <p>
              L'historique permet de retrouver les résolutions enregistrées,
              de consulter les modèles associés et de revoir les résultats.
            </p>
            <div className="learn-doc-method">
              <div className="learn-method-icon"><History size={21} /></div>
              <div><strong>Retrouver une résolution</strong><p>Ouvrez l'historique, sélectionnez une résolution puis consultez ses informations détaillées.</p><Link to="/history">Ouvrir l'historique <ArrowRight size={14} /></Link></div>
            </div>
            <div className="learn-doc-method">
              <div className="learn-method-icon"><FileText size={21} /></div>
              <div><strong>Générer un rapport</strong><p>Dans le détail d'une résolution compatible, utilisez les actions d'export proposées pour produire les fichiers de rapport disponibles.</p></div>
            </div>
          </section>

          <section id="errors" className="learn-doc-section">
            <span className="section-eyebrow">08 · AIDE AU DIAGNOSTIC</span>
            <h2>Erreurs fréquentes</h2>
            <div className="learn-faq-list">
              <details>
                <summary>Le problème est déclaré irréalisable. Pourquoi ?</summary>
                <p>Les contraintes et les bornes ne permettent peut-être aucune combinaison de valeurs. Vérifiez les signes, les coefficients et les quantités disponibles.</p>
              </details>
              <details>
                <summary>Pourquoi Branch &amp; Bound refuse mon modèle ?</summary>
                <p>Il faut au moins une variable entière ou binaire. Si toutes les variables sont continues, choisissez le Simplexe.</p>
              </details>
              <details>
                <summary>Pourquoi une variable prend-elle une valeur décimale ?</summary>
                <p>Une variable réelle peut être décimale. Si elle doit obligatoirement être entière, vérifiez son type dans les paramètres.</p>
              </details>
              <details>
                <summary>Pourquoi l'algorithme s'arrête-t-il avant de certifier l'optimum ?</summary>
                <p>Une limite de calcul ou un incident numérique peut empêcher la certification. Une solution connue n'est pas automatiquement une solution optimale certifiée.</p>
              </details>
              <details>
                <summary>Pourquoi le Simplexe affiche-t-il une phase de vérification ?</summary>
                <p>Certains modèles nécessitent une étape préalable pour trouver une solution de départ qui respecte toutes les contraintes. Cette étape n'est pas nécessaire pour tous les modèles.</p>
              </details>
            </div>
          </section>

          <footer className="learn-footer">
            <div>
              <span className="section-eyebrow">BESOIN DE PRATIQUER ?</span>
              <h2>Construisez votre premier modèle.</h2>
              <p>Reprenez les étapes du guide directement dans Orizone.</p>
            </div>
            <Link to="/solve" className="button button-primary">Commencer <ArrowRight size={16} /></Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
