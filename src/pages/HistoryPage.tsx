import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  FileText,
  Filter,
  GitBranch,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import { Link } from "react-router";

import type { ResolutionHistoryEntry } from "../types/history";
import {
  clearResolutionHistory,
  deleteResolutionHistoryEntry,
  getResolutionHistory,
} from "../utils/resolution-history";
import "../styles/history.css";

type MethodFilter = "all" | "simplex" | "branch-bound";
type StatusFilter = "all" | "optimal" | "other";

function numberText(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 }).format(value);
}

function objectiveValue(entry: ResolutionHistoryEntry): number | undefined {
  if (entry.method === "simplex") return entry.result.objectiveValue;
  return entry.result.incumbent?.objectiveValue;
}

function statusInfo(entry: ResolutionHistoryEntry): { label: string; optimal: boolean } {
  const status = entry.result.status;
  if (status === "optimal") return { label: "Solution optimale", optimal: true };
  if (status === "infeasible") return { label: "Irréalisable", optimal: false };
  if (status === "unbounded" || status === "unbounded_relaxation") return { label: "Non borné", optimal: false };
  if (status === "iteration_limit" || status === "node_limit") return { label: "Limite atteinte", optimal: false };
  if (status === "unsupported_domain") return { label: "Domaine non pris en charge", optimal: false };
  if (status === "invalid_model") return { label: "Modèle invalide", optimal: false };
  return { label: "Problème numérique", optimal: false };
}

function resolutionTitle(entry: ResolutionHistoryEntry): string {
  const direction = entry.problem.direction === "max" ? "Maximisation" : "Minimisation";
  const coefficients = entry.problem.objective
    .map((value, index) => `${value >= 0 && index > 0 ? "+" : ""}${numberText(value)}x${index + 1}`)
    .join(" ");
  return `${direction} · Z = ${coefficients}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<ResolutionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await getResolutionHistory());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getResolutionHistory()
      .then((loaded) => { if (active) setEntries(loaded); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Impossible de charger l'historique.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return entries.filter((entry) => {
      if (methodFilter !== "all" && entry.method !== methodFilter) return false;
      const isOptimal = statusInfo(entry).optimal;
      if (statusFilter === "optimal" && !isOptimal) return false;
      if (statusFilter === "other" && isOptimal) return false;
      if (!query) return true;
      return [resolutionTitle(entry), entry.method, statusInfo(entry).label]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(query);
    });
  }, [entries, methodFilter, search, statusFilter]);

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer définitivement cette résolution de l'historique ?")) return;
    try {
      await deleteResolutionHistoryEntry(id);
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La suppression a échoué.");
    }
  }

  async function handleClear() {
    if (!window.confirm("Supprimer toutes les résolutions enregistrées ? Cette action est irréversible.")) return;
    try {
      await clearResolutionHistory();
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La suppression a échoué.");
    }
  }

  return (
    <section className="result-page history-page">
      <div className="result-page-heading history-heading">
        <div>
          <span className="section-eyebrow">ESPACE DE TRAVAIL · ARCHIVES</span>
          <h1>Historique des <em>résolutions.</em></h1>
          <p>Retrouvez vos calculs, leurs résultats et l'intégralité des étapes enregistrées par Orizone.</p>
        </div>
        <div className="history-total-card">
          <span><FileText size={17} /> Résolutions enregistrées</span>
          <strong>{entries.length}</strong>
        </div>
      </div>

      <div className="history-toolbar workspace-card">
        <label className="history-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une fonction objectif…" />
        </label>
        <label className="history-filter">
          <Filter size={15} />
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value as MethodFilter)} aria-label="Filtrer par méthode">
            <option value="all">Toutes les méthodes</option>
            <option value="simplex">Simplexe</option>
            <option value="branch-bound">Branch &amp; Bound</option>
          </select>
        </label>
        <label className="history-filter">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filtrer par statut">
            <option value="all">Tous les statuts</option>
            <option value="optimal">Solutions optimales</option>
            <option value="other">Autres statuts</option>
          </select>
        </label>
        {entries.length > 0 && <button className="history-clear-button" type="button" onClick={() => void handleClear()}><Trash2 size={15} /> Tout effacer</button>}
      </div>

      {error && <div className="history-alert" role="alert">{error}</div>}

      {loading ? (
        <div className="workspace-card history-empty"><span className="history-empty-icon"><Clock3 size={22} /></span><h2>Chargement de l'historique…</h2></div>
      ) : filteredEntries.length === 0 ? (
        <div className="workspace-card history-empty">
          <span className="history-empty-icon"><FileText size={22} /></span>
          <h2>{entries.length === 0 ? "Aucune résolution enregistrée" : "Aucun résultat"}</h2>
          <p>{entries.length === 0 ? "Les résolutions Simplexe et Branch & Bound apparaîtront ici automatiquement après leur calcul." : "Essayez de modifier votre recherche ou vos filtres."}</p>
          {entries.length === 0 && <Link to="/solve" className="button button-primary">Créer un problème</Link>}
        </div>
      ) : (
        <div className="history-list" aria-live="polite">
          {filteredEntries.map((entry) => {
            const status = statusInfo(entry);
            const isSimplex = entry.method === "simplex";
            const count = isSimplex ? entry.result.iterations.length : entry.result.nodes.length;
            return (
              <article className="workspace-card history-entry" key={entry.id}>
                <div className="history-entry-icon">{isSimplex ? <Trophy size={19} /> : <GitBranch size={19} />}</div>
                <div className="history-entry-main">
                  <div className="history-entry-topline">
                    <span className="history-method">{isSimplex ? "SIMPLEXE" : "BRANCH & BOUND"}</span>
                    <span className={`history-status${status.optimal ? " is-optimal" : ""}`}>{status.label}</span>
                  </div>
                  <h2>{resolutionTitle(entry)}</h2>
                  <div className="history-entry-meta">
                    <span><Clock3 size={14} /> {formatDate(entry.createdAt)}</span>
                    <span>{entry.problem.variables.length} variable(s)</span>
                    <span>{entry.problem.constraints.length} contrainte(s)</span>
                    <span>{isSimplex ? `${count} tableau(x)` : `${count} nœud(s)`}</span>
                  </div>
                </div>
                <div className="history-entry-result">
                  <small>{entry.problem.direction === "max" ? "Objectif maximal" : "Objectif minimal"}</small>
                  <strong>{status.optimal ? numberText(objectiveValue(entry)) : "—"}</strong>
                  <span>{status.optimal ? "Valeur certifiée" : "Pas d'optimum certifié"}</span>
                </div>
                <div className="history-entry-actions">
                  <Link to={`/history/${encodeURIComponent(entry.id)}`} className="button button-secondary">Consulter</Link>
                  <button type="button" className="history-delete-button" aria-label="Supprimer cette résolution" title="Supprimer" onClick={() => void handleDelete(entry.id)}><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
