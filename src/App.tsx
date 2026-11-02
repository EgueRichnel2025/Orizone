import {
  Settings2
} from "lucide-react";
import { Route, Routes } from "react-router";

import WorkspaceLayout from "./layouts/WorkspaceLayout";
import HomePage from "./pages/HomePage";
import SolvePage from "./pages/SolvePage";
import AnalysisPage from "./pages/AnalysisPage";
import SimplexPage from "./pages/SimplexPage";
import BranchBoundPage from "./pages/BranchBoundPage";
import MethodsPage from "./pages/MethodsPage";
import DocumentationPage from "./pages/DocumentationPage";
import HistoryPage from "./pages/HistoryPage";
import HistoryDetailPage from "./pages/HistoryDetailPage";
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
        <Route path="methods" element={<MethodsPage />} />
        <Route path="documentation" element={<DocumentationPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<HistoryDetailPage />} />
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
