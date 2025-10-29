// src/ui/FKPicker.tsx
import * as React from "react";

type Column<T> = { key: keyof T | string; header: string; render?: (row: T) => React.ReactNode; w?: string };

type Props<T> = {
  open: boolean;
  title: string;
  load: () => Promise<T[]>;
  columns: Column<T>[];
  rowKey: (row: T) => React.Key;
  onPick: (row: T) => void;
  onClose: () => void;
};

export function FKPicker<T>({ open, title, load, columns, rowKey, onPick, onClose }: Props<T>) {
  const [rows, setRows] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    load().then(setRows).finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40">
      <div className="absolute inset-6 rounded-xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button className="rounded-md border px-3 py-1 text-sm" onClick={onClose}>Fermer</button>
        </div>
        <div className="overflow-auto grow">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm">
              <tr>
                {columns.map(c => (
                  <th key={String(c.key)} className="px-3 py-2 text-left whitespace-nowrap" style={{width: c.w}}>
                    {c.header}
                  </th>
                ))}
                <th className="px-3 py-2 text-left">OK</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-3 py-4 text-sm" colSpan={columns.length+1}>Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-4 text-sm" colSpan={columns.length+1}>Aucune donnée.</td></tr>
              ) : rows.map((r) => (
                <tr key={rowKey(r)} className="text-sm">
                  {columns.map(c => (
                    <td key={String(c.key)} className="px-3 py-2 whitespace-pre-wrap">
                      {c.render ? c.render(r) : (r as any)[c.key as any]}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                            onClick={() => { onPick(r); onClose(); }}>
                      OK
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
