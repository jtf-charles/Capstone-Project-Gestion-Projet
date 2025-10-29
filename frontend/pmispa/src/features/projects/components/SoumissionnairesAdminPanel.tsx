import React from "react";
import {
  listSoumissionnaires,
  createSoumissionnaire,
  updateSoumissionnaire,
  deleteSoumissionnaire,
  type Soumissionnaire,
  type SoumissionnaireInput,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Soumissionnaire };

const empty: SoumissionnaireInput = {
  nom_Soum: "",
  nif_soum: null,
  adresse_soum: null,
  telephone_soum: null,
  statut_soum: null,
  email_soum: null,
};

function isEmailValid(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function SoumissionnairesPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Soumissionnaire[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<SoumissionnaireInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Soumissionnaire | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listSoumissionnaires();
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

  function onEdit(row: Soumissionnaire) {
    setMode({ type: "edit", row });
    setForm({
      nom_Soum: row.nom_Soum || "",
      nif_soum: row.nif_soum ?? null,
      adresse_soum: row.adresse_soum ?? null,
      telephone_soum: row.telephone_soum ?? null,
      statut_soum: row.statut_soum ?? null,
      email_soum: row.email_soum ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: SoumissionnaireInput): string | null {
    if (!p.nom_Soum || !p.nom_Soum.trim()) return "Le nom est obligatoire.";
    if (p.email_soum && !isEmailValid(p.email_soum)) return "L'email n’est pas valide.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: SoumissionnaireInput = {
        nom_Soum: (form.nom_Soum || "").trim(),
        nif_soum: (form.nif_soum ?? "") || null,
        adresse_soum: (form.adresse_soum ?? "") || null,
        telephone_soum: (form.telephone_soum ?? "") || null,
        statut_soum: (form.statut_soum ?? "") || null,
        email_soum: (form.email_soum ?? "") || null,
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createSoumissionnaire(payload);
        show("Soumissionnaire créé.", "success");
      } else {
        await updateSoumissionnaire(mode.row.idsoumissionnaire, payload);
        show("Soumissionnaire mis à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Soumissionnaire) {
    const n = Number(row.nb_soumissions ?? 0);
    if (n > 0) {
      show(
        "Suppression impossible : des soumissions sont associées à ce soumissionnaire.",
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
      const res = await deleteSoumissionnaire(row.idsoumissionnaire);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Soumissionnaire supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer ce soumissionnaire.", "error");
    }
  }

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idsoumissionnaire,
        r.nom_Soum ?? "",
        r.nif_soum ?? "",
        r.adresse_soum ?? "",
        r.telephone_soum ?? "",
        r.statut_soum ?? "",
        r.email_soum ?? "",
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
              Filtrer (nom, NIF, email, téléphone, statut, adresse)…
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
            ? "Créer un soumissionnaire"
            : `Modifier : ${mode.row.nom_Soum}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Nom */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.nom_Soum}
              onChange={(e) => setForm((f) => ({ ...f, nom_Soum: e.target.value }))}
              required
            />
          </div>

          {/* NIF */}
          <div>
            <label className="block text-sm font-medium mb-1">NIF</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.nif_soum ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nif_soum: e.target.value || null }))}
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.telephone_soum ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone_soum: e.target.value || null }))
              }
              placeholder="ex. +509 ..."
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2"
              value={form.email_soum ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, email_soum: e.target.value || null }))
              }
              placeholder="ex. contact@entreprise.ht"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium mb-1">Statut</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.statut_soum ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, statut_soum: e.target.value || null }))
              }
              placeholder="ex. actif, suspendu…"
            />
          </div>

          {/* Adresse */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.adresse_soum ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, adresse_soum: e.target.value || null }))
              }
              placeholder="Adresse complète"
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
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">NIF</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2">Soumissions liées</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={9}>Chargement…</td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={9}>Aucun soumissionnaire.</td>
                </tr>
              ) : (
                display.map((r) => (
                  <tr key={r.idsoumissionnaire} className="text-sm">
                    <td className="px-4 py-2">{r.idsoumissionnaire}</td>
                    <td className="px-4 py-2">{r.nom_Soum}</td>
                    <td className="px-4 py-2">{r.nif_soum ?? ""}</td>
                    <td className="px-4 py-2">{r.telephone_soum ?? ""}</td>
                    <td className="px-4 py-2">{r.email_soum ?? ""}</td>
                    <td className="px-4 py-2">{r.statut_soum ?? ""}</td>
                    <td className="px-4 py-2">{r.adresse_soum ?? ""}</td>
                    <td className="px-4 py-2">{r.nb_soumissions ?? 0}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className={btnEdit} onClick={() => onEdit(r)}>Modifier</button>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer le soumissionnaire ?"
        message={`Supprimer « ${confirmDel?.nom_Soum ?? ""} » ?`}
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
