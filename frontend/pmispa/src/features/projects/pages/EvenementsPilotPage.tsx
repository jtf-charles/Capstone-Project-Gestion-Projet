// src/features/events/pages/EvenementsPilotPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { listProjectsLite, type ProjectLite } from "../api";
import {
  ProjectPanel,
  ActivitiesPanel,
  PersonnelsPanel,
  CommandesPanel,
  SoumissionnairesPanel,
  TransactionsPanel,
} from "../components";

type TabKey =
  | "projet"
  | "activites"
  | "personnels"
  | "commandes"
  | "soumissionnaires"
  | "transactions";

export default function EvenementsPilotPage() {
  const { token } = useAuth();

  // Sélecteur de projet
  const [allProjects, setAllProjects] = useState<ProjectLite[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [openSelect, setOpenSelect] = useState(false);
  const [selected, setSelected] = useState<ProjectLite | null>(null);

  // Onglets
  const [tab, setTab] = useState<TabKey>("projet");

  const listRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  /* ---------- charger la liste des projets (lite) ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoadingList(true);
        const rows = await listProjectsLite(token);
        if (!cancel) setAllProjects(rows || []);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement des projets");
      } finally {
        if (!cancel) setLoadingList(false);
      }
    })();
    return () => { cancel = true; };
  }, [token]);

  /* ---------- fermer la liste au clic extérieur ---------- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-role="project-select"]')) setOpenSelect(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* ---------- filtrage local ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter(p =>
      (p.code_projet || "").toLowerCase().includes(q)
    );
  }, [query, allProjects]);

  /* ---------- clavier dans l’autocomplete ---------- */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openSelect) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max((i < 0 ? filtered.length : i) - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        choose(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpenSelect(false);
    }
  }

  function choose(p: ProjectLite) {
    setSelected(p);
    setQuery("");
    setOpenSelect(false);
    setActiveIdx(-1);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setOpenSelect(true);
    setActiveIdx(-1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-semibold mb-6">Pilotage des événements</h1>

      {/* Sélecteur de projet */}
      <div className="mb-6" data-role="project-select">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Projet
        </label>
        <div className="relative">
          <input
            placeholder="Sélectionner ou rechercher un code projet…"
            className="w-full rounded-lg border px-3 py-2 pr-20"
            value={selected ? `${selected.code_projet}` : query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
              setOpenSelect(true);
              setActiveIdx(-1);
            }}
            onFocus={() => setOpenSelect(true)}
            onKeyDown={onKeyDown}
          />

          {/* Clear */}
          {selected && (
            <button
              type="button"
              className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={clearSelection}
              aria-label="Effacer la sélection"
              title="Effacer"
            >
              ×
            </button>
          )}

          {/* Toggle */}
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            onClick={() => setOpenSelect((o) => !o)}
            aria-label="Ouvrir la liste"
            title="Ouvrir la liste"
          >
            ▾
          </button>

          {openSelect && (
            <div
              ref={listRef}
              className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow max-h-72 overflow-auto"
            >
              {loadingList && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  Chargement…
                </div>
              )}

              {!loadingList && filtered.map((p, idx) => (
                <button
                  key={p.idprojet}
                  type="button"
                  className={`block w-full text-left px-3 py-2 hover:bg-slate-50 ${
                    idx === activeIdx ? "bg-slate-50" : ""
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => choose(p)}
                >
                  <div className="font-medium">{p.code_projet}</div>
                </button>
              ))}

              {!loadingList && filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  Aucun projet
                </div>
              )}
            </div>
          )}
        </div>

        {!!selected && (
          <div className="mt-2 text-sm text-slate-600">
            Projet sélectionné :{" "}
            <span className="font-medium">{selected.code_projet}</span>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b mb-4">
        <nav className="-mb-px flex gap-6 flex-wrap">
          {(
            [
              "projet",
              "activites",
              "personnels",
              "commandes",
              "soumissionnaires",
              "transactions",
            ] as TabKey[]
          ).map((k) => (
            <button
              key={k}
              className={`py-3 border-b-2 ${
                tab === k
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setTab(k)}
            >
              {k === "projet"
                ? "Projet"
                : k === "activites"
                ? "Activités"
                : k === "personnels"
                ? "Personnels"
                : k === "commandes"
                ? "Commandes"
                : k === "soumissionnaires"
                ? "Soumissionnaires"
                : "Transactions"}
            </button>
          ))}
        </nav>
      </div>

      {err && <div className="mb-4 text-red-600">Erreur : {err}</div>}
      {!selected && (
        <div className="text-slate-600">
          Sélectionnez un projet pour afficher les données.
        </div>
      )}

      {selected && (
        <>
          {tab === "projet" && <ProjectPanel projectId={selected.idprojet} />}
          {tab === "activites" && <ActivitiesPanel projectId={selected.idprojet} />}
          {tab === "personnels" && <PersonnelsPanel projectId={selected.idprojet} />}
          {tab === "commandes" && <CommandesPanel projectId={selected.idprojet} />}
          {tab === "soumissionnaires" && (
            <SoumissionnairesPanel projectId={selected.idprojet} />
          )}
          {tab === "transactions" && (
            <TransactionsPanel projectId={selected.idprojet} />
          )}
        </>
      )}
    </div>
  );
}
