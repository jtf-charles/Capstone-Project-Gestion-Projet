import React from "react";
import {
  listProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  type Procedure,
  type ProcedureInput,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Procedure };

const empty: ProcedureInput = { type_procedure: "" };

export default function ProceduresPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Procedure[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ProcedureInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Procedure | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listProcedures();
      setRows(Array.isArray(data) ? data : []);
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

  function onEdit(row: Procedure) {
    setMode({ type: "edit", row });
    setForm({ type_procedure: row.type_procedure || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: ProcedureInput): string | null {
    if (!p.type_procedure || !p.type_procedure.trim()) {
      return "Le type de procédure est obligatoire.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ProcedureInput = {
        type_procedure: (form.type_procedure || "").trim(),
      };
      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createProcedure(payload);
        show("Procédure créée.", "success");
      } else {
        await updateProcedure(mode.row.idprocedure, payload);
        show("Procédure mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Procedure) {
    // garde côté UI : impossible de supprimer si déjà associée à des commandes
    const n = Number(row.nb_commandes ?? 0);
    if (n > 0) {
      show(
        "Suppression impossible : des commandes sont associées à cette procédure.",
        "error"
      );
      return;
    }
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteProcedure(row.idprocedure);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Procédure supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cette procédure.", "error");
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.idprocedure, r.type_procedure, r.nb_commandes ?? 0]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      {/* Filtre */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filtrer (type, id, nombre de commandes)…
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
            ? "Créer une procédure"
            : `Modifier : ${mode.row.type_procedure}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Type de procédure *</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_procedure}
              onChange={(e) =>
                setForm((f) => ({ ...f, type_procedure: e.target.value }))
              }
              placeholder="ex. Appel d'offres, Demande de cotations…"
              required
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
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
                <th className="px-4 py-2">Type de procédure</th>
                <th className="px-4 py-2">Commandes liées</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={4}>
                    Chargement…
                  </td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={4}>
                    Aucune procédure.
                  </td>
                </tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idprocedure} className="text-sm">
                    <td className="px-4 py-2">{r.idprocedure}</td>
                    <td className="px-4 py-2">{r.type_procedure}</td>
                    <td className="px-4 py-2">{r.nb_commandes ?? 0}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className={btnEdit} onClick={() => onEdit(r)}>
                          Modifier
                        </button>
                        <button
                          className={btnDelete}
                          onClick={() => onDelete(r)}
                          disabled={(r.nb_commandes ?? 0) > 0}
                          title={
                            (r.nb_commandes ?? 0) > 0
                              ? "Impossible de supprimer : des commandes sont associées."
                              : undefined
                          }
                        >
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
        title="Supprimer la procédure ?"
        message={`Supprimer la procédure « ${confirmDel?.type_procedure ?? ""} » ?`}
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
