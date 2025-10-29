// src/features/events/EventsPanel.tsx
import * as React from "react";
import { Toast, useToast } from "../../../ui/Toast";
import { btnDelete, btnSave } from "../../../ui/tokens";
import { FKPicker } from "../../../ui/FKPicker";

/* ============================== API helpers ============================== */

const API = import.meta.env.VITE_API_BASE ?? "";

type Nullable<T> = T | null;

export type EvenementRow = {
  idevenement: number;
  type_evenement: string;
  date_evenement: Nullable<string>;
  date_prevue: Nullable<string>;
  description_evenement: Nullable<string>;
  statut_evenement: Nullable<string>;
  date_realisee: Nullable<string>;
  idactivite: Nullable<number>;
  idcommande: Nullable<number>;
  idsoumissionnaire: Nullable<number>;
  idpersonnel: Nullable<number>;
  idtransaction: Nullable<number>;
  idprojet: Nullable<number>;
  nb_documents?: number;
};

type EvenementInput = Omit<EvenementRow, "idevenement" | "nb_documents">;

type DocumentRow = {
  iddocument: number;
  titre_document?: string;
  type_document?: string;
  date_document?: string;
};

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j?.detail ? `${r.status} — ${j.detail}` : msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

const fetchJson = async <T,>(url: string) => {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
};

const normId = (v: any) =>
  v === undefined || v === null || v === "" || v === 0 || v === "0" ? null : Number(v);
const normDate = (s?: string | null) => (s && s.trim() ? s : null);

function normalizePayload(p: Partial<EvenementInput>): EvenementInput {
  return {
    idactivite: normId(p.idactivite),
    idcommande: normId(p.idcommande),
    idsoumissionnaire: normId(p.idsoumissionnaire),
    idpersonnel: normId(p.idpersonnel),
    idtransaction: normId(p.idtransaction),
    idprojet: normId(p.idprojet),
    type_evenement: (p.type_evenement ?? "").trim(),
    date_evenement: normDate(p.date_evenement ?? null),
    date_prevue: normDate(p.date_prevue ?? null),
    description_evenement: p.description_evenement?.trim() || null,
    statut_evenement: p.statut_evenement?.trim() || null,
    date_realisee: normDate(p.date_realisee ?? null),
  };
}

/* --- évènements --- */
function listEvenements() {
  return json<EvenementRow[]>(`${API}/api/v1/evenement/`);
}
function createEvenement(payload: EvenementInput) {
  return json<EvenementRow>(`${API}/api/v1/evenement/`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}
function updateEvenement(id: number, payload: EvenementInput) {
  return json<EvenementRow>(`${API}/api/v1/evenement/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}
function deleteEvenement(id: number) {
  return json<{ deleted: boolean; reason?: string }>(`${API}/api/v1/evenement/${id}`, {
    method: "DELETE",
  });
}

/* --- labels pour FK (affichage) --- */
async function fetchLabel(url: string, key: string, fmt?: (r: any) => string) {
  try {
    const r = await json<any>(url);
    if (fmt) return fmt(r);
    return r?.[key] ?? "-";
  } catch {
    return "-";
  }
}
const labelActivite  = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/activites/${id}`, "titre_act") : Promise.resolve("-");
const labelCommande  = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/commandes/${id}`, "libelle_commande") : Promise.resolve("-");
const labelSoum      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/soumissionnaires/${id}`, "nom_Soum",
        r => `${r.nom_Soum}${r.nif_soum ? ` (${r.nif_soum})` : ""}`) : Promise.resolve("-");
const labelPers      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/personnels/${id}`, "nom_personnel") : Promise.resolve("-");
const labelProj      = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/projets/${id}`, "code_projet") : Promise.resolve("-");
const labelTxn       = (id: number | null) =>
  id ? fetchLabel(`${API}/api/v1/transactions/${id}`, "idtransaction",
        r => [r.type_transaction, r.receveur_type, r.type_paiement, r.date_transaction, r.montant_transaction]
          .filter(Boolean).join(" · ")) : Promise.resolve("-");

/* --- archive --- */
async function listDocuments(): Promise<DocumentRow[]> {
  return fetchJson<DocumentRow[]>(`${API}/api/v1/archive/documents`);
}
async function attachDocuments(idevenement: number, ids: number[]) {
  return json(`${API}/api/v1/archive/evenement/${idevenement}/attach`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/* ============================== Component ============================== */

export default function EventsPanel() {
  const { toast, show, hide } = useToast();

  const empty: EvenementInput = {
    idactivite: null,
    idcommande: null,
    idsoumissionnaire: null,
    idpersonnel: null,
    idtransaction: null,
    idprojet: null,
    type_evenement: "",
    date_evenement: "",
    date_prevue: "",
    description_evenement: "",
    statut_evenement: "",
    date_realisee: "",
  };

  const [rows, setRows] = React.useState<EvenementRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [form, setForm] = React.useState<EvenementInput>(empty);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  // labels sous les boutons FK
  const [lbl, setLbl] = React.useState({
    act: "-",
    cmd: "-",
    soum: "-",
    pers: "-",
    txn: "-",
    prj: "-",
  });

  // doc picker
  const [docPickerOpen, setDocPickerOpen] = React.useState(false);
  const [selectedDocIds, setSelectedDocIds] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);

  // suppression
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await listEvenements();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      show(e?.message || "Échec de chargement.", "error");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { reload(); }, []);

  function resetForm() {
    setEditingId(null);
    setForm(empty);
    setLbl({ act: "-", cmd: "-", soum: "-", pers: "-", txn: "-", prj: "-" });
    setSelectedDocIds([]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type_evenement) return show("Type d’événement obligatoire.", "error");

    try {
      setSaving(true);

      let saved: EvenementRow;
      if (editingId) {
        saved = await updateEvenement(editingId, form);
      } else {
        saved = await createEvenement(form);
      }

      // Attacher des documents si sélectionnés
      if (selectedDocIds.length > 0) {
        await attachDocuments(saved.idevenement, selectedDocIds);
      }

      show(
        `${editingId ? "Événement mis à jour" : "Événement enregistré"} (#${saved.idevenement})`
        + (selectedDocIds.length ? ` + ${selectedDocIds.length} doc(s)` : ""),
        "success"
      );

      resetForm();
      await reload();
    } catch (err: any) {
      show(err?.message || "Échec de l’enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(r: EvenementRow) {
    setEditingId(r.idevenement);
    setForm({
      idactivite: r.idactivite,
      idcommande: r.idcommande,
      idsoumissionnaire: r.idsoumissionnaire,
      idpersonnel: r.idpersonnel,
      idtransaction: r.idtransaction,
      idprojet: r.idprojet,
      type_evenement: r.type_evenement,
      date_evenement: r.date_evenement,
      date_prevue: r.date_prevue,
      description_evenement: r.description_evenement,
      statut_evenement: r.statut_evenement,
      date_realisee: r.date_realisee,
    });
    setLbl({
      act: await labelActivite(r.idactivite),
      cmd: await labelCommande(r.idcommande),
      soum: await labelSoum(r.idsoumissionnaire),
      pers: await labelPers(r.idpersonnel),
      txn: await labelTxn(r.idtransaction),
      prj: await labelProj(r.idprojet),
    });
    setSelectedDocIds([]); // on part à vide (on associera en plus si besoin)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // suppression
  function askDelete(id: number) {
    setDeleteId(id);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      setDeleting(true);
      const out = await deleteEvenement(deleteId);
      if (out.deleted === false) {
        show(out.reason || "Suppression refusée.", "error");
      } else {
        show("Évènement supprimé.", "success");
        await reload();
      }
    } catch (e: any) {
      show(e?.message || "Suppression impossible.", "error");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeleteId(null);
    }
  }

  // états d’ouverture des pickers FK
  const [pickAct, setPickAct] = React.useState(false);
  const [pickCmd, setPickCmd] = React.useState(false);
  const [pickSoum, setPickSoum] = React.useState(false);
  const [pickPers, setPickPers] = React.useState(false);
  const [pickTxn, setPickTxn] = React.useState(false);
  const [pickPrj, setPickPrj] = React.useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Gestion des événements</h2>

      {/* FORMULAIRE */}
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-4 md:p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type d’événement *</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.type_evenement}
              onChange={(e) => setForm({ ...form, type_evenement: e.target.value })}
              required
            >
              <option value="" disabled>Choisir…</option>
              {[
                "Publication DDP",
                "Attribution du marché",
                "Remise rapport APS",
                "Démarrage chantier",
                "Avance",
                "Décompte",
              ].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Statut</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.statut_evenement ?? ""}
              onChange={(e) => setForm({ ...form, statut_evenement: e.target.value })}
            >
              <option value="" disabled>Choisir…</option>
              {["Réalisé", "Non-Réalisé"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date événement</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_evenement ?? ""}
              onChange={(e) => setForm({ ...form, date_evenement: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date prévue</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date_prevue ?? ""}
              onChange={(e) => setForm({ ...form, date_prevue: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            rows={3}
            value={form.description_evenement ?? ""}
            onChange={(e) => setForm({ ...form, description_evenement: e.target.value })}
          />
        </div>

        {/* Liens (FK) */}
        <div className="grid md:grid-cols-3 gap-4">
          <FkButton label="Activité" value={lbl.act} onClick={() => setPickAct(true)} />
          <FkButton label="Commande" value={lbl.cmd} onClick={() => setPickCmd(true)} />
          <FkButton label="Soumissionnaire" value={lbl.soum} onClick={() => setPickSoum(true)} />
          <FkButton label="Personnel" value={lbl.pers} onClick={() => setPickPers(true)} />
          <FkButton label="Transaction" value={lbl.txn} onClick={() => setPickTxn(true)} />
          <FkButton label="Projet" value={lbl.prj} onClick={() => setPickPrj(true)} />
        </div>

        {/* Documents */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => setDocPickerOpen(true)}
          >
            Documents
          </button>
          <span className="text-sm text-slate-600">
            {selectedDocIds.length > 0 ? `${selectedDocIds.length} sélectionné(s)` : "Aucun sélectionné"}
          </span>
        </div>

        <div className="flex gap-3">
          <button type="submit" className={btnSave} disabled={saving}>
            {editingId ? (saving ? "Mise à jour…" : "Mettre à jour") : (saving ? "Enregistrement…" : "Enregistrer")}
          </button>
          {editingId && (
            <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={resetForm} disabled={saving}>
              Annuler l’édition
            </button>
          )}
        </div>
      </form>

      {/* LISTE */}
      <section className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] divide-y">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Liens (FK)</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Docs</th>
                <th className="px-4 py-2 sticky right-0 bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={8}>Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-3 text-sm" colSpan={8}>Aucun évènement.</td></tr>
              ) : (
                rows.map((r) => <EventRow key={r.idevenement} r={r} onEdit={() => onEdit(r)} onDelete={() => askDelete(r.idevenement)} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PICKERS FK */}
      <FKPicker
        open={pickAct}
        onClose={() => setPickAct(false)}
        title="Choisir une activité"
        load={() => fetchJson<any[]>(`${API}/api/v1/activites/`)}
        columns={[
          { key: "idactivite", header: "#", w: "80px" },
          { key: "titre_act", header: "Titre" },
          { key: "description_act", header: "Description" },
        ]}
        rowKey={(r) => r.idactivite}
        onPick={(r) => { setForm((f) => ({ ...f, idactivite: r.idactivite })); setLbl((p) => ({ ...p, act: r.titre_act })); setPickAct(false); }}
      />
      <FKPicker
        open={pickCmd}
        onClose={() => setPickCmd(false)}
        title="Choisir une commande"
        load={() => fetchJson<any[]>(`${API}/api/v1/commandes/`)}
        columns={[
          { key: "idcommande", header: "#", w: "80px" },
          { key: "libelle_commande", header: "Libellé" },
          { key: "nature_commande", header: "Nature" },
          { key: "type_commande", header: "Type" },
        ]}
        rowKey={(r) => r.idcommande}
        onPick={(r) => { setForm((f) => ({ ...f, idcommande: r.idcommande })); setLbl((p) => ({ ...p, cmd: r.libelle_commande })); setPickCmd(false); }}
      />
      <FKPicker
        open={pickSoum}
        onClose={() => setPickSoum(false)}
        title="Choisir un soumissionnaire"
        load={() => fetchJson<any[]>(`${API}/api/v1/soumissionnaires/`)}
        columns={[
          { key: "idsoumissionnaire", header: "#", w: "80px" },
          { key: "nom_Soum", header: "Nom" },
          { key: "nif_soum", header: "NIF" },
          { key: "telephone_soum", header: "Téléphone" },
        ]}
        rowKey={(r) => r.idsoumissionnaire}
        onPick={(r) => {
          setForm((f) => ({ ...f, idsoumissionnaire: r.idsoumissionnaire }));
          setLbl((p) => ({ ...p, soum: `${r.nom_Soum}${r.nif_soum ? ` (${r.nif_soum})` : ""}` }));
          setPickSoum(false);
        }}
      />
      <FKPicker
        open={pickPers}
        onClose={() => setPickPers(false)}
        title="Choisir un personnel"
        load={() => fetchJson<any[]>(`${API}/api/v1/personnels/`)}
        columns={[
          { key: "idpersonnel", header: "#", w: "80px" },
          { key: "nom_personnel", header: "Nom" },
          { key: "fonction_personnel", header: "Fonction" },
        ]}
        rowKey={(r) => r.idpersonnel}
        onPick={(r) => { setForm((f) => ({ ...f, idpersonnel: r.idpersonnel })); setLbl((p) => ({ ...p, pers: r.nom_personnel })); setPickPers(false); }}
      />
      <FKPicker
        open={pickTxn}
        onClose={() => setPickTxn(false)}
        title="Choisir une transaction"
        load={() => fetchJson<any[]>(`${API}/api/v1/transactions/`)}
        columns={[
          { key: "idtransaction", header: "#", w: "80px" },
          { key: "type_transaction", header: "Type" },
          { key: "receveur_type", header: "Receveur" },
          { key: "type_paiement", header: "Paiement" },
          { key: "date_transaction", header: "Date" },
          { key: "montant_transaction", header: "Montant" },
        ]}
        rowKey={(r) => r.idtransaction}
        onPick={(r) => {
          setForm((f) => ({ ...f, idtransaction: r.idtransaction }));
          const txt = [r.type_transaction, r.receveur_type, r.type_paiement, r.date_transaction, r.montant_transaction]
            .filter(Boolean).join(" · ");
          setLbl((p) => ({ ...p, txn: txt || `txn ${r.idtransaction}` }));
          setPickTxn(false);
        }}
      />
      <FKPicker
        open={pickPrj}
        onClose={() => setPickPrj(false)}
        title="Choisir un projet"
        load={() => fetchJson<any[]>(`${API}/api/v1/projets/`)}
        columns={[
          { key: "idprojet", header: "#", w: "80px" },
          { key: "code_projet", header: "Code" },
          { key: "initule_projet", header: "Intitulé" },
        ]}
        rowKey={(r) => r.idprojet}
        onPick={(r) => { setForm((f) => ({ ...f, idprojet: r.idprojet })); setLbl((p) => ({ ...p, prj: r.code_projet })); setPickPrj(false); }}
      />

      {/* picker documents */}
      <DocumentPicker
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        selected={selectedDocIds}
        onChange={setSelectedDocIds}
      />

      {/* Confirm suppression */}
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer cet évènement ?"
        message="Cette action est définitive."
        cancelLabel="Annuler"
        confirmLabel={deleting ? "Suppression…" : "Supprimer"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        busy={deleting}
      />

      <Toast toast={toast} onClose={hide} />
    </div>
  );
}

/* ============================== Sub components ============================== */

function FkButton({ label, value, onClick }: { label: string; value: string; onClick: () => void; }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={onClick}>
          Choisir…
        </button>
        <span className="text-sm text-slate-600 line-clamp-1">{value || "-"}</span>
      </div>
    </div>
  );
}

function EventRow({ r, onEdit, onDelete }: { r: EvenementRow; onEdit: () => void; onDelete: () => void; }) {
  const [labels, setLabels] = React.useState({ act: "-", cmd: "-", soum: "-", pers: "-", txn: "-", prj: "-" });
  React.useEffect(() => {
    Promise.all([
      labelActivite(r.idactivite), labelCommande(r.idcommande), labelSoum(r.idsoumissionnaire),
      labelPers(r.idpersonnel), labelTxn(r.idtransaction), labelProj(r.idprojet),
    ]).then(([act, cmd, soum, pers, txn, prj]) => setLabels({ act, cmd, soum, pers, txn, prj }));
  }, [r]);

  return (
    <tr className="text-sm align-top">
      <td className="px-4 py-3">{r.idevenement}</td>
      <td className="px-4 py-3 whitespace-pre-wrap">{r.type_evenement}</td>
      <td className="px-4 py-3 whitespace-pre-wrap">{r.description_evenement ?? ""}</td>
      <td className="px-4 py-3 whitespace-pre-wrap">
        {r.date_evenement && <>Évt: {r.date_evenement}<br/></>}
        {r.date_prevue && <>Prévue: {r.date_prevue}<br/></>}
        {r.date_realisee && <>Réalisée: {r.date_realisee}</>}
      </td>
      <td className="px-4 py-3 whitespace-pre-wrap">
        {labels.act !== "-" && <>act: {labels.act}<br/></>}
        {labels.cmd !== "-" && <>cmdt: {labels.cmd}<br/></>}
        {labels.soum !== "-" && <>soum: {labels.soum}<br/></>}
        {labels.pers !== "-" && <>pers: {labels.pers}<br/></>}
        {labels.txn !== "-" && <>trc: {labels.txn}<br/></>}
        {labels.prj !== "-" && <>prj: {labels.prj}</>}
      </td>
      <td className="px-4 py-3">{r.statut_evenement ?? "-"}</td>
      <td className="px-4 py-3">{r.nb_documents ?? 0}</td>
      <td className="px-4 py-3 sticky right-0 bg-white">
        <div className="flex gap-2">
          <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={onEdit}>
            Modifier
          </button>
          <button className={btnDelete} onClick={onDelete}>
            Supprimer
          </button>
        </div>
      </td>
    </tr>
  );
}

/* Confirm dialog (léger) */
function ConfirmDialog({
  open, title, message, cancelLabel = "Annuler", confirmLabel = "Supprimer",
  onCancel, onConfirm, busy = false,
}: {
  open: boolean; title: string; message?: string; cancelLabel?: string; confirmLabel?: string;
  onCancel: () => void; onConfirm: () => void; busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-[101] w-[92%] max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        {message ? <p className="text-sm text-slate-600 mb-4">{message}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={btnDelete} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Document picker */
function DocumentPicker({
  open, onClose, selected, onChange,
}: { open: boolean; onClose: () => void; selected: number[]; onChange: (ids: number[]) => void; }) {
  const [rows, setRows] = React.useState<DocumentRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [localSel, setLocalSel] = React.useState<number[]>(selected);

  React.useEffect(() => {
    if (!open) return;
    setLocalSel(selected);
    (async () => {
      try {
        setLoading(true);
        const data = await listDocuments();
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, selected]);

  if (!open) return null;

  function toggle(id: number) {
    setLocalSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id)));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-[101] w-[95%] max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold mb-3">Associer des documents</h3>

        <div className="border rounded-md max-h-[50vh] overflow-auto">
          {loading ? (
            <div className="p-4 text-sm text-slate-600">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">Aucun document.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Titre</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Associer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.iddocument} className="border-t">
                    <td className="px-3 py-2">{d.iddocument}</td>
                    <td className="px-3 py-2">{d.titre_document ?? "-"}</td>
                    <td className="px-3 py-2">{d.type_document ?? "-"}</td>
                    <td className="px-3 py-2">{d.date_document ?? "-"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs ${
                          localSel.includes(d.iddocument) ? "bg-green-50 border-green-500" : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggle(d.iddocument)}
                      >
                        {localSel.includes(d.iddocument) ? "OK" : "Sélect."}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm bg-black text-white"
            onClick={() => { onChange(localSel); onClose(); }}
          >
            Valider ({localSel.length})
          </button>
        </div>
      </div>
    </div>
  );
}
