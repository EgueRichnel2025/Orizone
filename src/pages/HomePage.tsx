import { ArrowRight, FileDown, GitBranch, LineChart, MoveUpRight, Table2 } from "lucide-react";
import { Link } from "react-router";
import NeuralBackground from "../components/background/NeuralBackground";
import "../styles/homepage-mockup.css";

const features = [
  {
    icon: <Table2 size={21} strokeWidth={1.7} />,
    title: "Simplexe",
    description: "Programmation linéaire continue",
    to: "/simplex",
    accent: "simplex",
  },
  {
    icon: <GitBranch size={21} strokeWidth={1.7} />,
    title: "Branch & Bound",
    description: "Programmation en nombres entiers",
    to: "/branch-bound",
    accent: "branch",
  },
  {
    icon: <LineChart size={21} strokeWidth={1.7} />,
    title: "Analyse automatique",
    description: "Propriétés et méthode adaptée",
    to: "/analysis",
    accent: "analysis",
  },
  {
    icon: <FileDown size={21} strokeWidth={1.7} />,
    title: "Export PDF",
    description: "Rapports détaillés — à venir",
    to: "/documentation",
    accent: "export",
  },
];

function OrbitMark() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="20" cy="20" rx="17" ry="7" transform="rotate(-35 20 20)" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="30" cy="11" r="2.2" fill="#C98A3D" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="mockup-home-page">
      <section className="mockup-home-hero" aria-labelledby="home-title">
        <div className="mockup-home-copy">
          <div className="mockup-home-eyebrow">
            <span aria-hidden="true" />
            MATHÉMATIQUES · RECHERCHE OPÉRATIONNELLE
          </div>

          <h1 id="home-title">
            <span className="mockup-title-line">Résolvez vos problèmes</span>
            <span className="mockup-title-line">d’optimisation, <em>pas à pas.</em></span>
          </h1>

          <p className="mockup-home-description">
            Formulez votre problème, explorez les méthodes et comprenez chaque calcul,
            de l’objectif jusqu’à la solution.
          </p>

          <div className="mockup-home-actions">
            <Link to="/solve" className="button button-primary">
              Commencer une résolution <ArrowRight size={17} />
            </Link>
            <Link to="/methods" className="button button-secondary">
              Découvrir les méthodes
            </Link>
          </div>

          <div className="mockup-home-note">
            <span aria-hidden="true" />
            Des calculs expliqués, pas seulement des réponses.
          </div>
        </div>

        <div className="mockup-network-card" aria-label="Réseau interactif de concepts d’optimisation">
          <div className="mockup-network-toolbar" aria-hidden="true">
            <span>RÉSEAU DES MÉTHODES</span>
            <span className="mockup-network-live"><i /> INTERACTIF</span>
          </div>
          <div className="mockup-network-stage">
            <NeuralBackground />
            <div className="mockup-network-label mockup-label-simplex"><span>01</span>Simplexe</div>
            <div className="mockup-network-label mockup-label-duality"><span>02</span>Dualité</div>
            <div className="mockup-network-label mockup-label-kkt"><span>03</span>KKT</div>
            <div className="mockup-network-label mockup-label-branch"><span>04</span>Branch &amp; Bound</div>
            <div className="mockup-network-label mockup-label-convexity"><span>05</span>Convexité</div>
            <div className="mockup-network-center" aria-hidden="true"><OrbitMark /></div>
            <div className="mockup-network-hint">Déplacez le curseur pour explorer le réseau</div>
          </div>
          <div className="mockup-network-footer" aria-hidden="true">
            <span>MODÉLISER</span><i />
            <span>EXPLORER</span><i />
            <span>RÉSOUDRE</span>
          </div>
        </div>
      </section>

      <section className="mockup-feature-strip" aria-label="Fonctionnalités principales">
        {features.map((feature) => (
          <Link
            className={`mockup-feature mockup-feature-${feature.accent}`}
            to={feature.to}
            key={feature.title}
          >
            <span className="mockup-feature-icon">{feature.icon}</span>
            <span className="mockup-feature-copy">
              <strong>{feature.title}</strong>
              <small>{feature.description}</small>
            </span>
            <MoveUpRight className="mockup-feature-arrow" size={15} aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
