// src/api/projects.ts

export type Project = {
  idprojet: number;
  code_projet: string;
  intitule_projet: string | null;           // <-- forme normalisée (2 t)
  description_projet: string | null;
  date_demarrage_prevue: string | null;
  date_fin_prevue: string | null;
  date_demarrage_reelle: string | null;
  date_fin_reelle_projet: string | null;
  etat: string;
  budget_previsionnel: number;
  devise: string;
};

export type ProjectInput = Omit<Project, "idprojet">;

const BASE = "https://gestionprojet-api.onrender.com/api/v1/projets";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Normalise un objet projet quelle que soit la graphie utilisée par l’API. */
function normalizeProject(anyProj: any): Project {
  return {
    idprojet: Number(anyProj.idprojet),
    code_projet: anyProj.code_projet ?? "",
    // <--- tolère initule_projet (1 t) ET intitule_projet (2 t)
    intitule_projet:
      anyProj.intitule_projet ??
      anyProj.initule_projet ??
      null,
    description_projet: anyProj.description_projet ?? null,
    date_demarrage_prevue: anyProj.date_demarrage_prevue ?? null,
    date_fin_prevue: anyProj.date_fin_prevue ?? null,
    date_demarrage_reelle: anyProj.date_demarrage_reelle ?? null,
    date_fin_reelle_projet: anyProj.date_fin_reelle_projet ?? null,
    etat: anyProj.etat ?? "",
    budget_previsionnel: Number(anyProj.budget_previsionnel ?? 0),
    devise: anyProj.devise ?? "HTG",
  };
}

export const listProjects = async (): Promise<Project[]> => {
  const raw = await fetchJson<any[]>(BASE + "/");
  return raw.map(normalizeProject);
};

export const getProject = async (id: number): Promise<Project> => {
  const raw = await fetchJson<any>(`${BASE}/${id}`);
  return normalizeProject(raw);
};

export const createProject = async (data: ProjectInput): Promise<Project> => {
  const raw = await fetchJson<any>(BASE + "/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeProject(raw);
};

export const updateProject = async (
  id: number,
  data: ProjectInput
): Promise<Project> => {
  const raw = await fetchJson<any>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return normalizeProject(raw);
};

export const deleteProject = (id: number) =>
  fetchJson<{ deleted: boolean; idprojet?: number; reason?: string }>(
    `${BASE}/${id}`,
    { method: "DELETE" }
  );







  // --- ACTIVITÉS --------------------------------------------------------------
export type Activity = {
  idactivite: number;
  idprojet: number |string| null;
  titre_act: string;
  description_act: string | null;
  dateDemarragePrevue_act: string | null;
  dateFinPrevue_act: string | null;
};

export type ActivityInput = {
  idprojet: number |string| null;
  titre_act: string;
  description_act?: string | null;
  dateDemarragePrevue_act?: string | null;
  dateFinPrevue_act?: string | null;
};

export async function listActivities(): Promise<Activity[]> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/activites/`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("Erreur de chargement des activités.");
  return r.json();
}

export async function getActivity(idactivite: number): Promise<Activity> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/activites/${idactivite}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("Activité introuvable.");
  return r.json();
}

export async function createActivity(input: ActivityInput): Promise<Activity> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/activites/`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error("Échec de création de l’activité.");
  return r.json();
}

export async function updateActivity(idactivite: number, input: ActivityInput): Promise<Activity> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/activites/${idactivite}`, {
    method: "PUT",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error("Échec de mise à jour de l’activité.");
  return r.json();
}

export async function deleteActivity(idactivite: number): Promise<{ deleted: boolean; idactivite: number; reason?: string | null }> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/activites/${idactivite}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });
  if (!r.ok) {
    // Le backend renverra 200 + {deleted:false, reason} si blocage logique.
    throw new Error("Suppression refusée.");
  }
  return r.json();
}







// src/features/indicators/indicators_api.ts

export type Indicateur = {
  idindicateur: number;
  libelle_indicateur: string;
  niveau_base: number | string | null;
  niveau_cible: number | string | null;
  niveau_actuel: number | string | null;
};

export type IndicateurInput = {
  libelle_indicateur: string;
  niveau_base?: number | null;
  niveau_cible?: number | null;
  niveau_actuel?: number | null;
};

// helpers
async function j(r: Response) {
  if (!r.ok) throw new Error(await r.text() || r.statusText);
  return r.json();
}

export async function listIndicateurs(): Promise<Indicateur[]> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/indicateurs/`);
  return j(r);
}

export async function getIndicateur(id: number): Promise<Indicateur> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/indicateurs/${id}`);
  return j(r);
}

export async function createIndicateur(payload: IndicateurInput): Promise<Indicateur> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/indicateurs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return j(r);
}

export async function updateIndicateur(
  id: number,
  payload: IndicateurInput
): Promise<Indicateur> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/indicateurs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return j(r);
}

export async function deleteIndicateur(
  id: number
): Promise<{ deleted: boolean; idindicateur?: number; reason?: string | null }> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/indicateurs/${id}`, { method: "DELETE" });
  return j(r);
}







// ---------- Exercices budgétaires ----------

// Représente un enregistrement retourné par l'API
export type Exercice = {
  idexercice_budgetaire: number;
  annee: number | string;       // le backend peut renvoyer 2018 ou "2018"
  date_debut_exe: string;       // "YYYY-MM-DD"
  date_fin_exe: string;         // "YYYY-MM-DD"
  nb_programmations?: number;   // fourni par l'API pour l’info/suppression
};

// Payload d'entrée pour créer / mettre à jour
export type ExerciceInput = {
  annee: number;          // 4 chiffres (ex: 2025)
  date_debut_exe: string; // "YYYY-MM-DD"
  date_fin_exe: string;   // "YYYY-MM-DD"
};

// Réponse standard de suppression
export type DeleteExerciceResponse = {
  deleted: boolean;
  idexercice_budgetaire: number;
  reason?: string | null;
};

// Helpers (si tu les as déjà, réutilise les tiens)
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://gestionprojet-api.onrender.com${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.detail || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

// List
export function listExercices(): Promise<Exercice[]> {
  return api<Exercice[]>("/api/v1/exercices/");
}

// Create
export function createExercice(payload: ExerciceInput): Promise<Exercice> {
  return api<Exercice>("/api/v1/exercices/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update
export function updateExercice(
  idexercice_budgetaire: number,
  payload: ExerciceInput
): Promise<Exercice> {
  return api<Exercice>(`/api/v1/exercices/${idexercice_budgetaire}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Delete
export function deleteExercice(
  idexercice_budgetaire: number
): Promise<DeleteExerciceResponse> {
  return api<DeleteExerciceResponse>(`/api/v1/exercices/${idexercice_budgetaire}`, {
    method: "DELETE",
  });
}












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




// ---------- Soumissions (minimal pour le select) ----------
export type Soumission = {
  idsoumission: number;
  idcommande: number;
  date_soumission: string;      // "YYYY-MM-DD"
  statut_soumission: string | null;
};

export async function listSoumissions(): Promise<Soumission[]> {
  const r = await fetch(`https://gestionprojet-api.onrender.com/api/v1/soumissions/`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------- Personnels ----------
export type Personnel = {
  idpersonnel: number;
  idsoumission: number | null;
  nom_personnel: string;
  fonction_personnel: string | null;
  email_personnel: string | null;
  telephone_personnel: string | null;
  type_personnel: string | null;
};

export type PersonnelInput = {
  idsoumission?: number | null;
  nom_personnel: string;
  fonction_personnel?: string | null;
  email_personnel?: string | null;
  telephone_personnel?: string | null;
  type_personnel?: string | null;
};

const PERSONNEL_BASE = `https://gestionprojet-api.onrender.com/api/v1/personnels`;

async function apiPersonnel<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listPersonnels(): Promise<Personnel[]> {
  return apiPersonnel<Personnel[]>(`${PERSONNEL_BASE}/`);
}

export function getPersonnel(idpersonnel: number): Promise<Personnel> {
  return apiPersonnel<Personnel>(`${PERSONNEL_BASE}/${idpersonnel}`);
}

export function createPersonnel(payload: PersonnelInput): Promise<Personnel> {
  return apiPersonnel<Personnel>(`${PERSONNEL_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePersonnel(
  idpersonnel: number,
  payload: PersonnelInput
): Promise<Personnel> {
  return apiPersonnel<Personnel>(`${PERSONNEL_BASE}/${idpersonnel}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePersonnel(
  idpersonnel: number
): Promise<{ deleted: boolean; idpersonnel: number; reason?: string | null }> {
  return apiPersonnel<{ deleted: boolean; idpersonnel: number; reason?: string | null }>(
    `${PERSONNEL_BASE}/${idpersonnel}`,
    { method: "DELETE" }
  );
}









// ---------- Responsabilités ----------
export type Responsabilite = {
  idresponsabilites: number;
  idactivite: number | null;
  idpersonnel: number;
  date_debut_act: string | null; // "YYYY-MM-DD" | null
  date_fin_act: string | null;   // "YYYY-MM-DD" | null
  // fournis par le JOIN (backend) pour l'affichage
  titre_act?: string | null;
  nom_personnel?: string | null;
};

export type ResponsabiliteInput = {
  idactivite?: number | null;
  idpersonnel: number;
  date_debut_act?: string | null;
  date_fin_act?: string | null;
};

const RESP_BASE = `https://gestionprojet-api.onrender.com/api/v1/responsabilites`;

async function apiResp<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listResponsabilites(): Promise<Responsabilite[]> {
  return apiResp<Responsabilite[]>(`${RESP_BASE}/`);
}

export function getResponsabilite(id: number): Promise<Responsabilite> {
  return apiResp<Responsabilite>(`${RESP_BASE}/${id}`);
}

export function createResponsabilite(payload: ResponsabiliteInput): Promise<Responsabilite> {
  return apiResp<Responsabilite>(`${RESP_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResponsabilite(
  id: number,
  payload: ResponsabiliteInput
): Promise<Responsabilite> {
  return apiResp<Responsabilite>(`${RESP_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteResponsabilite(
  id: number
): Promise<{ deleted: boolean; idresponsabilites: number; reason?: string | null }> {
  return apiResp<{ deleted: boolean; idresponsabilites: number; reason?: string | null }>(
    `${RESP_BASE}/${id}`,
    { method: "DELETE" }
  );
}











// ---------- Contrats ----------
export type Contrat = {
  idcontrat: number;
  idpersonnel: number | null;
  date_signature: string | null;       // "YYYY-MM-DD" | null
  date_debut_contrat: string | null;   // "YYYY-MM-DD" | null
  date_fin_contrat: string | null;     // "YYYY-MM-DD" | null
  duree_contrat: number | null;
  montant_contrat: number | string | null; // la DB peut renvoyer "1234.00"
  // fournis par le JOIN pour l'affichage
  nom_personnel?: string | null;
};

export type ContratInput = {
  idpersonnel?: number | null;
  date_signature?: string | null;
  date_debut_contrat?: string | null;
  date_fin_contrat?: string | null;
  duree_contrat?: number | null;
  montant_contrat?: number | null;
};

const CONTRAT_BASE = `https://gestionprojet-api.onrender.com/api/v1/contrats`;

async function apiContrat<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listContrats(): Promise<Contrat[]> {
  return apiContrat<Contrat[]>(`${CONTRAT_BASE}/`);
}

export function getContrat(idcontrat: number): Promise<Contrat> {
  return apiContrat<Contrat>(`${CONTRAT_BASE}/${idcontrat}`);
}

export function createContrat(payload: ContratInput): Promise<Contrat> {
  return apiContrat<Contrat>(`${CONTRAT_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContrat(
  idcontrat: number,
  payload: ContratInput
): Promise<Contrat> {
  return apiContrat<Contrat>(`${CONTRAT_BASE}/${idcontrat}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteContrat(
  idcontrat: number
): Promise<{ deleted: boolean; idcontrat: number; reason?: string | null }> {
  return apiContrat<{ deleted: boolean; idcontrat: number; reason?: string | null }>(
    `${CONTRAT_BASE}/${idcontrat}`,
    { method: "DELETE" }
  );
}





// ---------- Procédures ----------
export type Procedure = {
  idprocedure: number;
  type_procedure: string;
  nb_commandes?: number; // fourni par l'API, utile pour empêcher la suppression côté UI
};

export type ProcedureInput = {
  type_procedure: string;
};

const PROC_BASE = `https://gestionprojet-api.onrender.com/api/v1/procedures`;

async function apiProc<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listProcedures(): Promise<Procedure[]> {
  return apiProc<Procedure[]>(`${PROC_BASE}/`);
}

export function getProcedure(idprocedure: number): Promise<Procedure> {
  return apiProc<Procedure>(`${PROC_BASE}/${idprocedure}`);
}

export function createProcedure(payload: ProcedureInput): Promise<Procedure> {
  return apiProc<Procedure>(`${PROC_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProcedure(
  idprocedure: number,
  payload: ProcedureInput
): Promise<Procedure> {
  return apiProc<Procedure>(`${PROC_BASE}/${idprocedure}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProcedure(
  idprocedure: number
): Promise<{ deleted: boolean; idprocedure: number; reason?: string | null }> {
  return apiProc<{ deleted: boolean; idprocedure: number; reason?: string | null }>(
    `${PROC_BASE}/${idprocedure}`,
    { method: "DELETE" }
  );
}







// ---------- Commandes ----------
export type Commande = {
  idcommande: number;
  idprocedure: number | null;
  idprojet: number | null;
  montant_commande: number | string; // peut revenir en string "1234.00"
  libelle_commande: string | null;
  nature_commande: string | null;
  type_commande: string | null;
  // confort (backend JOIN)
  type_procedure?: string | null;
  code_projet?: string | null;
  initule_projet?: string | null; // DB a "initule" (1 t)
  nb_soumissions?: number;
};

export type CommandeInput = {
  idprocedure?: number | null;
  idprojet?: number | null;
  montant_commande: number; // requis
  libelle_commande?: string | null;
  nature_commande?: string | null;
  type_commande?: string | null;
};

const COMMANDE_BASE = `https://gestionprojet-api.onrender.com/api/v1/commandes`;

async function apiCommande<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listCommandes(): Promise<Commande[]> {
  return apiCommande<Commande[]>(`${COMMANDE_BASE}/`);
}

export function getCommande(idcommande: number): Promise<Commande> {
  return apiCommande<Commande>(`${COMMANDE_BASE}/${idcommande}`);
}

export function createCommande(payload: CommandeInput): Promise<Commande> {
  return apiCommande<Commande>(`${COMMANDE_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCommande(
  idcommande: number,
  payload: CommandeInput
): Promise<Commande> {
  return apiCommande<Commande>(`${COMMANDE_BASE}/${idcommande}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCommande(
  idcommande: number
): Promise<{ deleted: boolean; idcommande: number; reason?: string | null }> {
  return apiCommande<{ deleted: boolean; idcommande: number; reason?: string | null }>(
    `${COMMANDE_BASE}/${idcommande}`,
    { method: "DELETE" }
  );
}





// ---------- Soumissionnaires ----------
export type Soumissionnaire = {
  idsoumissionnaire: number;
  nom_Soum: string;
  nif_soum: string | null;
  adresse_soum: string | null;
  telephone_soum: string | null;
  statut_soum: string | null;
  email_soum: string | null;
  nb_soumissions?: number; // fourni par l'API, pour bloquer la suppression
};

export type SoumissionnaireInput = {
  nom_Soum: string;
  nif_soum?: string | null;
  adresse_soum?: string | null;
  telephone_soum?: string | null;
  statut_soum?: string | null;
  email_soum?: string | null;
};

const SOUMISS_BASE = `https://gestionprojet-api.onrender.com/api/v1/soumissionnaires`;

async function apiSoum<T>(path: string, init?: RequestInit): Promise<T> {
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

export function listSoumissionnaires(): Promise<Soumissionnaire[]> {
  return apiSoum<Soumissionnaire[]>(`${SOUMISS_BASE}/`);
}

export function getSoumissionnaire(id: number): Promise<Soumissionnaire> {
  return apiSoum<Soumissionnaire>(`${SOUMISS_BASE}/${id}`);
}

export function createSoumissionnaire(payload: SoumissionnaireInput): Promise<Soumissionnaire> {
  return apiSoum<Soumissionnaire>(`${SOUMISS_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSoumissionnaire(
  id: number,
  payload: SoumissionnaireInput
): Promise<Soumissionnaire> {
  return apiSoum<Soumissionnaire>(`${SOUMISS_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSoumissionnaire(
  id: number
): Promise<{ deleted: boolean; idsoumissionnaire: number; reason?: string | null }> {
  return apiSoum<{ deleted: boolean; idsoumissionnaire: number; reason?: string | null }>(
    `${SOUMISS_BASE}/${id}`,
    { method: "DELETE" }
  );
}










