// src/features/transactions/components/ProjectPicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchProjectsLite, type ProjectLite1 } from "../api";

export default function ProjectPicker({
  value,
  onChange,
  placeholder = "Choisir un projet…",
  compact = false,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<ProjectLite1[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const rows = await fetchProjectsLite(token);
        if (!cancel) setItems(rows || []);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement des projets");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const qq = q.toLowerCase();
    return items.filter(
      (p) =>
        p.code_projet.toLowerCase().includes(qq) ||
        (p.intitule_projet || "").toLowerCase().includes(qq)
    );
  }, [items, q]);

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="block text-sm font-medium text-slate-700">
          Projet
        </label>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="min-w-[18rem] rounded-lg border px-3 py-2"
          disabled={loading || !!err}
          title="Sélection rapide"
        >
          <option value="">{loading ? "Chargement…" : "— Sélectionner —"}</option>
          {filtered.map((p) => (
            <option key={p.idprojet} value={p.idprojet}>
              {p.code_projet} {p.intitule_projet ? `· ${p.intitule_projet}` : ""}
            </option>
          ))}
        </select>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
