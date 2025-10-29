import React from "react";
import {
  listResponsabilites,
  createResponsabilite,
  updateResponsabilite,
  deleteResponsabilite,
  type Responsabilite,
  type ResponsabiliteInput,
  // listes pour les selects
  listActivities,
  listPersonnels,
  type Activity,
  type Personnel,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Responsabilite };

const empty: ResponsabiliteInput = {
  idactivite: null,       // optionnel
  idpersonnel: 0,         // requis (>0)
  date_debut_act: null,
  date_fin_act: null,
};

function validDateStr(d: string | null | undefined) {
  if (!d) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default function ResponsabilitesPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Responsabilite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ResponsabiliteInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Responsabilite | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [personnels, setPersonnels] = React.useState<Personnel[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, acts, pers] = await Promise.all([
        listResponsabilites(),
        listActivities(),
        listPersonnels(),
      ]);
      setActivities(acts);
      setPersonnels(pers);
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

  function onEdit(row: Responsabilite) {
    setMode({ type: "edit", row });
    setForm({
      idactivite: row.idactivite ?? null,
      idpersonnel: Number(row.idpersonnel),
      date_debut_act: row.date_debut_act ?? null,
      date_fin_act: row.date_fin_act ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: ResponsabiliteInput): string | null {
    if (!p.idpersonnel || Number(p.idpersonnel) <= 0) {
      return "Veuillez sélectionner un personnel.";
    }
    if (!validDateStr(p.date_debut_act) || !validDateStr(p.date_fin_act)) {
      return "Dates invalides (format attendu AAAA-MM-JJ).";
    }
    if (p.date_debut_act && p.date_fin_act) {
      const d1 = new Date(p.date_debut_act);
      const d2 = new Date(p.date_fin_act);
      if (d1 > d2) return "La date de fin doit être postérieure ou égale à la date de début.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ResponsabiliteInput = {
        idactivite:
          form.idactivite === undefined || form.idactivite === null
            ? null
            : Number(form.idactivite),
        idpersonnel: Number(form.idpersonnel),
        date_debut_act: (form.date_debut_act ?? "") || null,
        date_fin_act: (form.date_fin_act ?? "") || null,
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createResponsabilite(payload);
        show("Responsabilité créée.", "success");
      } else {
        await updateResponsabilite(mode.row.idresponsabilites, payload);
        show("Responsabilité mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Responsabilite) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteResponsabilite(row.idresponsabilites);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Responsabilité supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cette responsabilité.", "error");
    }
  }

  const actById = React.useMemo(() => {
    const m: Record<number, Activity> = {};
    for (const a of activities) m[a.idactivite] = a;
    return m;
  }, [activities]);

  const persById = React.useMemo(() => {
    const m: Record<number, Personnel> = {};
    for (const p of personnels) m[p.idpersonnel] = p;
    return m;
  }, [personnels]);

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idresponsabilites,
        r.idactivite ?? "",
        r.titre_act ?? "",
        r.idpersonnel,
        r.nom_personnel ?? "",
        r.date_debut_act ?? "",
        r.date_fin_act ?? "",
      ]
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
              Filtrer (activité, personnel, dates)…
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
            ? "Créer une responsabilité"
            : `Modifier : ${mode.row.nom_personnel ?? ""}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Personnel (requis) */}
          <div>
            <label className="block text-sm font-medium mb-1">Personnel *</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idpersonnel || 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, idpersonnel: Number(e.target.value) }))
              }
              required
            >
              <option value={0} disabled>— Sélectionner un personnel —</option>
              {personnels.map((p) => (
                <option key={p.idpersonnel} value={p.idpersonnel}>
                  {p.nom_personnel}
                </option>
              ))}
            </select>
          </div>

          {/* Activité (optionnelle) */}
          <div>
            <label className="block text-sm font-medium mb-1">Activité (optionnelle)</label>
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
              <option value="">— Sans activité —</option>
              {activities.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {a.titre_act}
                </option>
              ))}
            </select>
          </div>

          {/* Dates (optionnelles) */}
          <div>
            <label className="block text-sm font-medium mb-1">Date de début</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_debut_act ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_debut_act: e.target.value || null }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date de fin</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_fin_act ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_fin_act: e.target.value || null }))
              }
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className={btnSave}>Enregistrer</button>
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
                <th className="px-4 py-2">Début</th>
                <th className="px-4 py-2">Fin</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={6}>Chargement…</td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={6}>Aucune responsabilité.</td>
                </tr>
              ) : (
                display.map((r) => {
                  const a = r.idactivite ? actById[r.idactivite] : undefined;
                  const p = persById[r.idpersonnel];
                  const actLabel = r.idactivite ? (a?.titre_act ?? r.titre_act ?? "") : "—";
                  const persLabel = p?.nom_personnel ?? r.nom_personnel ?? r.idpersonnel;

                  return (
                    <tr key={r.idresponsabilites} className="text-sm">
                      <td className="px-4 py-2">{r.idresponsabilites}</td>
                      <td className="px-4 py-2">{persLabel}</td>
                      <td className="px-4 py-2">{actLabel}</td>
                      <td className="px-4 py-2">{r.date_debut_act ?? ""}</td>
                      <td className="px-4 py-2">{r.date_fin_act ?? ""}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button className={btnEdit} onClick={() => onEdit(r)}>Modifier</button>
                          <button className={btnDelete} onClick={() => onDelete(r)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer la responsabilité ?"
        message={`Supprimer la responsabilité #${confirmDel?.idresponsabilites ?? ""} ?`}
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
