import React from "react";
import {
  listExercices,
  createExercice,
  updateExercice,
  deleteExercice,
  type Exercice,
  type ExerciceInput,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Exercice };

// Valeurs par défaut (année courante, dates vides)
const todayStr = () => new Date().toISOString().slice(0, 10);
const empty: ExerciceInput = {
  annee: new Date().getFullYear(),
  date_debut_exe: "",
  date_fin_exe: "",
};

function asYear(v: unknown): number {
  if (v === null || v === undefined || v === "") return new Date().getFullYear();
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

function validDateStr(d: string) {
  // format YYYY-MM-DD attendu par l’API (Date SQL)
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default function ExercicesBudgetairesPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Exercice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ExerciceInput>(empty);
  const [confirmDel, setConfirmDel] = React.useState<Exercice | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listExercices();
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
    setForm({
      annee: new Date().getFullYear(),
      date_debut_exe: "",
      date_fin_exe: "",
    });
  }

  function onEdit(row: Exercice) {
    setMode({ type: "edit", row });
    setForm({
      annee: asYear(row.annee),
      date_debut_exe: row.date_debut_exe ?? "",
      date_fin_exe: row.date_fin_exe ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkDates(p: ExerciceInput): string | null {
    if (!validDateStr(p.date_debut_exe) || !validDateStr(p.date_fin_exe)) {
      return "Veuillez saisir des dates valides au format AAAA-MM-JJ.";
    }
    const d1 = new Date(p.date_debut_exe);
    const d2 = new Date(p.date_fin_exe);
    if (d1 > d2) return "La date de début doit être antérieure ou égale à la date de fin.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ExerciceInput = {
        annee: asYear(form.annee),
        date_debut_exe: (form.date_debut_exe || "").trim(),
        date_fin_exe: (form.date_fin_exe || "").trim(),
      };

      const errDates = checkDates(payload);
      if (errDates) {
        show(errDates, "error");
        return;
      }

      if (mode.type === "create") {
        await createExercice(payload);
        show("Exercice budgétaire créé.", "success");
      } else {
        await updateExercice(mode.row.idexercice_budgetaire, payload);
        show("Exercice budgétaire mis à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Exercice) {
    // Garde côté UI en plus du contrôle backend
    const n = Number((row as any).nb_programmations ?? 0);
    if (n > 0) {
      show(
        "Suppression impossible : des programmations sont associées à cet exercice.",
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
      const res = await deleteExercice(row.idexercice_budgetaire);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Exercice budgétaire supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(
        e?.message || "Impossible de supprimer cet exercice budgétaire.",
        "error"
      );
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idexercice_budgetaire,
        r.annee,
        r.date_debut_exe,
        r.date_fin_exe
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
              Filtrer par année ou date…
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
            ? "Créer un exercice budgétaire"
            : `Modifier : #${mode.row.idexercice_budgetaire}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Année *</label>
            <input
              type="number"
              min="1900"
              max="2100"
              className="w-full rounded-lg border px-3 py-2"
              value={form.annee ?? new Date().getFullYear()}
              onChange={(e) =>
                setForm((f) => ({ ...f, annee: Number(e.target.value) }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date de début *
            </label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_debut_exe || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_debut_exe: e.target.value }))
              }
              placeholder={todayStr()}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date de fin *
            </label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_fin_exe || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_fin_exe: e.target.value }))
              }
              placeholder={todayStr()}
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
                <th className="px-4 py-2">Année</th>
                <th className="px-4 py-2">Début</th>
                <th className="px-4 py-2">Fin</th>
        
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={6}>
                    Chargement…
                  </td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={6}>
                    Aucun exercice.
                  </td>
                </tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idexercice_budgetaire} className="text-sm">
                    <td className="px-4 py-2">{r.idexercice_budgetaire}</td>
                    <td className="px-4 py-2">{asYear(r.annee)}</td>
                    <td className="px-4 py-2">{r.date_debut_exe}</td>
                    <td className="px-4 py-2">{r.date_fin_exe}</td>
    
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer l’exercice budgétaire ?"
        message={`Supprimer l’exercice #${
          confirmDel?.idexercice_budgetaire ?? ""
        } (${confirmDel?.annee ?? ""}) ?`}
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
