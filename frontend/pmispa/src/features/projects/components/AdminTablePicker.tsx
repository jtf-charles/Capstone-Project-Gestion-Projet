// src/features/admin/components/AdminTablePicker.tsx


export default function AdminTablePicker({
  tables,
  value,
  onChange,
}: {
  tables: { name: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Table à gérer
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border px-3 py-2"
      >
        <option value="">— Sélectionner —</option>
        {tables.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {!tables.length && (
        <p className="text-xs text-slate-500">
          (La liste sera alimentée par l’API dans la prochaine étape)
        </p>
      )}
    </div>
  );
}
