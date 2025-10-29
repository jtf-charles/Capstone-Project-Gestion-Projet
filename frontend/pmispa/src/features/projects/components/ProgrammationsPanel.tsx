// frontend/pmispa/src/features/projects/components/ProgrammationsPanel.tsx
import React from "react";
import {
  // API Programmations
  listProgrammations,
  createProgrammation,
  updateProgrammation,
  deleteProgrammation,
  type Programmation,
  type ProgrammationInput,
  // Réutilisation des APIs existantes
  listActivities,
  listExercices,
  type Activity,
  type Exercice,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Programmation };

const empty: ProgrammationInput = {
  idactivite: null,              // optionnel
  idexercice_budgetaire: 0,      // obligatoire (0 = non choisi)
};

export default function ProgrammationsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Programmation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ProgrammationInput>(empty);
  const [confirmDel, setConfirmDel] = React.useState<Programmation | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [exercices, setExercices] = React.useState<Exercice[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, exs, acts] = await Promise.all([
        listProgrammations(),
        listExercices(),
        listActivities(),
      ]);
      const exSorted = [...exs].sort(
        (a, b) => Number(b.annee) - Number(a.annee)
      );
      setExercices(exSorted);
      setActivities(acts);
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

  function onEdit(row: Programmation) {
    setMode({ type: "edit", row });
    setForm({
      idactivite: row.idactivite ?? null,
      idexercice_budgetaire: Number(row.idexercice_budgetaire),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: ProgrammationInput): string | null {
    if (!p.idexercice_budgetaire || Number(p.idexercice_budgetaire) <= 0) {
      return "Veuillez sélectionner un exercice budgétaire.";
    }
    // idactivite peut être null (optionnel)
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ProgrammationInput = {
        idactivite: form.idactivite, // number | null — pas de comparaison à ""
        idexercice_budgetaire: Number(form.idexercice_budgetaire),
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createProgrammation(payload);
        show("Programmation créée.", "success");
      } else {
        await updateProgrammation(mode.row.idprogrammation, payload);
        show("Programmation mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Programmation) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteProgrammation(row.idprogrammation);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Programmation supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cette programmation.", "error");
    }
  }

  // Fallbacks pour libellés si l’API ne renvoie pas titre_act / annee
  const exById = React.useMemo(() => {
    const m: Record<number, Exercice> = {};
    for (const ex of exercices) m[ex.idexercice_budgetaire] = ex;
    return m;
  }, [exercices]);

  const actById = React.useMemo(() => {
    const m: Record<number, Activity> = {};
    for (const a of activities) m[a.idactivite] = a;
    return m;
  }, [activities]);

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idprogrammation,
        r.idexercice_budgetaire,
        r.annee ?? "",
        r.idactivite ?? "",
        r.titre_act ?? "",
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
              Filtrer (id, activité, exercice)…
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
            ? "Créer une programmation"
            : `Modifier : #${mode.row.idprogrammation}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Exercice budgétaire (obligatoire) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Exercice budgétaire *
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idexercice_budgetaire || 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idexercice_budgetaire: Number(e.target.value),
                }))
              }
              required
            >
              <option value={0} disabled>
                — Sélectionner un exercice —
              </option>
              {exercices.map((ex) => (
                <option
                  key={ex.idexercice_budgetaire}
                  value={ex.idexercice_budgetaire}
                >
                  {ex.annee}
                </option>
              ))}
            </select>
          </div>

          {/* Activité (optionnelle) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Activité (optionnelle)
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idactivite ?? ""} // number | null -> "" si null
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
                <th className="px-4 py-2">Exercice</th>
                <th className="px-4 py-2">Activité</th>
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
                    Aucune programmation.
                  </td>
                </tr>
              ) : (
                display.map((r) => {
                  const ex = exById[r.idexercice_budgetaire];
                  const exLabel = ex?.annee ?? r.annee ?? ""; // fallback année
                  const act = r.idactivite ? actById[r.idactivite] : undefined;
                  const actLabel = r.idactivite
                    ? `${act?.titre_act ?? r.titre_act ?? ""}`
                    : "—";

                  return (
                    <tr key={r.idprogrammation} className="text-sm">
                      <td className="px-4 py-2">{r.idprogrammation}</td>
                      <td className="px-4 py-2">
                        {exLabel ? `${exLabel} ` : ""}
                      </td>
                      <td className="px-4 py-2">{actLabel}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            className={btnEdit}
                            onClick={() => onEdit(r)}
                          >
                            Modifier
                          </button>
                          <button
                            className={btnDelete}
                            onClick={() => onDelete(r)}
                          >
                            Supprimer
                          </button>
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
        title="Supprimer la programmation ?"
        message={`Supprimer la programmation #${confirmDel?.idprogrammation ?? ""} ?`}
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
