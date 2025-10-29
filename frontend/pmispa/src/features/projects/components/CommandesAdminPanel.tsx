import React from "react";
import {
  listCommandes,
  createCommande,
  updateCommande,
  deleteCommande,
  type Commande,
  type CommandeInput,
  listProcedures,
  listProjects,
  type Procedure,
  type Project,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

// helpers
function toNumberOrNull(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toNumberRequired(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN as any;
  return n;
}

type Mode = { type: "create" } | { type: "edit"; row: Commande };

const empty: CommandeInput = {
  idprocedure: null,
  idprojet: null,
  montant_commande: 0,
  libelle_commande: null,
  nature_commande: null,
  type_commande: null,
};

export default function CommandesPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Commande[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<CommandeInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Commande | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [procedures, setProcedures] = React.useState<Procedure[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, procs, projs] = await Promise.all([
        listCommandes(),
        listProcedures(),
        listProjects(),
      ]);
      // tri lisible
      const procsSorted = [...procs].sort((a, b) =>
        (a.type_procedure || "").localeCompare(b.type_procedure || "", "fr", { sensitivity: "base" })
      );
      const projsSorted = [...projs].sort((a, b) =>
        (a.code_projet || "").localeCompare(b.code_projet || "", "fr", { sensitivity: "base" })
      );
      setProcedures(procsSorted);
      setProjects(projsSorted);
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

  function onEdit(row: Commande) {
    setMode({ type: "edit", row });
    setForm({
      idprocedure: row.idprocedure ?? null,
      idprojet: row.idprojet ?? null,
      montant_commande:
        row.montant_commande === null || row.montant_commande === undefined
          ? ("" as any)
          : Number(row.montant_commande),
      libelle_commande: row.libelle_commande ?? null,
      nature_commande: row.nature_commande ?? null,
      type_commande: row.type_commande ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: CommandeInput): string | null {
    if (!Number.isFinite(p.montant_commande) || p.montant_commande < 0) {
      return "Le montant est obligatoire et doit être ≥ 0.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: CommandeInput = {
        idprocedure:
          form.idprocedure === undefined || form.idprocedure === null
            ? null
            : Number(form.idprocedure),
        idprojet:
          form.idprojet === undefined || form.idprojet === null
            ? null
            : Number(form.idprojet),
        montant_commande: toNumberRequired(form.montant_commande),
        libelle_commande: (form.libelle_commande ?? "") || null,
        nature_commande: (form.nature_commande ?? "") || null,
        type_commande: (form.type_commande ?? "") || null,
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createCommande(payload);
        show("Commande créée.", "success");
      } else {
        await updateCommande(mode.row.idcommande, payload);
        show("Commande mise à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Commande) {
    // règle métier côté UI : impossible de supprimer si soumissions liées
    const n = Number(row.nb_soumissions ?? 0);
    if (n > 0) {
      show(
        "Suppression impossible : des soumissions sont associées à cette commande.",
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
      const res = await deleteCommande(row.idcommande);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Commande supprimée.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer cette commande.", "error");
    }
  }

  const procById = React.useMemo(() => {
    const m: Record<number, Procedure> = {};
    for (const p of procedures) m[p.idprocedure] = p;
    return m;
  }, [procedures]);

  const projById = React.useMemo(() => {
    const m: Record<number, Project> = {};
    for (const p of projects) m[p.idprojet] = p;
    return m;
  }, [projects]);

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idcommande,
        r.type_procedure ?? "",
        r.code_projet ?? "",
        r.initule_projet ?? "",
        r.libelle_commande ?? "",
        r.nature_commande ?? "",
        r.type_commande ?? "",
        r.montant_commande ?? "",
        r.nb_soumissions ?? 0,
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
              Filtrer (procédure, projet, libellé, nature, type, montant)…
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
            ? "Créer une commande"
            : `Modifier : ${mode.row.libelle_commande ?? ""}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Procédure (optionnelle) */}
          <div>
            <label className="block text-sm font-medium mb-1">Procédure</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idprocedure ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idprocedure: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Non défini —</option>
              {procedures.map((p) => (
                <option key={p.idprocedure} value={p.idprocedure}>
                  {p.type_procedure}
                </option>
              ))}
            </select>
          </div>

          {/* Projet (optionnel) */}
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
              {projects.map((p) => (
                <option key={p.idprojet} value={p.idprojet}>
                  {p.code_projet} {p.intitule_projet ? `— ${p.intitule_projet}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-sm font-medium mb-1">Libellé</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.libelle_commande ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, libelle_commande: e.target.value || null }))
              }
              placeholder="ex. Fourniture de …"
            />
          </div>

          {/* Nature */}
          <div>
            <label className="block text-sm font-medium mb-1">Nature</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.nature_commande ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, nature_commande: e.target.value || null }))
              }
              placeholder="ex. Travaux, Services, Fournitures…"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_commande ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, type_commande: e.target.value || null }))
              }
              placeholder="ex. Marché public…"
            />
          </div>

          {/* Montant (requis) */}
          <div>
            <label className="block text-sm font-medium mb-1">Montant *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-lg border px-3 py-2"
              value={form.montant_commande ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  montant_commande:
                    e.target.value === "" ? ("" as any) : Number(e.target.value),
                }))
              }
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
                <th className="px-4 py-2">Procédure</th>
                <th className="px-4 py-2">Projet</th>
                <th className="px-4 py-2">Libellé</th>
                <th className="px-4 py-2">Nature</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Soumissions liées</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={9}>
                    Chargement…
                  </td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={9}>
                    Aucune commande.
                  </td>
                </tr>
              ) : (
                display.map((r) => {
                  const proc = r.idprocedure ? procById[r.idprocedure] : undefined;
                  const proj = r.idprojet ? projById[r.idprojet] : undefined;

                  const procLabel = proc?.type_procedure ?? r.type_procedure ?? "";
                  const projLabel =
                    (proj?.code_projet ?? r.code_projet ?? "") +
                    (proj?.intitule_projet
                      ? ` — ${proj.intitule_projet}`
                      : r.initule_projet
                      ? ` — ${r.initule_projet}`
                      : "");

                  const montant =
                    r.montant_commande === null || r.montant_commande === undefined
                      ? ""
                      : String(r.montant_commande);

                  return (
                    <tr key={r.idcommande} className="text-sm">
                      <td className="px-4 py-2">{r.idcommande}</td>
                      <td className="px-4 py-2">{procLabel}</td>
                      <td className="px-4 py-2">{projLabel.trim() || ""}</td>
                      <td className="px-4 py-2">{r.libelle_commande ?? ""}</td>
                      <td className="px-4 py-2">{r.nature_commande ?? ""}</td>
                      <td className="px-4 py-2">{r.type_commande ?? ""}</td>
                      <td className="px-4 py-2">{montant}</td>
                      <td className="px-4 py-2">{r.nb_soumissions ?? 0}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button className={btnEdit} onClick={() => onEdit(r)}>
                            Modifier
                          </button>
                          <button
                            className={btnDelete}
                            onClick={() => onDelete(r)}
                            disabled={(r.nb_soumissions ?? 0) > 0}
                            title={
                              (r.nb_soumissions ?? 0) > 0
                                ? "Impossible de supprimer : des soumissions sont associées."
                                : undefined
                            }
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
        title="Supprimer la commande ?"
        message={`Supprimer la commande « ${confirmDel?.libelle_commande ?? ""} » ?`}
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
