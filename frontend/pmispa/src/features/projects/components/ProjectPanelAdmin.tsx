import React from "react";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
  type ProjectInput,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";

const ETATS = ["En cours", "Clôturé", "Suspendu"] as const;

type Mode = { type: "create" } | { type: "edit"; project: Project };

const emptyInput: ProjectInput = {
  code_projet: "",
  intitule_projet: "",
  description_projet: "",
  date_demarrage_prevue: "",
  date_fin_prevue: "",
  date_demarrage_reelle: "",
  date_fin_reelle_projet: "",
  etat: ETATS[0],
  budget_previsionnel: 0,
  devise: "HTG",
};

export default function ProjectsPanel() {
  const [items, setItems] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<ProjectInput>(emptyInput);
  const [message, setMessage] = React.useState<string | null>(null);

  // --- état pour la modale de suppression ---
  const [confirming, setConfirming] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  // ------------------------------------------

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setItems(data);
    } catch (e: any) {
      setMessage(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  function reset() {
    setMode({ type: "create" });
    setForm(emptyInput);
    setMessage(null);
  }

  function onEdit(p: Project) {
    setMode({ type: "edit", project: p });
    setForm({
      code_projet: p.code_projet ?? "",
      intitule_projet: p.intitule_projet ?? "",
      description_projet: p.description_projet ?? "",
      date_demarrage_prevue: p.date_demarrage_prevue ?? "",
      date_fin_prevue: p.date_fin_prevue ?? "",
      date_demarrage_reelle: p.date_demarrage_reelle ?? "",
      date_fin_reelle_projet: p.date_fin_reelle_projet ?? "",
      etat: p.etat ?? ETATS[0],
      budget_previsionnel: Number(p.budget_previsionnel ?? 0),
      devise: p.devise ?? "HTG",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const dup = items.find(
      p => p.code_projet.trim().toLowerCase() === form.code_projet.trim().toLowerCase()
        && (mode.type === "create" || p.idprojet !== mode.project.idprojet)
    );
    if (dup) {
      setMessage(`Un projet avec le code "${form.code_projet}" existe déjà.`);
      return;
    }

    const sanitize = (s: string | null | undefined) => (s || "").trim();

    const payload: ProjectInput = {
      ...form,
      date_demarrage_prevue: sanitize(form.date_demarrage_prevue),
      date_fin_prevue: sanitize(form.date_fin_prevue),
      date_demarrage_reelle: sanitize(form.date_demarrage_reelle),
      date_fin_reelle_projet: sanitize(form.date_fin_reelle_projet),
      budget_previsionnel: Number(form.budget_previsionnel || 0),
      devise: form.devise || "HTG",
    };

    try {
      if (mode.type === "create") {
        await createProject(payload);
        setMessage("Projet créé avec succès.");
      } else {
        await updateProject(mode.project.idprojet, payload);
        setMessage("Projet mis à jour.");
      }
      reset();
      await reload();
    } catch (e: any) {
      setMessage(e.message || "Échec de l’enregistrement.");
    }
  }

  // --- ouverture de la modale au clic sur “Supprimer” ---
  function askDelete(p: Project) {
    setMessage(null);
    setConfirming(p);
  }

  // --- exécution réelle de la suppression (même logique qu'avant) ---
  async function confirmDelete() {
    if (!confirming) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await deleteProject(confirming.idprojet);
      if (!res.deleted) {
        setMessage(res.reason || "Suppression refusée par le serveur.");
      } else {
        setMessage("Projet supprimé.");
        await reload();
      }
    } catch (e: any) {
      setMessage(e.message || "Impossible de supprimer ce projet.");
    } finally {
      setDeleting(false);
      setConfirming(null);
    }
  }
  // ---------------------------------------------------------------

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      [p.idprojet, p.code_projet, p.intitule_projet, p.description_projet]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, filter]);

  return (
    <div className="space-y-6">
      {/* Barre recherche */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filtrer par code, intitulé, description…
            </label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Rechercher…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              <button className={btnGhost} onClick={reload}>Actualiser</button>
            </div>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <h3 className="text-lg font-semibold mb-4">
          {mode.type === "create" ? "Créer un projet" : `Modifier : ${mode.project.code_projet}`}
        </h3>

        {message && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Code projet *</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.code_projet}
              onChange={e => setForm(f => ({ ...f, code_projet: e.target.value }))}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Intitulé</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.intitule_projet ?? ""}
              onChange={e => setForm(f => ({ ...f, intitule_projet: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.description_projet ?? ""}
              onChange={e => setForm(f => ({ ...f, description_projet: e.target.value }))}
            />
          </div>

          <FieldDate
            label="Démarrage prévu"
            value={form.date_demarrage_prevue ?? ""}
            onChange={v => setForm(f => ({ ...f, date_demarrage_prevue: v }))}
          />
          <FieldDate
            label="Fin prévue"
            value={form.date_fin_prevue ?? ""}
            onChange={v => setForm(f => ({ ...f, date_fin_prevue: v }))}
          />

          <FieldDate
            label="Démarrage réel"
            value={form.date_demarrage_reelle ?? ""}
            onChange={v => setForm(f => ({ ...f, date_demarrage_reelle: v }))}
          />
          <FieldDate
            label="Fin réelle"
            value={form.date_fin_reelle_projet ?? ""}
            onChange={v => setForm(f => ({ ...f, date_fin_reelle_projet: v }))}
          />

          <div>
            <label className="block text-sm font-medium mb-1">État</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.etat}
              onChange={e => setForm(f => ({ ...f, etat: e.target.value }))}
            >
              {ETATS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Budget prévisionnel</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg border px-3 py-2"
                value={form.budget_previsionnel}
                onChange={e =>
                  setForm(f => ({ ...f, budget_previsionnel: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Devise</label>
              <input
                className="w-24 rounded-lg border px-3 py-2"
                value={form.devise}
                onChange={e => setForm(f => ({ ...f, devise: e.target.value }))}
              />
            </div>
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
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Intitulé</th>
                <th className="px-4 py-2">Budget</th>
                <th className="px-4 py-2">État</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Aucun projet.</td></tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.idprojet} className="text-sm">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{p.code_projet}</td>
                    <td className="px-4 py-2">{p.intitule_projet || "—"}</td>
                    <td className="px-4 py-2">
                      {new Intl.NumberFormat().format(Number(p.budget_previsionnel || 0))}{" "}
                      {p.devise || ""}
                    </td>
                    <td className="px-4 py-2">{p.etat}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className={btnEdit} onClick={() => onEdit(p)}>Modifier</button>
                        {/* OUVRIR LA MODALE ICI */}
                        <button className={btnDelete} onClick={() => askDelete(p)}>
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

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setConfirming(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-base font-semibold mb-2">
              Supprimer le projet ?
            </h4>
            <p className="text-sm text-slate-600 mb-5">
              Supprimer le projet <span className="font-medium">{confirming.code_projet}</span> ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className={btnGhost}
                onClick={() => setConfirming(null)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className={btnDelete}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldDate({
  label,
  value,
  onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="date"
        className="w-full rounded-lg border px-3 py-2"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
