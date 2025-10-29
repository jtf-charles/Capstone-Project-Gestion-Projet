// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AppNavBar } from "./components/AppNavBar";
import HomePage from "./pages/HomePage";
import LoginPage from "./features/auth/pages/LoginPage";
import ProjectsPage from "./features/projects/pages/ProjectsPage";
import ProjectDetailPage from "./features/projects/pages/ProjectDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import RequireAuth from "./features/auth/RequireAuth";
import RequireGuest from "./features/auth/RequireGuest";   
import EvenementsPilotPage from "./features/projects/pages/EvenementsPilotPage";
import TransactionsPage from "./features/projects/pages/TransactionsPage";
import AdminDbPage from "./features/projects/pages/AdminDbPage";
import RequireRole from "./features/auth/RequireRole"; 
import { AppFooter } from "./components/AppFooter"; 
export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNavBar />
      <main className="flex-1 p-4">
        <Routes>
          {/* /login accessible uniquement si NON connecté */}
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          {/* Routes protégées */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projets" element={<ProjectsPage />} />
            <Route path="/projets/:id" element={<ProjectDetailPage />} />
            <Route path="/evenements" element={<EvenementsPilotPage />} />
           {'<Route path="/transactions" element={<TransactionsPage />} /> '}
            {'<Route path="/admin" element={<AdminDbPage />} />'}
            {/* ⬇️ Ces routes ne sont accessibles qu’aux admins */}
          <Route element={<RequireRole allowed={["admin"]} />}>
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/admin" element={<AdminDbPage />} />
          </Route>
          </Route>
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
      <AppFooter /> {/* affiché partout, y compris sur “Pilotage des événements” */}
    </div>
  );
}
