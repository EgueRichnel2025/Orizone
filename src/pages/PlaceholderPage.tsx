import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

interface PlaceholderPageProps {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

function PlaceholderPage({ icon, eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page section-container">
      <Link to="/" className="back-link"><ArrowLeft size={16} />Retour à l’accueil</Link>
      <div className="placeholder-page-content">
        {icon && <span className="feature-icon">{icon}</span>}
        <span className="section-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="coming-soon">EN COURS DE CONSTRUCTION</span>
      </div>
    </section>
  );
}

export default PlaceholderPage;
