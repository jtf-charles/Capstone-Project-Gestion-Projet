import React from "react";
import {
  listPersonnels,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  listSoumissions,
  type Personnel,
  type PersonnelInput,
  type Soumission,
} from "../admin_api";
import { btnSave, btnEdit, btnDelete, btnGhost } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Mode = { type: "create" } | { type: "edit"; row: Personnel };

const empty: PersonnelInput = {
  idsoumission: null,     // optionnel
  nom_personnel: "",
  fonction_personnel: null,
  email_personnel: null,
  telephone_personnel: null,
  type_personnel: null,
};

function isEmailValid(v: string) {
  // simple check (laisser la vraie validation côté backend si besoin)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function PersonnelsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Personnel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState<Mode>({ type: "create" });
  const [form, setForm] = React.useState<PersonnelInput>({ ...empty });
  const [confirmDel, setConfirmDel] = React.useState<Personnel | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [soums, setSoums] = React.useState<Soumission[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, s] = await Promise.all([listPersonnels(), listSoumissions()]);
      // tri soumissions par date décroissante
      const sSorted = [...s].sort(
        (a, b) => new Date(b.date_soumission).getTime() - new Date(a.date_soumission).getTime()
      );
      setSoums(sSorted);
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

  function onEdit(row: Personnel) {
    setMode({ type: "edit", row });
    setForm({
      idsoumission: row.idsoumission ?? null,
      nom_personnel: row.nom_personnel || "",
      fonction_personnel: row.fonction_personnel,
      email_personnel: row.email_personnel,
      telephone_personnel: row.telephone_personnel,
      type_personnel: row.type_personnel,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkPayload(p: PersonnelInput): string | null {
    if (!p.nom_personnel || !p.nom_personnel.trim()) {
      return "Le nom est obligatoire.";
    }
    if (p.email_personnel && !isEmailValid(p.email_personnel)) {
      return "L'email n’est pas valide.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: PersonnelInput = {
        idsoumission:
          form.idsoumission === undefined || form.idsoumission === null
            ? null
            : Number(form.idsoumission),
        nom_personnel: (form.nom_personnel || "").trim(),
        fonction_personnel: (form.fonction_personnel ?? "") || null,
        email_personnel: (form.email_personnel ?? "") || null,
        telephone_personnel: (form.telephone_personnel ?? "") || null,
        type_personnel: (form.type_personnel ?? "") || null,
      };

      const errMsg = checkPayload(payload);
      if (errMsg) {
        show(errMsg, "error");
        return;
      }

      if (mode.type === "create") {
        await createPersonnel(payload);
        show("Personnel créé.", "success");
      } else {
        await updatePersonnel(mode.row.idpersonnel, payload);
        show("Personnel mis à jour.", "success");
      }
      reset();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    }
  }

  function onDelete(row: Personnel) {
    setConfirmDel(row);
  }

  async function confirmDelete() {
    const row = confirmDel!;
    setConfirmDel(null);
    try {
      const res = await deletePersonnel(row.idpersonnel);
      if (!res.deleted) {
        show(res.reason || "Suppression refusée par le serveur.", "error");
      } else {
        show("Personnel supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Impossible de supprimer ce personnel.", "error");
    }
  }

  const soumById = React.useMemo(() => {
    const m: Record<number, Soumission> = {};
    for (const s of soums) m[s.idsoumission] = s;
    return m;
  }, [soums]);

  const display = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.idpersonnel,
        r.nom_personnel ?? "",
        r.fonction_personnel ?? "",
        r.email_personnel ?? "",
        r.telephone_personnel ?? "",
        r.type_personnel ?? "",
        r.idsoumission ?? "",
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
              Filtrer (nom, email, téléphone, fonction, type)…
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
            ? "Ajouter un personnel"
            : `Modifier : ${mode.row.nom_personnel}`}
        </h3>

        {err && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* idsoumission (optionnel) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Soumission (optionnelle)
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.idsoumission ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  idsoumission: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Sans soumission —</option>
              {soums.map((s) => (
                <option key={s.idsoumission} value={s.idsoumission}>
                  {s.date_soumission} — {s.statut_soumission ?? "en cours"}
                </option>
              ))}
            </select>
          </div>

          {/* nom_personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.nom_personnel}
              onChange={(e) =>
                setForm((f) => ({ ...f, nom_personnel: e.target.value }))
              }
              required
            />
          </div>

          {/* fonction_personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Fonction</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.fonction_personnel ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, fonction_personnel: e.target.value || null }))
              }
            />
          </div>

          {/* type_personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_personnel ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, type_personnel: e.target.value || null }))
              }
              placeholder="ex. Interne, Externe…"
            />
          </div>

          {/* email_personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2"
              value={form.email_personnel ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, email_personnel: e.target.value || null }))
              }
              placeholder="ex. nom@domaine.com"
            />
          </div>

          {/* telephone_personnel */}
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.telephone_personnel ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone_personnel: e.target.value || null }))
              }
              placeholder="ex. +509 ..."
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
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Fonction</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Soumission</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={8}>
                    Chargement…
                  </td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-sm" colSpan={8}>
                    Aucun personnel.
                  </td>
                </tr>
              ) : (
                display.map((r) => {
                  const s = r.idsoumission ? soumById[r.idsoumission] : null;
                  const soumLabel = s
                    ? `${s.date_soumission} — ${s.statut_soumission ?? "en cours"}`
                    : "—";

                  return (
                    <tr key={r.idpersonnel} className="text-sm">
                      <td className="px-4 py-2">{r.idpersonnel}</td>
                      <td className="px-4 py-2">{r.nom_personnel}</td>
                      <td className="px-4 py-2">{r.fonction_personnel ?? ""}</td>
                      <td className="px-4 py-2">{r.type_personnel ?? ""}</td>
                      <td className="px-4 py-2">{r.email_personnel ?? ""}</td>
                      <td className="px-4 py-2">{r.telephone_personnel ?? ""}</td>
                      <td className="px-4 py-2">{soumLabel}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button className={btnEdit} onClick={() => onEdit(r)}>
                            Modifier
                          </button>
                          <button className={btnDelete} onClick={() => onDelete(r)}>
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

      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer le personnel ?"
        message={`Supprimer ${confirmDel?.nom_personnel ?? ""} ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} onClose={hide} />
    </div>
  );
}
