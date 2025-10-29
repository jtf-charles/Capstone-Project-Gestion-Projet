// Palette centrale de styles de boutons (Tailwind)
// Utilisable partout pour garder la même sémantique/couleurs.

export const btnBase =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium " +
  "shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export const btnPrimary = `${btnBase} bg-green-600 text-white hover:bg-green-700 focus:ring-green-600`;   // Enregistrer / Valider
export const btnWarning = `${btnBase} bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500`;  // Modifier
export const btnDanger  = `${btnBase} bg-red-600 text-white hover:bg-red-700 focus:ring-red-600`;        // Supprimer
export const btnGhost   = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`; // Actions neutres
