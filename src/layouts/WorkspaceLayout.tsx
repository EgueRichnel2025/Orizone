import {
  BookOpen,
  ChevronRight,
  History,
  House,
  Orbit,
  Settings2,
  SlidersHorizontal,
  Network,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import ThemeToggle from "../components/layout/ThemeToggle";
import "../styles/workspace-layout.css";

const navigationItems = [
  { to: "/", label: "Accueil", icon: House, end: true },
  { to: "/solve", label: "Résoudre", icon: SlidersHorizontal },
  { to: "/history", label: "Historique", icon: History },
  { to: "/methods", label: "Méthodes", icon: Network },
  { to: "/documentation", label: "Documentation", icon: BookOpen },
];

const pageTitles: Record<string, string> = {
  "/": "Accueil",
  "/solve": "Nouveau problème",
  "/analysis": "Analyse du problème",
  "/simplex": "Méthode du Simplexe",
  "/branch-bound": "Arbre Branch & Bound",
  "/history": "Historique",
  "/methods": "Méthodes",
  "/documentation": "Documentation",
  "/settings": "Paramètres",
};

export default function WorkspaceLayout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? "Espace de travail";

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar" aria-label="Navigation principale d’Orizone">
        <Link to="/" className="workspace-brand" aria-label="Orizone, accueil">
          <span className="workspace-brand-mark">
            <Orbit size={21} strokeWidth={1.7} />
          </span>
          <span>ORIZONE</span>
        </Link>

        <div className="sidebar-section-label">ESPACE DE TRAVAIL</div>
        <nav className="workspace-sidebar-nav" aria-label="Navigation principale">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `workspace-nav-link${isActive ? " is-active" : ""}`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.to === "/solve" && (
                  <span className="sidebar-nav-dot" aria-hidden="true" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="workspace-sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-mark">
              <Orbit size={17} />
            </span>
            <div>
              <strong>Un problème à la fois.</strong>
              <span>Comprendre chaque étape.</span>
            </div>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `workspace-nav-link settings-link${isActive ? " is-active" : ""}`
            }
          >
            <Settings2 size={18} strokeWidth={1.8} />
            <span>Paramètres</span>
          </NavLink>
          <div className="sidebar-version">ORIZONE · ESPACE SCIENTIFIQUE</div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb" aria-label="Fil d’Ariane">
            <span>Orizone</span>
            <ChevronRight size={15} />
            <strong>{pageTitle}</strong>
          </div>
          <div className="workspace-topbar-actions">
            <span className="workspace-status">
              <span /> Environnement de travail
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
