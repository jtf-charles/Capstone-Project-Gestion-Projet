// src/features/transactions/components/ProjectSearchBox.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchProjectsQuick, type QuickProject } from "../api";
import { useAuth } from "../../auth/AuthContext";

type Props = {
  value: number | null;                         // id du projet sélectionné
  onChange: (id: number | null) => void;        // renvoie l'id sélectionné
  placeholder?: string;
};

export default function ProjectSearchBox({ value, onChange, placeholder }: Props) {
  const { token } = useAuth();
  const [all, setAll] = useState<QuickProject[]>([]);
  const [q, setQ] = useState<string>("");

  // charge 1 seule fois
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const rows = await fetchProjectsQuick(token??undefined);
        if (!cancel) setAll(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancel) setAll([]);
      }
    })();
    return () => { cancel = true; };
  }, [token]);

  // petit filtre (insensible à la casse)
  const options = useMemo(() => {
    const src = all ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return src.slice(0, 50);
    return src.filter(p =>
      p.code_projet.toLowerCase().includes(s) ||
      (p.intitule ?? "").toLowerCase().includes(s)
    ).slice(0, 50);
  }, [all, q]);

  // lecture étiquette du projet sélectionné
  const selectedLabel = useMemo(() => {
    if (value == null) return "";
    const p = all.find(x => x.idprojet === value);
    return p ? `${p.code_projet}${p.intitule ? " — " + p.intitule : ""}` : "";
  }, [value, all]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}              // TOUJOURS une string
        className="w-full rounded-lg border px-3 py-2"
        placeholder={placeholder ?? "Chercher / choisir un projet..."}
        aria-label="Recherche projet"
      />
      {/* suggestions */}
      {q && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-white shadow">
          {options.map(p => (
            <button
              key={p.idprojet}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => {
                onChange(p.idprojet);
                setQ(""); // referme la liste
              }}
            >
              <div className="font-medium">{p.code_projet}</div>
              {p.intitule && <div className="text-sm text-slate-600">{p.intitule}</div>}
            </button>
          ))}
        </div>
      )}

      {/* affichage read-only du projet sélectionné */}
      {selectedLabel && !q && (
        <div className="mt-1 text-sm text-slate-600">
          Projet sélectionné : <span className="font-medium">{selectedLabel}</span>
        </div>
      )}
    </div>
  );
}
