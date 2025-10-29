// src/features/events/components/CommandesPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchProjectCommandesLite, type CommandeLite,
  fetchCommandeEvenements, type EventRow
} from "../api";
import EventDocsModal from "../components/EventDocsModal";

export default function CommandesPanel({ projectId }: { projectId: number }) {
  const { token } = useAuth();

  // liste des commandes
  const [cmds, setCmds] = useState<CommandeLite[]>([]);
  const [loadingCmds, setLoadingCmds] = useState(false);
  const [errCmds, setErrCmds] = useState<string | null>(null);

  // commande choisie
  const [selectedCmdId, setSelectedCmdId] = useState<number | null>(null);
  const selectedCmd = useMemo(
    () => cmds.find(c => c.idcommande === selectedCmdId) || null,
    [cmds, selectedCmdId]
  );

  // événements
  const [evts, setEvts] = useState<EventRow[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(false);
  const [errEvts, setErrEvts] = useState<string | null>(null);

  // Modale documents
  const [docModalFor, setDocModalFor] = useState<number | null>(null);

  // Charger commandes + présélectionner la 1ère
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErrCmds(null);
        setLoadingCmds(true);
        const rows = await fetchProjectCommandesLite(projectId, token);
        if (!cancel) {
          setCmds(rows || []);
          if (!selectedCmdId && rows?.length) {
            setSelectedCmdId(rows[0].idcommande);
          }
        }
      } catch (e: any) {
        if (!cancel) setErrCmds(e?.message || "Erreur de chargement des commandes");
      } finally {
        if (!cancel) setLoadingCmds(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, token]);

  // Charger événements quand la commande change
  useEffect(() => {
    if (!selectedCmdId) {
      setEvts([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setErrEvts(null);
        setLoadingEvts(true);
        const rows = await fetchCommandeEvenements(selectedCmdId, token);
        if (!cancel) setEvts(rows || []);
      } catch (e: any) {
        if (!cancel) setErrEvts(e?.message || "Erreur de chargement des événements");
      } finally {
        if (!cancel) setLoadingEvts(false);
      }
    })();
    return () => { cancel = true; };
  }, [selectedCmdId, token]);

  return (
    <section className="space-y-4">
      {/* Select + "Nature" (comme ActivitiesPanel) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Choisir / rechercher une commande
          </label>
          <div className="relative">
            <select
              value={selectedCmdId ?? ""}
              onChange={e => setSelectedCmdId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border px-3 py-2"
            >
              {!cmds.length && <option value="">— Aucune —</option>}
              {cmds.map(c => (
                <option key={c.idcommande} value={c.idcommande}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nature</label>
          <div className="h-10 flex items-center justify-center rounded-full border px-4 text-slate-700">
            {selectedCmd?.nature ?? "—"}
          </div>
        </div>
      </div>

      {/* Liste d’événements */}
      <div className="mt-2">
        {loadingEvts && <div className="text-sm text-gray-500">Chargement des événements…</div>}
        {errEvts && <div className="text-sm text-red-600">Erreur: {errEvts}</div>}

        {!loadingEvts && !errEvts && evts.length === 0 && (
          <div className="rounded-lg border p-4 text-slate-600">
            Aucun événement pour cette commande.
          </div>
        )}

        <div className="space-y-4">
          {evts.map((e) => (
            <article key={e.idevenement} className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                {e.type_evenement}
              </h3>

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
                  onClick={() => setDocModalFor(e.idevenement)}
                >
                  Documents liés
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Modale documents */}
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
