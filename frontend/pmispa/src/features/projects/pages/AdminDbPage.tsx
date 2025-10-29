import React from "react";
import { Link } from "react-router-dom";
import DepartmentsPanel from "../components/DepartmentsPanel";
import SitesPanel from "../components/SitesPanel";
import ProjectsPanel from "../components/ProjectPanelAdmin";
import CouverturesPanel from "../components/CouverturesPanel";
import ImplantationsPanel from "../components/ImplementationsPanel";
import ActivitiesPanel from "../components/ActivitiesPanelAdmin"; // ⬅️ nouveau
import IndicatorsPanel from "../components/IndicatorsPanel"; // ⬅️ nouveau
import SuivisPanel from "../components/SuivisPanel";
import ExercicesBudgetairesPanel from "../components/ExercicesBudgetairesPanel";
import ProgrammationsPanel from "../components/ProgrammationsPanel";
import PersonnelsAdminPanel from "../components/PersonnelsAdminPanel";
import ResponsabilitesPanel from "../components/ResponsabilitesPanel";
import ContratsPanel from "../components/ContratsPanel";
import ProceduresPanel from "../components/ProceduresPanel";
import CommandesAdminPanel from "../components/CommandesAdminPanel";
import SoumissionnairesAdminPanel from "../components/SoumissionnairesAdminPanel";
import SoumissionsPanel from "../components/SoumissionsPanel";
import TransactionsAdminPanel from "../components/TransactionsAdminPanel";
import DocumentsPanel from "../components/DocumentsPanel";
import EvenementsPanel from "../components/EvenementsPanel";




export default function AdminDbPage() {
  const [table, setTable] = React.useState<
    "departements" | "sites" | "implantations" | "couvertures" | "projets"
     | "activites"|"indicateurs"|"suivis"|"exercices budgetaires"|
     "programmations"|"personnels"|"responsabilites"|"contrats"|
     "procedures"|"commandes"| "soumissionnaires"|"soumissions"|"transactions"|"documents"|"evenements"
  >("departements");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <section className="rounded-xl border bg-white p-4 md:p-5">
        <div className="grid md:grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Table à gérer
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={table}
              onChange={(e) => setTable(e.target.value as any)}
            >
              <option value="departements">Départements</option>
              <option value="sites">Sites</option>
              <option value="implantations">Implantations</option>
              <option value="couvertures">Couvertures</option>
              <option value="projets">Projets</option>
              <option value="activites">Activités</option> {/* ⬅️ nouveau */}
              <option value="indicateurs">Indicateurs</option>
              <option value="suivis">Suivis</option>
              <option value="exercices budgetaires">Exercices Budgetaires</option>
              <option value="programmations"> Programmations</option>
              <option value="personnels">Personnels</option>
              <option value="responsabilites">Responsabilités</option>
              <option value="contrats">Contrats</option>
              <option value="procedures">Procédures</option>
              <option value="commandes">Commandes</option>
              <option value="soumissionnaires">Soumissionnaires</option>
              <option value="soumissions">Soumissions</option>
              <option value="transactions">Transactions</option>
              <option value="documents">Documents</option>
              <option value="evenements">Evenements</option>


            </select>
            <p className="mt-1 text-xs text-slate-500">
              Cette page propose une gestion CRUD par table.
            </p>
          </div>
          <Link to="/" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            Accueil
          </Link>
        </div>
      </section>

      {table === "departements" && <DepartmentsPanel />}
      {table === "sites" && <SitesPanel />}
      {table === "implantations" && <ImplantationsPanel />}
      {table === "couvertures" && <CouverturesPanel />}
      {table === "projets" && <ProjectsPanel />}
      {table === "activites" && <ActivitiesPanel />} {/* ⬅️ nouveau */}
      {table === "indicateurs" && <IndicatorsPanel />}{/* ⬅️ */}
      {table === "suivis" && <SuivisPanel />}{/* ⬅️ */}
      {table === "exercices budgetaires" && <ExercicesBudgetairesPanel />}{/* ⬅️ */}
      {table === "programmations" && <ProgrammationsPanel />}{/* ⬅️ */}
      {table === "personnels" && <PersonnelsAdminPanel />}
      {table === "responsabilites" && <ResponsabilitesPanel />}
      {table === "contrats" && <ContratsPanel />}
      {table === "procedures" && <ProceduresPanel />}
      {table === "commandes" && <CommandesAdminPanel />}
      {table === "soumissionnaires" && <SoumissionnairesAdminPanel />}
      {table === "soumissions" && <SoumissionsPanel />}
      {table === "transactions" && <TransactionsAdminPanel />}
      {table === "documents" && <DocumentsPanel />}
      {table === "evenements" && <EvenementsPanel />}
    </div>
  );
}
