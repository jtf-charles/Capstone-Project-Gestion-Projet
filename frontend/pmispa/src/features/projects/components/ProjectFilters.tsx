// src/features/projects/components/ProjectFilters.tsx
import React from "react";

type Props = {
  q: string;
  year: string;
  status: string; // "", "en_cours", "cloture"
  onChange: (next: Partial<{ q: string; year: string; status: string }>) => void;
  onReset: () => void;
};

export function ProjectFilters({ q, year, status, onChange, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[260px]">
        <label className="block text-sm text-gray-600 mb-1">Recherche</label>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Code projet…"
          value={q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Année de début</label>
        <input
          className="w-[180px] rounded border px-3 py-2"
          placeholder="ex. 2024"
          value={year}
          onChange={(e) => onChange({ year: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">État</label>
        <select
          className="w-[180px] rounded border px-3 py-2"
          value={status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">Tous</option>
          <option value="en_cours">En cours</option>
          <option value="cloture">Clôturé</option>
        </select>
      </div>

      <div>
        <button
          className="px-4 py-2 rounded border"
          onClick={onReset}
          type="button"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
