import { ArrowUpRight, Orbit } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";

import ThemeToggle from "../components/layout/ThemeToggle";
import "../styles/workspace-layout.css";

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Orizone, accueil">
        <span className="brand-mark">
          <Orbit size={21} strokeWidth={1.7} />
        </span>
        <span className="brand-name">ORIZONE</span>
      </Link>

      <nav className="desktop-nav" aria-label="Navigation principale">
        <NavLink to="/" end className="nav-link">Accueil</NavLink>
        <NavLink to="/solve" className="nav-link">Résoudre</NavLink>
        <NavLink to="/methods" className="nav-link">Méthodes</NavLink>
        <NavLink to="/documentation" className="nav-link">Documentation</NavLink>
      </nav>

      <div className="home-header-actions">
        <ThemeToggle />
        <Link to="/solve" className="header-cta">
          Commencer
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link to="/" className="footer-brand">ORIZONE</Link>
      <p>Résoudre. Comprendre. Aller plus loin.</p>
      <span>Optimisation mathématique</span>
    </footer>
  );
}

export default function HomeLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
