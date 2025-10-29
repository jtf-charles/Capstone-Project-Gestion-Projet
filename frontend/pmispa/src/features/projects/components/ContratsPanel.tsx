import React from "react";
import {
  listContrats,
  createContrat,
  updateContrat,
  deleteContrat,
  type Contrat,
  type ContratInput,
  listPersonnels,
  type Personnel,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Contrat };

const empty: ContratInput = {
  idpersonnel: null,          // optionnel
  date_signature: null,
  date_debut_contrat: null,
  date_fin_contrat: null,
  duree_contrat: null,
  montant_contrat: null,
};

function validDateStr(d: string | null | undefined) {
  if (!d) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function toNumberOrNull(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ContratsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Contrat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ContratInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Contrat | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [personnels, setPersonnels] = React.useState<Personnel[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, pers] = await Promise.all([listContrats(), listPersonnels()]);
      const persSorted = [...pers].sort((a, b) =>
        (a.nom_personnel || "").localeCompare(b.nom_personnel || "", "fr", {
          sensitivity: "base",
        })
      );
      setPersonnels(persSorted);
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

  function onEdit(row: Contrat) {
    setMode({ type: "edit", row });
    setForm({
      idpersonnel: row.idpersonnel ?? null,
      date_signature: row.date_signature ?? null,
      date_debut_contrat: row.date_debut_contrat ?? null,
      date_fin_contrat: row.date_fin_contrat ?? null,
      duree_contrat: row.duree_contrat ?? null,
      montant_contrat:
        row.montant_contrat === null || row.montant_contrat === undefined
          ? null
          : Number(row.montant_contrat),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: ContratInput): string | null {
    if (!validDateStr(p.date_signature) || !validDateStr(p.date_debut_contrat) || !validDateStr(p.date_fin_contrat)) {
      return "Dates invalides (format attendu AAAA-MM-JJ).";
    }
    if (p.date_debut_contrat && p.date_fin_contrat) {
      const d1 = new Date(p.date_debut_contrat);
      const d2 = new Date(p.date_fin_contrat);
      if (d1 > d2) return "La date de fin doit être postérieure ou égale à la date de début.";
    }
    if (p.duree_contrat != null && p.duree_contrat < 0) {
      return "La durée doit être ≥ 0.";
    }
    if (p.montant_contrat != null && p.montant_contrat < 0) {
      return "Le montant doit être ≥ 0.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ContratInput = {
        idpersonnel:
          form.idpersonnel === undefined || form.idpersonnel === null
            ? null
            : Number(form.idpersonnel),
        date_signature: (form.date_signature ?? "") || null,
        date_debut_contrat: (form.date_debut_contrat ?? "") || null,
        date_fin_contrat: (form.date_fin_contrat ?? "") || null,
        duree_contrat: toNumberOrNull(form.duree_contrat),
        montant_contrat: toNumberOrNull(form.montant_contrat),
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createContrat(payload);
        show("Contrat créé.", "success");
      } else {
        await updateContrat(mode.row.idcontrat, payload);
        show("Contrat mis à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Contrat) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteContrat(row.idcontrat);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Contrat supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer ce contrat.", "error");
    }
  }

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
        r.idcontrat,
        r.idpersonnel ?? "",
        r.nom_personnel ?? "",
        r.date_signature ?? "",
        r.date_debut_contrat ?? "",
        r.date_fin_contrat ?? "",
        r.duree_contrat ?? "",
        r.montant_contrat ?? "",
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
              Filtrer (personnel, dates, montant)…
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
          {mode.type === "create" ? "Créer un contrat" : `Modifier : ${mode.row.nom_personnel ?? ""}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Personnel (optionnel) */}
          <div>
            <label className="block text-sm font-medium mb-1">Personnel (optionnel)</label>
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
              <option value="">— Non assigné —</option>
              {personnels.map((p) => (
                <option key={p.idpersonnel} value={p.idpersonnel}>
                  {p.nom_personnel}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium mb-1">Date de signature</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_signature ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, date_signature: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Début du contrat</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_debut_contrat ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_debut_contrat: e.target.value || null }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fin du contrat</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_fin_contrat ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_fin_contrat: e.target.value || null }))
              }
            />
          </div>

          {/* Durée & Montant */}
          <div>
            <label className="block text-sm font-medium mb-1">Durée (jours / mois)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2"
              value={form.duree_contrat ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, duree_contrat: e.target.value === "" ? null : Number(e.target.value) }))
              }
              placeholder="ex. 12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Montant</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-lg border px-3 py-2"
              value={form.montant_contrat ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  montant_contrat: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              placeholder="ex. 250000.00"
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
                <th className="px-4 py-2">Personnel</th>
                <th className="px-4 py-2">Signature</th>
                <th className="px-4 py-2">Début</th>
                <th className="px-4 py-2">Fin</th>
                <th className="px-4 py-2">Durée</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={8}>Chargement…</td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={8}>Aucun contrat.</td>
                </tr>
              ) : (
                display.map((r) => {
                  const p = r.idpersonnel ? persById[r.idpersonnel] : undefined;
                  const persLabel = p?.nom_personnel ?? r.nom_personnel ?? "";

                  // montant_contrat peut venir en string -> on l'affiche tel quel
                  const montant =
                    r.montant_contrat === null || r.montant_contrat === undefined
                      ? ""
                      : String(r.montant_contrat);

                  return (
                    <tr key={r.idcontrat} className="text-sm">
                      <td className="px-4 py-2">{r.idcontrat}</td>
                      <td className="px-4 py-2">{persLabel}</td>
                      <td className="px-4 py-2">{r.date_signature ?? ""}</td>
                      <td className="px-4 py-2">{r.date_debut_contrat ?? ""}</td>
                      <td className="px-4 py-2">{r.date_fin_contrat ?? ""}</td>
                      <td className="px-4 py-2">{r.duree_contrat ?? ""}</td>
                      <td className="px-4 py-2">{montant}</td>
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
        title="Supprimer le contrat ?"
        message={`Supprimer le contrat #${confirmDel?.idcontrat ?? ""} ?`}
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
