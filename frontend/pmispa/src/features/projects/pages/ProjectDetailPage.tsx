// src/features/projects/pages/ProjectDetailPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchProject,
  listProjectDepartements,
  fetchProjectActivites,
  fetchActiviteImplantations,
  fetchActiviteSuivi,
  fetchActiviteResponsables,
  fetchActiviteExercices,
  fetchProjectPersonnels,
  fetchProjectCommandes,
  fetchCommandeSoumissionnaires,
  fetchCommandeTitulaires,          // <-- NEW
  type Project,
  type Department as Departement,
  type Activity,
  type SuiviRow,
  type ResponsableRow,
  type Exercice,
  type PersonnelRow,
  type CommandeRow,
  type SoumissionnaireRow,
  type TitulaireRow,                // <-- NEW
} from "../api";

/* ---------- Tabs ---------- */
type TabKey =
  | "resume"
  | "departements"
  | "sites"
  | "activites"
  | "evenements"
  | "personnels"
  | "commandes";

/* ---------- Activity subpanel ---------- */
type ActivitySub =
  | "zone"
  | "suivi"
  | "responsabilite"
  | "exercice"
  | "evenements"
  | "transactions";

/* ---------- Commande subpanel ---------- */
type CommandeSub = "soumissionnaires" | "titulaire";

/* ======================================================================= */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { token } = useAuth();

  const [tab, setTab] = useState<TabKey>("activites");
  const [proj, setProj] = useState<Project | null>(null);

  // Départements
  const [deps, setDeps] = useState<Departement[] | null>(null);

  // Activités
  const [acts, setActs] = useState<Activity[] | null>(null);

  // ----- Menu d’actions (Activités)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  // Panneau d’activité
  const [activeAct, setActiveAct] = useState<Activity | null>(null);
  const [activeActTab, setActiveActTab] = useState<ActivitySub | null>(null);

  // Zone d’implantation
  const [zoneRows, setZoneRows] = useState<Array<{ idsite: number; site: string; departement: string }> | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneErr, setZoneErr] = useState<string | null>(null);

  // Suivi
  const [suiviRows, setSuiviRows] = useState<SuiviRow[] | null>(null);
  const [suiviLoading, setSuiviLoading] = useState(false);
  const [suiviErr, setSuiviErr] = useState<string | null>(null);

  // Responsabilités
  const [respRows, setRespRows] = useState<ResponsableRow[] | null>(null);
  const [respLoading, setRespLoading] = useState(false);
  const [respErr, setRespErr] = useState<string | null>(null);

  // Exercice fiscale
  const [exeRows, setExeRows] = useState<Exercice[] | null>(null);
  const [exeLoading, setExeLoading] = useState(false);
  const [exeErr, setExeErr] = useState<string | null>(null);

  // Personnels (onglet)
  const [persRows, setPersRows] = useState<PersonnelRow[] | null>(null);
  const [persLoading, setPersLoading] = useState(false);
  const [persErr, setPersErr] = useState<string | null>(null);

  // Commandes (onglet)
  const [cmdRows, setCmdRows] = useState<CommandeRow[] | null>(null);
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdErr, setCmdErr] = useState<string | null>(null);

  // ----- Menu d’actions (Commandes)
  const [openCmdMenuIdx, setOpenCmdMenuIdx] = useState<number | null>(null);
  const [cmdMenuPos, setCmdMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  // Panneau Commande
  const [activeCmdIdx, setActiveCmdIdx] = useState<number | null>(null);
  const [activeCmdSub, setActiveCmdSub] = useState<CommandeSub | null>(null);

  // Soumissionnaires (panneau Commande)
  const [soumRows, setSoumRows] = useState<SoumissionnaireRow[] | null>(null);
  const [soumLoading, setSoumLoading] = useState(false);
  const [soumErr, setSoumErr] = useState<string | null>(null);

  // Titulaires (panneau Commande)  <-- NEW
  const [titRows, setTitRows] = useState<TitulaireRow[] | null>(null);
  const [titLoading, setTitLoading] = useState(false);
  const [titErr, setTitErr] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ------------------------- Projet ------------------------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const p = await fetchProject(projectId, token?? undefined);
        if (!cancel) setProj(p);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId, token]);

  /* ---------------------- Départements ---------------------- */
  useEffect(() => {
    if (tab !== "departements") return;
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const d = await listProjectDepartements(projectId, token?? undefined);
        if (!cancel) setDeps(d);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement des départements");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab, projectId, token]);

  /* ------------------------ Activités ----------------------- */
  useEffect(() => {
    if (tab !== "activites") return;
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const a = await fetchProjectActivites(projectId, token?? undefined);
        if (!cancel) setActs(a);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Erreur de chargement des activités");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab, projectId, token]);

  /* ------------------- Zone d’implantation ------------------ */
  useEffect(() => {
    if (!activeAct || activeActTab !== "zone") return;
    let cancel = false;
    (async () => {
      try {
        setZoneErr(null);
        setZoneLoading(true);
        const rows = await fetchActiviteImplantations(activeAct.idactivite, token?? undefined);
        if (!cancel) setZoneRows((rows as unknown as { idsite: number; site: string; departement: string }[]) || []);
;
      } catch (e: any) {
        if (!cancel) setZoneErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setZoneLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [activeAct, activeActTab, token]);

  /* -------------------------- Suivi ------------------------- */
  useEffect(() => {
    if (!activeAct || activeActTab !== "suivi") return;
    let cancel = false;
    (async () => {
      try {
        setSuiviErr(null);
        setSuiviLoading(true);
        const rows = await fetchActiviteSuivi(activeAct.idactivite, token?? undefined);
        if (!cancel) setSuiviRows(rows || []);
      } catch (e: any) {
        if (!cancel) setSuiviErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setSuiviLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [activeAct, activeActTab, token]);

  /* --------------------- Responsabilités -------------------- */
  useEffect(() => {
    if (!activeAct || activeActTab !== "responsabilite") return;
    let cancel = false;
    (async () => {
      try {
        setRespErr(null);
        setRespLoading(true);
        const rows = await fetchActiviteResponsables(activeAct.idactivite, token?? undefined);
        if (!cancel) setRespRows(rows || []);
      } catch (e: any) {
        if (!cancel) setRespErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setRespLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [activeAct, activeActTab, token]);

  /* --------------------- Exercice fiscale ------------------- */
  useEffect(() => {
    if (!activeAct || activeActTab !== "exercice") return;
    let cancel = false;
    (async () => {
      try {
        setExeErr(null);
        setExeLoading(true);
        const rows = await fetchActiviteExercices(activeAct.idactivite, token?? undefined);
        if (!cancel) setExeRows(rows || []);
      } catch (e: any) {
        if (!cancel) setExeErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancel) setExeLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [activeAct, activeActTab, token]);

  /* --------------------- Personnels (onglet) ---------------- */
  useEffect(() => {
    if (tab !== "personnels") return;
    let cancel = false;
    (async () => {
      try {
        setPersErr(null);
        setPersLoading(true);
        const rows = token ? await fetchProjectPersonnels(projectId, token) : [];
        if (!cancel) setPersRows(rows || []);
      } catch (e: any) {
        if (!cancel) setPersErr(e?.message || "Erreur de chargement des personnels");
      } finally {
        if (!cancel) setPersLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab, projectId, token]);

  /* ----------------------- Commandes (onglet) ---------------- */
  useEffect(() => {
    if (tab !== "commandes") return;
    let cancel = false;
    (async () => {
      try {
        setCmdErr(null);
        setCmdLoading(true);
        const rows = await fetchProjectCommandes(projectId, token?? undefined);
        if (!cancel) setCmdRows(rows || []);
      } catch (e: any) {
        if (!cancel) setCmdErr(e?.message || "Erreur de chargement des commandes");
      } finally {
        if (!cancel) setCmdLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab, projectId, token]);

  /* ------------- Soumissionnaires (panneau Commande) -------- */
  useEffect(() => {
    if (activeCmdIdx == null || activeCmdSub !== "soumissionnaires") return;
    const current = cmdRows?.[activeCmdIdx];
    if (!current) return;

    let cancel = false;
    (async () => {
      try {
        setSoumErr(null);
        setSoumLoading(true);
        const id =
          (current as any).idcommande ??
          (current as any)["id_commande"] ??
          (current as any)["id"];
        const rows = await fetchCommandeSoumissionnaires(Number(id), token?? undefined);
        if (!cancel) setSoumRows(rows || []);
      } catch (e: any) {
        if (!cancel) setSoumErr(e?.message || "Erreur de chargement des soumissionnaires");
      } finally {
        if (!cancel) setSoumLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [activeCmdIdx, activeCmdSub, cmdRows, token]);

  /* ---------------- Titulaires (panneau Commande) ----------- NEW */
  useEffect(() => {
    if (activeCmdIdx == null || activeCmdSub !== "titulaire") return;
    const current = cmdRows?.[activeCmdIdx];
    if (!current) return;

    let cancel = false;
    (async () => {
      try {
        setTitErr(null);
        setTitLoading(true);
        const id =
          (current as any).idcommande ??
          (current as any)["id_commande"] ??
          (current as any)["id"];
        const rows = await fetchCommandeTitulaires(Number(id), token?? undefined);
        if (!cancel) setTitRows(rows || []);
      } catch (e: any) {
        if (!cancel) setTitErr(e?.message || "Erreur de chargement des titulaires");
      } finally {
        if (!cancel) setTitLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [activeCmdIdx, activeCmdSub, cmdRows, token]);

  /* ---------------- fermer menus clic extérieur -------------- */
  useEffect(() => {
    function onOutsideMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-role="activity-menu"]') ||
        target.closest('[data-role="activity-menu-button"]') ||
        target.closest('[data-role="commande-menu"]') ||
        target.closest('[data-role="commande-menu-button"]')
      ) return;
      setOpenMenuId(null);
      setMenuPos(null);
      setOpenCmdMenuIdx(null);
      setCmdMenuPos(null);
    }
    document.addEventListener("mousedown", onOutsideMouseDown);
    return () => document.removeEventListener("mousedown", onOutsideMouseDown);
  }, []);

  /* ---------------- Badge d’état du projet ----------------- */
  const badge = useMemo(() => {
    const etat = proj?.etat?.toLowerCase() || "";
    const green = "bg-emerald-100 text-emerald-800";
    const gray = "bg-gray-100 text-gray-800";
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${etat.includes("clot") ? gray : green}`}>
        <span className="w-2 h-2 rounded-full bg-current mr-2" />
        {proj?.etat || "—"}
      </span>
    );
  }, [proj]);

  /* ----------------------- Menu actions (Activité) ---------- */
  function toggleMenu(a: Activity, ev: React.MouseEvent<HTMLButtonElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const pos: { left: number; top?: number; bottom?: number } = { left: rect.left + window.scrollX };
    const spaceBelow = window.innerHeight - rect.bottom;
    const needed = 280;
    if (spaceBelow < needed) pos.bottom = window.innerHeight - rect.top;
    else pos.top = rect.bottom + window.scrollY;

    setMenuPos(pos);
    setOpenMenuId(cur => (cur === a.idactivite ? null : a.idactivite));
  }
  function openPanel(act: Activity, sub: ActivitySub) {
    setActiveAct(act);
    setActiveActTab(sub);
    setOpenMenuId(null);
    setMenuPos(null);
    if (tab !== "activites") setTab("activites");
  }
  const openPanelBy = (sub: ActivitySub) => {
    if (!openMenuId || !acts) return;
    const act = acts.find(x => x.idactivite === openMenuId);
    if (act) openPanel(act, sub);
  };

  /* ----------------------- Menu actions (Commande) ---------- */
  function toggleCmdMenu(idx: number, ev: React.MouseEvent<HTMLButtonElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const pos: { left: number; top?: number; bottom?: number } = { left: rect.left + window.scrollX };
    const spaceBelow = window.innerHeight - rect.bottom;
    const needed = 200;
    if (spaceBelow < needed) pos.bottom = window.innerHeight - rect.top;
    else pos.top = rect.bottom + window.scrollY;

    setCmdMenuPos(pos);
    setOpenCmdMenuIdx(cur => (cur === idx ? null : idx));
  }
  const openCmdPanelBy = (sub: CommandeSub) => {
    if (openCmdMenuIdx == null) return;
    setActiveCmdIdx(openCmdMenuIdx);
    setActiveCmdSub(sub);

    // reset des contenus pour éviter les reliquats
    setSoumRows(null); setSoumErr(null);
    setTitRows(null);  setTitErr(null);

    setOpenCmdMenuIdx(null);
    setCmdMenuPos(null);
    if (tab !== "commandes") setTab("commandes");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{proj?.code_projet || "…"}</h1>
        {badge}
      </div>

      <div className="mt-6 border-b">
        <nav className="-mb-px flex gap-6 flex-wrap">
          {(
            [
              "resume",
              "departements",
              "sites",
              "activites",
              "evenements",
              "personnels",
              "commandes",
            ] as TabKey[]
          ).map(k => (
            <button
              key={k}
              className={`py-3 border-b-2 ${tab === k ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}
              onClick={() => setTab(k)}
            >
              {k === "resume" ? "Résumé"
               : k === "departements" ? "Départements"
               : k === "sites" ? "Sites"
               : k === "activites" ? "Activités"
               : k === "evenements" ? "Événements"
               : k === "personnels" ? "Personnels"
               : "Commandes"}
            </button>
          ))}
        </nav>
      </div>

      {err && <div className="mt-4 text-red-600">Erreur: {err}</div>}

      {/* ================= Résumé ================= */}
      {tab === "resume" && proj && (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Début prévu" value={fmt(proj.date_demarrage_prevue)} />
          <Field label="Fin prévue" value={fmt(proj.date_fin_prevue)} />
          <Field label="Début réel" value={fmt(proj.date_demarrage_reelle)} />
          <Field label="Fin réelle" value={fmt(proj.date_fin_reelle_projet)} />
          <Field
            label="Budget prévisionnel"
            value={
              proj.budget_previsionnel != null
                ? `${proj.budget_previsionnel.toLocaleString()} ${proj.devise || ""}`
                : "—"
            }
          />
          <Field label="Devise" value={proj.devise} />
          <div className="md:col-span-2">
            <Field label="Description" value={proj.description_projet || "—"} />
          </div>
        </section>
      )}

      {/* ================= Départements ================= */}
      {tab === "departements" && (
        <section className="mt-6">
          {loading && <div className="text-gray-500 text-sm">Chargement…</div>}
          {!loading && deps && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr><th className="px-4 py-3 text-left">Nom</th></tr>
                </thead>
                <tbody>
                  {deps.map((d) => (
                    <tr key={d.iddepartement} className="border-t">
                      <td className="px-4 py-3">{d.nom_departement}</td>
                    </tr>
                  ))}
                  {deps.length === 0 && (
                    <tr className="border-t"><td className="px-4 py-3">Aucun département pour ce projet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ================= Activités ================= */}
      {tab === "activites" && (
        <section className="mt-6">
          {loading && <div className="text-gray-500 text-sm">Chargement…</div>}
          {!loading && acts && (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Titre</th>
                      <th className="px-4 py-3 text-left">Début prévu</th>
                      <th className="px-4 py-3 text-left">Fin prévue</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acts.map(a => (
                      <tr key={a.idactivite} className="border-t align-top">
                        <td className="px-4 py-3">{a.titre_act}</td>
                        <td className="px-4 py-3">{fmt(a.dateDemarragePrevue_act)}</td>
                        <td className="px-4 py-3">{fmt(a.dateFinPrevue_act)}</td>
                        <td className="px-4 py-3">{a.description_act || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block">
                            <button
                              data-role="activity-menu-button"
                              onClick={(ev) => toggleMenu(a, ev)}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                              aria-label="Ouvrir le menu"
                            >
                              …
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {acts.length === 0 && (
                      <tr className="border-t">
                        <td colSpan={5} className="px-4 py-3">Aucune activité pour ce projet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {openMenuId !== null && menuPos && (
                <div
                  style={{ position: "fixed", left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom, zIndex: 50 }}
                  className="w-[320px]"
                  data-role="activity-menu"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden rounded-xl border bg-white shadow-xl" style={{ maxHeight: "min(60vh, 320px)", overflowY: "auto" }}>
                    <MenuItem onClick={() => openPanelBy("zone")}>Zone d’implantation</MenuItem>
                    <MenuItem onClick={() => openPanelBy("suivi")}>Suivi</MenuItem>
                    <MenuItem onClick={() => openPanelBy("responsabilite")}>Responsabilité</MenuItem>
                    <MenuItem onClick={() => openPanelBy("exercice")}>Exercice fiscale</MenuItem>
                    <MenuItem onClick={() => openPanelBy("evenements")}>Événements</MenuItem>
                    <MenuItem onClick={() => openPanelBy("transactions")}>Transactions</MenuItem>
                  </div>
                </div>
              )}

              {activeAct && activeActTab && (
                <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Activité</div>
                      <h3 className="text-lg font-semibold">{activeAct.titre_act}</h3>
                      <div className="text-sm text-gray-600">
                        {fmt(activeAct.dateDemarragePrevue_act)} → {fmt(activeAct.dateFinPrevue_act)}
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveAct(null); setActiveActTab(null); }}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>

                  <ActivitySubContent
                    sub={activeActTab}
                    zone={{ rows: zoneRows || [], loading: zoneLoading, error: zoneErr }}
                    suivi={{ rows: suiviRows || [], loading: suiviLoading, error: suiviErr }}
                    resp={{ rows: respRows || [], loading: respLoading, error: respErr }}
                    exercice={{ rows: exeRows || [], loading: exeLoading, error: exeErr }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ================= Personnels ================= */}
      {tab === "personnels" && (
        <section className="mt-6">
          {persLoading && <div className="text-sm text-gray-500">Chargement…</div>}
          {persErr && <div className="text-sm text-red-600">Erreur: {persErr}</div>}
          {!persLoading && !persErr && persRows && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Fonction</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Téléphone</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Date signature</th>
                    <th className="px-4 py-2 text-left">Début contrat</th>
                    <th className="px-4 py-2 text-left">Fin contrat</th>
                    <th className="px-4 py-2 text-left">Durée (mois)</th>
                  </tr>
                </thead>
                <tbody>
                  {persRows.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{p.nom}</td>
                      <td className="px-4 py-2">{p.fonction ?? "—"}</td>
                      <td className="px-4 py-2">{p.email ?? "—"}</td>
                      <td className="px-4 py-2">{p.telephone ?? "—"}</td>
                      <td className="px-4 py-2">{p.type ?? "—"}</td>
                      <td className="px-4 py-2">{fmt(p.date_signature)}</td>
                      <td className="px-4 py-2">{fmt(p.date_debut_contrat)}</td>
                      <td className="px-4 py-2">{fmt(p.date_fin_contrat)}</td>
                      <td className="px-4 py-2">{p.duree_contrat ?? "—"}</td>
                    </tr>
                  ))}
                  {persRows.length === 0 && (
                    <tr className="border-t">
                      <td colSpan={9} className="px-4 py-3">Aucun personnel trouvé pour ce projet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ================= Commandes ================= */}
      {tab === "commandes" && (
        <section className="mt-6">
          {cmdLoading && <div className="text-sm text-gray-500">Chargement…</div>}
          {cmdErr && <div className="text-sm text-red-600">Erreur: {String(cmdErr)}</div>}
          {!cmdLoading && !cmdErr && cmdRows && (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Montant</th>
                      <th className="px-4 py-3 text-left">Libellé</th>
                      <th className="px-4 py-3 text-left">Nature</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Procédure</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmdRows.map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3">{(r as any).montant_commande?.toLocaleString?.() ?? (r as any).montant_commande}</td>
                        <td className="px-4 py-3">{r.libelle_commande}</td>
                        <td className="px-4 py-3">{r.nature_commande}</td>
                        <td className="px-4 py-3">{r.type_commande}</td>
                        <td className="px-4 py-3">{(r as any).type_procedure}</td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block">
                            <button
                              data-role="commande-menu-button"
                              onClick={(ev) => toggleCmdMenu(idx, ev)}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                              aria-label="Ouvrir le menu commande"
                            >
                              …
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {cmdRows.length === 0 && (
                      <tr className="border-t">
                        <td colSpan={6} className="px-4 py-3">Aucune commande.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Menu flottant Commande */}
              {openCmdMenuIdx !== null && cmdMenuPos && (
                <div
                  style={{ position: "fixed", left: cmdMenuPos.left, top: cmdMenuPos.top, bottom: cmdMenuPos.bottom, zIndex: 50 }}
                  className="w-[280px]"
                  data-role="commande-menu"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden rounded-xl border bg-white shadow-xl" style={{ maxHeight: "min(60vh, 240px)", overflowY: "auto" }}>
                    <MenuItem onClick={() => openCmdPanelBy("soumissionnaires")}>Soumissionnaires</MenuItem>
                    <MenuItem onClick={() => openCmdPanelBy("titulaire")}>Titulaire</MenuItem>
                  </div>
                </div>
              )}

              {/* Panneau Commande */}
              {activeCmdIdx != null && activeCmdSub && cmdRows[activeCmdIdx] && (
                <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Commande</div>
                      <h3 className="text-lg font-semibold">{cmdRows[activeCmdIdx].libelle_commande}</h3>
                      <div className="text-sm text-gray-600">
                        Montant&nbsp;: {(cmdRows[activeCmdIdx] as any).montant_commande?.toLocaleString?.() ?? (cmdRows[activeCmdIdx] as any).montant_commande}
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveCmdIdx(null); setActiveCmdSub(null); }}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>

                  <CommandeSubContent
                    sub={activeCmdSub}
                    soum={{ rows: soumRows || [], loading: soumLoading, error: soumErr }}
                    titulaire={{ rows: titRows || [], loading: titLoading, error: titErr }}  // <-- NEW
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

/* ====================== Sous-composants ====================== */
function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1 text-xs uppercase text-gray-500">{label}</div>
      <div className="text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

function fmt(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50" onClick={onClick}>
      {children}
    </button>
  );
}

function ActivitySubContent({
  sub,
  zone,
  suivi,
  resp,
  exercice,
}: {
  sub: ActivitySub;
  zone: { rows: Array<{ idsite: number; site: string; departement: string }>; loading: boolean; error: string | null };
  suivi?: { rows: SuiviRow[]; loading: boolean; error: string | null };
  resp?: { rows: ResponsableRow[]; loading: boolean; error: string | null };
  exercice?: { rows: Exercice[]; loading: boolean; error: string | null };
}) {
  if (sub === "zone") {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Zone d’implantation</h4>
        {zone.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {zone.error && <div className="text-sm text-red-600">Erreur: {zone.error}</div>}
        {!zone.loading && !zone.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Site</th>
                  <th className="px-4 py-2 text-left">Département</th>
                </tr>
              </thead>
              <tbody>
                {zone.rows.map((r) => (
                  <tr key={r.idsite} className="border-t">
                    <td className="px-4 py-2">{r.site}</td>
                    <td className="px-4 py-2">{r.departement}</td>
                  </tr>
                ))}
                {zone.rows.length === 0 && (
                  <tr className="border-t">
                    <td className="px-4 py-3" colSpan={2}>Aucune implantation enregistrée pour cette activité.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (sub === "suivi" && suivi) {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Suivi des indicateurs</h4>
        {suivi.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {suivi.error && <div className="text-sm text-red-600">Erreur: {suivi.error}</div>}
        {!suivi.loading && !suivi.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Indicateur</th>
                  <th className="px-4 py-2 text-left">Base</th>
                  <th className="px-4 py-2 text-left">Cible</th>
                  <th className="px-4 py-2 text-left">Actuel</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {suivi.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{r.libelle_indicateur}</td>
                    <td className="px-4 py-2">{r.niveau_base ?? "—"}</td>
                    <td className="px-4 py-2">{r.niveau_cible ?? "—"}</td>
                    <td className="px-4 py-2">{r.niveau_actuel ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={r.statut_indicateur === "Atteint"
                        ? "rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs"
                        : "rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs"}>
                        {r.statut_indicateur}
                      </span>
                    </td>
                  </tr>
                ))}
                {suivi.rows.length === 0 && (
                  <tr className="border-t"><td className="px-4 py-3" colSpan={5}>Aucun indicateur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (sub === "responsabilite" && resp) {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Responsabilités</h4>
        {resp.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {resp.error && <div className="text-sm text-red-600">Erreur: {resp.error}</div>}
        {!resp.loading && !resp.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">Fonction</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Téléphone</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Début</th>
                  <th className="px-4 py-2 text-left">Fin</th>
                  <th className="px-4 py-2 text-left">Statut / Durée</th>
                </tr>
              </thead>
              <tbody>
                {resp.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{r.nom_personnel}</td>
                    <td className="px-4 py-2">{r.fonction ?? "—"}</td>
                    <td className="px-4 py-2">{r.email ?? "—"}</td>
                    <td className="px-4 py-2">{r.telephone ?? "—"}</td>
                    <td className="px-4 py-2">{r.type ?? "—"}</td>
                    <td className="px-4 py-2">{fmt(r.date_debut_act)}</td>
                    <td className="px-4 py-2">{fmt(r.date_fin_act)}</td>
                    <td className="px-4 py-2">{r.statut_duree}</td>
                  </tr>
                ))}
                {resp.rows.length === 0 && (
                  <tr className="border-t"><td className="px-4 py-3" colSpan={8}>Aucune responsabilité enregistrée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (sub === "exercice" && exercice) {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Exercice fiscale</h4>
        {exercice.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {exercice.error && <div className="text-sm text-red-600">Erreur: {exercice.error}</div>}
        {!exercice.loading && !exercice.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Année</th>
                  <th className="px-4 py-2 text-left">Début</th>
                  <th className="px-4 py-2 text-left">Fin</th>
                </tr>
              </thead>
              <tbody>
                {exercice.rows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{r.annee}</td>
                    <td className="px-4 py-2">{fmt(r.date_debut_exe)}</td>
                    <td className="px-4 py-2">{fmt(r.date_fin_exe)}</td>
                  </tr>
                ))}
                {exercice.rows.length === 0 && (
                  <tr className="border-t"><td className="px-4 py-3" colSpan={3}>Aucun exercice fiscal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* -------------------- Commande subcontent ------------------- */
function CommandeSubContent({
  sub,
  soum,
  titulaire, // <-- NEW
}: {
  sub: CommandeSub;
  soum: { rows: SoumissionnaireRow[]; loading: boolean; error: string | null };
  titulaire?: { rows: TitulaireRow[]; loading: boolean; error: string | null };
}) {
  if (sub === "soumissionnaires") {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Soumissionnaires</h4>
        {soum.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {soum.error && <div className="text-sm text-red-600">Erreur: {soum.error}</div>}
        {!soum.loading && !soum.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">NIF</th>
                  <th className="px-4 py-2 text-left">Adresse</th>
                  <th className="px-4 py-2 text-left">Téléphone</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {soum.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{r.nom_soumissionnaire}</td>
                    <td className="px-4 py-2">{r.nif ?? "—"}</td>
                    <td className="px-4 py-2">{r.adresse ?? "—"}</td>
                    <td className="px-4 py-2">{r.telephone ?? "—"}</td>
                    <td className="px-4 py-2">{r.statut ?? "—"}</td>
                    <td className="px-4 py-2">{r.email ?? "—"}</td>
                  </tr>
                ))}
                {soum.rows.length === 0 && (
                  <tr className="border-t">
                    <td className="px-4 py-3" colSpan={6}>Aucun soumissionnaire pour cette commande.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (sub === "titulaire" && titulaire) {
    return (
      <div>
        <h4 className="mb-3 text-base font-semibold">Titulaire(s) du marché</h4>
        {titulaire.loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {titulaire.error && <div className="text-sm text-red-600">Erreur: {titulaire.error}</div>}
        {!titulaire.loading && !titulaire.error && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">NIF</th>
                  <th className="px-4 py-2 text-left">Adresse</th>
                  <th className="px-4 py-2 text-left">Téléphone</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Date soumission</th>
                  <th className="px-4 py-2 text-left">Statut soumission</th>
                </tr>
              </thead>
              <tbody>
                {titulaire.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{r.nom_soumissionnaire}</td>
                    <td className="px-4 py-2">{r.nif ?? "—"}</td>
                    <td className="px-4 py-2">{r.adresse ?? "—"}</td>
                    <td className="px-4 py-2">{r.telephone ?? "—"}</td>
                    <td className="px-4 py-2">{r.statut ?? "—"}</td>
                    <td className="px-4 py-2">{r.email ?? "—"}</td>
                    <td className="px-4 py-2">{fmt(r.date_soumission)}</td>
                    <td className="px-4 py-2">{r.statut_soumission ?? "—"}</td>
                  </tr>
                ))}
                {titulaire.rows.length === 0 && (
                  <tr className="border-t">
                    <td className="px-4 py-3" colSpan={8}>Aucun titulaire pour cette commande.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Fallback (si jamais)
  return (
    <div>
      <h4 className="mb-3 text-base font-semibold">Titulaire</h4>
      <div className="text-sm text-gray-600">(Contenu à venir)</div>
    </div>
  );
}
