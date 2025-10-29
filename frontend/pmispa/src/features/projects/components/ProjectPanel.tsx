// src/features/events/components/ProjectPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchProjetEvenements, type EventRow } from "../api";
import EventDocsModal from "./EventDocsModal"; // déjà créé plus tôt

export default function ProjectPanel({ projectId }: { projectId: number }) {
  // ... ton code existant d’affichage des champs du projet

  // ▼ Nouvel état pour les événements du projet
  const { token } = useAuth();
  const [evts, setEvts] = React.useState<EventRow[]>([]);
  const [loadingEvts, setLoadingEvts] = React.useState(false);
  const [errEvts, setErrEvts] = React.useState<string | null>(null);

  // modal documents
  const [docEvtId, setDocEvtId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErrEvts(null);
        setLoadingEvts(true);
        const rows = await fetchProjetEvenements(projectId, token);
        if (!cancel) setEvts(rows || []);
      } catch (e: any) {
        if (!cancel) setErrEvts(e?.message || "Erreur de chargement des événements");
      } finally {
        if (!cancel) setLoadingEvts(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, token]);

  return (
    <section className="space-y-6">
      {/* === Ton bloc d’infos projet EXISTANT ici === */}

      {/* === Nouvel encart : événements du projet === */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Événements du projet</h3>

        {loadingEvts && <div className="text-sm text-gray-500">Chargement…</div>}
        {errEvts && <div className="text-sm text-red-600">Erreur : {errEvts}</div>}

        {!loadingEvts && !errEvts && evts.length === 0 && (
          <div className="rounded-lg border p-4 text-slate-600">
            Aucun événement pour ce projet.
          </div>
        )}

        <div className="space-y-4">
          {evts.map((e) => (
            <article key={e.idevenement} className="rounded-xl border bg-white p-5 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">{e.type_evenement}</h4>

              {e.description_evenement && (
                <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                  {e.description_evenement}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <Meta label="Date évènement" value={fmt(e.date_evenement)} />
                <Meta label="Date prévue"    value={fmt(e.date_prevue)} />
                <Meta label="Statut"         value={e.statut_evenement || "—"} />
                <Meta label="Date réalisée"  value={fmt(e.date_realisee)} />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => setDocEvtId(e.idevenement)}
                >
                  Documents liés
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <EventDocsModal
        idevenement={docEvtId ?? 0}
        open={docEvtId !== null}
        onClose={() => setDocEvtId(null)}
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
