// src/features/projects/components/SuivisPanel.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/* ---- Types (noms = DB) ---- */
type Suivi = {
  idsuivi: number;
  idindicateur: number | null;
  idactivite: number | null;

  // champs enrichis renvoyés par l'API (facultatifs)
  libelle_indicateur?: string;
  titre_act?: string;
  code_projet?: string;
};

type Indicateur = {
  idindicateur: number;
  libelle_indicateur: string;
};

type Activite = {
  idactivite: number;
  idprojet: number | null;
  titre_act: string;
};

type Projet = {
  idprojet: number;
  code_projet: string;
  intitule_projet?: string | null;
};

export default function SuivisPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Suivi[]>([]);
  const [indicateurs, setIndicateurs] = React.useState<Indicateur[]>([]);
  const [activites, setActivites] = React.useState<Activite[]>([]);
  const [projets, setProjets] = React.useState<Projet[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");

  // form create
  const [indicSel, setIndicSel] = React.useState<number | "">("");
  const [actSel, setActSel] = React.useState<number | "">("");

  // modales
  const [confirmDel, setConfirmDel] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<Suivi | null>(null);

  /* ---- maps pour libellés ---- */
  const projCodeById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projets) m.set(p.idprojet, p.code_projet);
    return m;
  }, [projets]);

  const actLabelById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const a of activites) {
      const code = a.idprojet ? projCodeById.get(a.idprojet) ?? "—" : "—";
      m.set(a.idactivite, `${code} — ${a.titre_act}`);
    }
    return m;
  }, [activites, projCodeById]);

  const indicLabelById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const i of indicateurs) m.set(i.idindicateur, i.libelle_indicateur);
    return m;
  }, [indicateurs]);

  /* ---- chargement ---- */
  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [rList, rInd, rAct, rProj] = await Promise.all([
        fetch(`${API_BASE}/api/v1/suivis/`, { headers }),
        fetch(`${API_BASE}/api/v1/indicateurs/`, { headers }),
        fetch(`${API_BASE}/api/v1/activites/`, { headers }),
        fetch(`${API_BASE}/api/v1/projets/`, { headers }),
      ]);

      if (!rList.ok) throw new Error(`Suivis: ${rList.status} ${rList.statusText}`);
      if (!rInd.ok) throw new Error(`Indicateurs: ${rInd.status} ${rInd.statusText}`);
      if (!rAct.ok) throw new Error(`Activités: ${rAct.status} ${rAct.statusText}`);
      if (!rProj.ok) throw new Error(`Projets: ${rProj.status} ${rProj.statusText}`);

      setRows((await rList.json()) as Suivi[]);
      setIndicateurs((await rInd.json()) as Indicateur[]);
      setActivites((await rAct.json()) as Activite[]);
      setProjets((await rProj.json()) as Projet[]);
    } catch (e: any) {
      setErr(e?.message || "Erreur au chargement");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    load();
  }, [token]);

  /* ---- filtrage ---- */
  const display = rows.filter((r) => {
    const idtxt = String(r.idsuivi ?? "");
    const li = r.libelle_indicateur ?? (r.idindicateur ? indicLabelById.get(r.idindicateur) : "") ?? "";
    const ta = r.titre_act ?? (r.idactivite ? actLabelById.get(r.idactivite) : "") ?? "";
    const cp = r.code_projet ?? "";
    const hay = `${idtxt} ${li} ${ta} ${cp}`.toLowerCase();
    return hay.includes(filter.trim().toLowerCase());
  });

  /* ---- create ---- */
  async function handleCreate() {
    const idindicateur = typeof indicSel === "number" ? indicSel : null;
    const idactivite = typeof actSel === "number" ? actSel : null;

    if (!idindicateur || !idactivite) {
      show("Veuillez choisir un indicateur et une activité.", "error");
      return;
    }

    // anti-doublon client
    const dup = rows.some((r) => r.idindicateur === idindicateur && r.idactivite === idactivite);
    if (dup) {
      show("Ce suivi (indicateur + activité) existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/suivis/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ idindicateur, idactivite }), // NOMS STRICTEMENT DB
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de l’enregistrement");
      }
      setIndicSel("");
      setActSel("");
      await load();
      show("Suivi enregistré.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  /* ---- delete ---- */
  async function doDelete(idsuivi: number) {
    try {
      const r = await fetch(`${API_BASE}/api/v1/suivis/${idsuivi}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Suppression impossible");
      }
      await load();
      show("Suivi supprimé.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  /* ---- update ---- */
  async function doUpdate(idsuivi: number, idindicateur: number, idactivite: number) {
    // anti-doublon
    const dup = rows.some(
      (r) => r.idsuivi !== idsuivi && r.idindicateur === idindicateur && r.idactivite === idactivite
    );
    if (dup) {
      show("Un suivi avec cet indicateur et cette activité existe déjà.", "error");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/v1/suivis/${idsuivi}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ idindicateur, idactivite }), // NOMS STRICTEMENT DB
      });
      if (!r.ok) {
        const t = await safeText(r);
        throw new Error(t || "Échec de la modification");
      }
      setEditRow(null);
      await load();
      show("Suivi modifié.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la modification", "error");
    }
  }

  /* ---- rendu ---- */
  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xl rounded-md border px-3 py-2"
          placeholder="Filtrer par #, indicateur, activité, code projet…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className={btnGhost} onClick={load}>Actualiser</button>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          Erreur : {err}
        </div>
      )}

      {/* Form create */}
      <div className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Indicateur</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={indicSel === "" ? "" : String(indicSel)}
              onChange={(e) => setIndicSel(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un indicateur —</option>
              {indicateurs.map((i) => (
                <option key={i.idindicateur} value={i.idindicateur}>
                  {i.libelle_indicateur}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Activité</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={actSel === "" ? "" : String(actSel)}
              onChange={(e) => setActSel(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir une activité —</option>
              {activites.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {actLabelById.get(a.idactivite)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnSave} onClick={handleCreate} disabled={indicSel === "" || actSel === ""}>
            Enregistrer
          </button>
          <button className={btnGhost} onClick={() => { setIndicSel(""); setActSel(""); }}>
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
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Indicateur</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Activité</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Code projet</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-3 py-3 text-slate-500">Chargement…</td></tr>
            )}
            {!loading && display.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-3 text-slate-500">Aucune donnée.</td></tr>
            )}
            {!loading && display.map((r) => {
              const li = r.libelle_indicateur ?? (r.idindicateur ? indicLabelById.get(r.idindicateur) : "") ?? "—";
              const act = r.titre_act ?? (r.idactivite ? actLabelById.get(r.idactivite) : "") ?? "—";
              const code = r.code_projet ??
                (r.idactivite
                  ? (() => {
                      const a = activites.find(x => x.idactivite === r.idactivite);
                      return a?.idprojet ? projCodeById.get(a.idprojet) ?? "—" : "—";
                    })()
                  : "—");

              return (
                <tr key={r.idsuivi} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{r.idsuivi}</td>
                  <td className="px-3 py-2">{li}</td>
                  <td className="px-3 py-2">{act}</td>
                  <td className="px-3 py-2">{code}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className={btnEdit} onClick={() => setEditRow(r)}>Modifier</button>
                      <button className={btnDelete} onClick={() => setConfirmDel(r.idsuivi)}>Supprimer</button>
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
        title="Supprimer le suivi ?"
        message="Confirmer la suppression de ce suivi (indicateur + activité) ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      <EditSuiviDialog
        open={!!editRow}
        indicateurs={indicateurs}
        activites={activites}
        actLabelById={actLabelById}
        initialIndicId={editRow?.idindicateur ?? undefined}
        initialActId={editRow?.idactivite ?? undefined}
        onCancel={() => setEditRow(null)}
        onConfirm={(idindicateur, idactivite) => {
          const id = editRow!.idsuivi;
          doUpdate(id, idindicateur, idactivite);
        }}
      />

      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

/* ---- Dialog d'édition ---- */
function EditSuiviDialog(props: {
  open: boolean;
  indicateurs: Indicateur[];
  activites: Activite[];
  actLabelById: Map<number, string>;
  initialIndicId?: number;
  initialActId?: number;
  onCancel: () => void;
  onConfirm: (idindicateur: number, idactivite: number) => void;
}) {
  const { open, indicateurs, activites, actLabelById, initialIndicId, initialActId, onCancel, onConfirm } = props;
  const [indic, setIndic] = React.useState<number | "">("");
  const [act, setAct] = React.useState<number | "">("");

  React.useEffect(() => {
    setIndic(typeof initialIndicId === "number" ? initialIndicId : "");
    setAct(typeof initialActId === "number" ? initialActId : "");
  }, [initialIndicId, initialActId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold">Modifier le suivi</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Indicateur</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={indic === "" ? "" : String(indic)}
              onChange={(e) => setIndic(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir un indicateur —</option>
              {indicateurs.map((i) => (
                <option key={i.idindicateur} value={i.idindicateur}>
                  {i.libelle_indicateur}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Activité</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={act === "" ? "" : String(act)}
              onChange={(e) => setAct(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— choisir une activité —</option>
              {activites.map((a) => (
                <option key={a.idactivite} value={a.idactivite}>
                  {actLabelById.get(a.idactivite)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className={btnGhost} onClick={onCancel}>Annuler</button>
          <button
            className={btnSave}
            disabled={indic === "" || act === ""}
            onClick={() => onConfirm(indic as number, act as number)}
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
