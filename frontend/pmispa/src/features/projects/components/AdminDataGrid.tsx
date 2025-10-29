// src/features/admin/components/AdminDataGrid.tsx


export default function AdminDataGrid({
  isEmpty,
  title,
}: {
  isEmpty: boolean;
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>

      {isEmpty ? (
        <div className="p-6 text-sm text-slate-500">
          Sélectionnez d’abord une table pour afficher ses données.
        </div>
      ) : (
        <div className="p-6 text-sm text-slate-500">
          (La grille de données apparaîtra ici une fois l’API branchée.)
        </div>
      )}
    </div>
  );
}
