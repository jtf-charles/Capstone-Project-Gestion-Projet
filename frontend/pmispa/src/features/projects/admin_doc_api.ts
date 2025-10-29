// API client ─ colle aux endpoints visibles dans ton Swagger
const API_BASE = "https://gestionprojet-api.onrender.com";

/* ---------------- Types (noms = BDD) ---------------- */
export type DocumentRow = {
  iddocument: number;
  chemin: string;
  date_ajout: string;                // "YYYY-MM-DD"
  titre_document: string;
  description_document: string | null;
  nb_archives?: number;              // renvoyé par l'API
};

export type DocumentInput = {
  chemin: string;
  date_ajout: string;                // "YYYY-MM-DD"
  titre_document: string;
  description_document?: string | null;
};

/* ---------------- Helpers fetch ---------------- */
async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j?.detail || j?.message) ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/* ---------------- REST (CRUD) ---------------- */
// NOTE: "Document" (D majuscule) d'après Swagger
const DOC_BASE = `${API_BASE}/api/v1/Document`;
const DOC_load = `${API_BASE}/api/v1/storage`;

export function listDocuments(): Promise<DocumentRow[]> {
  return jfetch<DocumentRow[]>(`${DOC_BASE}/`);
}

export function createDocument(payload: DocumentInput): Promise<DocumentRow> {
  return jfetch<DocumentRow>(`${DOC_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteDocument(id: number): Promise<{ deleted: boolean; iddocument: number; reason?: string | null }> {
  return jfetch<{ deleted: boolean; iddocument: number; reason?: string | null }>(
    `${DOC_BASE}/${id}`,
    { method: "DELETE" }
  );
}

/* ---------------- Actions utilitaires ---------------- */
// Ouvrir / Télécharger (endpoints en minuscules : /api/v1/document/…)
export const buildOpenURL = (id: number) => `${API_BASE}/api/v1/document/${id}/open`;
export const buildDownloadURL = (id: number) => `${API_BASE}/api/v1/document/${id}/download`;

/* ---------------- Upload binaire ---------------- */
// Swagger: POST /api/v1/Document/upload  (D majuscule)
export async function uploadBinary(file: File): Promise<{ rel: string; url: string; filename: string; size: number; mime_type: string }> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${DOC_load}/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j?.detail || j?.message) ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as any;
}
