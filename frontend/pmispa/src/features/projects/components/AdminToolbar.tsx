// src/features/admin/components/AdminToolbar.tsx
import React from "react";

export default function AdminToolbar({
  disabled,
  onCreate,
  onEdit,
  onDelete,
  onRefresh,
}: {
  disabled?: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-md border px-3 py-1.5 text-sm bg-emerald-600 text-white disabled:opacity-50"
        disabled={disabled}
        onClick={onCreate}
      >
        Insérer
      </button>
      <button
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        disabled={disabled}
        onClick={onEdit}
      >
        Modifier
      </button>
      <button
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        disabled={disabled}
        onClick={onDelete}
      >
        Supprimer
      </button>

      <div className="ml-auto">
        <button
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={onRefresh}
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
