// ---------- Soumissions ----------
export type Soumission = {
  idsoumission: number;
  idsoumissionnaire: number | null;  // <-- présent en BDD
  idcommande: number;                // <-- présent en BDD
  date_soumission: string;           // "YYYY-MM-DD"
  statut_soumission: string | null;

  // champs "confort" renvoyés par le JOIN côté backend (optionnels)
  nom_Soum?: string | null;          // libellé du soumissionnaire
  libelle_commande?: string | null;  // libellé de la commande
};

export type SoumissionInput = {
  idsoumissionnaire?: number | null;
  idcommande: number;
  date_soumission: string;           // "YYYY-MM-DD"
  statut_soumission?: string | null;
};
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const SOUM_BASE = `${API_BASE}/api/v1/soumissions`;

async function apiSoumission<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
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

export function listSoumissions(): Promise<Soumission[]> {
  return apiSoumission<Soumission[]>(`${SOUM_BASE}/`);
}

export function getSoumission(id: number): Promise<Soumission> {
  return apiSoumission<Soumission>(`${SOUM_BASE}/${id}`);
}

export function createSoumission(payload: SoumissionInput): Promise<Soumission> {
  return apiSoumission<Soumission>(`${SOUM_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSoumission(
  id: number,
  payload: SoumissionInput
): Promise<Soumission> {
  return apiSoumission<Soumission>(`${SOUM_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSoumission(
  id: number
): Promise<{ deleted: boolean; idsoumission: number; reason?: string | null }> {
  return apiSoumission<{ deleted: boolean; idsoumission: number; reason?: string | null }>(
    `${SOUM_BASE}/${id}`,
    { method: "DELETE" }
  );
}
