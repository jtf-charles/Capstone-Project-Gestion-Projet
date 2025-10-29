import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const link =
  "px-3 py-2 rounded-md text-sm font-medium text-slate-200 " +
  "hover:text-white hover:bg-white/10 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-white/40 transition";
const active = "bg-white/20 text-white";

export function AppNavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 text-slate-100 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center gap-4">
        <div className="font-semibold tracking-wide text-white">MARNDR || DIA</div>

        {user && (
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={({ isActive }) => `${link} ${isActive ? active : ""}`}>
              Accueil
            </NavLink>
            <NavLink to="/projets" className={({ isActive }) => `${link} ${isActive ? active : ""}`}>
              Projets
            </NavLink>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden sm:block text-slate-300">
                {user.username} · {user.role}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 rounded-md bg-white/10 text-slate-100 hover:bg-white/20"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="px-3 py-1 rounded-md bg-white/10 text-slate-100 hover:bg-white/20"
            >
              Connexion
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
