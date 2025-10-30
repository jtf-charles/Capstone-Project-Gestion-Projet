// src/features/projects/pages/ProjectsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ProjectFilters } from "../components/ProjectFilters";
import { ProjectTable } from "../components/ProjectTable";
import { listProjects } from "../api";
import type { Project } from "../api";

const PAGE_SIZE = 10;

export default function ProjectsPage() {
  const { token, user } = useAuth();
  const role = user?.role ?? "regular";
  const canCreate = role === "admin";

  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState(""); // "", "en_cours", "cloture"
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(
    () => ({ q, year: year ? Number(year) : undefined, status, page }),
    [q, year, status, page]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!token) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await listProjects(
          {
            q: query.q,
            year: query.year,
            page,
            limit: PAGE_SIZE,
            status: (status === "en_cours"|| status === "cloture" ? status : undefined),
          },
          token
        );
        if (!cancelled) {
          setItems(res);
          // si tu veux un vrai total côté API, on pourra l'ajouter; ici on prend la longueur reçue
          setTotal(res.length);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || "Erreur serveur lors de la recherche");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, token, page, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Projets</h1>

      <ProjectFilters
        q={q}
        year={year}
        status={status}
        onChange={(next) => {
          if (next.q !== undefined) setQ(next.q);
          if (next.year !== undefined) setYear(next.year);
          if (next.status !== undefined) setStatus(next.status);
          setPage(0);
        }}
        onReset={() => {
          setQ("");
          setYear("");
          setStatus("");
          setPage(0);
        }}
      />

      {loading && <div className="text-gray-500 text-sm">Chargement…</div>}
      {err && <div className="text-red-600 text-sm">Erreur: {err}</div>}

      <ProjectTable
        items={items}
        {...({ canCreate, onCreate: () => alert("Création projet (prochaine étape) !") } as any)}
        
      />

      <div className="flex items-center gap-2 justify-end">
        <button
          className="px-3 py-2 rounded border disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          type="button"
        >
          Précédent
        </button>

        <span className="text-sm text-gray-600">
          Page {page + 1} / {totalPages}
        </span>

        <button
          className="px-3 py-2 rounded border disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          type="button"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
