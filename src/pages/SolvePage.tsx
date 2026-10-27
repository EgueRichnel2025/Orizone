import { ArrowLeft, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";

const steps = [
  { number: "01", title: "Objectif" },
  { number: "02", title: "Contraintes" },
  { number: "03", title: "Variables" },
  { number: "04", title: "Résolution" },
];

function SolvePage() {
  return (
    <section className="solve-page section-container">
      <Link to="/" className="back-link"><ArrowLeft size={16} />Retour à l’accueil</Link>

      <div className="solve-heading">
        <span className="section-eyebrow">NOUVELLE RÉSOLUTION</span>
        <h1>Construisons votre<br /><em>problème d’optimisation.</em></h1>
        <p>
          Commencez par définir votre fonction objectif. Nous organiserons
          ensuite les contraintes et la nature des variables.
        </p>
      </div>

      <div className="step-progress">
        {steps.map((step, index) => (
          <div className={`progress-item ${index === 0 ? "is-active" : ""}`} key={step.number}>
            <span className="progress-number">{step.number}</span>
            <span className="progress-title">{step.title}</span>
            {index < steps.length - 1 && <span className="progress-connector" />}
          </div>
        ))}
      </div>

      <div className="builder-intro">
        <span className="builder-icon"><SlidersHorizontal size={22} /></span>
        <div>
          <h2>Définissez votre objectif</h2>
          <p>
            Le constructeur interactif sera notre prochaine fonctionnalité.
            Il permettra de créer les champs selon le nombre de variables
            et de contraintes choisi.
          </p>
        </div>
      </div>

      <div className="builder-placeholder">
        <div className="placeholder-equation">
          <span className="equation-label">OBJECTIF</span>
          <span className="equation-preview">max&nbsp; Z = c₁x₁ + c₂x₂ + ··· + cₙxₙ</span>
        </div>
        <div className="placeholder-equation">
          <span className="equation-label">CONTRAINTES</span>
          <span className="equation-preview">aᵢ₁x₁ + aᵢ₂x₂ + ··· + aᵢₙxₙ ≤ bᵢ</span>
        </div>
        <div className="placeholder-equation">
          <span className="equation-label">VARIABLES</span>
          <span className="equation-preview">Réelles · Entières · Binaires</span>
        </div>
      </div>

      <div className="builder-footer">
        <span>Étape 1 sur 4</span>
        <button type="button" className="button button-primary" disabled>
          Continuer <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

export default SolvePage;
