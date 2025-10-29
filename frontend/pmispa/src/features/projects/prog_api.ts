// ---------- Programmations ----------

export type Programmation = {
  idprogrammation: number;
  idactivite: number | null;            // peut être NULL côté BD
  idexercice_budgetaire: number;
  // champs issus du JOIN (si l’API les renvoie)
  titre_act?: string | null;
  annee?: number | string | null;
};

export type ProgrammationInput = {
  idactivite: number | null;
  idexercice_budgetaire: number;
};

const PROG_BASE = `https://gestionprojet-api.onrender.com/api/v1/programmations`;

async function apiProg<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j && (j.detail || j.message)) || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function listProgrammations(): Promise<Programmation[]> {
  return apiProg<Programmation[]>(`${PROG_BASE}/`);
}

export function getProgrammation(idprogrammation: number): Promise<Programmation> {
  return apiProg<Programmation>(`${PROG_BASE}/${idprogrammation}`);
}

export function createProgrammation(payload: ProgrammationInput): Promise<Programmation> {
  return apiProg<Programmation>(`${PROG_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProgrammation(
  idprogrammation: number,
  payload: ProgrammationInput
): Promise<Programmation> {
  return apiProg<Programmation>(`${PROG_BASE}/${idprogrammation}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProgrammation(
  idprogrammation: number
): Promise<{ deleted: boolean; idprogrammation: number; reason?: string | null }> {
  return apiProg<{ deleted: boolean; idprogrammation: number; reason?: string | null }>(
    `${PROG_BASE}/${idprogrammation}`,
    { method: "DELETE" }
  );
}
