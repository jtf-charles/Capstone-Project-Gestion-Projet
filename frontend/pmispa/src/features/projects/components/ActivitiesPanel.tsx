// src/features/events/components/ActivitiesPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchProjectActivites, type Activity } from "../api";
import { fetchActiviteEvenements, type EventRow } from "../api";

// 🔹 Modale d’affichage des documents (charge l’API quand open=true)
import EventDocsModal from "../components/EventDocsModal";

export default function ActivitiesPanel({ projectId }: { projectId: number }) {
  const { token } = useAuth();

  // liste d’activités pour le select
  const [acts, setActs] = useState<Activity[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [errActs, setErrActs] = useState<string | null>(null);

  // activité choisie
  const [selectedActId, setSelectedActId] = useState<number | null>(null);
  const selectedAct = useMemo(
    () => acts.find(a => a.idactivite === selectedActId) || null,
    [acts, selectedActId]
  );

  // événements
  const [evts, setEvts] = useState<EventRow[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(false);
  const [errEvts, setErrEvts] = useState<string | null>(null);

  // 🔹 Modale “Documents liés”
  const [docModalFor, setDocModalFor] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErrActs(null);
        setLoadingActs(true);
        const rows = await fetchProjectActivites(projectId, token);
        if (!cancel) {
          setActs(rows || []);
          if (!selectedActId && rows?.length) {
            setSelectedActId(rows[0].idactivite);
          }
        }
      } catch (e: any) {
        if (!cancel) setErrActs(e?.message || "Erreur de chargement des activités");
      } finally {
        if (!cancel) setLoadingActs(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, token]);

  useEffect(() => {
    if (!selectedActId) {
      setEvts([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setErrEvts(null);
        setLoadingEvts(true);
        const rows = await fetchActiviteEvenements(selectedActId, token);
        if (!cancel) setEvts(rows || []);
      } catch (e: any) {
        if (!cancel) setErrEvts(e?.message || "Erreur de chargement des événements");
      } finally {
        if (!cancel) setLoadingEvts(false);
      }
    })();
    return () => { cancel = true; };
  }, [selectedActId, token]);

  return (
    <section className="space-y-4">
      {/* Sélecteur (liste + recherche native) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Choisir / rechercher une activité
          </label>
          <div className="relative">
            <select
              value={selectedActId ?? ""}
              onChange={e => setSelectedActId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border px-3 py-2"
            >
              {!acts.length && <option value="">— Aucune —</option>}
              {acts.map(a => (
                <option key={a.idactivite} value={a.idactivite}>
                  {a.titre_act}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Début prévu</label>
          <div className="h-10 flex items-center justify-center rounded-full border px-4 text-slate-700">
            {fmt(selectedAct?.dateDemarragePrevue_act)}
          </div>
        </div>
      </div>

      {/* Liste d’événements */}
      <div className="mt-2">
        {loadingEvts && <div className="text-sm text-gray-500">Chargement des événements…</div>}
        {errEvts && <div className="text-sm text-red-600">Erreur: {errEvts}</div>}

        {!loadingEvts && !errEvts && evts.length === 0 && (
          <div className="rounded-lg border p-4 text-slate-600">
            Aucun événement pour cette activité.
          </div>
        )}

        <div className="space-y-4">
          {evts.map((e) => (
            <article key={e.idevenement} className="rounded-xl border bg-white p-5 shadow-sm">
              {/* Titre (type d’événement) */}
              <h3 className="text-lg font-semibold text-slate-900">
                {e.type_evenement}
              </h3>

              {/* Description */}
              {e.description_evenement && (
                <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                  {e.description_evenement}
                </p>
              )}

              {/* Méta */}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <Meta label="Date évènement" value={fmt(e.date_evenement)} />
                <Meta label="Date prévue"    value={fmt(e.date_prevue)} />
                <Meta label="Statut"         value={e.statut_evenement || "—"} />
                <Meta label="Date réalisée"  value={fmt(e.date_realisee)} />
              </div>

              {/* Bouton : Documents liés */}
              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => setDocModalFor(e.idevenement)}
                >
                  Documents liés
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 🔹 Modale documents (chargement à la demande) */}
      <EventDocsModal
        idevenement={docModalFor ?? 0}
        open={docModalFor != null}
        onClose={() => setDocModalFor(null)}
      />
    </section>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
      <span className="text-slate-500">{label} :</span>
      <span className="font-medium text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

function fmt(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}
