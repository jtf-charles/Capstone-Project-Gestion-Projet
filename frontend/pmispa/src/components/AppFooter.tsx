// src/components/AppFooter.tsx
export function AppFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200/70 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-4 text-center text-sm text-slate-600">
        <span>© {new Date().getFullYear()} MARNDR — République d’Haïti · DIA</span>
        <span className="mx-2 text-slate-400">•</span>
        <span>
          Powered by{" "}
          <a
            href="https://www.linkedin.com/in/charles-joseph-tancrede-fils" // change si tu veux
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-800 hover:text-green-700 transition"
            title="Voir le profil"
          >
            Charles Joseph Tancrede Fils
          </a>
        </span>
      </div>
    </footer>
  );
}
