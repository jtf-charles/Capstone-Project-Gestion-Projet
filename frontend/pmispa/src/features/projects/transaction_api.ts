// src/features/projects/transactions_api.ts
const API_BASE ="https://gestionprojet-api.onrender.com";

// ---------- Types ----------
export type Transaction = {
  idtransaction: number;
  idpersonnel: number | null;
  idactivite: number | null;
  montant_transaction: number | string; // backend peut renvoyer string
  type_transaction: string | null;
  receveur_type: string | null;
  type_paiement: string | null;
  date_transaction: string | null; // "YYYY-MM-DD"
  commentaire: string | null;
  devise: string | null;
  idprojet: number | null;

  // champs de confort (JOIN)
  nom_personnel?: string | null;
  titre_act?: string | null;
  code_projet?: string | null;
};

export type TransactionInput = {
  idpersonnel?: number | null;
  idactivite?: number | null;
  montant_transaction: number;
  type_transaction?: string | null;
  receveur_type?: string | null;
  type_paiement?: string | null;
  date_transaction?: string | null; // "YYYY-MM-DD"
  commentaire?: string | null;
  devise?: string | null;
  idprojet?: number | null;
};

const BASE = `${API_BASE}/api/v1/transactions`;

// helper
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

// ---------- CRUD ----------
export function listTransactions(): Promise<Transaction[]> {
  return api<Transaction[]>(`${BASE}/`);
}

export function getTransaction(idtransaction: number): Promise<Transaction> {
  return api<Transaction>(`${BASE}/${idtransaction}`);
}

export function createTransaction(payload: TransactionInput): Promise<Transaction> {
  return api<Transaction>(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTransaction(
  idtransaction: number,
  payload: TransactionInput
): Promise<Transaction> {
  return api<Transaction>(`${BASE}/${idtransaction}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTransaction(
  idtransaction: number
): Promise<{ deleted: boolean; idtransaction: number; reason?: string | null }> {
  return api<{ deleted: boolean; idtransaction: number; reason?: string | null }>(
    `${BASE}/${idtransaction}`,
    { method: "DELETE" }
  );
}
