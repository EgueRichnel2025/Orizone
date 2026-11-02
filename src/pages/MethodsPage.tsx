import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitBranch,
  Lightbulb,
  Target,
} from "lucide-react";
import { Link } from "react-router";
import "../styles/learning-pages.css";

export default function MethodsPage() {
  return (
    <main className="learn-page">
      <header className="learn-hero">
        <span className="section-eyebrow">RESSOURCES · RECHERCHE OPÉRATIONNELLE</span>
        <h1>Comprendre les méthodes <em>d'optimisation.</em></h1>
        <p>
          Découvrez comment transformer un problème concret en modèle mathématique,
          choisir une méthode de résolution et comprendre les résultats obtenus.
          Chaque notion est expliquée progressivement, avec des exemples.
        </p>

        <div className="learn-hero-actions">
          <Link to="/solve" className="button button-primary">
            Créer un problème <ArrowRight size={16} />
          </Link>
          <Link to="/documentation" className="button button-secondary">
            Consulter le guide <BookOpen size={16} />
          </Link>
        </div>
      </header>

      <nav className="learn-section-nav" aria-label="Navigation dans les méthodes">
        <a href="#linear-programming">Programmation linéaire</a>
        <a href="#simplex-method">Simplexe</a>
        <a href="#branch-bound-method">Branch &amp; Bound</a>
        <a href="#choose-method">Quelle méthode choisir ?</a>
      </nav>

      <section className="learn-introduction">
        <div className="learn-introduction-icon"><Lightbulb size={22} /></div>
        <div>
          <strong>Avant de choisir un algorithme, comprenons le problème.</strong>
          <p>
            En optimisation, nous cherchons la meilleure décision possible tout en
            respectant un ensemble de limites. Ces décisions peuvent concerner
            une production, un budget, un transport, une planification ou
            l'utilisation de ressources.
          </p>
        </div>
      </section>

      <section id="linear-programming" className="learn-section">
        <div className="learn-section-heading">
          <span className="section-eyebrow">01 · LES FONDATIONS</span>
          <h2>La programmation <em>linéaire.</em></h2>
          <p>
            La programmation linéaire permet de rechercher la meilleure valeur
            d'une fonction tout en respectant des contraintes mathématiques.
          </p>
        </div>

        <div className="learn-concept-grid">
          <article className="learn-concept-card">
            <span className="learn-number">01</span>
            <h3>Les variables de décision</h3>
            <p>
              Ce sont les quantités que nous pouvons décider ou contrôler.
              Par exemple, le nombre de produits de type A et de type B à fabriquer.
            </p>
            <div className="learn-example">x₁ = quantité de produits A</div>
            <div className="learn-example">x₂ = quantité de produits B</div>
          </article>

          <article className="learn-concept-card">
            <span className="learn-number">02</span>
            <h3>La fonction objectif</h3>
            <p>
              C'est ce que nous souhaitons améliorer : gagner davantage,
              dépenser moins, réduire un temps ou utiliser moins de ressources.
            </p>
            <div className="learn-formula">Maximiser Z = 3x₁ + 5x₂</div>
          </article>

          <article className="learn-concept-card">
            <span className="learn-number">03</span>
            <h3>Les contraintes</h3>
            <p>
              Elles représentent les limites que nous ne devons pas dépasser :
              budget, capacité de production, temps disponible ou quantité de matière.
            </p>
            <div className="learn-formula">x₁ + 2x₂ ≤ 8</div>
            <div className="learn-formula">3x₁ + 2x₂ ≤ 12</div>
          </article>

          <article className="learn-concept-card">
            <span className="learn-number">04</span>
            <h3>Le domaine des variables</h3>
            <p>
              Il précise les valeurs autorisées pour chaque variable :
              positives, libres, entières ou binaires.
            </p>
            <div className="learn-formula">x₁ ≥ 0 ; x₂ ≥ 0</div>
          </article>
        </div>

        <div className="learn-example-panel">
          <span className="card-kicker">EXEMPLE COMPLET</span>
          <h3>Un petit problème de production</h3>
          <p>
            Une entreprise fabrique deux produits. Le premier rapporte 3 unités
            de bénéfice et le second 5. Elle dispose de ressources limitées.
            Elle veut déterminer les quantités à produire pour maximiser son bénéfice.
          </p>
          <div className="learn-model">
            <div><small>Objectif</small><strong>Max Z = 3x₁ + 5x₂</strong></div>
            <div><small>Première limite</small><strong>x₁ + 2x₂ ≤ 8</strong></div>
            <div><small>Deuxième limite</small><strong>3x₁ + 2x₂ ≤ 12</strong></div>
            <div><small>Quantités</small><strong>x₁ ≥ 0 ; x₂ ≥ 0</strong></div>
          </div>
          <p className="learn-example-conclusion">
            Le modèle mathématique permet maintenant de chercher les quantités
            qui donnent le meilleur bénéfice sans dépasser les ressources disponibles.
          </p>
          <Link to="/solve" className="learn-inline-link">
            Essayer cet exemple dans Orizone <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section id="simplex-method" className="learn-section">
        <div className="learn-section-heading">
          <span className="section-eyebrow">02 · RÉSOLUTION CONTINUE</span>
          <h2>La méthode du <em>Simplexe.</em></h2>
          <p>
            Le Simplexe est une méthode qui améliore progressivement une solution
            jusqu'à ce qu'aucune amélioration ne soit encore possible.
          </p>
        </div>

        <div className="learn-method-banner">
          <div className="learn-method-icon"><Target size={23} /></div>
          <div>
            <strong>Son objectif</strong>
            <p>
              Trouver la meilleure solution d'un problème linéaire dont les
              variables peuvent prendre des valeurs réelles, y compris décimales.
            </p>
          </div>
        </div>

        <div className="learn-steps">
          <article>
            <span>1</span>
            <div>
              <h3>Construire le premier tableau</h3>
              <p>
                Nous organisons les variables, les contraintes et les quantités
                disponibles dans un tableau de calcul.
              </p>
            </div>
          </article>

          <article>
            <span>2</span>
            <div>
              <h3>Choisir ce que nous allons améliorer</h3>
              <p>
                Dans le tableau standard de maximisation, nous regardons les
                coûts réduits positifs. Le plus élevé indique la variable
                qui permet la meilleure amélioration à cette étape.
              </p>
            </div>
          </article>

          <article>
            <span>3</span>
            <div>
              <h3>Comparer les contraintes</h3>
              <p>
                Nous divisons chaque quantité disponible par son coefficient
                positif dans la colonne choisie. Le plus petit rapport positif
                indique la contrainte qui sera atteinte en premier.
              </p>
            </div>
          </article>

          <article>
            <span>4</span>
            <div>
              <h3>Transformer le tableau</h3>
              <p>
                Nous utilisons le nombre situé au croisement de la ligne et de
                la colonne choisies. Les opérations de lignes permettent
                d'obtenir un nouveau tableau.
              </p>
            </div>
          </article>

          <article>
            <span>5</span>
            <div>
              <h3>Vérifier si nous pouvons faire mieux</h3>
              <p>
                Nous recommençons jusqu'à ce qu'aucun coût réduit positif
                ne permette d'améliorer la solution dans le tableau standard
                de maximisation.
              </p>
            </div>
          </article>
        </div>

        <div className="learn-note">
          <CheckCircle2 size={19} />
          <p>
            Le résultat du Simplexe peut être décimal. C'est normal :
            une solution continue n'impose pas que les quantités soient entières.
          </p>
        </div>

        <Link to="/simplex" className="learn-action-card">
          <div>
            <span className="card-kicker">PASSER À LA PRATIQUE</span>
            <strong>Consulter une résolution par Simplexe</strong>
            <p>Examiner les tableaux, les pivots et les calculs détaillés.</p>
          </div>
          <ArrowRight size={20} />
        </Link>
      </section>

      <section id="branch-bound-method" className="learn-section">
        <div className="learn-section-heading">
          <span className="section-eyebrow">03 · OPTIMISATION DISCRÈTE</span>
          <h2>La méthode <em>Branch &amp; Bound.</em></h2>
          <p>
            Lorsque certaines décisions doivent être entières ou binaires,
            le Simplexe seul ne suffit pas. Branch &amp; Bound explore alors
            plusieurs sous-problèmes pour trouver une solution entière optimale.
          </p>
        </div>

        <div className="learn-method-banner">
          <div className="learn-method-icon"><GitBranch size={23} /></div>
          <div>
            <strong>Son objectif</strong>
            <p>
              Trouver la meilleure solution qui respecte aussi les exigences
              d'intégralité des variables.
            </p>
          </div>
        </div>

        <div className="learn-branch-example">
          <div className="learn-branch-root">
            <strong>Problème initial</strong>
            <span>La relaxation donne x₁ = 2,5</span>
          </div>
          <div className="learn-branch-lines">
            <div><span>x₁ ≤ 2</span><i /></div>
            <div><span>x₁ ≥ 3</span><i /></div>
          </div>
          <div className="learn-branch-children">
            <article><strong>Sous-problème A</strong><p>On ajoute la limite x₁ ≤ 2, puis on résout à nouveau.</p></article>
            <article><strong>Sous-problème B</strong><p>On ajoute la limite x₁ ≥ 3, puis on résout à nouveau.</p></article>
          </div>
          <p className="learn-branch-caption">
            Exemple illustratif : une valeur fractionnaire de 2,5 est séparée
            en deux possibilités qui couvrent toutes les valeurs entières possibles.
          </p>
        </div>

        <div className="learn-concept-grid learn-concept-grid-three">
          <article className="learn-concept-card">
            <span className="learn-number">A</span>
            <h3>La relaxation</h3>
            <p>
              Nous autorisons temporairement les variables entières à prendre
              des valeurs décimales. Le Simplexe résout ce problème plus souple.
            </p>
          </article>
          <article className="learn-concept-card">
            <span className="learn-number">B</span>
            <h3>Le branchement</h3>
            <p>
              Si une variable devant être entière vaut 2,5, nous créons deux
              possibilités : elle doit être au plus égale à 2, ou au moins égale à 3.
            </p>
          </article>
          <article className="learn-concept-card">
            <span className="learn-number">C</span>
            <h3>L'élagage</h3>
            <p>
              Nous arrêtons l'exploration d'un sous-problème lorsqu'il est
              impossible, lorsqu'il ne peut pas améliorer la meilleure solution
              entière connue, ou lorsqu'il fournit déjà une solution entière.
            </p>
          </article>
        </div>

        <div className="learn-note">
          <Lightbulb size={19} />
          <p>
            La valeur de la relaxation est une borne pour le sous-problème.
            Elle ne doit pas être confondue avec une solution entière admissible
            lorsque certaines variables sont encore fractionnaires.
          </p>
        </div>

        <Link to="/branch-bound" className="learn-action-card">
          <div>
            <span className="card-kicker">PASSER À LA PRATIQUE</span>
            <strong>Explorer un arbre Branch &amp; Bound</strong>
            <p>Suivre les sous-problèmes, les contraintes et les décisions d'élagage.</p>
          </div>
          <ArrowRight size={20} />
        </Link>
      </section>

      <section id="choose-method" className="learn-section">
        <div className="learn-section-heading">
          <span className="section-eyebrow">04 · FAIRE LE BON CHOIX</span>
          <h2>Quelle méthode <em>utiliser ?</em></h2>
          <p>Le choix dépend principalement du domaine des variables.</p>
        </div>

        <div className="learn-comparison">
          <article>
            <span className="learn-comparison-tag">VARIABLES CONTINUES</span>
            <h3>Simplexe</h3>
            <p>
              Toutes les variables peuvent prendre des valeurs réelles.
              Les résultats peuvent donc être décimaux.
            </p>
            <Link to="/simplex">Voir le Simplexe <ArrowRight size={14} /></Link>
          </article>

          <article>
            <span className="learn-comparison-tag is-copper">VARIABLES ENTIÈRES OU BINAIRES</span>
            <h3>Branch &amp; Bound</h3>
            <p>
              Au moins une variable doit respecter une condition d'intégralité.
              La méthode utilise des relaxations Simplexe pour explorer les possibilités.
            </p>
            <Link to="/branch-bound">Voir Branch &amp; Bound <ArrowRight size={14} /></Link>
          </article>
        </div>
      </section>

      <footer className="learn-footer">
        <div>
          <span className="section-eyebrow">À VOUS DE JOUER</span>
          <h2>Transformez une situation en modèle mathématique.</h2>
          <p>Formulez votre problème et laissez Orizone vous accompagner dans sa résolution.</p>
        </div>
        <Link to="/solve" className="button button-primary">
          Commencer <ArrowRight size={16} />
        </Link>
      </footer>
    </main>
  );
}
