// src/ui/tokens.ts
// Petites "design tokens" Tailwind pour nos boutons,
// afin d'avoir une seule source de vérité réutilisable partout.

export const btnBase =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium " +
  "shadow-sm ring-1 ring-inset transition disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2";

export const btnVariants = {
  save:
    "bg-emerald-600 text-white hover:bg-emerald-700 ring-emerald-700/10 focus:ring-emerald-700",
  edit:
    "bg-amber-500 text-white hover:bg-amber-600 ring-amber-600/10 focus:ring-amber-700",
  delete:
    "bg-rose-600 text-white hover:bg-rose-700 ring-rose-700/10 focus:ring-rose-700",
  ghost:
    "bg-white text-slate-700 hover:bg-slate-50 ring-slate-300 focus:ring-slate-400",
} as const;

// standard buttons to add on the interfaces of the project
export const btnSave = `${btnBase} ${btnVariants.save}`;
export const btnEdit = `${btnBase} ${btnVariants.edit}`;
export const btnDelete = `${btnBase} ${btnVariants.delete}`;
export const btnGhost = `${btnBase} ${btnVariants.ghost}`;
export const btnPrimary = btnSave;
