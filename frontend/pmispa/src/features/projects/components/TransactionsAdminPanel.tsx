import React from "react";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type Transaction,
  type TransactionInput,
} from "../transaction_api";

// On réutilise les listes existantes dans admin_api.ts
import {
  listPersonnels,
  type Personnel,
  listActivities,
  type Activity,
  listProjects,
  type Project,
} from "../admin_api";

import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Transaction };

const today = () => new Date().toISOString().slice(0, 10);

const empty: TransactionInput = {
  idpersonnel: null,
  idactivite: null,
  montant_transaction: 0,
  type_transaction: null,
  receveur_type: null,
  type_paiement: null,
  date_transaction: today(),
  commentaire: "",
  devise: "HTG",
  idprojet: null,
};

// valeurs autorisées (menus fermés)
const TYPE_TRANSACTION_OPTIONS = ["Avance", "decompte", "commande", "acompte"] as const;
const RECEVEUR_TYPE_OPTIONS = ["Personnel", "activite"] as const;
const TYPE_PAIEMENT_OPTIONS = ["avance", "decompte", "simplepaiement"] as const;

function validDateStr(d?: string | null) {
  return !d || /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function asNumber(v: any, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export default function TransactionsAdminPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<TransactionInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Transaction | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [pers, setPers] = React.useState<Personnel[]>([]);
  const [acts, setActs] = React.useState<Activity[]>([]);
  const [projs, setProjs] = React.useState<Project[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, lp, la, pr] = await Promise.all([
        listTransactions(),
        listPersonnels(),
        listActivities(),
        listProjects(),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setPers(lp);
      setActs(la);
      setProjs(pr);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  function reset() {
    setMode({ type: "create" });
    setForm({ ...empty });
  }

  function onEdit(row: Transaction) {
    setMode({ type: "edit", row });
    setForm({
      idpersonnel: row.idpersonnel ?? null,
      idactivite: row.idactivite ?? null,
      montant_transaction: asNumber(row.montant_transaction),
      type_transaction: row.type_transaction ?? null,
      receveur_type: row.receveur_type ?? null,
      type_paiement: row.type_paiement ?? null,
      date_transaction: row.date_transaction ?? today(),
      commentaire: row.commentaire ?? "",
      devise: row.devise ?? "HTG",
      idprojet: row.idprojet ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: TransactionInput): string | null {
    if (!Number.isFinite(p.montant_transaction) || (p.montant_transaction ?? 0) < 0)
      return "Montant invalide (>= 0 requis).";
    if (!validDateStr(p.date_transaction)) return "Date invalide (AAAA-MM-JJ).";

    // (déjà limités par les <select>, mais on garde un filet de sécurité)
    if (p.type_transaction && !TYPE_TRANSACTION_OPTIONS.includes(p.type_transaction as any)) {
      return "Type de transaction invalide.";
    }
    if (p.receveur_type && !RECEVEUR_TYPE_OPTIONS.includes(p.receveur_type as any)) {
      return "Type de receveur invalide.";
    }
    if (p.type_paiement && !TYPE_PAIEMENT_OPTIONS.includes(p.type_paiement as any)) {
      return "Type de paiement invalide.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: TransactionInput = {
        idpersonnel: form.idpersonnel === null || form.idpersonnel === undefined ? null : Number(form.idpersonnel),
        idactivite: form.idactivite === null || form.idactivite === undefined ? null : Number(form.idactivite),
        montant_transaction: asNumber(form.montant_transaction),
        type_transaction: form.type_transaction ?? null,
        receveur_type: form.receveur_type ?? null,
        type_paiement: form.type_paiement ?? null,
        date_transaction: form.date_transaction ?? today(),
        commentaire: (form.commentaire ?? "").trim() || null,
        devise: (form.devise ?? "").trim() || "HTG",
        idprojet: form.idprojet === null || form.idprojet === undefined ? null : Number(form.idprojet),
      };

      const msg = checkPayload(payload);
      if (msg) {
        show(msg, "error");
        return;
      }

      if (mode.type === "create") {
        await createTransaction(payload);
        show("Transaction créée.", "success");
      } else {
        await updateTransaction(mode.row.idtransaction, payload);
        show("Transaction mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Transaction) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteTransaction(row.idtransaction);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Transaction supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(
        e?.message || "Impossible de supprimer cette transaction.",
        "error"
      );
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idtransaction,
        r.nom_personnel ?? "",
        r.titre_act ?? "",
        r.code_projet ?? "",
        r.montant_transaction ?? "",
        r.type_transaction ?? "",
        r.type_paiement ?? "",
        r.receveur_type ?? "",
        r.devise ?? "",
        r.date_transaction ?? "",
        r.commentaire ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      {/* Filtre + refresh */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filtrer (personnel, activité, projet, type, date)…
            </label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Rechercher…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button className={btnGhost} onClick={reload}>
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <h3 className="text-lg font-semibold mb-4">
          {mode.type === "create"
            ? "Créer une transaction"
            : `Modifier : ${mode.row.nom_personnel ?? ""} — ${mode.row.titre_act ?? ""} (${mode.row.code_projet ?? ""})`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
          {/* Personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Personnel</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idpersonnel ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idpersonnel: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Non défini —</option>
              {pers.map((p) => (
                <option key={p.idpersonnel} value={p.idpersonnel}>
                  {p.nom_personnel}
                </option>
              ))}
            </select>
          </div>

          {/* Activité */}
          <div>
            <label className="block text-sm font-medium mb-1">Activité</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idactivite ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idactivite: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Non définie —</option>
              {acts.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {a.titre_act}
                </option>
              ))}
            </select>
          </div>

          {/* Projet */}
          <div>
            <label className="block text-sm font-medium mb-1">Projet</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idprojet ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idprojet: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Non défini —</option>
              {projs.map((p) => (
                <option key={p.idprojet} value={p.idprojet}>
                  {p.code_projet} {p.intitule_projet ? `— ${p.intitule_projet}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium mb-1">Montant *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border px-3 py-2"
              value={form.montant_transaction}
              onChange={(e) =>
                setForm((f) => ({ ...f, montant_transaction: asNumber(e.target.value) }))
              }
              required
            />
          </div>

          {/* Type transaction (menu fermé) */}
          <div>
            <label className="block text-sm font-medium mb-1">Type de transaction</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_transaction ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type_transaction: e.target.value === "" ? null : e.target.value,
                }))
              }
            >
              <option value="">— Non défini —</option>
              {TYPE_TRANSACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Type paiement (menu fermé) */}
          <div>
            <label className="block text-sm font-medium mb-1">Type de paiement</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_paiement ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type_paiement: e.target.value === "" ? null : e.target.value,
                }))
              }
            >
              <option value="">— Non défini —</option>
              {TYPE_PAIEMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Receveur (menu fermé) */}
          <div>
            <label className="block text-sm font-medium mb-1">Receveur</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.receveur_type ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  receveur_type: e.target.value === "" ? null : e.target.value,
                }))
              }
            >
              <option value="">— Non défini —</option>
              {RECEVEUR_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Devise */}
          <div>
            <label className="block text-sm font-medium mb-1">Devise</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.devise ?? "HTG"}
              onChange={(e) => setForm((f) => ({ ...f, devise: e.target.value }))}
              placeholder="HTG, USD…"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_transaction ?? today()}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_transaction: e.target.value }))
              }
              required
            />
          </div>

          {/* Commentaire (col 3) */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Commentaire</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              rows={3}
              value={form.commentaire ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, commentaire: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className={btnSave}>
              Enregistrer
            </button>
            <button type="button" onClick={reset} className={btnGhost}>
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      {/* Tableau */}
      <section className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Personnel</th>
                <th className="px-4 py-2">Activité</th>
                <th className="px-4 py-2">Projet</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Devise</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Paiement</th>
                <th className="px-4 py-2">Receveur</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={11}>Chargement…</td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={11}>Aucune transaction.</td>
                </tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idtransaction} className="text-sm">
                    <td className="px-4 py-2">{r.idtransaction}</td>
                    <td className="px-4 py-2">{r.nom_personnel ?? ""}</td>
                    <td className="px-4 py-2">{r.titre_act ?? ""}</td>
                    <td className="px-4 py-2">{r.code_projet ?? ""}</td>
                    <td className="px-4 py-2">{r.montant_transaction}</td>
                    <td className="px-4 py-2">{r.devise ?? ""}</td>
                    <td className="px-4 py-2">{r.type_transaction ?? ""}</td>
                    <td className="px-4 py-2">{r.type_paiement ?? ""}</td>
                    <td className="px-4 py-2">{r.receveur_type ?? ""}</td>
                    <td className="px-4 py-2">{r.date_transaction ?? ""}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className={btnEdit} onClick={() => onEdit(r)}>
                          Modifier
                        </button>
                        <button className={btnDelete} onClick={() => onDelete(r)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer la transaction ?"
        message={`Supprimer la transaction ${confirmDel?.idtransaction ?? ""} ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={confirmDelete}
      />

      {/* Toast */}
      <Toast toast={toast} onClose={hide} />
    </div>
  );
}
