// API client pour Evenement — chemins et sérialisation alignés sur le backend

const API ="https://gestionprojet-api.onrender.com";

// — types
export type Nullable<T> = T | null;

export type EvenementRow = {
  idevenement: number;
  idactivite: Nullable<number>;
  idcommande: Nullable<number>;
  idsoumissionnaire: Nullable<number>;
  idpersonnel: Nullable<number>;
  idtransaction: Nullable<number>;
  idprojet: Nullable<number>;
  type_evenement: string;
  date_evenement: Nullable<string>;
  date_prevue: Nullable<string>;
  description_evenement: Nullable<string>;
  statut_evenement: Nullable<string>;
  date_realisee: Nullable<string>;
  nb_documents: number;
};

export type EvenementInput = Omit<EvenementRow, "idevenement" | "nb_documents">;

// — helpers
async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    // renvoyer un message lisible
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j?.detail ? `${r.status} — ${j.detail}` : msg;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

// Backend normalise déjà 0/""/null → NULL, mais autant envoyer propre
function normId(v: any): number | null {
  if (v === undefined || v === null || v === "" || v === 0 || v === "0") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normDate(s?: string | null): string | null {
  return s && s.trim() ? s : null;
}
export function normalizePayload(p: Partial<EvenementInput>): EvenementInput {
  return {
    idactivite: normId(p.idactivite),
    idcommande: normId(p.idcommande),
    idsoumissionnaire: normId(p.idsoumissionnaire),
    idpersonnel: normId(p.idpersonnel),
    idtransaction: normId(p.idtransaction),
    idprojet: normId(p.idprojet),
    type_evenement: (p.type_evenement ?? "").trim(),
    date_evenement: normDate(p.date_evenement ?? null),
    date_prevue: normDate(p.date_prevue ?? null),
    description_evenement: p.description_evenement?.trim() || null,
    statut_evenement: p.statut_evenement?.trim() || null,
    date_realisee: normDate(p.date_realisee ?? null),
  };
}

// — endpoints
export function listEvenements() {
  return json<EvenementRow[]>(`${API}/api/v1/evenement/`);
}
export function getEvenement(id: number) {
  return json<EvenementRow>(`${API}/api/v1/evenement/${id}`);
}
export function createEvenement(payload: EvenementInput) {
  return json<EvenementRow>(`${API}/api/v1/evenement/`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}
export function updateEvenement(id: number, payload: EvenementInput) {
  return json<EvenementRow>(`${API}/api/v1/evenement/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}
export function deleteEvenement(id: number) {
  return json<{ deleted: boolean; reason?: string }>(`${API}/api/v1/evenement/${id}`, {
    method: "DELETE",
  });
}

// — petites fonctions d’étiquette pour l’affichage (déjà utilisées par ton panel)
async function fetchLabel(url: string, key: string, fmt?: (r: any) => string) {
  try {
    const r = await json<any>(url);
    if (fmt) return fmt(r);
    return r?.[key] ?? "-";
  } catch {
    return "-";
  }
}

export const labelActivite  = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/activites/${id}`, "titre_act") : Promise.resolve("-");
export const labelCommande  = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/commandes/${id}`, "libelle_commande") : Promise.resolve("-");
export const labelSoum      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/soumissionnaires/${id}`, "nom_Soum",
        r => `${r.nom_Soum}${r.nif_soum ? ` (${r.nif_soum})` : ""}`) : Promise.resolve("-");
export const labelPers      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/personnels/${id}`, "nom_personnel") : Promise.resolve("-");
export const labelProj      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/projets/${id}`, "code_projet") : Promise.resolve("-");
export const labelTxn       = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/transactions/${id}`, "idtransaction",
        r => [r.type_transaction, r.receveur_type, r.type_paiement, r.date_transaction, r.montant_transaction]
              .filter(Boolean).join(" · ")) : Promise.resolve("-");







// evenements_api.ts (compléter le fichier existant)
//const API = import.meta.env.VITE_API_BASE ?? "";

export type DocumentRow = {
  iddocument: number;
  titre_document?: string;
  type_document?: string;
  date_document?: string;
};

export type ArchiveRow = {
  idarchive: number;
  idevenement: number | null;
  iddocument: number | null;
  date_archive: string | null;
};

export async function listDocuments(): Promise<DocumentRow[]> {
  const r = await fetch(`${API}/api/v1/archive/documents`, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function listArchivesForEvent(idevenement: number): Promise<ArchiveRow[]> {
  const r = await fetch(`${API}/api/v1/archive/evenement/${idevenement}`, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function attachDocuments(idevenement: number, ids: number[]): Promise<ArchiveRow[]> {
  const r = await fetch(`${API}/api/v1/archive/evenement/${idevenement}/attach`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function deleteArchive(idarchive: number): Promise<void> {
  const r = await fetch(`${API}/api/v1/archive/${idarchive}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
