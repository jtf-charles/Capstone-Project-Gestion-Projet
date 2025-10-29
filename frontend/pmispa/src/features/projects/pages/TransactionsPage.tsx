// src/features/projects/pages/TransactionsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProjectSearchBox from "../components/ProjectSearchBox";
import { useAuth } from "../../auth/AuthContext";
import EventDocsModal from "../components/EventDocsModal";

type Tx = {
  idtransaction: number;
  date_transaction: string;
  type_transaction?: string | null;
  commentaire?: string | null;
  montant_transaction: number;
  devise: string;
  type_paiement?: string | null;
  idpersonnel?: number | null;
  idactivite?: number | null;
  nom_personnel?: string | null;
  type_personnel?: string | null;
  titre_act?: string | null;
};

type EventRow = {
  idevenement: number;
  type_evenement: string;
  date_evenement?: string | null;
  date_prevue?: string | null;
  date_realisee?: string | null;
  description_evenement?: string | null;
  statut_evenement?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

export default function TransactionsPage() {
  const { token } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [scope, setScope] = useState<"personnel" | "activite">("personnel");

  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // expansion + cache événements
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [eventsCache, setEventsCache] = useState<
    Record<number, { loading: boolean; error: string | null; items: EventRow[] }>
  >({});
  const [docModalFor, setDocModalFor] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const r = await fetch(`/api/v1/transactions/projets/${projectId}/transactions?scope=${scope}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error("Erreur de chargement");
        const data: Tx[] = await r.json();
        if (!cancel) {
          setRows(Array.isArray(data) ? data : []);
          setExpanded(new Set());
          setEventsCache({});
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, scope, token]);

  const columns = useMemo(() => {
    if (scope === "personnel") {
      return [
        { key: "date_transaction", label: "Date" },
        { key: "nom_personnel",   label: "Personnel" },
        { key: "type_personnel",  label: "Type" },
        { key: "type_transaction",label: "Nature" },
        { key: "type_paiement",   label: "Paiement" },
        { key: "commentaire",     label: "Commentaire" },
        { key: "montant_transaction", label: "Montant" },
        { key: "devise",          label: "Devise" },
      ] as const;
    }
    return [
      { key: "date_transaction", label: "Date" },
      { key: "titre_act",        label: "Activité" },
      { key: "type_transaction", label: "Nature" },
      { key: "commentaire",      label: "Commentaire" },
      { key: "montant_transaction", label: "Montant" },
      { key: "devise",           label: "Devise" },
    ] as const;
  }, [scope]);

  async function toggleEventsFor(txId: number) {
    const next = new Set(expanded);
    const isOpen = next.has(txId);
    if (isOpen) {
      next.delete(txId);
      setExpanded(next);
      return;
    }
    next.add(txId);
    setExpanded(next);

    if (eventsCache[txId]?.items) return;

    setEventsCache(prev => ({ ...prev, [txId]: { loading: true, error: null, items: [] } }));
    try {
      const url = `/api/v1/transactions/${txId}/evenements`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      const items: EventRow[] = await res.json();
      setEventsCache(prev => ({ ...prev, [txId]: { loading: false, error: null, items: items || [] } }));
    } catch (e: any) {
      setEventsCache(prev => ({ ...prev, [txId]: { loading: false, error: e?.message || "Erreur", items: [] } }));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Pilotage des transactions financières
        </h1>
        <Link to="/" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
          Accueil
        </Link>
      </header>

      {/* Filtres compacts */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px] items-end">
          <div>
            <ProjectSearchBox
              value={projectId}
              onChange={setProjectId}
              placeholder="Chercher / choisir un projet..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Le projet sélectionné et le scope déterminent la liste des transactions affichées ci-dessous.
            </p>
          </div>

          <div className="justify-self-end">
            <label className="block text-sm font-medium text-slate-700 mb-1">Objet</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="rounded-full border px-3 py-2"
            >
              <option value="personnel">Personnel</option>
              <option value="activite">Activité</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-white">
        {loading && <div className="p-4 text-sm text-slate-500">Chargement…</div>}
        {err && <div className="p-4 text-sm text-red-600">Erreur : {err}</div>}
        {!loading && !err && rows.length === 0 && (
          <div className="p-4 text-slate-600">Aucune transaction.</div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700"> </th>
                  {columns.map(c => (
                    <th key={c.key as string} className="px-3 py-2 text-left font-semibold text-slate-700">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = expanded.has(r.idtransaction);
                  const ev = eventsCache[r.idtransaction];
                  return (
                    <React.Fragment key={r.idtransaction}>
                      <tr className="border-t">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleEventsFor(r.idtransaction)}
                            className="rounded-full border border-indigo-300 text-indigo-700 px-2 py-1 text-xs hover:bg-indigo-50"
                            aria-expanded={isOpen}
                            aria-controls={`txev-${r.idtransaction}`}
                          >
                            {isOpen ? "Fermer" : "Événements"}
                          </button>
                        </td>
                        {columns.map(c => {
                          const v = (r as any)[c.key];
                          return (
                            <td key={c.key as string} className="px-3 py-2 whitespace-nowrap">
                              {c.key === "montant_transaction"
                                ? new Intl.NumberFormat().format(Number(v ?? 0))
                                : (v ?? "—")}
                            </td>
                          );
                        })}
                      </tr>

                      {/* ==== BLOC ÉVÉNEMENTS (style accentué) ==== */}
                      {isOpen && (
                        <tr id={`txev-${r.idtransaction}`} className="bg-indigo-50/40">
                          <td className="px-3 py-3" colSpan={columns.length + 1}>
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 shadow-inner">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-200">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-indigo-300 text-[10px] text-indigo-700 font-semibold">EVT</span>
                                <span className="text-indigo-900 font-medium text-sm">
                                  Événements liés à la transaction
                                </span>
                              </div>

                              {!ev || ev.loading ? (
                                <div className="px-3 py-2 text-slate-700">Chargement des événements…</div>
                              ) : ev.error ? (
                                <div className="px-3 py-2 text-red-700">Erreur : {ev.error}</div>
                              ) : ev.items.length === 0 ? (
                                <div className="px-3 py-2 text-slate-700">Aucun événement lié.</div>
                              ) : (
                                <div className="px-2 py-2 overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-indigo-100/70 text-indigo-900">
                                      <tr>
                                        <th className="px-2 py-1 text-left">Type</th>
                                        <th className="px-2 py-1 text-left">Prévue</th>
                                        <th className="px-2 py-1 text-left">Réalisée</th>
                                        <th className="px-2 py-1 text-left">Statut</th>
                                        <th className="px-2 py-1 text-left">Description</th>
                                        <th className="px-2 py-1 text-left">Docs</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ev.items.map((e) => (
                                        <tr key={e.idevenement} className="border-t border-indigo-200">
                                          <td className="px-2 py-1">{e.type_evenement}</td>
                                          <td className="px-2 py-1">{fmtDate(e.date_prevue)}</td>
                                          <td className="px-2 py-1">{fmtDate(e.date_realisee)}</td>
                                          <td className="px-2 py-1">{e.statut_evenement ?? "—"}</td>
                                          <td className="px-2 py-1">{e.description_evenement ?? "—"}</td>
                                          <td className="px-2 py-1">
                                            <button
                                              className="rounded-md border border-indigo-300 text-indigo-700 px-2 py-1 text-xs hover:bg-indigo-50"
                                              onClick={() => setDocModalFor(e.idevenement)}
                                            >
                                              Documents liés
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EventDocsModal
        idevenement={docModalFor ?? 0}
        open={docModalFor != null}
        onClose={() => setDocModalFor(null)}
      />
    </div>
  );
}
