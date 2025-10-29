// src/features/projects/components/SitesPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave, btnPrimary } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Departement = { iddepartement: number; departement: string };
type SiteRow = {
  idsite: number;
  iddepartement: number | null;
  localite: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// --- petite aide pour la comparaison insensible à la casse (et espaces) ---
const norm = (s: string) => s.trim().toLowerCase();

export default function SitesPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  // données
  const [deps, setDeps] = React.useState<Departement[]>([]);
  const [rows, setRows] = React.useState<SiteRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // filtres / création rapide
  const [filter, setFilter] = React.useState("");
  const [newDeptId, setNewDeptId] = React.useState<number | "">("");
  const [newLocalite, setNewLocalite] = React.useState("");

  // modales
  const [confirmDel, setConfirmDel] = React.useState<{ id: number; name: string } | null>(null);
  const [edit, setEdit] = React.useState<{
    id: number;
    iddepartement: number | null;
    localite: string;
  } | null>(null);

  // ---- fetch Departements + Sites ----
  async function loadDeps() {
    try {
      const r = await fetch(`${API_BASE}/api/v1/departements/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = (await r.json()) as Departement[];
      setDeps(data || []);
    } catch (e: any) {
      show(e?.message || "Erreur chargement départements", "error");
    }
  }

  async function loadSites() {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/v1/sites/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = (await r.json()) as SiteRow[];
      setRows(data || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadDeps();
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // index pour le rendu du nom du département
  const depById = React.useMemo(() => {
    const m = new Map<number, string>();
    deps.forEach((d) => m.set(d.iddepartement, d.departement));
    return m;
  }, [deps]);

  // affichage filtré
  const display = rows.filter((s) => {
    const dName = s.iddepartement ? depById.get(s.iddepartement) || "" : "";
    const bag = `${s.idsite} ${s.localite} ${dName}`;
    return norm(bag).includes(norm(filter));
  });

  // ---- CREATE ----
  async function handleCreate() {
    const name = newLocalite.trim();
    const depId = newDeptId === "" ? null : Number(newDeptId);

    if (!name) return;

    // block doublon côté UI (insensible à la casse)
    const exists = rows.some((r) => norm(r.localite) === norm(name));
    if (exists) {
      show("Cette localité existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/sites/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ iddepartement: depId, localite: name }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de l’enregistrement");
      }
      setNewLocalite("");
      setNewDeptId("");
      await loadSites();
      show("Site enregistré avec succès.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  // ---- DELETE ----
  async function doDelete(id: number) {
    try {
      const r = await fetch(`${API_BASE}/api/v1/sites/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Suppression impossible");
      }
      await loadSites();
      show("Site supprimé.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  // ---- UPDATE ----
  async function doUpdate(id: number, localite: string, iddepartement: number | null) {
    const name = (localite || "").trim();
    if (!name) return;

    // anti-doublon côté UI (on ignore la ligne courante)
    const exists = rows.some((r) => r.idsite !== id && norm(r.localite) === norm(name));
    if (exists) {
      show("Cette localité existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/sites/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ iddepartement, localite: name }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de la modification");
      }
      await loadSites();
      show("Site modifié.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la modification", "error");
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      {/* barre filtre + refresh */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xl rounded-md border px-3 py-2"
          placeholder="Filtrer par id, localité, département…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className={btnGhost} onClick={loadSites}>
          Actualiser
        </button>
      </div>

      {/* erreurs éventuelles */}
      {err && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          Erreur : {err}
        </div>
      )}

      {/* Création */}
      <div className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-[280px_1fr_auto_auto]">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={newDeptId}
              onChange={(e) =>
                setNewDeptId(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">— non défini —</option>
              {deps.map((d) => (
                <option key={d.iddepartement} value={d.iddepartement}>
                  {d.departement}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Localité</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="ex. Léogâne"
              value={newLocalite}
              onChange={(e) => setNewLocalite(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              className={btnSave}
              onClick={handleCreate}
              disabled={!newLocalite.trim()}
            >
              Enregistrer
            </button>
            <button
              className={btnGhost}
              onClick={() => {
                setNewLocalite("");
                setNewDeptId("");
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La suppression d’un site est refusée s’il est lié à une implantation.
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Département</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Localité</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-slate-500">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && display.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-slate-500">
                  Aucune donnée.
                </td>
              </tr>
            )}
            {!loading &&
              display.map((s) => (
                <tr key={s.idsite} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{s.idsite}</td>
                  <td className="px-3 py-2">
                    {s.iddepartement ? depById.get(s.iddepartement) || "—" : "—"}
                  </td>
                  <td className="px-3 py-2">{s.localite}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={btnEdit}
                        onClick={() =>
                          setEdit({
                            id: s.idsite,
                            iddepartement: s.iddepartement,
                            localite: s.localite,
                          })
                        }
                      >
                        Modifier
                      </button>
                      <button
                        className={btnDelete}
                        onClick={() => setConfirmDel({ id: s.idsite, name: s.localite })}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Dialog supprimer */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Supprimer le site ?"
        message="Supprimer ce site ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!.id;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      {/* Dialog modifier (département + localité) */}
      <EditSiteDialog
        open={!!edit}
        deps={deps}
        initial={edit ?? { id: 0, iddepartement: null, localite: "" }}
        onCancel={() => setEdit(null)}
        onSubmit={(payload) => {
          const { id, localite, iddepartement } = payload;
          setEdit(null);
          doUpdate(id, localite, iddepartement);
        }}
      />

      {/* Toast */}
      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

/** ---------- Dialog interne pour éditer un site ---------- */
function EditSiteDialog(props: {
  open: boolean;
  deps: Departement[];
  initial: { id: number; iddepartement: number | null; localite: string };
  onCancel: () => void;
  onSubmit: (p: { id: number; iddepartement: number | null; localite: string }) => void;
}) {
  const { open, deps, initial, onCancel, onSubmit } = props;
  const [localite, setLocalite] = React.useState(initial.localite);
  const [depId, setDepId] = React.useState<number | "">(initial.iddepartement ?? "");

  React.useEffect(() => {
    if (open) {
      setLocalite(initial.localite);
      setDepId(initial.iddepartement ?? "");
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">Nouveau libellé</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Département
            </label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={depId}
              onChange={(e) => setDepId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">— non défini —</option>
              {deps.map((d) => (
                <option key={d.iddepartement} value={d.iddepartement}>
                  {d.departement}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nouvelle localité
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={localite}
              onChange={(e) => setLocalite(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className={btnGhost} onClick={onCancel}>
            Annuler
          </button>
          <button
            className={btnPrimary}
            onClick={() =>
              onSubmit({
                id: initial.id,
                localite,
                iddepartement: depId === "" ? null : Number(depId),
              })
            }
            disabled={!localite.trim()}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
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
