// src/features/auth/RequireRole.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Role = "admin" | "regular";

export default function RequireRole({ allowed }: { allowed: Role[] }) {
  const { token, user } = useAuth();
  const location = useLocation();

  // non connecté → retourne au login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // connecté mais rôle non autorisé → affiche message d'interdiction
  if (!user || !allowed.includes(user.role)) {
    return <NoAccessPage />;
  }

  // OK → on rend la route protégée
  return <Outlet />;
}

/** Petite page inline d’accès refusé */
function NoAccessPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 rounded-xl border bg-white">
      <h1 className="text-xl font-semibold text-red-700">Accès refusé</h1>
      <p className="mt-2 text-slate-700">
        Vous n’avez pas les permissions nécessaires pour consulter cette page.
      </p>
      <p className="mt-2 text-slate-600">
        Contactez un administrateur si vous pensez qu’il s’agit d’une erreur.
      </p>
      <a
        href="/"
        className="inline-block mt-4 rounded-lg bg-green-700 text-white px-4 py-2 hover:bg-green-800"
      >
        Retour à l’accueil
      </a>
    </div>
  );
}
