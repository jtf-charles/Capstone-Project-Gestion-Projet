// src/features/projects/components/DocumentsPanel.tsx
import React from "react";
import { btnDelete, btnSave } from "../../../ui/tokens";
import { Toast, useToast } from "../../../ui/Toast";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  uploadBinary,
  buildOpenURL,
  buildDownloadURL,
  type DocumentRow,
  // <-- on ajoute updateDocument
  updateDocument,
} from "../document_api";

/* ---- helpers téléchargement ---- */
function getExt(path?: string) {
  if (!path) return "";
  const clean = path.split("#")[0].split("?")[0];
  const i = clean.lastIndexOf(".");
  return i >= 0 ? clean.slice(i) : "";
}
function downloadName(d: DocumentRow) {
  const ext = getExt(d.chemin);
  const t = (d.titre_document || "").trim();
  if (!t) return ext ? `document${ext}` : "document";
  const low = t.toLowerCase();
  return ext && !low.endsWith(ext.toLowerCase()) ? `${t}${ext}` : t;
}

export default function DocumentsPanel() {
  const { toast, show, hide } = useToast();

  const [rows, setRows] = React.useState<DocumentRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  // état formulaire
  const [file, setFile] = React.useState<File | null>(null);
  const [titre, setTitre] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [dateAjout, setDateAjout] = React.useState("");

  // état édition
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingChemin, setEditingChemin] = React.useState<string>(""); // chemin existant quand on édite

  async function reload() {
    setLoading(true);
    try {
      const data = await listDocuments();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      show(e?.message || "Échec de chargement.", "error");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    reload();
  }, []);

  function resetForm() {
    setFile(null);
    setTitre("");
    setDesc("");
    setDateAjout("");
    setEditingId(null);
    setEditingChemin("");
    const el = document.getElementById("doc-file") as HTMLInputElement | null;
    if (el) el.value = "";
  }

  /* ----------------- Création / Mise à jour ----------------- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!dateAjout) return show("La date d’ajout est obligatoire.", "error");

    try {
      setLoading(true);

      // chemin à envoyer : si création => upload obligatoire,
      // si édition => upload seulement si un nouveau fichier est choisi.
      let cheminToSave = editingId ? editingChemin : "";
      if (file) {
        const up = await uploadBinary(file); // POST /api/v1/Document/upload
        cheminToSave = up.rel;
      } else if (!editingId) {
        return show("Sélectionne un fichier.", "error");
      }

      const payload = {
        chemin: cheminToSave,
        date_ajout: dateAjout,
        titre_document: titre.trim(),
        description_document: (desc || "").trim() || null,
      };

      if (editingId) {
        await updateDocument(editingId, payload);
        show("Document mis à jour.", "success");
      } else {
        await createDocument(payload);
        show("Document enregistré avec succès.", "success");
      }

      resetForm();
      await reload();
    } catch (e: any) {
      show(e?.message || "Échec de l’enregistrement.", "error");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------- Edition ----------------- */
  function onEdit(row: DocumentRow) {
    setEditingId(row.iddocument);
    setEditingChemin(row.chemin || "");
    setTitre(row.titre_document || "");
    setDesc(row.description_document || "");
    setDateAjout(row.date_ajout || "");
    setFile(null);
    const el = document.getElementById("doc-file") as HTMLInputElement | null;
    if (el) el.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancelEdit() {
    resetForm();
  }

  /* ----------------- Suppression ----------------- */
  async function onDelete(id: number) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const out = await deleteDocument(id);
      if (out.deleted === false) {
        show(out.reason || "Suppression refusée.", "error");
      } else {
        show("Document supprimé.", "success");
        if (editingId === id) resetForm(); // si on supprimait celui en cours d’édition
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Suppression impossible.", "error");
    }
  }

  /* ----------------- Ouvrir / Télécharger ----------------- */
  const handleOpen = (id: number) => window.open(buildOpenURL(id), "_blank", "noopener,noreferrer");
  const handleDownload = (d: DocumentRow) => {
    fetch(buildDownloadURL(d.iddocument), { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Téléchargement impossible");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = downloadName(d);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => show("Échec du téléchargement.", "error"));
  };

  const isEditing = editingId !== null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Gestion des documents</h2>

      {/* FORMULAIRE (création + édition) */}
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-4 md:p-5">
        {isEditing && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
            Modification du document <span className="font-semibold">#{editingId}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Titre *</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date d’ajout *</label>
          <input
            type="date"
            className="rounded-lg border px-3 py-2"
            value={dateAjout}
            onChange={(e) => setDateAjout(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {isEditing ? "Remplacer le fichier (facultatif)" : "Fichier *"}
          </label>
          <input
            id="doc-file"
            type="file"
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required={!isEditing}  // obligatoire uniquement en création
          />
          <p className="text-xs text-slate-500 mt-1">
            {isEditing
              ? <>Laisse vide pour conserver le fichier actuel (<code>{editingChemin || "—"}</code>).</>
              : <>Le fichier sera stocké puis son <code>chemin</code> relatif sera écrit en BDD.</>}
          </p>
        </div>

        <div className="flex gap-2">
          <button type="submit" className={btnSave} disabled={loading}>
            {loading ? (isEditing ? "Mise à jour…" : "Enregistrement…") : (isEditing ? "Mettre à jour" : "Enregistrer")}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* LISTE */}
      <section className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Titre</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Fichier</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={6}>Aucun document.</td></tr>
              ) : (
                rows
                  .slice()
                  .sort((a, b) => a.iddocument - b.iddocument)
                  .map((d) => (
                    <tr key={d.iddocument} className="text-sm">
                      <td className="px-4 py-2">{d.iddocument}</td>
                      <td className="px-4 py-2">{d.titre_document}</td>
                      <td className="px-4 py-2 whitespace-pre-wrap">{d.description_document ?? ""}</td>
                      <td className="px-4 py-2">{d.date_ajout}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => handleOpen(d.iddocument)}
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => handleDownload(d)}
                        >
                          Télécharger
                        </button>
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => onEdit(d)}
                        >
                          Modifier
                        </button>
                        <button className={btnDelete} onClick={() => onDelete(d.iddocument)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast toast={toast} onClose={hide} />
    </div>
  );
}
