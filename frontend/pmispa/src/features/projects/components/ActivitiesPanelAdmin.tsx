import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { btnDelete, btnEdit, btnGhost, btnSave } from "../../../ui/tokens";
import { ConfirmDialog } from "../../../ui/dialogs";
import { Toast, useToast } from "../../../ui/Toast";

const API_BASE = "https://gestionprojet-api.onrender.com";
const ACTIVITIES_URL = `${API_BASE}/api/v1/activites/`; // backend FR
const PROJECTS_URL   = `${API_BASE}/api/v1/projets/`;

type Project = {
  idprojet: number;
  code_projet: string;
  intitule_projet?: string | null;
};

type Activity = {
  idactivite: number;
  idprojet: number | null;
  titre_act: string;
  description_act?: string | null;
  dateDemarragePrevue_act?: string | null;
  dateFinPrevue_act?: string | null;
};

type ActivityInput = {
  idprojet: number | null;
  titre_act: string;
  description_act?: string | null;
  dateDemarragePrevue_act?: string | null;
  dateFinPrevue_act?: string | null;
};

export default function ActivitiesPanel() {
  const { token } = useAuth();
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<Activity[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // filtre
  const [filter, setFilter] = React.useState("");

  // formulaire
  const [form, setForm] = React.useState<ActivityInput>({
    idprojet: null,
    titre_act: "",
    description_act: "",
    dateDemarragePrevue_act: "",
    dateFinPrevue_act: "",
  });
  const [editId, setEditId] = React.useState<number | null>(null);

  // modale suppression
  const [confirmDel, setConfirmDel] = React.useState<number | null>(null);

  // map idprojet -> projet (clé normalisée)
  const projectById = React.useMemo(() => {
    const m = new Map<number, Project>();
    for (const p of projects) m.set(Number(p.idprojet), p);
    return m;
  }, [projects]);

  // -------- LOAD (sans dépendances qui bouclent) ----------
  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [rActs, rProjs] = await Promise.all([
        fetch(ACTIVITIES_URL, { headers }),
        fetch(PROJECTS_URL, { headers }),
      ]);

      if (!rActs.ok) throw new Error(`Activités: ${rActs.status} ${rActs.statusText}`);
      if (!rProjs.ok) throw new Error(`Projets: ${rProjs.status} ${rProjs.statusText}`);

      const acts = (await rActs.json()) as Activity[];
      const projs = (await rProjs.json()) as Project[];

      setRows(Array.isArray(acts) ? acts : []);
      setProjects(Array.isArray(projs) ? projs : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    load();
    // ne pas mettre de dépendances qui changent pendant load()
  }, [token]);

  // -------- CREATE / UPDATE ----------
  async function handleSave() {
    const payload: ActivityInput = {
      idprojet:
        form.idprojet === null || form.idprojet === undefined || form.idprojet === ("" as any)
          ? null
          : Number(form.idprojet),
      titre_act: (form.titre_act || "").trim(),
      description_act: (form.description_act || "").trim(),
      dateDemarragePrevue_act: (form.dateDemarragePrevue_act || "").trim(),
      dateFinPrevue_act: (form.dateFinPrevue_act || "").trim(),
    };

    if (!payload.titre_act) {
      show("Le titre est requis.", "error");
      return;
    }

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const url = editId ? `${ACTIVITIES_URL}${editId}` : ACTIVITIES_URL;
      const method = editId ? "PUT" : "POST";

      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) {
        const txt = await safeText(r);
        throw new Error(txt || "Échec de l’enregistrement");
      }

      setForm({
        idprojet: null,
        titre_act: "",
        description_act: "",
        dateDemarragePrevue_act: "",
        dateFinPrevue_act: "",
      });
      setEditId(null);
      await load();
      show(editId ? "Activité modifiée." : "Activité créée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de l’enregistrement", "error");
    }
  }

  // -------- DELETE ----------
  async function doDelete(id: number) {
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`${ACTIVITIES_URL}${id}`, { method: "DELETE", headers });

      // le backend renvoie { deleted, reason } → on respecte son message si refus
      const data = await r.json().catch(() => ({} as any));
      if (!r.ok || data?.deleted === false) {
        throw new Error(data?.reason || (await safeText(r)) || "Suppression impossible");
      }

      await load();
      show("Activité supprimée.", "success");
    } catch (e: any) {
      show(e?.message || "Erreur lors de la suppression", "error");
    }
  }

  // -------- affichage filtré ----------
  const display = rows.filter((a) => {
    const proj = a.idprojet != null ? projectById.get(Number(a.idprojet)) : undefined;
    const projLabel = proj ? `${proj.code_projet}${proj.intitule_projet ? ` — ${proj.intitule_projet}` : ""}` : "";
    const hay = [
      a.titre_act || "",
      a.description_act || "",
      projLabel,
      String(a.idactivite || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(filter.trim().toLowerCase());
  });

  // -------- rendu ----------
  return (
    <section className="rounded-xl border bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className="w-full max-w-xl rounded-md border px-3 py-2"
          placeholder="Filtrer par titre, description, code projet…"
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

      {/* Formulaire */}
      <div className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Projet</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.idprojet === null || form.idprojet === undefined ? "" : String(form.idprojet)}
              onChange={(e) =>
                setForm((f) => ({ ...f, idprojet: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">— choisir un projet —</option>
              {projects.map((p) => (
                <option key={p.idprojet} value={p.idprojet}>
                  {p.code_projet}{p.intitule_projet ? ` — ${p.intitule_projet}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.titre_act}
              onChange={(e) => setForm((f) => ({ ...f, titre_act: e.target.value }))}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.description_act ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description_act: e.target.value }))}
            />
          </div>

          <FieldDate
            label="Démarrage prévu"
            value={form.dateDemarragePrevue_act ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, dateDemarragePrevue_act: v }))}
          />
          <FieldDate
            label="Fin prévue"
            value={form.dateFinPrevue_act ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, dateFinPrevue_act: v }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnSave} onClick={handleSave}>
            {editId ? "Mettre à jour" : "Enregistrer"}
          </button>
          <button
            className={btnGhost}
            onClick={() => {
              setForm({
                idprojet: null,
                titre_act: "",
                description_act: "",
                dateDemarragePrevue_act: "",
                dateFinPrevue_act: "",
              });
              setEditId(null);
            }}
          >
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
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Projet</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Titre</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Période</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-3 py-3 text-slate-500">Chargement…</td></tr>
            )}
            {!loading && display.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-3 text-slate-500">Aucune activité.</td></tr>
            )}
            {!loading && display.map((a, idx) => {
              const proj = a.idprojet != null ? projectById.get(Number(a.idprojet)) : undefined;
              const projLabel = proj ? `${proj.code_projet}${proj.intitule_projet ? ` — ${proj.intitule_projet}` : ""}` : "—";
              return (
                <tr key={a.idactivite} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{idx + 1}</td>
                  <td className="px-3 py-2">{projLabel}</td>
                  <td className="px-3 py-2">{a.titre_act || "—"}</td>
                  <td className="px-3 py-2">
                    {(a.dateDemarragePrevue_act || "—")} {" → "} {(a.dateFinPrevue_act || "—")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={btnEdit}
                        onClick={() => {
                          setEditId(a.idactivite);
                          setForm({
                            idprojet: a.idprojet ?? null,
                            titre_act: a.titre_act ?? "",
                            description_act: a.description_act ?? "",
                            dateDemarragePrevue_act: a.dateDemarragePrevue_act ?? "",
                            dateFinPrevue_act: a.dateFinPrevue_act ?? "",
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Modifier
                      </button>
                      <button className={btnDelete} onClick={() => setConfirmDel(a.idactivite)}>
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
        open={confirmDel !== null}
        title="Supprimer l’activité ?"
        message="Supprimer cette activité ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!;
          setConfirmDel(null);
          doDelete(id);
        }}
      />

      <Toast toast={toast} onClose={hide} />
    </section>
  );
}

function FieldDate({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="date"
        className="w-full rounded-md border px-3 py-2"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

async function safeText(r: Response) {
  try { return await r.text(); } catch { return ""; }
}
