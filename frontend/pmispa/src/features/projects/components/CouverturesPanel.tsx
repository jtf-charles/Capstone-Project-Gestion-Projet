// src/features/projects/components/CouverturesPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

const API_BASE = "https://gestionprojet-api.onrender.com";

/* --- types souples (accepte departement | nom_departement) --- */
type Departement = { iddepartement: number; departement?: string; nom_departement?: string };
type Projet = { idprojet: number; code_projet: string; intitule_projet?: string };

type Couverture = {
  idcouverture: number;
  iddepartement: number | null;
  idprojet: number | null;
  /* si l’API les renvoie déjà avec jointure : */
  nom_departement?: string;
  code_projet?: string;
  intitule_projet?: string;
};

export default function CouverturesPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Couverture[]>([]);
  const [departements, setDepartements] = React.useState<Departement[]>([]);
  const [projets, setProjets] = React.useState<Projet[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState("");

  // form “create”
  const [depSel, setDepSel] = React.useState<number | "">("");
  const [projSel, setProjSel] = React.useState<number | "">("");

  // modales
  const [confirmDel, setConfirmDel] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<Couverture | null>(null);

  /* ---- helpers noms ---- */
  const depNameById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const d of departements) {
      m.set(d.iddepartement, d.departement ?? d.nom_departement ?? `#${d.iddepartement}`);
    }
    return m;
  }, [departements]);

  const projLabelById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projets) {
      const title = p.intitule_projet ? ` — ${p.intitule_projet}` : "";
      m.set(p.idprojet, `${p.code_projet}${title}`);
    }
    return m;
  }, [projets]);

  /* ---- load ---- */
  async function load() {
    try {
      setErr(null);
      setLoading(true);

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [rList, rDeps, rProjs] = await Promise.all([
        fetch(`${API_BASE}/api/v1/couvertures/`, { headers }),
        fetch(`${API_BASE}/api/v1/departements/`, { headers }),
        fetch(`${API_BASE}/api/v1/projets/`, { headers }),
      ]);

      if (!rList.ok) throw new Error(`Couvertures: ${rList.status} ${rList.statusText}`);
      if (!rDeps.ok) throw new Error(`Départements: ${rDeps.status} ${rDeps.statusText}`);
      if (!rProjs.ok) throw new Error(`Projets: ${rProjs.status} ${rProjs.statusText}`);

      const data = (await rList.json()) as Couverture[];
      const deps = (await rDeps.json()) as Departement[];
      const prjs = (await rProjs.json()) as Projet[];

      setRows(Array.isArray(data) ? data : []);
      setDepartements(Array.isArray(deps) ? deps : []);
      setProjets(Array.isArray(prjs) ? prjs : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur au chargement");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    load();
  }, [token]);

  /* ---- filtrage affichage ---- */
  const display = rows.filter((r) => {
    const idtxt = String(r.idcouverture ?? "");
    const dn = r.nom_departement ?? (r.iddepartement ? depNameById.get(r.iddepartement) : "") ?? "";
    const pl =
      r.code_projet
        ? `${r.code_projet}${r.intitule_projet ? ` — ${r.intitule_projet}` : ""}`
        : r.idprojet
        ? projLabelById.get(r.idprojet) ?? ""
        : "";
    const hay = `${idtxt} ${dn} ${pl}`.toLowerCase();
    return hay.includes(filter.trim().toLowerCase());
  });

  /* ---- create ---- */
  async function handleCreate() {
    const iddep = typeof depSel === "number" ? depSel : null;
    const idprj = typeof projSel === "number" ? projSel : null;

    if (!iddep || !idprj) {
      show("Veuillez choisir un département et un projet.", "error");
      return;
    }

    // petite vérification côté client pour doublon (même couple dep+projet)
    const dup = rows.some((r) => r.iddepartement === iddep && r.idprojet === idprj);
    if (dup) {
      show("Cette couverture (département + projet) existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/couvertures/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ iddepartement: iddep, idprojet: idprj }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de l’enregistrement");
      }
      setDepSel("");
      setProjSel("");
      await load();
      show("Couverture enregistrée avec succès.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  /* ---- delete ---- */
  async function doDelete(id: number) {
    try {
      const r = await fetch(`${API_BASE}/api/v1/couvertures/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Suppression impossible");
      }
      await load();
      show("Couverture supprimée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  /* ---- update ---- */
  async function doUpdate(id: number, iddepartement: number, idprojet: number) {
    // check doublon
    const dup = rows.some(
      (r) => r.idcouverture !== id && r.iddepartement === iddepartement && r.idprojet === idprojet
    );
    if (dup) {
      show("Un enregistrement avec ce département et ce projet existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/couvertures/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ iddepartement, idprojet }),
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de la modification");
      }
      setEditRow(null);
      await load();
      show("Couverture modifiée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la modification", "error");
    }
  }

  /* ---- rendu ---- */
  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      {/* Filtres / refresh */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xl rounded-md border px-3 py-2"
          placeholder="Filtrer par id, département, projet…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className={btnGhost} onClick={load}>Actualiser</button>
      </div>

      {/* zone erreur */}
      {err && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          Erreur : {err}
        </div>
      )}

      {/* Form create */}
      <div className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={depSel === "" ? "" : String(depSel)}
              onChange={(e) => setDepSel(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un département —</option>
              {departements.map((d) => (
                <option key={d.iddepartement} value={d.iddepartement}>
                  {d.departement ?? d.nom_departement}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Projet</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={projSel === "" ? "" : String(projSel)}
              onChange={(e) => setProjSel(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un projet —</option>
              {projets.map((p) => (
                <option key={p.idprojet} value={p.idprojet}>
                  {p.code_projet}{p.intitule_projet ? ` — ${p.intitule_projet}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Règle : une couverture (département + projet) ne peut pas être dupliquée.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnSave} onClick={handleCreate} disabled={depSel === "" || projSel === ""}>
            Enregistrer
          </button>
          <button className={btnGhost} onClick={() => { setDepSel(""); setProjSel(""); }}>
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Département</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Projet</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-3 py-3 text-slate-500">Chargement…</td></tr>
            )}
            {!loading && display.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-3 text-slate-500">Aucune donnée.</td></tr>
            )}
            {!loading && display.map((r) => {
              const depLabel = r.nom_departement ?? (r.iddepartement ? depNameById.get(r.iddepartement) : "") ?? "—";
              const projLabel =
                r.code_projet
                  ? `${r.code_projet}${r.intitule_projet ? ` — ${r.intitule_projet}` : ""}`
                  : r.idprojet
                  ? projLabelById.get(r.idprojet) ?? "—"
                  : "—";
              return (
                <tr key={r.idcouverture} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{r.idcouverture}</td>
                  <td className="px-3 py-2">{depLabel}</td>
                  <td className="px-3 py-2">{projLabel}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className={btnEdit} onClick={() => setEditRow(r)}>Modifier</button>
                      <button className={btnDelete} onClick={() => setConfirmDel(r.idcouverture)}>Supprimer</button>
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
        open={confirmDel !== null}
        title="Supprimer la couverture ?"
        message="Supprimer cette couverture (département + projet) ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      <EditCouvertureDialog
        open={!!editRow}
        departements={departements}
        projets={projets}
        initialDepId={editRow?.iddepartement ?? undefined}
        initialProjId={editRow?.idprojet ?? undefined}
        onCancel={() => setEditRow(null)}
        onConfirm={(depId, projId) => {
          const id = editRow!.idcouverture;
          doUpdate(id, depId, projId);
        }}
      />

      {/* Toast */}
      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

/* --- petit composant d’édition avec 2 selects --- */
function EditCouvertureDialog(props: {
  open: boolean;
  departements: Departement[];
  projets: Projet[];
  initialDepId?: number;
  initialProjId?: number;
  onCancel: () => void;
  onConfirm: (iddepartement: number, idprojet: number) => void;
}) {
  const { open, departements, projets, initialDepId, initialProjId, onCancel, onConfirm } = props;
  const [dep, setDep] = React.useState<number | "">("");
  const [prj, setPrj] = React.useState<number | "">("");

  React.useEffect(() => {
    setDep(typeof initialDepId === "number" ? initialDepId : "");
    setPrj(typeof initialProjId === "number" ? initialProjId : "");
  }, [initialDepId, initialProjId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">Modifier la couverture</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={dep === "" ? "" : String(dep)}
              onChange={(e) => setDep(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un département —</option>
              {departements.map((d) => (
                <option key={d.iddepartement} value={d.iddepartement}>
                  {d.departement ?? d.nom_departement}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Projet</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={prj === "" ? "" : String(prj)}
              onChange={(e) => setPrj(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un projet —</option>
              {projets.map((p) => (
                <option key={p.idprojet} value={p.idprojet}>
                  {p.code_projet}{p.intitule_projet ? ` — ${p.intitule_projet}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className={btnGhost} onClick={onCancel}>Annuler</button>
          <button
            className={btnSave}
            disabled={dep === "" || prj === ""}
            onClick={() => onConfirm(dep as number, prj as number)}
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
  try { return await r.text(); } catch { return ""; }
}
