// src/features/projects/api.ts
// ==> IMPORTANT : import relatif (pas d’alias @)
import { apiFetch } from "../../lib/api";

const BASE = "/api/v1/projets";

/* ---------- Types ---------- */
export type Project = {
  idprojet: number;
  code_projet: string;
  intitule_projet: string | null;
  description_projet: string | null;
  date_demarrage_prevue: string | null;
  date_fin_prevue: string | null;
  date_demarrage_reelle: string | null;
  date_fin_reelle_projet: string | null;
  etat: string | null;
  budget_previsionnel: number | null;
  devise: string | null;
};

export type Department = {
  iddepartement: number;
  nom_departement: string;
  code_departement?: string | null;  // <-- tolérant
};

export type Activity = {
  idactivite: number;
  titre_act?: string | null;
  description_act?: string | null;
  dateDemarragePrevue_act?: string | null;
  dateFinPrevue_act?: string | null;
};

export type ListParams = {
  q?: string;
  year?: string | number;
  status?: "en_cours" | "cloture"; // optionnel, supporté côté API
  page?: number;                   // le backend accepte page -> skip = page*limit
  limit?: number;
  // compat : si jamais tu veux utiliser skip au lieu de page
  skip?: number;
};


// ----- Implantations (Zone d’implantation) -----
export type Implantation = {
  idsite: number;
  nom_site: string;
  iddepartement: number;
  nom_departement: string;
};

export type SuiviRow = {
  libelle_indicateur: string;
  niveau_base: number | null;
  niveau_cible: number | null;
  niveau_actuel: number | null;
  statut_indicateur: string; // 'Atteint' | 'Pas encore atteint'
};


export async function fetchActiviteSuivi(activiteId: number | string, token?: string) {
  return apiFetch<SuiviRow[]>(`/api/v1/projets/activites/${activiteId}/suivi`, { token });
}


// src/features/projects/api.ts
export interface PersonnelRow {
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  type?: string;
  date_signature?: string;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  duree_contrat?: number;
}

export async function fetchProjectPersonnels(idprojet: number, token: string): Promise<PersonnelRow[]> {
  const res = await fetch(`/api/v1/projets/${idprojet}/personnels`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Erreur chargement personnels");
  return res.json();
}



// --- NEW: commandes
export type CommandeRow = {
  idcommande: number;
  montant_commande?: number | null;
  libelle_commande?: string | null;
  nature_commande?: string | null;
  type_commande?: string | null;
  type_procedure?: string | null;
};

// util standard
async function json<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ... fonctions existantes (fetchProject, listProjectDepartements, etc.)

// --- NEW: commandes du projet
export async function fetchProjectCommandes(
  projectId: number,
  token?: string
): Promise<CommandeRow[]> {
  // adapte si ton routeur a un préfixe différent
  return json<CommandeRow[]>(`${BASE}/${projectId}/commandes`, token);
}


// src/features/projects/api.ts

// src/features/projects/api.ts

export type SoumissionnaireRow = {
  nom_soumissionnaire: string;
  nif: string | null;
  adresse: string | null;
  telephone: string | null;
  statut: string | null;
  email: string | null;
};

export async function fetchCommandeSoumissionnaires(
  commandeId: number,
  token?: string
): Promise<SoumissionnaireRow[]> {
  const r = await fetch(
    `/api/v1/projets/commandes/${commandeId}/soumissionnaires`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}


// --- Titulaires (soumissionnaires gagnants)
export type TitulaireRow = {
  nom_soumissionnaire: string;
  nif?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  statut?: string | null;
  email?: string | null;
  date_soumission?: string | null;
  statut_soumission?: string | null;
};

export async function fetchCommandeTitulaires(
  commandeId: number,
  token?: string
): Promise<TitulaireRow[]> {
  const res = await fetch(
    `/api/v1/projets/commandes/${commandeId}/titulaires`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );
  if (!res.ok) throw new Error("Erreur de chargement des titulaires");
  return await res.json();
}




// types
export type ResponsableRow = {
  nom_personnel: string;
  fonction?: string | null;
  email?: string | null;
  telephone?: string | null;
  type?: string | null;
  date_debut_act?: string | null;
  date_fin_act?: string | null;
  statut_duree: string;
};

// fetch
export async function fetchActiviteResponsables(
  activiteId: number,
  token?: string
): Promise<ResponsableRow[]> {
  const res = await fetch(`/api/v1/projets/activites/${activiteId}/responsables`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Erreur serveur lors du chargement des responsabilités");
  return res.json();
}

// ---- types
export type Exercice = {
  annee: number;
  date_debut_exe: string | null;
  date_fin_exe: string | null;
};

// ---- fetch
export async function fetchActiviteExercices(activiteId: number, token?: string) {
  const res = await fetch(`/api/v1/projets/activites/${activiteId}/exercices`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Erreur chargement exercices fiscaux");
  const data = (await res.json()) as Exercice[];
  return data;
}


export async function fetchActiviteImplantations(
  activiteId: number | string,
  token?: string
) {
  return apiFetch<Implantation[]>(
    `/api/v1/projets/activites/${activiteId}/implantations`,
    { token }
  );
}



/* ---------- Projets ---------- */
export async function listProjects(
  params: ListParams = {},
  token?: string
): Promise<Project[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.year != null) qs.set("year", String(params.year));
  if (params.status) qs.set("status", params.status);
  if (params.page != null) qs.set("page", String(params.page));
  else if (params.skip != null) qs.set("skip", String(params.skip));
  if (params.limit != null) qs.set("limit", String(params.limit));

  const url = qs.toString() ? `${BASE}?${qs.toString()}` : BASE;
  return apiFetch<Project[]>(url, { token });
}

export async function fetchProject(id: number | string, token?: string) {
  return apiFetch<Project>(`${BASE}/${id}`, { token });
}

/* ---------- Départements liés au projet ---------- */
export async function listProjectDepartements(
  projectId: number | string,
  token?: string
) {
  return apiFetch<Department[]>(`${BASE}/${projectId}/departements`, { token });
}


/* ---------- Activités liées (NOUVEAU) ---------- */
export async function fetchProjectActivites(
  projectId: number | string,
  token?: string
) {
 // si déjà défini en haut, ne pas dupliquer
  return apiFetch<Activity[]>(`${BASE}/${projectId}/activites`, { token });
}

//fetchProjectActivites
//listProjectActivites



/* ---------- Briques pour les autres onglets (placeholder compatibles) ---------- */
export type AnyRecord = Record<string, any>;
export type Site = AnyRecord;
export type Activite = AnyRecord;
export type Evenement = AnyRecord;

async function tryFetch<T>(url: string, token?: string): Promise<T | null> {
  try {
    const data = await apiFetch<T>(url, { token });
    
    if (Array.isArray(data) && data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchProjectSites(projectId: number | string, token?: string) {
  const candidates = [
    `/api/v1/sites?project_id=${projectId}`,
    `/api/v1/sites?projet_id=${projectId}`,
  ];
  for (const url of candidates) {
    const res = await tryFetch<Site[]>(url, token);
    if (res) return res;
  }
  return [] as Site[];
}

export async function listProjectActivites(projectId: number | string, token?: string) {
  const candidates = [
    `/api/v1/activites?project_id=${projectId}`,
    `/api/v1/activites?projet_id=${projectId}`,
  ];
  for (const url of candidates) {
    const res = await tryFetch<Activite[]>(url, token);
    if (res) return res;
  }
  return [] as Activite[];
}

export async function fetchProjectEvenements(projectId: number | string, token?: string) {
  const candidates = [
    `/api/v1/evenements?project_id=${projectId}`,
    `/api/v1/evenements?projet_id=${projectId}`,
  ];
  for (const url of candidates) {
    const res = await tryFetch<Evenement[]>(url, token);
    if (res) return res;
  }
  return [] as Evenement[];
}



// --- Liste "lite" pour la combo des événements (code + id) ---
// api.ts
export type ProjectLite = { idprojet: number; code_projet: string };

export async function listProjectsLite(token: string): Promise<ProjectLite[]> {
  const pageSize = 100;             // <= respecte la contrainte backend
  let skip = 0;
  const out: ProjectLite[] = [];

  while (true) {
    const res = await fetch(`/api/v1/projets?skip=${skip}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Erreur de chargement des projets (${res.status}) ${msg}`);
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items ?? []);
    out.push(
      ...items.map((p: any) => ({
        idprojet: p.idprojet ?? p.id ?? p.project_id,
        code_projet: p.code_projet,
      }))
    );

    if (items.length < pageSize) break; // plus de page
    skip += pageSize;
  }
  return out;
}



export type EventRow = {
  idevenement: number;
  type_evenement: string;
  date_evenement?: string | null;
  date_prevue?: string | null;
  description_evenement?: string | null;
  statut_evenement?: string | null;
  date_realisee?: string | null;
};

// GET /api/v1/projets/activites/{id}/evenements
export async function fetchActiviteEvenements(activiteId: number, token?: string): Promise<EventRow[]> {
  const res = await fetch(`/api/v1/projets/activites/${activiteId}/evenements`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Erreur de chargement des événements");
  }
  return await res.json();
}




// déjà présent : fetchActiviteEvenements(...)

export async function fetchProjetEvenements(
  projectId: number,
  token?: string | null
): Promise<EventRow[]> {
  const base = import.meta.env.VITE_API_BASE ?? "";
  const res = await fetch(`${base}/api/v1/projets/${projectId}/evenements`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Erreur de chargement des événements");
  return await res.json();
}






export type DocRow = {
  iddocument: number;
  titre_document: string;
  chemin: string;
  date_ajout: string;
  url: string;
};

export async function fetchEventDocuments(eid: number, token?: string): Promise<DocRow[]> {
  const res = await fetch(`/api/v1/evenements/${eid}/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Erreur de chargement des documents");
  return await res.json();
}






// src/features/events/api.ts (ajouts)

export type Personnel = {
  idpersonnel: number;
  nom_personnel?: string | null;
  fonction_personnel?: string | null;  // libellé à montrer à droite
};







// --- Types unifiés côté UI ---
export type PersonnelLite = {
  idpersonnel: number;   // ⬅️ il manquait ce champ
  nom_personnel: string;
  fonction?: string | null;
  email?: string | null;      // adapte les noms si c’est email1/email2 etc.
  telephone?: string | null;  // idem
  type?: string | null;
};


export async function fetchPersonnelEvenements(
  idpersonnel: number,
  token?: string
): Promise<EventRow[]> {
  const res = await fetch(`/api/v1/personnels/${idpersonnel}/evenements`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Erreur de chargement des événements");
  return res.json();
}

 
// ✅ Liste des personnels d’un projet (même style que fetchProjectActivites)
export async function fetchProjectPersonnelsLite(
  projectId: number | string,
  token?: string
) {
  return apiFetch<PersonnelLite[]>(`/api/v1/evenements/${projectId}/personnels`, { token });
}





// src/features/events/api.ts

export type CommandeLite = {
  idcommande: number;
  libelle: string;   // alias de libelle_commande
  nature: string;    // alias de nature_commande
};

// Liste des commandes d’un projet
export async function fetchProjectCommandesLite(projectId: number | string, token?: string) {
  return apiFetch<CommandeLite[]>(`/api/v1/evenements/${projectId}/commandes`, { token });
}

// Evénements par commande
export async function fetchCommandeEvenements(idcommande: number, token?: string) {
  return apiFetch<EventRow[]>(`/api/v1/commandes/${idcommande}/evenements`, { token });
}


// src/features/events/api.ts

export type SoumLite = {
  idsoumissionnaire: number;
  nom: string;   // alias de nom_soumissionnaire
  nif: string;   // alias de nif_soumissionnaire
};

export async function fetchProjectSoumissionnairesLite(projectId: number | string, token?: string) {
  return apiFetch<SoumLite[]>(`/api/v1/evenements/${projectId}/soumissionnaires`, { token });
}

export async function fetchSoumissionnaireEvenements(idsoumissionnaire: number, token?: string) {
  return apiFetch<EventRow[]>(`/api/v1/soumissionnaires/${idsoumissionnaire}/evenements`, { token });
}




// --- Événements liés à une transaction ---
export type TxEventRow = {
  idevenement: number;
  type_evenement: string;
  date_evenement?: string | null;
  date_prevue?: string | null;
  date_realisee?: string | null;
  description_evenement?: string | null;
  statut_evenement?: string | null;
};


export type Tx = {
  idtransaction: number;
};


export async function fetchTransactionEvenements(
  idtransaction: number,
  token?: string
): Promise<EventRow[]> {
  return apiFetch<EventRow[]>(
    `/api/v1/transactions/${idtransaction}/evenements`,
    { token }
  );
}











// src/features/transactions/api.ts

// src/features/transactions/api.ts

export type BaseTransactionRow = {
  idtransaction: number;
  date_transaction: string | null;
  type_transaction: string | null;
  commentaire: string | null;
  montant_transaction: number | null;
  devise: string;
  type_paiement: string | null;
  idpersonnel: number | null;
  idactivite: number | null;
};

// Quand scope = "personnel"
export type PersonnelTransactionRow = BaseTransactionRow & {
  nom_personnel: string;         // <- nouveau
  type_personnel: string | null; // <- nouveau
  
};

// Quand scope = "activite"
export type ActiviteTransactionRow = BaseTransactionRow & {
  titre_act: string;             // <- nouveau
};

export type Scope = "personnel" | "activite";
export type TransactionRow = PersonnelTransactionRow | ActiviteTransactionRow;

// src/features/auth/api.ts (ou l’endroit où est définie authHeaders)
export function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}


// (inchangé) si tu as déjà cette fonction ailleurs
export type ProjectLite1 = { idprojet: number; code_projet: string; intitule_projet?: string | null };

export async function fetchProjectsLite(token?: string): Promise<ProjectLite1[]> {
  const res = await fetch(`/api/v1/projets?skip=0&limit=100`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Erreur de chargement des projets");
  const data = await res.json();
  return (data || []).map((r: any) => ({
    idprojet: r.idprojet ?? r.id ?? 0,
    code: r.code_projet ?? r.code ?? "",
    // ta colonne DB s’appelle "initule_projet"
    titre: r.initule_projet ?? r.intitule_projet ?? null,
  }));
}

export async function fetchProjectTransactions(
  projectId: number,
  scope: Scope,
  token?: string
): Promise<TransactionRow[]> {
  const url = `/api/v1/projets/${projectId}/transactions?scope=${scope}`;
  const res = await fetch(url, { headers: { ...authHeaders(token) } });
  if (!res.ok) throw new Error("Erreur de chargement des transactions");
  return (await res.json()) as TransactionRow[];
}




// src/features/transactions/api.ts
// ou ton util utilitaire existant

export type QuickProject = {
  idprojet: number;
  code_projet: string;
  intitule?: string | null;
};

export async function fetchProjectsQuick(token?: string): Promise<QuickProject[]> {
  // 1) si tu as déjà un endpoint qui renvoie tous les projets avec code/id,
  // remplace l’URL ci-dessous par le tien. Sinon on réutilise /projets?skip=0&limit=100
  const rows = await apiFetch<any[]>(`/api/v1/projets?skip=0&limit=100`, { token });
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    idprojet: Number(r.idprojet),
    code_projet: String(r.code_projet ?? ""),
    intitule: r.initule_projet ?? r.intitule ?? null,
  }));
}
