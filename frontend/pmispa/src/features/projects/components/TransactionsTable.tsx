// src/features/transactions/components/TransactionsTable.tsx
import type { TransactionRow, Scope } from "../api";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}
function fmtMoney(n?: number | null, currency?: string) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "HTG",
      maximumFractionDigits: 2,
    }).format(n);
  } catch { return String(n); }
}

export default function TransactionsTable({
  rows, scope, loading, error,
}: {
  rows: TransactionRow[];
  scope: Scope;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <div className="text-sm text-gray-500">Chargement des transactions…</div>;
  if (error)   return <div className="text-sm text-red-600">Erreur: {error}</div>;
  if (!rows.length) return (
    <div className="rounded-lg border p-4 text-slate-600">Aucune transaction.</div>
  );

  const isPers = scope === "personnel";
  const isAct  = scope === "activite";

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Commentaire</th>
            {isPers && (
              <>
                <th className="px-3 py-2 text-left">Personnel</th>
                <th className="px-3 py-2 text-left">Type personnel</th>
               
              </>
            )}
            {isAct && (
              <th className="px-3 py-2 text-left">Activité</th>
            )}

            <th className="px-3 py-2 text-left">Montant</th>
            <th className="px-3 py-2 text-left">Devise</th>
            <th className="px-3 py-2 text-left">Type paiement</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((t) => (
            <tr key={t.idtransaction} className="border-t">
              <td className="px-3 py-2">{fmtDate(t.date_transaction)}</td>
              <td className="px-3 py-2">{t.type_transaction ?? "—"}</td>
              <td className="px-3 py-2">{t.commentaire ?? "—"}</td>

              {isPers && (
                <>
                  <td className="px-3 py-2">
                    {"nom_personnel" in t ? t.nom_personnel : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {"type_personnel" in t ? (t.type_personnel ?? "—") : "—"}
                  </td>
                </>
              )}

              {isAct && (
                <td className="px-3 py-2">
                  {"titre_act" in t ? t.titre_act : "—"}
                </td>
              )}

              <td className="px-3 py-2">{fmtMoney(t.montant_transaction, t.devise)}</td>
              <td className="px-3 py-2">{t.devise}</td>
               <td className="px-3 py-2">{t.type_paiement}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
