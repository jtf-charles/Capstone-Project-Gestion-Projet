// src/features/projects/components/ImplantationsPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

type Site = {
  idsite: number;
  iddepartement?: number | string | null;
  localite: string;
  departement?: string;
  nom_departement?: string;
  dept?: string;
};
type Activite = { idactivite: number; titre_act: string };
type Implantation = { idimplementation: number; idsite: number | null; idactivite: number | null };

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/* ---------- Dialog d’édition ---------- */
function EditImplDialog(props: {
  open: boolean;
  sites: Site[];
  activites: Activite[];
  value?: { idsite: number | null; idactivite: number | null };
  onCancel: () => void;
  onConfirm: (val: { idsite: number; idactivite: number }) => void;
}) {
  const { open, onCancel, onConfirm, sites, activites } = props;
  const [idsite, setIdsite] = React.useState<number | "">("");
  const [idactivite, setIdactivite] = React.useState<number | "">("");

  React.useEffect(() => {
    if (!open) return;
    setIdsite((props.value?.idsite ?? "") as any);
    setIdactivite((props.value?.idactivite ?? "") as any);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Modifier l’implantation</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={idsite}
              onChange={(e) => setIdsite((e.target.value ? Number(e.target.value) : "") as any)}
            >
              <option value="">— choisir un site —</option>
              {sites.map((s) => (
                <option key={s.idsite} value={s.idsite}>
                  {s.localite}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Activité</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={idactivite}
              onChange={(e) =>
                setIdactivite((e.target.value ? Number(e.target.value) : "") as any)
              }
            >
              <option value="">— choisir une activité —</option>
              {activites.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {a.titre_act}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className={btnGhost} onClick={onCancel}>
            Annuler
          </button>
          <button
            className={btnSave}
            onClick={() => {
              if (idsite && idactivite) onConfirm({ idsite, idactivite });
            }}
            disabled={!idsite || !idactivite}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Panneau Implantations ---------- */
export default function ImplantationsPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Implantation[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [acts, setActs] = React.useState<Activite[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState("");
  const [selSite, setSelSite] = React.useState<number | "">("");
  const [selAct, setSelAct] = React.useState<number | "">("");

  const [confirmDel, setConfirmDel] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<Implantation | null>(null);

  // maps utiles
  const siteMap = React.useMemo(() => {
    const m = new Map<number, Site>();
    sites.forEach((s) => m.set(Number(s.idsite), s));
    return m;
  }, [sites]);

  const actMap = React.useMemo(() => {
    const m = new Map<number, Activite>();
    acts.forEach((a) => m.set(Number(a.idactivite), a));
    return m;
  }, [acts]);

  async function loadAll() {
    try {
      setErr(null);
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [rImpl, rSites, rActs] = await Promise.all([
        fetch(`${API_BASE}/api/v1/implantations/`, { headers }),
        fetch(`${API_BASE}/api/v1/sites/`, { headers }),
        fetch(`${API_BASE}/api/v1/activites/`, { headers }),
      ]);

      if (!rImpl.ok || !rSites.ok || !rActs.ok) throw new Error("Chargement impossible");

      setRows((await rImpl.json()) as Implantation[]);
      setSites((await rSites.json()) as Site[]);
      setActs((await rActs.json()) as Activite[]);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    loadAll();
  }, [token]);

  const display = rows.filter((r) => {
    const s = r.idsite ? siteMap.get(r.idsite) : undefined;
    const a = r.idactivite ? actMap.get(r.idactivite) : undefined;
    const line = [r.idimplementation, s?.localite ?? "", a?.titre_act ?? ""]
      .join(" ")
      .toLowerCase();
    return line.includes(filter.trim().toLowerCase());
  });

  /* ---------- create ---------- */
  async function handleCreate() {
    if (!selSite || !selAct) return;

    const exists = rows.some(
      (r) => Number(r.idsite) === Number(selSite) && Number(r.idactivite) === Number(selAct)
    );
    if (exists) {
      show("Cette implantation (site + activité) existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/implantations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ idsite: Number(selSite), idactivite: Number(selAct) }),
      });
      if (!r.ok) throw new Error((await safeText(r)) || "Échec de l’enregistrement");

      setSelSite("");
      setSelAct("");
      await loadAll();
      show("Implantation enregistrée avec succès.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  /* ---------- delete ---------- */
  async function doDelete(id: number) {
    try {
      const r = await fetch(`${API_BASE}/api/v1/implantations/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error((await safeText(r)) || "Suppression impossible");
      await loadAll();
      show("Implantation supprimée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  /* ---------- update ---------- */
  async function doUpdate(id: number, payload: { idsite: number; idactivite: number }) {
    const exists = rows.some(
      (r) =>
        r.idimplementation !== id &&
        Number(r.idsite) === Number(payload.idsite) &&
        Number(r.idactivite) === Number(payload.idactivite)
    );
    if (exists) {
      show("Cette combinaison site + activité existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/implantations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          idsite: Number(payload.idsite),
          idactivite: Number(payload.idactivite),
        }),
      });
      if (!r.ok) throw new Error((await safeText(r)) || "Échec de la modification");
      await loadAll();
      show("Implantation modifiée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la modification", "error");
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xl rounded-md border px-3 py-2"
          placeholder="Filtrer par id, localité, activité…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className={btnGhost} onClick={loadAll}>
          Actualiser
        </button>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          Erreur : {err}
        </div>
      )}

      {/* Formulaire de création */}
      <div className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={selSite}
              onChange={(e) => setSelSite((e.target.value ? Number(e.target.value) : "") as any)}
            >
              <option value="">— choisir un site —</option>
              {sites.map((s) => (
                <option key={s.idsite} value={s.idsite}>
                  {s.localite}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Activité</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={selAct}
              onChange={(e) => setSelAct((e.target.value ? Number(e.target.value) : "") as any)}
            >
              <option value="">— choisir une activité —</option>
              {acts.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {a.titre_act}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Règle : une implantation (site + activité) ne peut pas être dupliquée.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnSave} onClick={handleCreate} disabled={!selSite || !selAct}>
            Enregistrer
          </button>
          <button
            className={btnGhost}
            onClick={() => {
              setSelSite("");
              setSelAct("");
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau : colonne Département supprimée */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Site</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Activité</th>
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
              display.map((r) => {
                const s = r.idsite ? siteMap.get(r.idsite) : undefined;
                const a = r.idactivite ? actMap.get(r.idactivite) : undefined;

                return (
                  <tr key={r.idimplementation} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{r.idimplementation}</td>
                    <td className="px-3 py-2">{s?.localite ?? "—"}</td>
                    <td className="px-3 py-2">{a?.titre_act ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className={btnEdit} onClick={() => setEditRow(r)}>
                          Modifier
                        </button>
                        <button className={btnDelete} onClick={() => setConfirmDel(r.idimplementation)}>
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
        open={confirmDel != null}
        title="Supprimer l’implantation ?"
        message="Supprimer cette implantation ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      <EditImplDialog
        open={!!editRow}
        sites={sites}
        activites={acts}
        value={
          editRow
            ? { idsite: editRow.idsite ?? null, idactivite: editRow.idactivite ?? null }
            : undefined
        }
        onCancel={() => setEditRow(null)}
        onConfirm={(val) => {
          const id = editRow!.idimplementation;
          setEditRow(null);
          doUpdate(id, val);
        }}
      />

      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

/* util */
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
