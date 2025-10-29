// src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { motion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  CalendarCheck2,
  HandCoins,
  ShieldCheck,
  FileText,
  BarChart3,
  LifeBuoy,
  ArrowUpRight,
  Lock,
} from "lucide-react";

type Tone = "green" | "indigo" | "amber" | "rose" | "slate";
type CardDef = {
  key: string;
  to: string | null;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: Tone;
  badge?: { text: string; tone: Tone };
  restrictedToAdmin?: boolean;
  coming?: string;
};

export default function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "regular";
  const isAdmin = role === "admin";

  // Animations (typage Variants + easing valide)
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.06 * i,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const cards: CardDef[] = [
    {
      key: "projets",
      to: "/projets",
      title: "Projets",
      desc:
        "Parcourez, filtrez par année et code, et ouvrez le détail de chaque projet.",
      badge: { text: "Principal", tone: "green" },
      icon: FolderKanban,
      tone: "green",
    },
    {
      key: "evenements",
      to: "/evenements",
      title: "Événements",
      desc:
        "Consulter les détails de toutes les opérations effectuées  et les documents qui y sont liés",
      icon: CalendarCheck2,
      tone: "indigo",
    },
    {
      key: "transactions",
      to: "/transactions",
      title: "Transactions financières",
      desc:
        "Suivre les transactions par projet, puis par objet (personnel, activité, etc.).",
      icon: HandCoins,
      tone: "amber",
      restrictedToAdmin: true,
    },
    {
      key: "admin",
      to: "/admin",
      title: "Espace Admin",
      desc:
        "Accéder aux interfaces d'insertion, de modification et de suppression de données",
      badge: { text: "Admin", tone: "rose" },
      icon: ShieldCheck,
      tone: "rose",
      restrictedToAdmin: true,
    },
    {
      key: "documents",
      to: null,
      title: "Documents",
      desc:
        "Espace documentaire (bientôt). Modèles, notes techniques et pièces jointes projet.",
      icon: FileText,
      tone: "slate",
      coming: "En préparation",
    },
    {
      key: "stats",
      to: null,
      title: "Statistiques",
      desc:
        "Indicateurs clés (en cours) : répartition par état, budget prévu, avancement, etc.",
      icon: BarChart3,
      tone: "slate",
      coming: "En préparation",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-8 space-y-10">
      {/* HERO */}
      <motion.section
        className="relative overflow-hidden rounded-3xl text-white"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* gradient principal */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-700 via-emerald-700 to-teal-600" />
        {/* motif en points */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:12px_12px]" />
        {/* halos décoratifs */}
        <div className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative z-10 grid gap-8 p-6 md:p-10 lg:p-12 md:grid-cols-[auto_1fr_auto] items-center">
          {/* Sous-titre PLEINE LARGEUR, plus imposant */}
          <motion.p
            className="col-span-full w-full text-center text-white/95 text-base md:text-lg lg:text-xl font-medium leading-relaxed tracking-wide"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
          >
            République d’Haïti · Ministère de l’Agriculture, des Ressources
            Naturelles et du Développement Rural
          </motion.p>

          {/* logos */}
          <motion.div
            className="flex items-center gap-5"
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
          >
            <motion.img
              src="/logos/marndr.jpg"
              alt="MARNDR"
              className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/90 p-1 shadow-lg"
              initial={{ y: 0 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 6 }}
            />
            <motion.img
              src="/logos/haiti.png"
              alt="Haïti"
              className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/90 p-1 shadow-lg"
              initial={{ y: 0 }}
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 6, delay: 0.5 }}
            />
          </motion.div>

          {/* Titre principal + texte */}
          <motion.div
            className="text-left"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
          >
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold mt-1 leading-tight">
              Direction des infrastructures agricoles
            </h1>
            <p className="text-white/80 mt-2">
              Bienvenue{user?.username ? `, ${user.username}` : ""} — rôle{" "}
              <span className="font-semibold">{role}</span>. Cette plateforme
              centralise les projets, le suivi et la documentation pour un
              pilotage fiable et efficace.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="flex md:flex-col gap-3 justify-end"
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
          >
            <Link
              to="/projets"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-green-800 font-medium px-4 py-2.5 hover:bg-white/90 shadow-md transition"
            >
              Accéder aux projets <ArrowUpRight size={18} />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Bandeau d’info — centré */}
      <motion.section
        className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-4 md:p-5 shadow-sm"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-emerald-900 font-medium flex items-center justify-center gap-2">
            <span>👋</span>
            <span>Bienvenue sur  la plateforme de gestion des projets à financement interne.</span>
          </p>
          <p className="text-emerald-900/80 mt-1">
            Les informations affichées dans l’interface sont synchronisées avec le back-office.
          </p>
        </div>
      </motion.section>

      {/* Grille de cartes — version teintée */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((c, i) => {
          // classes par tone (fixes pour Tailwind)
          const cardBg =
            c.tone === "green"  ? "bg-green-50"  :
            c.tone === "indigo" ? "bg-indigo-50" :
            c.tone === "amber"  ? "bg-amber-50"  :
            c.tone === "rose"   ? "bg-rose-50"   :
                                  "bg-white";

          const cardBorder =
            c.tone === "green"  ? "border-green-100"  :
            c.tone === "indigo" ? "border-indigo-100" :
            c.tone === "amber"  ? "border-amber-100"  :
            c.tone === "rose"   ? "border-rose-100"   :
                                  "border-slate-200/70";

          const iconWrap =
            c.tone === "green"  ? "bg-green-100 text-green-700"  :
            c.tone === "indigo" ? "bg-indigo-100 text-indigo-700" :
            c.tone === "amber"  ? "bg-amber-100 text-amber-700"  :
            c.tone === "rose"   ? "bg-rose-100 text-rose-700"   :
                                  "bg-slate-100 text-slate-700";

          const linkColor =
            c.tone === "green"  ? "text-green-700"  :
            c.tone === "indigo" ? "text-indigo-700" :
            c.tone === "amber"  ? "text-amber-700"  :
            c.tone === "rose"   ? "text-rose-700"   :
                                  "text-slate-700";

          return (
            <motion.div
              key={c.key}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4, scale: 1.01 }}
              className={`group relative rounded-2xl border ${cardBorder} ${cardBg} p-5 shadow-sm hover:shadow-lg transition`}
            >
              {/* Badge & lock */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {c.restrictedToAdmin && !isAdmin && (
                  <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-medium">
                    <Lock size={14} /> Restreint
                  </span>
                )}
                {c.badge && (
                  <span
                    className={
                      "rounded-md px-2 py-0.5 text-xs font-medium " +
                      (c.badge.tone === "green"
                        ? "bg-green-100 text-green-700"
                        : c.badge.tone === "indigo"
                        ? "bg-indigo-100 text-indigo-700"
                        : c.badge.tone === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : c.badge.tone === "rose"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700")
                    }
                  >
                    {c.badge.text}
                  </span>
                )}
              </div>

              {/* Icône */}
              <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconWrap}`}>
                <c.icon size={22} />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">{c.title}</h3>
              <p className="text-slate-700 mt-1">{c.desc}</p>

              {c.to ? (
                <Link to={c.to} className={`mt-4 inline-flex items-center gap-2 font-medium ${linkColor}`}>
                  Ouvrir
                  <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 text-slate-500">
                  {c.coming ?? "Bientôt"}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Carte d’aide (teal) */}
        <motion.div
          custom={cards.length + 1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          whileHover={{ y: -4, scale: 1.01 }}
          className="rounded-2xl border border-teal-100 bg-teal-50 p-5 shadow-sm hover:shadow-lg transition"
        >
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <LifeBuoy size={22} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Besoin d’aide ?</h3>
          <p className="text-slate-700 mt-1">
            Pour toute question ou demande d’accès, contactez l’équipe DIA / MARNDR.
            Vous pouvez commencer par la section{" "}
            <Link to="/projets" className="text-green-700 font-medium">Projets</Link>.
          </p>
        </motion.div>
      </section>

      {/* Pied */}
    </div>
  );
}
