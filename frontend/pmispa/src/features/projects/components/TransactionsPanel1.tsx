// src/features/projects/components/TransactionsPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchProjectTransactions,
  fetchTransactionEvenements,
  type TransactionRow,
  type Scope,
} from "../api";
import EventDocsModal from "../components/EventDocsModal";

type EventRow = {
  idevenement: number;
  type_evenement: string;
  date_evenement?: string | null;
  date_prevue?: string | null;
  date_realisee?: string | null;
  description_evenement?: string | null;
  statut_evenement?: string | null;
};

export default function TransactionsPanel({ projectId }: { projectId: number }) {
  const { token } = useAuth();

  // scope + liste transactions
  const [scope, setScope] = useState<Scope>("personnel");
  const [txs, setTxs] = useState<TransactionRow[]>([]);
  const [, setLoadingTxs] = useState<boolean>(false);
  const [, setErrTxs] = useState<string | null>(null);

  // sélection
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const selectedTx = useMemo(
    () => txs.find(t => t.idtransaction === selectedTxId) || null,
    [txs, selectedTxId]
  );

  // événements
  const [evts, setEvts] = useState<EventRow[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(false);
  const [errEvts, setErrEvts] = useState<string | null>(null);

  // modale documents
  const [docModalFor, setDocModalFor] = useState<number | null>(null);

  // Charger la liste des transactions selon le scope
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErrTxs(null);
        setLoadingTxs(true);
        const rows = await fetchProjectTransactions(Number(projectId), scope, token || undefined);
        if (!cancel) {
          setTxs(rows || []);
          // présélectionner la 1ère
          setSelectedTxId(rows?.[0]?.idtransaction ?? null);
        }
      } catch (e: any) {
        if (!cancel) setErrTxs(e?.message || "Erreur de chargement des transactions");
      } finally {
        if (!cancel) setLoadingTxs(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, scope, token]);

  // Charger les événements quand la transaction change
  useEffect(() => {
    if (!selectedTxId) {
      setEvts([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setErrEvts(null);
        setLoadingEvts(true);
        const rows = await fetchTransactionEvenements(selectedTxId, token || undefined);
        if (!cancel) setEvts(rows || []);
      } catch (e: any) {
        if (!cancel) setErrEvts(e?.message || "Erreur de chargement des événements");
      } finally {
        if (!cancel) setLoadingEvts(false);
      }
    })();
    return () => { cancel = true; };
  }, [selectedTxId, token]);

  return (
    <section className="space-y-4">
      {/* Filtres / sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Objet</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="rounded-full border px-3 py-2"
          >
            <option value="personnel">Personnel</option>
            <option value="activite">Activité</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Choisir / rechercher une transaction
          </label>
          <select
            value={selectedTxId ?? ""}
            onChange={(e) => setSelectedTxId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border px-3 py-2"
          >
            {!txs.length && <option value="">— Aucune —</option>}
            {txs.map(t => (
              <option key={t.idtransaction} value={t.idtransaction}>
                {scope === "personnel"
                  ? `${(t as any).nom_personnel ?? "—"} — ${t.type_transaction ?? "—"}`
                  : `${(t as any).titre_act ?? "—"} — ${t.type_transaction ?? "—"}`}
              </option>
            ))}
          </select>
          {!!selectedTx && (
            <p className="mt-1 text-xs text-slate-500">
              Montant:{" "}
              <span className="font-medium">
                {new Intl.NumberFormat().format(Number(selectedTx.montant_transaction ?? 0))}{" "}
                {selectedTx.devise ?? ""}
              </span>{" "}
              • Date: {fmt(selectedTx.date_transaction)}
            </p>
          )}
        </div>
      </div>

      {/* Liste d’événements */}
      <div className="mt-2">
        {loadingEvts && <div className="text-sm text-gray-500">Chargement des événements…</div>}
        {errEvts && <div className="text-sm text-red-600">Erreur: {errEvts}</div>}

        {!loadingEvts && !errEvts && evts.length === 0 && (
          <div className="rounded-lg border p-4 text-slate-600">
            Aucun événement pour cette transaction.
          </div>
        )}

        <div className="space-y-4">
          {evts.map(e => (
            <article key={e.idevenement} className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{e.type_evenement}</h3>

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
