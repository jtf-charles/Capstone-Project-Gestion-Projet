// src/features/projects/components/ProjectTable.tsx
import { Link } from "react-router-dom";
import type { Project } from "../api";

export function ProjectTable({ items }: { items: Project[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full divide-y">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Intitulé</th>
            <th className="px-4 py-3">Début prévu</th>
            <th className="px-4 py-3">État</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((p) => (
            <tr key={p.idprojet} className="odd:bg-white even:bg-slate-50/50">
              <td className="px-4 py-3 whitespace-nowrap">{p.code_projet}</td>
              <td className="px-4 py-3">{p.intitule_projet || "-"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{p.date_demarrage_prevue || "-"}</td>
              <td className="px-4 py-3">{p.etat || "-"}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/projets/${p.idprojet}`}
                  className="text-indigo-600 hover:underline"
                >
                  Ouvrir
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                Aucun projet trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
