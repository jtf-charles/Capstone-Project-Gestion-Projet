import React from "react";
// --- soumissions : viennent de Soum_api.ts
import {
  listSoumissions,
  createSoumission,
  updateSoumission,
  deleteSoumission,
  type Soumission,
  type SoumissionInput,
} from "../Soum_api";

// --- soumissionnaires & commandes : viennent de Admin_api.ts
import {
  listSoumissionnaires,
  type Soumissionnaire,
  listCommandes,
  type Commande,
} from "../admin_api";

import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Soumission };

const today = () => new Date().toISOString().slice(0, 10);

const empty: SoumissionInput = {
  idsoumissionnaire: null,   // optionnel
  idcommande: 0,             // requis
  date_soumission: today(),
  statut_soumission: "en cours",
};

function validDateStr(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default function SoumissionsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Soumission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<SoumissionInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Soumission | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [soums, setSoums] = React.useState<Soumissionnaire[]>([]);
  const [cmds, setCmds] = React.useState<Commande[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, soumList, cmdList] = await Promise.all([
        listSoumissions(),
        listSoumissionnaires(),
        listCommandes(),
      ]);
      const soumSorted = [...soumList].sort((a, b) =>
        (a.nom_Soum || "").localeCompare(b.nom_Soum || "", "fr", { sensitivity: "base" })
      );
      const cmdSorted = [...cmdList].sort((a, b) =>
        String(a.libelle_commande || "").localeCompare(String(b.libelle_commande || ""), "fr", { sensitivity: "base" })
      );
      setSoums(soumSorted);
      setCmds(cmdSorted);
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

  function onEdit(row: Soumission) {
    setMode({ type: "edit", row });
    setForm({
      idsoumissionnaire: row.idsoumissionnaire ?? null,
      idcommande: Number(row.idcommande),
      date_soumission: row.date_soumission,
      statut_soumission: row.statut_soumission ?? "en cours",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: SoumissionInput): string | null {
    if (!p.idcommande || Number(p.idcommande) <= 0)
      return "Veuillez sélectionner une commande.";
    if (!p.date_soumission || !validDateStr(p.date_soumission))
      return "La date de soumission est obligatoire (AAAA-MM-JJ).";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: SoumissionInput = {
        idsoumissionnaire:
          form.idsoumissionnaire === undefined || form.idsoumissionnaire === null
            ? null
            : Number(form.idsoumissionnaire),
        idcommande: Number(form.idcommande),
        date_soumission: (form.date_soumission || "").trim(),
        statut_soumission: (form.statut_soumission ?? "") || "en cours",
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createSoumission(payload);
        show("Soumission créée.", "success");
      } else {
        await updateSoumission(mode.row.idsoumission, payload);
        show("Soumission mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Soumission) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deleteSoumission(row.idsoumission);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Soumission supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cette soumission.", "error");
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idsoumission,
        r.nom_Soum ?? "",
        r.libelle_commande ?? "",
        r.date_soumission ?? "",
        r.statut_soumission ?? "",
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
              Filtrer (soumissionnaire, commande, statut, date)…
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
            ? "Créer une soumission"
            : `Modifier : ${mode.row.nom_Soum ?? ""} — ${mode.row.libelle_commande ?? ""}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Soumissionnaire (optionnel) */}
          <div>
            <label className="block text-sm font-medium mb-1">Soumissionnaire</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idsoumissionnaire ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idsoumissionnaire: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Non défini —</option>
              {soums.map((s) => (
                <option key={s.idsoumissionnaire} value={s.idsoumissionnaire}>
                  {s.nom_Soum}
                </option>
              ))}
            </select>
          </div>

          {/* Commande (requis) */}
          <div>
            <label className="block text-sm font-medium mb-1">Commande *</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idcommande}
              onChange={(e) =>
                setForm((f) => ({ ...f, idcommande: Number(e.target.value) }))
              }
              required
            >
              <option value={0} disabled>— Sélectionner une commande —</option>
              {cmds.map((c) => (
                <option key={c.idcommande} value={c.idcommande}>
                  {c.libelle_commande ?? `Commande ${c.idcommande}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date de soumission *</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_soumission}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_soumission: e.target.value }))
              }
              required
            />
          </div>

          {/* Statut */}
          {/* Statut */}
            <div>
            <label className="block text-sm font-medium mb-1">Statut *</label>
            <select
                className="w-full rounded-lg border px-3 py-2"
                value={form.statut_soumission ?? "en cours"}
                onChange={(e) =>
                setForm((f) => ({ ...f, statut_soumission: e.target.value }))
                }
                required
            >
                <option value="en cours">En cours</option>
                <option value="gagnante">Gagnante</option>
                <option value="rejetée">Rejetée</option>
            </select>
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
                <th className="px-4 py-2">Soumissionnaire</th>
                <th className="px-4 py-2">Commande</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Statut</th>
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
                  <td className="px-4 py-3 text-sm" colSpan={6}>Aucune soumission.</td>
                </tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idsoumission} className="text-sm">
                    <td className="px-4 py-2">{r.idsoumission}</td>
                    <td className="px-4 py-2">{r.nom_Soum ?? ""}</td>
                    <td className="px-4 py-2">{r.libelle_commande ?? r.idcommande}</td>
                    <td className="px-4 py-2">{r.date_soumission}</td>
                    <td className="px-4 py-2">{r.statut_soumission ?? ""}</td>
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
        title="Supprimer la soumission ?"
        message={`Supprimer la soumission ${confirmDel?.idsoumission ?? ""} ?`}
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
