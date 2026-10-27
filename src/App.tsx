import { Link, NavLink, Route, Routes } from "react-router";
import { ArrowUpRight, Atom, BookOpen, History, Orbit } from "lucide-react";

import HomePage from "./pages/HomePage";
import SolvePage from "./pages/SolvePage";
import PlaceholderPage from "./pages/PlaceholderPage";

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

      <Link to="/solve" className="header-cta">
        Commencer
        <ArrowUpRight size={16} />
      </Link>
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

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/solve" element={<SolvePage />} />
          <Route
            path="/methods"
            element={
              <PlaceholderPage
                icon={<Atom size={25} />}
                eyebrow="Explorer"
                title="Les méthodes d’optimisation."
                description="Découvrez les méthodes du cours, leurs principes, leurs conditions d’application et leurs étapes de résolution."
              />
            }
          />
          <Route
            path="/documentation"
            element={
              <PlaceholderPage
                icon={<BookOpen size={25} />}
                eyebrow="Documentation"
                title="Comprendre les méthodes."
                description="Un espace consacré aux notions mathématiques, aux algorithmes et aux explications utilisées par Orizone."
              />
            }
          />
          <Route
            path="/history"
            element={
              <PlaceholderPage
                icon={<History size={25} />}
                eyebrow="Historique"
                title="Vos résolutions."
                description="Nous préparerons ici un espace pour retrouver les problèmes déjà résolus."
              />
            }
          />
          <Route
            path="*"
            element={
              <PlaceholderPage
                eyebrow="Page introuvable"
                title="Cette page n’existe pas."
                description="L’adresse demandée ne correspond à aucune page d’Orizone."
              />
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
