import { BookOpen, History, Network, Settings2 } from "lucide-react";
import { Route, Routes } from "react-router";

import WorkspaceLayout from "./layouts/WorkspaceLayout";
import HomePage from "./pages/HomePage";
import SolvePage from "./pages/SolvePage";
import AnalysisPage from "./pages/AnalysisPage";
import SimplexPage from "./pages/SimplexPage";
import BranchBoundPage from "./pages/BranchBoundPage";
import PlaceholderPage from "./pages/PlaceholderPage";

/**
 * Toutes les vues d'Orizone partagent le même WorkspaceLayout.
 * La navigation ne change plus entre l'accueil et les pages internes.
 */
function App() {
  return (
    <Routes>
      <Route element={<WorkspaceLayout />}>
        <Route index element={<HomePage />} />
        <Route path="solve" element={<SolvePage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="simplex" element={<SimplexPage />} />
        <Route path="branch-bound" element={<BranchBoundPage />} />
        <Route
          path="methods"
          element={
            <PlaceholderPage
              icon={<Network size={25} />}
              eyebrow="Explorer"
              title="Les méthodes d’optimisation."
              description="Découvrez les méthodes du cours, leurs principes, leurs conditions d’application et leurs étapes de résolution."
            />
          }
        />
        <Route
          path="documentation"
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
          path="history"
          element={
            <PlaceholderPage
              icon={<History size={25} />}
              eyebrow="Historique"
              title="Vos résolutions."
              description="Retrouvez ici les problèmes que vous aurez enregistrés. L’historique sera connecté au stockage dans une phase ultérieure."
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              icon={<Settings2 size={25} />}
              eyebrow="Préférences"
              title="Paramètres d’Orizone."
              description="Les préférences de l’application seront regroupées ici. Le changement de thème est accessible depuis la barre supérieure."
            />
          }
        />
        <Route
          path="*"
          element={
            <PlaceholderPage
              eyebrow="Page introuvable"
              title="Cette page n’existe pas."
              description="L’adresse demandée ne correspond à aucune page d’Orizone. Utilisez la navigation pour revenir dans l’application."
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
