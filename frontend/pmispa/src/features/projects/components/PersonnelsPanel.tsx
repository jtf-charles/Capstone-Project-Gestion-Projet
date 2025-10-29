import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchProjectPersonnelsLite,
  type PersonnelLite,
  fetchPersonnelEvenements,
  type EventRow,
} from "../api";
import EventDocsModal from "../components/EventDocsModal";

export default function PersonnelsPanel({ projectId }: { projectId: number }) {
  const { token } = useAuth();

  const [pers, setPers] = useState<PersonnelLite[]>([]);
  const [loadingPers, setLoadingPers] = useState(false);
  const [errPers, setErrPers] = useState<string | null>(null);

  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(null);
  const selectedPersonnel = useMemo(
    () => pers.find(p => p.idpersonnel === selectedPersonnelId) || null,
    [pers, selectedPersonnelId]
  );

  const [evts, setEvts] = useState<EventRow[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(false);
  const [errEvts, setErrEvts] = useState<string | null>(null);

  const [docModalFor, setDocModalFor] = useState<number | null>(null);

  // charge personnels + présélection
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErrPers(null);
        setLoadingPers(true);
        const rows = await fetchProjectPersonnelsLite(projectId, token);

        if (cancel) return;

        // 🔒 Dé-doublonne par idpersonnel (si l’API renvoie des doublons)
        const seen = new Set<number>();
        const dedup = (rows || []).filter(r => {
          if (!r || typeof r.idpersonnel !== "number") return false;
          if (seen.has(r.idpersonnel)) return false;
          seen.add(r.idpersonnel);
          return true;
        });

        setPers(dedup);

        if (!selectedPersonnelId && dedup.length) {
          setSelectedPersonnelId(dedup[0].idpersonnel);
        }
      } catch (e: any) {
        if (!cancel) setErrPers(e?.message || "Erreur de chargement des personnels");
      } finally {
        if (!cancel) setLoadingPers(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, token]); // identique au bloc Activités

  // charge événements quand la sélection change
  useEffect(() => {
    if (!selectedPersonnelId) { setEvts([]); return; }
    let cancel = false;
    (async () => {
      try {
        setErrEvts(null);
        setLoadingEvts(true);
        const rows = await fetchPersonnelEvenements(selectedPersonnelId, token);
        if (!cancel) setEvts(rows || []);
      } catch (e: any) {
        if (!cancel) setErrEvts(e?.message || "Erreur de chargement des événements");
      } finally {
        if (!cancel) setLoadingEvts(false);
      }
    })();
    return () => { cancel = true; };
  }, [selectedPersonnelId, token]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Choisir / rechercher un personnel
          </label>
          <div className="relative">
            <select
              // ✅ Jamais NaN : string vide si aucun id
              value={selectedPersonnelId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedPersonnelId(v ? Number(v) : null);
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              {/* Option vide seulement si pas de données (copie exacte d’ActivitiesPanel) */}
              {!pers.length && <option value="">— Aucune —</option>}

              {/* ✅ clé unique même en cas de doublon API */}
              {pers.map((p) => (
                <option key={p.idpersonnel} value={p.idpersonnel}>
                  {p.nom_personnel}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fonction</label>
          <div className="h-10 flex items-center justify-center rounded-full border px-4 text-slate-700">
            {selectedPersonnel?.fonction ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-2">
        {loadingEvts && <div className="text-sm text-gray-500">Chargement des événements…</div>}
        {errEvts && <div className="text-sm text-red-600">Erreur: {errEvts}</div>}

        {!loadingEvts && !errEvts && evts.length === 0 && (
          <div className="rounded-lg border p-4 text-slate-600">
            Aucun événement pour ce personnel.
          </div>
        )}

        <div className="space-y-4">
          {evts.map(e => (
            <article key={e.idevenement} className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{e.type_evenement}</h3>
              {!!e.description_evenement && (
                <p className="mt-2 text-slate-700 whitespace-pre-wrap">{e.description_evenement}</p>
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
  ``