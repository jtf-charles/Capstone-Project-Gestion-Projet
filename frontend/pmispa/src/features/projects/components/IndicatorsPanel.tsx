// src/features/indicators/IndicatorsPanel.tsx
import React from "react";
import {
  listIndicateurs,
  createIndicateur,
  updateIndicateur,
  deleteIndicateur,
  type Indicateur,
  type IndicateurInput,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Indicateur };

const empty: IndicateurInput = {
  libelle_indicateur: "",
  niveau_base: 0,
  niveau_cible: 0,
  niveau_actuel: 0,
};

function asNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export default function IndicatorsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Indicateur[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<IndicateurInput>(empty);
  const [confirmDel, setConfirmDel] = React.useState<Indicateur | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listIndicateurs();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  function reset() {
    setMode({ type: "create" });
    setForm(empty);
  }

  function onEdit(row: Indicateur) {
    setMode({ type: "edit", row });
    setForm({
      libelle_indicateur: row.libelle_indicateur ?? "",
      niveau_base: asNum(row.niveau_base),
      niveau_cible: asNum(row.niveau_cible),
      niveau_actuel: asNum(row.niveau_actuel),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: IndicateurInput = {
        libelle_indicateur: (form.libelle_indicateur || "").trim(),
        niveau_base: asNum(form.niveau_base),
        niveau_cible: asNum(form.niveau_cible),
        niveau_actuel: asNum(form.niveau_actuel),
      };
      if (!payload.libelle_indicateur) {
        show("Le libellé est requis.", "error");
        return;
      }

      if (mode.type === "create") {
        await createIndicateur(payload);
        show("Indicateur créé.", "success");
      } else {
        await updateIndicateur(mode.row.idindicateur, payload);
        show("Indicateur mis à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  async function onDelete(row: Indicateur) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteIndicateur(row.idindicateur);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Indicateur supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cet indicateur.", "error");
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idindicateur,
        r.libelle_indicateur,
        r.niveau_base,
        r.niveau_cible,
        r.niveau_actuel,
      ]
        .filter(Boolean)
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
              Filtrer par titre ou valeur…
            </label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Rechercher…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button className={btnGhost} onClick={reload}>Actualiser</button>
            </div>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <h3 className="text-lg font-semibold mb-4">
          {mode.type === "create" ? "Créer un indicateur" : `Modifier : #${mode.row.idindicateur}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Libellé *</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.libelle_indicateur}
              onChange={(e) => setForm((f) => ({ ...f, libelle_indicateur: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Niveau de base</label>
            <input
              type="number" step="0.01" min="0"
              className="w-full rounded-lg border px-3 py-2"
              value={form.niveau_base ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, niveau_base: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Niveau cible</label>
            <input
              type="number" step="0.01" min="0"
              className="w-full rounded-lg border px-3 py-2"
              value={form.niveau_cible ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, niveau_cible: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Niveau actuel</label>
            <input
              type="number" step="0.01" min="0"
              className="w-full rounded-lg border px-3 py-2"
              value={form.niveau_actuel ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, niveau_actuel: Number(e.target.value) }))}
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className={btnSave}>Enregistrer</button>
            <button type="button" onClick={reset} className={btnGhost}>Réinitialiser</button>
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
                <th className="px-4 py-2">Libellé</th>
                <th className="px-4 py-2">Base</th>
                <th className="px-4 py-2">Cible</th>
                <th className="px-4 py-2">Actuel</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Chargement…</td></tr>
              ) : display.length === 0 ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Aucun indicateur.</td></tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idindicateur} className="text-sm">
                    <td className="px-4 py-2">{r.idindicateur}</td>
                    <td className="px-4 py-2">{r.libelle_indicateur}</td>
                    <td className="px-4 py-2">{asNum(r.niveau_base)}</td>
                    <td className="px-4 py-2">{asNum(r.niveau_cible)}</td>
                    <td className="px-4 py-2">{asNum(r.niveau_actuel)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className={btnEdit} onClick={() => onEdit(r)}>Modifier</button>
                        <button className={btnDelete} onClick={() => onDelete(r)}>Supprimer</button>
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
        title="Supprimer l’indicateur ?"
        message={`Supprimer l’indicateur « ${confirmDel?.libelle_indicateur ?? ""} » ?`}
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
