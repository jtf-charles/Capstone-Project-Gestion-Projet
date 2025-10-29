//scr/features/auth/pages/LoginPage
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const schema = z.object({
  username: z.string().min(1, "Nom d’utilisateur obligatoire"),
  password: z.string().min(1, "Mot de passe obligatoire"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { loginAs } = useAuth();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from?.pathname || "/projets";

  // Submitters dédiés aux 2 rôles
  const onSubmitAs = (expectRole: "admin" | "regular") =>
    handleSubmit(async () => {
      setMsg(null);
      const { username, password } = getValues();
      try {
        await loginAs({ username, password, expectRole });
        setMsg({ type: "success", text: "Connexion réussie" });
        setTimeout(() => nav(from, { replace: true }), 400);
      } catch {
        setMsg({ type: "error", text: "Échec de connexion" });
      }
    })();

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">

        {/* --- PANNEAU MARQUE / LOGOS --- */}
        <aside className="relative bg-green-700 text-white p-8 flex flex-col items-center justify-center gap-6">
          {/* léger motif en fond */}
          <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_1px)] [background-size:12px_12px]" />
          <div className="relative z-10 w-full flex flex-col items-center gap-6">

            {/* Logos */}
            <div className="flex items-center gap-6">
              <img
                src="/logos/haitiDrapo.png"
                alt="Logo HAITI"
                className="w-28 h-28 object-contain rounded-md bg-white/90 p-1 shadow-md"
              />
              <img
                src="/logos/haiti.png"
                alt="Armoiries d’Haïti"
                className="w-28 h-28 object-contain rounded-md bg-white/90 p-1 shadow-md"
              />
            </div>

            {/* Texte institutionnel */}
            <div className="text-center max-w-md">
               <h2 className="text-lg font-semibold leading-snug">
                République d’Haïti
              </h2>
                <br></br>
              <h2 className="text-lg font-semibold leading-snug">
                Système de gestion des projets de l'administration publique
              </h2>
              <br></br>
              <h2 className="text-lg font-semibold leading-snug">
                Capstone project : Bootcamp Software Engineering AKADEMI
              </h2>
               <br></br>
              <p className="text-sm text-white/80 mt-2">
                Développé par: <br/><br/> Charles J. Tancrède Fils<br/><br/>Gédéon Freycinet
              </p>
            </div>
          </div>

          {/* bas de panneau */}
          <div className="relative z-10 mt-8 text-xs text-white/70">
            © {new Date().getFullYear()}— République d’Haïti
          </div>
        </aside>

        {/* --- FORMULAIRE --- */}
        <main className="p-8 md:p-10">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Connexion
          </h1>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Nom d’utilisateur
              </label>
              <input
                {...register("username")}
                placeholder="admin_user ou regular_user"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              {errors.username && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                {...register("password")}
                placeholder="admin2025 / user2025"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {msg && (
              <div
                className={
                  "text-sm px-3 py-2 rounded-md " +
                  (msg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200")
                }
              >
                {msg.text}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {/* IMPORTANT: type='button' pour ne pas déclencher submit HTML par défaut */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onSubmitAs("admin")}
                className="w-full rounded-lg bg-green-700 text-white py-2 font-medium hover:bg-green-800 disabled:opacity-60"
              >
                Connecter en tant que <b>admin</b>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onSubmitAs("regular")}
                className="w-full rounded-lg bg-gray-200 text-gray-900 py-2 font-medium hover:bg-gray-300 disabled:opacity-60"
              >
                Connecter en tant que <b>utilisateur régulier</b>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
