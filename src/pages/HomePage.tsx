import { ArrowRight, BookOpen, GitBranch, MoveUpRight, Sigma } from "lucide-react";
import { Link } from "react-router";
import NeuralBackground from "../components/background/NeuralBackground";

const features = [
  {
    icon: <Sigma size={22} strokeWidth={1.6} />,
    number: "01",
    title: "Programmation linéaire",
    description:
      "Explorez la méthode graphique et le Simplexe à travers des calculs détaillés.",
    label: "SIMPLEXE",
  },
  {
    icon: <GitBranch size={22} strokeWidth={1.6} />,
    number: "02",
    title: "Optimisation entière",
    description:
      "Visualisez les séparations, les bornes et les décisions de Branch & Bound.",
    label: "BRANCH & BOUND",
  },
  {
    icon: <BookOpen size={22} strokeWidth={1.6} />,
    number: "03",
    title: "Comprendre les calculs",
    description:
      "Suivez les étapes et découvrez pourquoi chaque opération est nécessaire.",
    label: "EXPLICATIONS",
  },
];

function HomePage() {
  return (
    <>
      <section className="hero section-container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            MATHÉMATIQUES · RECHERCHE OPÉRATIONNELLE
          </div>

          <h1 className="hero-title">
            La solution compte.
            <br />
            <em>Le chemin aussi.</em>
          </h1>

          <p className="hero-description">
            Orizone vous accompagne dans la résolution de vos problèmes
            d’optimisation mathématique. Explorez les calculs, visualisez
            les étapes et comprenez comment une solution est obtenue.
          </p>

          <div className="hero-actions">
            <Link to="/solve" className="button button-primary">
              Commencer une résolution
              <ArrowRight size={17} />
            </Link>
            <Link to="/methods" className="button button-secondary">
              Explorer les méthodes
            </Link>
          </div>

          <div className="hero-note">
            <span className="note-line" />
            Pensé pour apprendre, conçu pour comprendre.
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-topline">
            <span>ESPACE D’OPTIMISATION</span>
            <span className="visual-status"><span /> EXPLORATION</span>
          </div>

          <div className="network-stage">
            <NeuralBackground />
            <div className="network-label label-simplex"><span>01</span>Simplexe</div>
            <div className="network-label label-duality"><span>02</span>Dualité</div>
            <div className="network-label label-kkt"><span>03</span>Kuhn-Tucker</div>
            <div className="network-label label-branch"><span>04</span>Branch &amp; Bound</div>
            <div className="network-label label-convexity"><span>05</span>Convexité</div>

            <div className="network-center">
              <OrbitMark />
              <span>O</span>
            </div>
            <div className="network-equation equation-one">Z = cᵀx</div>
            <div className="network-equation equation-two">Ax ≤ b</div>
          </div>

          <div className="visual-bottomline">
            <span>MODÉLISER</span><span className="visual-arrow">→</span>
            <span>EXPLORER</span><span className="visual-arrow">→</span>
            <span>RÉSOUDRE</span>
          </div>
        </div>
      </section>

      <section className="features-section section-container">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">UN ESPACE POUR RAISONNER</span>
            <h2>Les mathématiques,<br /><em>étape par étape.</em></h2>
          </div>
          <p>
            De la formulation du problème à l’interprétation du résultat,
            chaque étape doit avoir un sens.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-card-top">
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-number">{feature.number}</span>
              </div>
              <span className="feature-label">{feature.label}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link
                to="/methods"
                className="feature-link"
                aria-label={`Découvrir : ${feature.title}`}
              >
                Explorer <MoveUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section section-container">
        <div>
          <span className="section-eyebrow">VOTRE PROCHAIN PROBLÈME</span>
          <h2>Commençons par le formuler.</h2>
          <p>Définissez votre objectif, vos contraintes et la nature de vos variables.</p>
        </div>
        <Link to="/solve" className="button button-dark">
          Créer un problème <MoveUpRight size={17} />
        </Link>
      </section>
    </>
  );
}

function OrbitMark() {
  return (
    <svg viewBox="0 0 40 40" width="35" height="35" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="20" cy="20" rx="17" ry="7" transform="rotate(-35 20 20)" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="30" cy="11" r="2.2" fill="#B7793E" />
    </svg>
  );
}

export default HomePage;
