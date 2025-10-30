// src/features/projects/components/DepartmentsPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave } from "../../../ui/tokens";
import { ConfirmDialog, PromptDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Departement = {
  iddepartement: number;
  nom_departement?: string | null; // ⟵ robustesse : parfois l'API renvoie ce champ…
  departement?: string | null;     // ⟵ …et parfois celui-ci
};

const API_BASE = "https://gestionprojet-api.onrender.com";

// helpers d’affichage/filtrage sûrs
function norm(s: unknown): string {
  return (s ?? "").toString().trim().toLowerCase();
}
function labelOf(d: Departement): string {
  return ((d.nom_departement ?? d.departement) ?? "").toString();
}

export default function DepartmentsPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Departement[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState("");
  const [lib, setLib] = React.useState("");

  // Modales
  const [confirmDel, setConfirmDel] = React.useState<{ id: number; name: string } | null>(null);
  const [promptEdit, setPromptEdit] = React.useState<{ id: number; name: string } | null>(null);

  /* ---------- fetch list ---------- */
  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/v1/departements/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = (await r.json()) as Departement[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ⟵ filtrage robuste
  const display = React.useMemo(() => {
    const q = norm(filter);
    if (!q) return rows;
    return rows.filter((d) => norm(d.nom_departement ?? d.departement).includes(q));
  }, [rows, filter]);

  /* ---------- create ---------- */
  async function handleCreate() {
    const name = lib.trim();
    if (!name) return;
    try {
      const r = await fetch(`${API_BASE}/api/v1/departements/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ departement: name }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de l’enregistrement");
      }
      setLib("");
      await load();
      show("Département enregistré avec succès.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  /* ---------- delete ---------- */
  async function doDelete(id: number) {
    try {
      const r = await fetch(`${API_BASE}/api/v1/departements/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Suppression impossible");
      }
      await load();
      show("Département supprimé.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  /* ---------- update ---------- */
  async function doUpdate(id: number, newName: string) {
    const name = (newName || "").trim();
    if (!name) return;
    try {
      const r = await fetch(`${API_BASE}/api/v1/departements/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ departement: name }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de la modification");
      }
      await load();
      show("Département modifié.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la modification", "error");
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      {/* Ligne filtres + refresh */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xs rounded-md border px-3 py-2"
          placeholder="Filtrer…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className={btnGhost} onClick={load}>
          Actualiser
        </button>
      </div>

      {/* zone erreur éventuelle */}
      {err && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          Erreur : {err}
        </div>
      )}

      {/* Form ajouter */}
      <div className="mb-4 rounded-lg border p-3">
        <label className="block text-sm font-medium text-slate-700">Libellé</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            className="w-full flex-1 rounded-md border px-3 py-2"
            placeholder="ex. Ouest"
            value={lib}
            onChange={(e) => setLib(e.target.value)}
          />
          <button className={btnSave} onClick={handleCreate} disabled={!lib.trim()}>
            Enregistrer
          </button>
          <button className={btnGhost} onClick={() => setLib("")}>
            Réinitialiser
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Règles : le nom doit être unique (insensible à la casse). La suppression est
          interdite si le département est associé à une couverture projet.
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Département</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-slate-500">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && display.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-slate-500">
                  Aucune donnée.
                </td>
              </tr>
            )}
            {!loading &&
              display.map((d) => {
                const label = labelOf(d) || "—";
                return (
                  <tr key={d.iddepartement} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{d.iddepartement}</td>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={btnEdit}
                          onClick={() => setPromptEdit({ id: d.iddepartement, name: label })}
                        >
                          Modifier
                        </button>
                        <button
                          className={btnDelete}
                          onClick={() => setConfirmDel({ id: d.iddepartement, name: label })}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Dialogues */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer le département ?"
        message={`Supprimer ce département ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!.id;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      <PromptDialog
        open={!!promptEdit}
        title="Nouveau libellé"
        label="Nouveau libellé"
        initialValue={promptEdit?.name || ""}
        confirmText="Enregistrer"
        cancelText="Annuler"
        onCancel={() => setPromptEdit(null)}
        onConfirm={(val) => {
          const id = promptEdit!.id;
          setPromptEdit(null);
          doUpdate(id, val);
        }}
      />

      {/* Toast */}
      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

/* util */
async function safeText(r: Response) {
  try {
    const t = await r.text();
    return t;
  } catch {
    return "";
  }
}
