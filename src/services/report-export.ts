import type { SimplexHistoryEntry } from "../types/history";

/** Adresse du service FastAPI XeLaTeX d'Orizone. */
const REPORT_API_BASE_URL = "http://localhost:8002";

export type SimplexReportFormat = "pdf" | "latex";

async function responseError(response: Response): Promise<string> {
  const body = await response.text();
  if (!body) return `Le service de rapports a répondu avec le statut ${response.status}.`;

  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null && "detail" in parsed) {
      const detail = (parsed as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // Le serveur peut renvoyer un message texte brut.
  }

  return body.slice(0, 1200);
}

/** Envoie une entrée Simplexe sauvegardée et télécharge le fichier retourné. */
export async function downloadSimplexReport(
  entry: SimplexHistoryEntry,
  format: SimplexReportFormat,
): Promise<void> {
  const endpoint = format === "pdf" ? "pdf" : "latex";
  const expectedMime = format === "pdf" ? "application/pdf" : "application/x-tex";

  let response: Response;
  try {
    response = await fetch(`${REPORT_API_BASE_URL}/api/reports/simplex/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erreur réseau inconnue.";
    throw new Error(
      `Impossible de joindre le service LaTeX sur ${REPORT_API_BASE_URL}. Vérifiez que Docker est démarré. (${reason})`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(expectedMime)) {
    throw new Error(`Le service a renvoyé un format inattendu : ${contentType || "inconnu"}.`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Le service a renvoyé un fichier vide.");
  }

  const filename = format === "pdf"
    ? "Orizone-Simplexe.pdf"
    : "Orizone-Simplexe.tex";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
