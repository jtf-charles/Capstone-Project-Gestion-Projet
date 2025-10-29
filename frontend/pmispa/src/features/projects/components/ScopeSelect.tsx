
import type { Scope } from "../api";

export default function ScopeSelect({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (s: Scope) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Objet</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Scope)}
        className="rounded-full border px-4 py-2"
      >
        <option value="personnel">Personnel</option>
        <option value="activite">Activité</option>
      </select>
    </div>
  );
}
