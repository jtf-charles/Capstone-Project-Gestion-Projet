// src/features/projects/document_api.ts
const API_BASE ="https://gestionprojet-api.onrender.com";

export type DocumentRow = {
  iddocument: number;
  chemin: string;
  date_ajout: string; // "YYYY-MM-DD"
  titre_document: string;
  description_document: string | null;
  nb_archives?: number; // confort pour bloquer la suppression
};

export type DocumentInput = {
  chemin: string;
  date_ajout: string; // "YYYY-MM-DD"
  titre_document: string;
  description_document?: string | null;
};

const BASE = `${API_BASE}/api/v1/Document`;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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

export function listDocuments(): Promise<DocumentRow[]> {
  return api<DocumentRow[]>(`${BASE}/`);
}

export function getDocument(id: number): Promise<DocumentRow> {
  return api<DocumentRow>(`${BASE}/${id}`);
}

export function createDocument(payload: DocumentInput): Promise<DocumentRow> {
  return api<DocumentRow>(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDocument(id: number, payload: DocumentInput): Promise<DocumentRow> {
  return api<DocumentRow>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDocument(
  id: number
): Promise<{ deleted: boolean; iddocument: number; reason?: string | null }> {
  return api<{ deleted: boolean; iddocument: number; reason?: string | null }>(
    `${BASE}/${id}`,
    { method: "DELETE" }
  );
}



/* ---------------- REST (CRUD) ---------------- */
// NOTE: "Document" (D majuscule) d'après Swagger
const DOC_load = `${API_BASE}/api/v1/storage`;









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