// src/features/events/components/EventDocsModal.tsx
import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchEventDocuments, type DocRow } from "../api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function getExtFromPath(path?: string | null) {
  if (!path) return "";
  const base = path.split("?")[0].split("#")[0];
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i) : "";
}

function buildDownloadName(doc: DocRow) {
  const ext = getExtFromPath(doc.chemin); // ex: ".pdf", ".docx"…
  if (!doc.titre_document) return (ext ? `document${ext}` : "document");
  // si le titre a déjà une extension, on garde tel quel
  const lower = doc.titre_document.toLowerCase();
  if (ext && lower.endsWith(ext.toLowerCase())) return doc.titre_document;
  // sinon on ajoute l’extension trouvée dans chemin
  return ext ? `${doc.titre_document}${ext}` : doc.titre_document;
}

export default function EventDocsModal({
  idevenement,
  open,
  onClose,
}: {
  idevenement: number;
  open: boolean;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [docs, setDocs] = React.useState<DocRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !idevenement) return;
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const rows = await fetchEventDocuments(idevenement, token?? undefined);
        if (!cancel) setDocs(rows || []);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement des documents");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, idevenement, token]);

  const handleOpen = (id: number) => {
    const url = `${API_BASE}/api/v1/documents/${id}/open`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async (doc: DocRow) => {
    try {
      const url = `${API_BASE}/api/v1/documents/${doc.iddocument}/download`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Téléchargement impossible");
      const blob = await res.blob();

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = buildDownloadName(doc); // <<— nom + extension correcte
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Échec du téléchargement");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Documents liés</h3>
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            Fermer
          </button>
        </div>

        {loading && <div className="text-sm text-slate-500">Chargement…</div>}
        {err && <div className="text-sm text-red-600">Erreur : {err}</div>}

        {!loading && !err && (
          <div className="space-y-3">
            {docs.map((d) => (
              <div key={d.iddocument} className="rounded border p-3">
                <div className="font-medium">{d.titre_document ?? d.chemin}</div>
                <div className="text-xs text-slate-500">Ajouté le {fmt(d.date_ajout)}</div>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => handleOpen(d.iddocument)}>
                    Ouvrir
                  </button>
                  <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => handleDownload(d)}>
                    Télécharger
                  </button>
                </div>
              </div>
            ))}
            {docs.length === 0 && <div className="text-sm text-slate-500">Aucun document.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}
