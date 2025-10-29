// src/features/projects/types.ts
export interface Project {
  idprojet: number;
  code_projet: string;
  initule_projet: string | null;
  description_projet: string | null;
  date_demarrage_prevue: string | null;  // ISO "YYYY-MM-DD"
  date_fin_prevue: string | null;
  date_demarrage_reelle: string | null;
  date_fin_reelle_projet: string | null;
  etat: string;
  budget_previsionnel: number;
  devise: string;
}
