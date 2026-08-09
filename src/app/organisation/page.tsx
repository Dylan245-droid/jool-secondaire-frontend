"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles, useSessionUser } from "@/lib/roles";
import {
  CalendarDays, BookOpen, Layers, GraduationCap, DoorOpen, UserCheck, Clock,
  FileText, Trash2, Check, Pencil, Lock,
} from "lucide-react";

// ─── TYPES ───

interface SchoolYear {
  id: number;
  label: string;
  admin_start_date: string;
  school_start_date: string;
  end_date?: string | null;
  is_active: boolean;
}

interface Trimestre {
  id: number;
  label: string;
  school_year_id: number;
  position: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Niveau {
  id: number;
  code: string;
  label: string;
  type_etablissement: string;
  age_min?: number | null;
  age_max?: number | null;
}

interface Matiere {
  id: number;
  code: string;
  label: string;
  groupe: string;
  coefficient_defaut: number;
  est_obligatoire: boolean;
  is_local?: boolean;
}

interface Serie {
  id: number;
  code: string;
  label: string;
  niveau_id: number;
  coefficients: Record<string, number>;
  is_local?: boolean;
}

interface CoefMatiere {
  matiere_id: number;
  matiere_code: string;
  matiere_label: string;
  coefficient_national: number;
  coefficient_local: number | null;
  coefficient_effectif: number;
  source: string;
}

interface Salle {
  id: number;
  code: string;
  capacite: number;
  emplacement: string;
  is_active: boolean;
}

interface Classe {
  id: number;
  label: string;
  niveau: { label: string };
}

interface Membre {
  id: number;
  membership_id: number;
  nom: string;
  prenom: string;
  role: string;
  is_active: boolean;
}

interface Affectation {
  id: number;
  classe_id: number;
  classe_label: string;
  matiere_id: number;
  matiere_label: string;
  enseignant_id?: number;
  enseignant_nom?: string;
  est_principal: boolean;
}

interface Seance {
  id: number;
  classe_id: number;
  matiere_id: number;
  matiere_label: string;
  salle_id?: number;
  salle_code?: string;
  enseignant_id?: number;
  enseignant_nom?: string;
  jour: number;
  jour_label: string;
  heure_debut: string;
  heure_fin: string;
}

interface Cours {
  id: number;
  niveau_id: number;
  niveau_label: string;
  matiere_id: number;
  matiere_label: string;
  titre: string;
  objectifs: string;
  heures_prevues: number;
  is_active: boolean;
}

const GROUPES = ["scientifique", "litteraire", "langue", "sport", "technologique", "artistique", "autre"];
const JOURS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];
const TRIM_LABELS: Record<string, string> = { t1: "1er Trimestre", t2: "2ème Trimestre", t3: "3ème Trimestre" };

const TABS = [
  { id: "annee", label: "Année & trimestres", icon: CalendarDays },
  { id: "matieres", label: "Matières", icon: BookOpen },
  { id: "series", label: "Séries", icon: Layers },
  { id: "niveaux", label: "Niveaux", icon: GraduationCap },
  { id: "salles", label: "Salles", icon: DoorOpen },
  { id: "affectations", label: "Affectations", icon: UserCheck },
  { id: "edt", label: "Emploi du temps", icon: Clock },
  { id: "cours", label: "Cours / programmes", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const btnPrimary = "rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50";
const btnGhost = "rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-muted";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-lg border border-card-border shadow-card p-5 mb-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </section>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return msg ? <p className="text-sm text-red-600">{msg}</p> : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function OrganisationPage() {
  useRequireRoles(["owner", "adm", "tch"]);
  const user = useSessionUser();
  const canWrite = user?.role === "owner" || user?.role === "adm";
  const [tab, setTab] = useState<TabId>("annee");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Organisation pédagogique</h2>
          <p className="text-sm text-muted-foreground">
            Année scolaire, référentiels, salles, affectations, emploi du temps et programmes
            {canWrite ? "" : " — lecture seule"}
          </p>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-border text-gray-700 hover:bg-secondary"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "annee" && <TabAnnee canWrite={canWrite} />}
        {tab === "matieres" && <TabMatieres canWrite={canWrite} />}
        {tab === "series" && <TabSeries canWrite={canWrite} />}
        {tab === "niveaux" && <TabNiveaux />}
        {tab === "salles" && <TabSalles canWrite={canWrite} />}
        {tab === "affectations" && <TabAffectations canWrite={canWrite} />}
        {tab === "edt" && <TabEdt canWrite={canWrite} />}
        {tab === "cours" && <TabCours canWrite={canWrite} />}
      </main>
    </div>
  );
}

// ─── NIVEAUX ───

function TabNiveaux() {
  const { data: niveaux } = useQuery({ queryKey: ["niveaux"], queryFn: () => api.get<Niveau[]>("/secondaire/niveaux") });
  const college = niveaux?.filter((n) => n.type_etablissement === "college");
  const lycee = niveaux?.filter((n) => n.type_etablissement === "lycee");
  const [coefsNiveauId, setCoefsNiveauId] = useState<number | null>(null);
  const [coefsData, setCoefsData] = useState<CoefMatiere[]>([]);
  const [coefsEdit, setCoefsEdit] = useState<Record<string, string>>({});
  const [coefsMsg, setCoefsMsg] = useState("");
  const [coefsLoading, setCoefsLoading] = useState(false);

  async function openCoefs(n: Niveau) {
    if (coefsNiveauId === n.id) {
      setCoefsNiveauId(null);
      return;
    }
    setCoefsNiveauId(n.id);
    setCoefsMsg("");
    setCoefsLoading(true);
    try {
      const data = await api.get<CoefMatiere[]>(`/secondaire/coefs/niveaux/${n.id}`);
      setCoefsData(data);
      setCoefsEdit(Object.fromEntries(data.map((c) => [String(c.matiere_id), String(c.coefficient_effectif)])));
    } catch (e) {
      setCoefsMsg(e instanceof ApiError ? e.message : "Erreur chargement coefs");
    } finally {
      setCoefsLoading(false);
    }
  }

  async function saveCoefs() {
    if (coefsNiveauId === null) return;
    setCoefsMsg("");
    const surcharges = Object.entries(coefsEdit)
      .filter(([mid, v]) => {
        const national = coefsData.find((c) => String(c.matiere_id) === mid)?.coefficient_national;
        return national !== undefined && Number(v) !== national;
      })
      .map(([mid, v]) => ({ matiere_id: Number(mid), coefficient: Number(v) || 1 }));
    try {
      const data = await api.patch<CoefMatiere[]>(`/secondaire/coefs/niveaux/${coefsNiveauId}`, {
        matieres: surcharges,
      });
      setCoefsData(data);
      setCoefsEdit(Object.fromEntries(data.map((c) => [String(c.matiere_id), String(c.coefficient_effectif)])));
      setCoefsMsg(`Surcharges enregistrées (${surcharges.length} matière(s)).`);
    } catch (e) {
      setCoefsMsg(e instanceof ApiError ? e.message : "Erreur enregistrement coefs");
    }
  }

  function Bloc({ title, items }: { title: string; items?: Niveau[] }) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground bg-muted border-b border-border">
                <th className="px-3 py-2">Code</th>
                <th>Niveau</th>
                <th>Tranche d&apos;âge</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {items?.map((n) => (
                <tr key={n.id}>
                  <td className="px-3 py-2 font-mono text-xs">{n.code}</td>
                  <td className="py-2">{n.label}</td>
                  <td className="py-2 text-xs">
                    {n.age_min && n.age_max ? `${n.age_min} – ${n.age_max} ans` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => openCoefs(n)} className={btnGhost}>
                      {coefsNiveauId === n.id ? "Fermer coefs" : "Coefs"}
                    </button>
                  </td>
                </tr>
              ))}
              {!items?.length && (
                <tr><td className="px-3 py-2 text-muted-foreground">Aucun niveau.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {coefsNiveauId !== null && coefsData.length > 0 && (
          <div className="mt-3 bg-muted rounded-lg border border-border p-3">
            <h4 className="text-sm font-semibold mb-2">Parcours-type — surcharge locale (établissement)</h4>
            {coefsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <>
                <table className="w-full text-sm mb-2">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-1">Matière</th>
                      <th>National</th>
                      <th>Effectif local</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {coefsData.map((c) => (
                      <tr key={c.matiere_id}>
                        <td className="py-1">{c.matiere_label}</td>
                        <td className="py-1">{c.coefficient_national}</td>
                        <td className="py-1">
                          <input
                            type="number"
                            step="0.5"
                            value={coefsEdit[String(c.matiere_id)] ?? ""}
                            onChange={(e) => setCoefsEdit({ ...coefsEdit, [String(c.matiere_id)]: e.target.value })}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {coefsMsg && <p className={`text-xs mb-2 ${coefsMsg.startsWith("Surcharges") ? "text-green-700" : "text-red-600"}`}>{coefsMsg}</p>}
                <button onClick={saveCoefs} className={btnPrimary}>
                  Enregistrer les surcharges
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Section title="Niveaux (référentiel national fixe)">
      <p className="text-sm text-muted-foreground mb-4">
        Les 7 niveaux du système gabonais sont fixes. La tranche d&apos;âge sert d&apos;avertissement
        non bloquant lors des inscriptions. Les coefficients effectifs suivent la règle :
        surcharge de l&apos;établissement → référentiel national (série ou parcours-type) → coefficient par défaut.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bloc title="Collège" items={college} />
        <Bloc title="Lycée" items={lycee} />
      </div>
    </Section>
  );
}

// ─── ANNÉE SCOLAIRE & TRIMESTRES ───

function TabAnnee({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ label: "", admin_start_date: "", school_start_date: "", end_date: "" });
  const [selected, setSelected] = useState<number | null>(null);
  const [trim, setTrim] = useState({ label: "t1", position: "1", start_date: "", end_date: "" });

  const { data: years, isLoading } = useQuery({
    queryKey: ["org", "school-years"],
    queryFn: () => api.get<SchoolYear[]>("/secondaire/school-years"),
  });
  const { data: trimestres } = useQuery({
    queryKey: ["org", "trimestres", selected],
    queryFn: () => api.get<Trimestre[]>("/secondaire/trimestres?school_year_id=" + selected),
    enabled: selected !== null,
  });

  const createYear = useMutation({
    mutationFn: () =>
      api.post<SchoolYear>("/secondaire/school-years", {
        label: form.label || undefined,
        admin_start_date: form.admin_start_date,
        school_start_date: form.school_start_date,
        end_date: form.end_date || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "school-years"] });
      qc.invalidateQueries({ queryKey: ["school-years"] });
      setForm({ label: "", admin_start_date: "", school_start_date: "", end_date: "" });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création année"),
  });

  const activate = useMutation({
    mutationFn: (id: number) => api.patch<SchoolYear>(`/secondaire/school-years/${id}`, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "school-years"] }),
  });

  const createTrim = useMutation({
    mutationFn: () =>
      api.post<Trimestre>("/secondaire/trimestres", {
        school_year_id: selected,
        label: trim.label,
        position: Number(trim.position),
        start_date: trim.start_date,
        end_date: trim.end_date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "trimestres", selected] });
      setTrim({ label: "t1", position: "1", start_date: "", end_date: "" });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création trimestre"),
  });

  const patchTrim = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { start_date?: string; end_date?: string } }) =>
      api.patch<Trimestre>(`/secondaire/trimestres/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "trimestres", selected] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur modification trimestre"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title={`Années scolaires (${years?.length ?? 0})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {years?.map((y) => (
              <li key={y.id} className="py-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelected(y.id === selected ? null : y.id)}
                    className={`flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-muted ${
                      selected === y.id ? "bg-secondary" : ""
                    }`}
                  >
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{y.label}</span>
                    {y.is_active && (
                      <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5">active</span>
                    )}
                  </button>
                  {canWrite && !y.is_active && (
                    <button
                      onClick={() => activate.mutate(y.id)}
                      disabled={activate.isPending}
                      className={btnGhost}
                    >
                      Activer
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-8">
                  Admin {y.admin_start_date} · Rentrée {y.school_start_date}
                  {y.end_date ? ` · Fin ${y.end_date}` : ""}
                </p>
                {selected === y.id && (
                  <div className="mt-3 pl-8 space-y-2">
                    {trimestres?.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="w-32 font-medium">{TRIM_LABELS[t.label] ?? t.label}</span>
                        <input
                          type="date"
                          defaultValue={t.start_date}
                          onBlur={(e) => {
                            if (e.target.value !== t.start_date)
                              patchTrim.mutate({ id: t.id, data: { start_date: e.target.value } });
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input
                          type="date"
                          defaultValue={t.end_date}
                          onBlur={(e) => {
                            if (e.target.value !== t.end_date)
                              patchTrim.mutate({ id: t.id, data: { end_date: e.target.value } });
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        />
                      </div>
                    ))}
                    {trimestres?.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun trimestre pour cette année.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {canWrite && (
        <div className="space-y-6">
          <Section title="Nouvelle année scolaire">
            <div className="space-y-3">
              <Field label="Libellé (optionnel — ex : 2027-2028)">
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className={inputCls}
                  placeholder="2027-2028"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rentrée administrative *">
                  <input
                    type="date"
                    value={form.admin_start_date}
                    onChange={(e) => setForm({ ...form, admin_start_date: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Rentrée des classes *">
                  <input
                    type="date"
                    value={form.school_start_date}
                    onChange={(e) => setForm({ ...form, school_start_date: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Fin d'année (optionnel)">
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <ErrMsg msg={error} />
              <button
                onClick={() => createYear.mutate()}
                disabled={!form.admin_start_date || !form.school_start_date || createYear.isPending}
                className={btnPrimary}
              >
                {createYear.isPending ? "Création…" : "Créer l'année"} (désactive la précédente
              </button>
              <p className="text-xs text-muted-foreground">
                La nouvelle année devient automatiquement l&apos;année active.
              </p>
            </div>
          </Section>

          <Section title="Créer un trimestre">
            <div className="space-y-3">
              <Field label="Année scolaire">
                <select value={selected ?? ""} onChange={(e) => setSelected(Number(e.target.value))} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {years?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Trimestre">
                  <select
                    value={trim.label}
                    onChange={(e) =>
                      setTrim({ ...trim, label: e.target.value, position: e.target.value === "t1" ? "1" : e.target.value === "t2" ? "2" : "3" })
                    }
                    className={inputCls}
                  >
                    {Object.entries(TRIM_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Début *">
                  <input
                    type="date"
                    value={trim.start_date}
                    onChange={(e) => setTrim({ ...trim, start_date: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Fin *">
                  <input
                    type="date"
                    value={trim.end_date}
                    onChange={(e) => setTrim({ ...trim, end_date: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <ErrMsg msg={error} />
              <button
                onClick={() => createTrim.mutate()}
                disabled={!selected || !trim.start_date || !trim.end_date || createTrim.isPending}
                className={btnPrimary}
              >
                {createTrim.isPending ? "Création…" : "Créer le trimestre"}
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── MATIÈRES ───

function TabMatieres({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editCoef, setEditCoef] = useState("");
  const [form, setForm] = useState({
    code: "", label: "", groupe: "scientifique", coefficient_defaut: "1", est_obligatoire: true,
  });

  const { data: matieres } = useQuery({
    queryKey: ["org", "matieres"],
    queryFn: () => api.get<Matiere[]>("/secondaire/matieres"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Matiere>("/secondaire/matieres", {
        code: form.code, label: form.label, groupe: form.groupe,
        coefficient_defaut: Number(form.coefficient_defaut) || 1,
        est_obligatoire: form.est_obligatoire,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "matieres"] });
      setForm({ code: "", label: "", groupe: "scientifique", coefficient_defaut: "1", est_obligatoire: true });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création matière"),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Matiere> }) =>
      api.patch<Matiere>(`/secondaire/matieres/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "matieres"] });
      setEditing(null);
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur modification matière"),
  });

  return (
    <Section title={`Matières officielles (${matieres?.length ?? 0})`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-card-border">
                <th className="py-2">Code</th>
                <th>Matière</th>
                <th>Origine</th>
                <th>Groupe</th>
                <th>Coef.</th>
                <th>Obligatoire</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {matieres?.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 font-mono text-xs">{m.code}</td>
                  <td className="py-2">{m.label}</td>
                  <td className="py-2">
                    {m.is_local ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">Locale</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Nationale</span>
                    )}
                  </td>
                  <td className="py-2 text-xs">{m.groupe}</td>
                  <td className="py-2">
                    {editing === m.id ? (
                      <input
                        type="number"
                        step="0.5"
                        value={editCoef}
                        onChange={(e) => setEditCoef(e.target.value)}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      m.coefficient_defaut
                    )}
                  </td>
                  <td className="py-2">
                    {editing === m.id ? (
                      <input
                        type="checkbox"
                        defaultChecked={m.est_obligatoire}
                        onChange={(e) => patch.mutate({ id: m.id, data: { est_obligatoire: e.target.checked } })}
                      />
                    ) : (
                      <span className={`text-xs ${m.est_obligatoire ? "text-green-700" : "text-gray-400"}`}>
                        {m.est_obligatoire ? "oui" : "non"}
                      </span>
                    )}
                  </td>
                  {canWrite && !m.is_local && (
                    <td className="py-2 text-right">
                      <span className="text-[11px] text-gray-300" title="Matière nationale : lecture seule">
                        <Lock className="w-3 h-3 inline" />
                      </span>
                    </td>
                  )}
                  {canWrite && m.is_local && (
                    <td className="py-2 text-right">
                      {editing === m.id ? (
                        <button
                          onClick={() => patch.mutate({ id: m.id, data: { coefficient_defaut: Number(editCoef) || 1 } })}
                          className="flex items-center gap-1 rounded-md bg-primary text-white px-2 py-1 text-xs"
                        >
                          <Check className="w-3 h-3" /> OK
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(m.id);
                            setEditCoef(String(m.coefficient_defaut));
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="w-3 h-3" /> Coef.
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <ErrMsg msg={error} />
        </div>

        {canWrite && (
          <div className="space-y-3 bg-muted rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Nouvelle matière</h4>
            <Field label="Code *">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="SVT" />
            </Field>
            <Field label="Libellé *">
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Groupe">
              <select value={form.groupe} onChange={(e) => setForm({ ...form, groupe: e.target.value })} className={inputCls}>
                {GROUPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coef. défaut">
                <input
                  type="number"
                  step="0.5"
                  value={form.coefficient_defaut}
                  onChange={(e) => setForm({ ...form, coefficient_defaut: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Obligatoire">
                <input
                  type="checkbox"
                  checked={form.est_obligatoire}
                  onChange={(e) => setForm({ ...form, est_obligatoire: e.target.checked })}
                  className="mt-2"
                />
              </Field>
            </div>
            <button
              onClick={() => create.mutate()}
              disabled={!form.code || !form.label || create.isPending}
              className={`${btnPrimary} w-full`}
            >
              {create.isPending ? "Création…" : "Ajouter"}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── SÉRIES ───

function TabSeries({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCoefs, setEditCoefs] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ code: string; label: string; niveau_id: string; coefs: Record<string, string> }>({
    code: "", label: "", niveau_id: "", coefs: {},
  });

  const { data: series } = useQuery({ queryKey: ["org", "series"], queryFn: () => api.get<Serie[]>("/secondaire/series") });
  const { data: matieres } = useQuery({ queryKey: ["org", "matieres"], queryFn: () => api.get<Matiere[]>("/secondaire/matieres") });
  const { data: niveaux } = useQuery({ queryKey: ["niveaux"], queryFn: () => api.get<Niveau[]>("/secondaire/niveaux") });
  const lyceeNiveaux = niveaux?.filter((n) => n.type_etablissement === "lycee");

  const create = useMutation({
    mutationFn: () =>
      api.post<Serie>("/secondaire/series", {
        code: form.code,
        label: form.label,
        niveau_id: Number(form.niveau_id),
        matieres_obligatoires: Object.entries(form.coefs)
          .filter(([, c]) => c !== "")
          .map(([mid, c]) => ({ matiere_id: Number(mid), coefficient: Number(c) || 1 })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "series"] });
      setForm({ code: "", label: "", niveau_id: "", coefs: {} });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création série"),
  });

  const patch = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.patch<Serie>(`/secondaire/series/${id}`, {
        label: editLabel,
        matieres_obligatoires: Object.entries(editCoefs)
          .filter(([, c]) => c !== "")
          .map(([mid, c]) => ({ matiere_id: Number(mid), coefficient: Number(c) || 1 })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "series"] });
      setEditingId(null);
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur modification série"),
  });

  const [coefsSerieId, setCoefsSerieId] = useState<number | null>(null);
  const [coefsData, setCoefsData] = useState<CoefMatiere[]>([]);
  const [coefsEdit, setCoefsEdit] = useState<Record<string, string>>({});
  const [coefsMsg, setCoefsMsg] = useState("");
  const [coefsLoading, setCoefsLoading] = useState(false);

  async function openCoefs(s: Serie) {
    if (coefsSerieId === s.id) {
      setCoefsSerieId(null);
      return;
    }
    setCoefsSerieId(s.id);
    setCoefsMsg("");
    setCoefsLoading(true);
    try {
      const data = await api.get<CoefMatiere[]>(`/secondaire/coefs/series/${s.id}`);
      setCoefsData(data);
      setCoefsEdit(Object.fromEntries(data.map((c) => [String(c.matiere_id), String(c.coefficient_effectif)])));
    } catch (e) {
      setCoefsMsg(e instanceof ApiError ? e.message : "Erreur chargement coefs");
    } finally {
      setCoefsLoading(false);
    }
  }

  async function saveCoefs() {
    if (coefsSerieId === null) return;
    setCoefsMsg("");
    const surcharges = Object.entries(coefsEdit)
      .filter(([mid, v]) => {
        const national = coefsData.find((c) => String(c.matiere_id) === mid)?.coefficient_national;
        return national !== undefined && Number(v) !== national;
      })
      .map(([mid, v]) => ({ matiere_id: Number(mid), coefficient: Number(v) || 1 }));
    try {
      const data = await api.patch<CoefMatiere[]>(`/secondaire/coefs/series/${coefsSerieId}`, {
        matieres: surcharges,
      });
      setCoefsData(data);
      setCoefsEdit(Object.fromEntries(data.map((c) => [String(c.matiere_id), String(c.coefficient_effectif)])));
      setCoefsMsg(`Surcharges enregistrées (${surcharges.length} matière(s)).`);
    } catch (e) {
      setCoefsMsg(e instanceof ApiError ? e.message : "Erreur enregistrement coefs");
    }
  }

  function openEdit(s: Serie) {
    setEditingId(s.id);
    setEditLabel(s.label);
    setEditCoefs(Object.fromEntries(Object.entries(s.coefficients).map(([k, v]) => [k, String(v)])));
  }

  return (
    <Section title={`Séries lycée (${series?.length ?? 0})`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ul className="divide-y divide-card-border">
          {series?.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {s.code} — {s.label}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({niveaux?.find((n) => n.id === s.niveau_id)?.label ?? `niveau #${s.niveau_id}`})
                  </span>{" "}
                  {s.is_local ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">Locale</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Nationale</span>
                  )}
                </span>
                {canWrite && s.is_local && (
                  <button onClick={() => (editingId === s.id ? setEditingId(null) : openEdit(s))} className={btnGhost}>
                    {editingId === s.id ? "Fermer" : "Modifier"}
                  </button>
                )}
                {canWrite && !s.is_local && (
                  <span className="text-xs text-gray-300" title="Série nationale : lecture seule">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                <button onClick={() => openCoefs(s)} className={btnGhost} title="Coefficients effectifs (surcharge locale)">
                  {coefsSerieId === s.id ? "Fermer coefs" : "Coefs"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(s.coefficients).length} matière(s) obligatoire(s) :
                {" "}
                {Object.entries(s.coefficients)
                  .map(([mid, coef]) => `${matieres?.find((m) => m.id === Number(mid))?.label ?? `#${mid}`} (${coef})`)
                  .join(", ") || "aucune"}
              </p>
              {editingId === s.id && (
                <div className="mt-3 space-y-2 bg-muted rounded-lg border border-border p-3">
                  <Field label="Libellé">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputCls} />
                  </Field>
                  <div className="space-y-1">
                    {matieres?.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editCoefs[String(m.id)] !== undefined}
                          onChange={(e) => {
                            const next = { ...editCoefs };
                            if (e.target.checked) next[String(m.id)] = "1";
                            else delete next[String(m.id)];
                            setEditCoefs(next);
                          }}
                        />
                        <span className="flex-1">{m.label}</span>
                        {editCoefs[String(m.id)] !== undefined && (
                          <input
                            type="number"
                            step="0.5"
                            value={editCoefs[String(m.id)]}
                            onChange={(e) => setEditCoefs({ ...editCoefs, [String(m.id)]: e.target.value })}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
                            placeholder="Coef."
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <ErrMsg msg={error} />
                  <button onClick={() => patch.mutate({ id: s.id })} disabled={patch.isPending} className={btnPrimary}>
                    {patch.isPending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              )}
              {coefsSerieId === s.id && (
                <div className="mt-3 bg-muted rounded-lg border border-border p-3">
                  <h4 className="text-sm font-semibold mb-2">
                    Coefficients effectifs {s.code} — surcharge locale (établissement)
                  </h4>
                  {coefsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : (
                    <>
                      <table className="w-full text-sm mb-2">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground border-b border-border">
                            <th className="py-1">Matière</th>
                            <th>National</th>
                            <th>Effectif local</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                          {coefsData.map((c) => (
                            <tr key={c.matiere_id}>
                              <td className="py-1">{c.matiere_label}</td>
                              <td className="py-1">{c.coefficient_national}</td>
                              <td className="py-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={coefsEdit[String(c.matiere_id)] ?? ""}
                                  onChange={(e) => setCoefsEdit({ ...coefsEdit, [String(c.matiere_id)]: e.target.value })}
                                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {coefsMsg && <p className={`text-xs mb-2 ${coefsMsg.startsWith("Surcharges") ? "text-green-700" : "text-red-600"}`}>{coefsMsg}</p>}
                      {canWrite && (
                        <button onClick={saveCoefs} className={btnPrimary}>
                          Enregistrer les surcharges
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
          {series?.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aucune série.</li>}
        </ul>

        {canWrite && (
          <div className="space-y-3 bg-muted rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Nouvelle série</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code *">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="S" />
              </Field>
              <Field label="Libellé *">
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} placeholder="Scientifique" />
              </Field>
            </div>
            <Field label="Niveau *">
              <select value={form.niveau_id} onChange={(e) => setForm({ ...form, niveau_id: e.target.value })} className={inputCls}>
                <option value="">— Choisir —</option>
                {lyceeNiveaux?.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-muted-foreground">Matières obligatoires et coefficients :</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {matieres?.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.coefs[String(m.id)] !== undefined}
                    onChange={(e) => {
                      const next = { ...form.coefs };
                      if (e.target.checked) next[String(m.id)] = "1";
                      else delete next[String(m.id)];
                      setForm({ ...form, coefs: next });
                    }}
                  />
                  <span className="flex-1">{m.label}</span>
                  {form.coefs[String(m.id)] !== undefined && (
                    <input
                      type="number"
                      step="0.5"
                      value={form.coefs[String(m.id)]}
                      onChange={(e) => setForm({ ...form, coefs: { ...form.coefs, [String(m.id)]: e.target.value } })}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
                      placeholder="Coef."
                    />
                  )}
                </label>
              ))}
            </div>
            <ErrMsg msg={error} />
            <button
              onClick={() => create.mutate()}
              disabled={!form.code || !form.label || !form.niveau_id || create.isPending}
              className={`${btnPrimary} w-full`}
            >
              {create.isPending ? "Création…" : "Créer la série"}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── SALLES ───

function TabSalles({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ code: "", capacite: "30", emplacement: "" });

  const { data: salles } = useQuery({ queryKey: ["org", "salles"], queryFn: () => api.get<Salle[]>("/secondaire/salles") });

  const create = useMutation({
    mutationFn: () =>
      api.post<Salle>("/secondaire/salles", {
        code: form.code,
        capacite: Number(form.capacite) || 30,
        emplacement: form.emplacement,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "salles"] });
      setForm({ code: "", capacite: "30", emplacement: "" });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création salle"),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Salle> }) =>
      api.patch<Salle>(`/secondaire/salles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "salles"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur modification salle"),
  });

  return (
    <Section title={`Salles (${salles?.length ?? 0})`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-card-border">
                <th className="py-2">Code</th>
                <th>Capacité</th>
                <th>Emplacement</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {salles?.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-mono text-xs">{s.code}</td>
                  <td className="py-2">
                    {canWrite ? (
                      <input
                        type="number"
                        defaultValue={s.capacite}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== s.capacite)
                            patch.mutate({ id: s.id, data: { capacite: Number(e.target.value) || 30 } });
                        }}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      s.capacite
                    )}
                  </td>
                  <td className="py-2">
                    {canWrite ? (
                      <input
                        defaultValue={s.emplacement}
                        onBlur={(e) => {
                          if (e.target.value !== s.emplacement)
                            patch.mutate({ id: s.id, data: { emplacement: e.target.value } });
                        }}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      s.emplacement
                    )}
                  </td>
                  <td className="py-2">
                    {canWrite ? (
                      <button
                        onClick={() => patch.mutate({ id: s.id, data: { is_active: !s.is_active } })}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-gray-500"
                        }`}
                      >
                        {s.is_active ? "active" : "inactive"}
                      </button>
                    ) : (
                      <span className={`text-xs ${s.is_active ? "text-green-700" : "text-gray-400"}`}>
                        {s.is_active ? "active" : "inactive"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ErrMsg msg={error} />
        </div>

        {canWrite && (
          <div className="space-y-3 bg-muted rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Nouvelle salle</h4>
            <Field label="Code *">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="S01" />
            </Field>
            <Field label="Capacité">
              <input
                type="number"
                value={form.capacite}
                onChange={(e) => setForm({ ...form, capacite: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Emplacement">
              <input value={form.emplacement} onChange={(e) => setForm({ ...form, emplacement: e.target.value })} className={inputCls} placeholder="Bloc A" />
            </Field>
            <button
              onClick={() => create.mutate()}
              disabled={!form.code || create.isPending}
              className={`${btnPrimary} w-full`}
            >
              {create.isPending ? "Création…" : "Ajouter"}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── AFFECTATIONS ───

function useEnseignants(canWrite: boolean) {
  return useQuery({
    queryKey: ["org", "enseignants"],
    queryFn: () => api.get<Membre[]>("/secondaire/membres"),
    enabled: canWrite,
  });
}

function TabAffectations({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [classeId, setClasseId] = useState<number | null>(null);
  const [form, setForm] = useState({ matiere_id: "", enseignant_id: "", est_principal: false });

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classe[]>("/secondaire/classes") });
  const { data: matieres } = useQuery({ queryKey: ["org", "matieres"], queryFn: () => api.get<Matiere[]>("/secondaire/matieres") });
  const { data: enseignants } = useEnseignants(canWrite);
  const { data: affectations } = useQuery({
    queryKey: ["org", "affectations", classeId],
    queryFn: () => api.get<Affectation[]>(`/secondaire/affectations?classe_id=${classeId}`),
    enabled: classeId !== null,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Affectation>("/secondaire/affectations", {
        classe_id: classeId,
        matiere_id: Number(form.matiere_id),
        enseignant_id: Number(form.enseignant_id),
        est_principal: form.est_principal,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "affectations", classeId] });
      setForm({ matiere_id: "", enseignant_id: "", est_principal: false });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur affectation"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/affectations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "affectations", classeId] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur suppression"),
  });

  const tchMembres = enseignants?.filter((m) => m.role === "tch" && m.is_active) ?? [];

  return (
    <Section title="Affectations des enseignants">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Field label="Classe">
            <select value={classeId ?? ""} onChange={(e) => setClasseId(Number(e.target.value) || null)} className={inputCls}>
              <option value="">— Choisir —</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {c.niveau.label}
                </option>
              ))}
            </select>
          </Field>
          {classeId && (
            <ul className="mt-4 divide-y divide-card-border">
              {affectations?.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {a.matiere_label} {a.est_principal && <span className="text-xs text-primary">(principal)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.enseignant_nom ?? "—"}</p>
                  </div>
                  {canWrite && (
                    <button
                      onClick={() => remove.mutate(a.id)}
                      className="text-muted-foreground hover:text-red-600"
                      title="Retirer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
              {affectations?.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">Aucune affectation dans cette classe.</li>
              )}
            </ul>
          )}
        </div>

        {canWrite && classeId && (
          <div className="lg:col-span-2 space-y-3 bg-muted rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Affecter un enseignant</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Matière *">
                <select value={form.matiere_id} onChange={(e) => setForm({ ...form, matiere_id: e.target.value })} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {matieres?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Enseignant *">
                <select value={form.enseignant_id} onChange={(e) => setForm({ ...form, enseignant_id: e.target.value })} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {tchMembres.map((m) => (
                    <option key={m.membership_id} value={m.membership_id}>
                      {m.prenom} {m.nom}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.est_principal}
                onChange={(e) => setForm({ ...form, est_principal: e.target.checked })}
              />
              Professeur principal de la classe
            </label>
            <ErrMsg msg={error} />
            <button
              onClick={() => create.mutate()}
              disabled={!form.matiere_id || !form.enseignant_id || create.isPending}
              className={btnPrimary}
            >
              {create.isPending ? "Affectation…" : "Affecter"}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── EMPLOI DU TEMPS ───

function TabEdt({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [classeId, setClasseId] = useState<number | null>(null);
  const [form, setForm] = useState({
    matiere_id: "", salle_id: "", enseignant_id: "", jour: "1",
    heure_debut: "08:00", heure_fin: "09:00",
  });

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classe[]>("/secondaire/classes") });
  const { data: matieres } = useQuery({ queryKey: ["org", "matieres"], queryFn: () => api.get<Matiere[]>("/secondaire/matieres") });
  const { data: salles } = useQuery({ queryKey: ["org", "salles"], queryFn: () => api.get<Salle[]>("/secondaire/salles") });
  const { data: enseignants } = useEnseignants(canWrite);
  const { data: seances } = useQuery({
    queryKey: ["org", "edt", classeId],
    queryFn: () => api.get<Seance[]>(`/secondaire/edt?classe_id=${classeId}`),
    enabled: classeId !== null,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Seance>("/secondaire/edt/seances", {
        classe_id: classeId,
        matiere_id: Number(form.matiere_id),
        salle_id: form.salle_id ? Number(form.salle_id) : undefined,
        enseignant_id: form.enseignant_id ? Number(form.enseignant_id) : undefined,
        jour: Number(form.jour),
        heure_debut: form.heure_debut,
        heure_fin: form.heure_fin,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "edt", classeId] });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création séance"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/edt/seances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "edt", classeId] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur suppression"),
  });

  const tchMembres = enseignants?.filter((m) => m.role === "tch" && m.is_active) ?? [];

  return (
    <Section title="Emploi du temps">
      <div className="mb-4">
        <Field label="Classe">
          <select value={classeId ?? ""} onChange={(e) => setClasseId(Number(e.target.value) || null)} className={`${inputCls} max-w-md`}>
            <option value="">— Choisir —</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {c.niveau.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {classeId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {JOURS.map((j) => (
              <div key={j.value} className="bg-muted rounded-lg border border-border p-3 min-h-40">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">{j.label}</h4>
                <ul className="space-y-1">
                  {seances
                    ?.filter((s) => s.jour === j.value)
                    .map((s) => (
                      <li key={s.id} className="rounded-md bg-white border border-border px-2 py-1.5 text-xs">
                        <p className="font-medium">
                          {s.heure_debut.slice(0, 5)}–{s.heure_fin.slice(0, 5)}
                        </p>
                        <p className="text-muted-foreground">{s.matiere_label}</p>
                        <p className="text-muted-foreground">
                          {[s.salle_code, s.enseignant_nom].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {canWrite && (
                          <button
                            onClick={() => remove.mutate(s.id)}
                            className="mt-1 text-muted-foreground hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  {seances?.filter((s) => s.jour === j.value).length === 0 && (
                    <li className="text-xs text-muted-foreground">—</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          <ErrMsg msg={error} />

          {canWrite && (
            <div className="mt-6 space-y-3 bg-muted rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold">Ajouter une séance</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Field label="Matière *">
                  <select value={form.matiere_id} onChange={(e) => setForm({ ...form, matiere_id: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    {matieres?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Jour *">
                  <select value={form.jour} onChange={(e) => setForm({ ...form, jour: e.target.value })} className={inputCls}>
                    {JOURS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Début *">
                  <input
                    type="time"
                    value={form.heure_debut}
                    onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Fin *">
                  <input
                    type="time"
                    value={form.heure_fin}
                    onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Salle">
                  <select value={form.salle_id} onChange={(e) => setForm({ ...form, salle_id: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    {salles
                      ?.filter((s) => s.is_active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Enseignant">
                  <select value={form.enseignant_id} onChange={(e) => setForm({ ...form, enseignant_id: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    {tchMembres.map((m) => (
                      <option key={m.membership_id} value={m.membership_id}>
                        {m.prenom} {m.nom}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                onClick={() => create.mutate()}
                disabled={!form.matiere_id || create.isPending}
                className={btnPrimary}
              >
                {create.isPending ? "Ajout…" : "Ajouter la séance"}
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

// ─── COURS / PROGRAMMES ───

function TabCours({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [matiereFilter, setMatiereFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitre, setEditTitre] = useState("");
  const [editHeures, setEditHeures] = useState("");
  const [form, setForm] = useState({
    niveau_id: "", matiere_id: "", titre: "", objectifs: "", heures_prevues: "1",
  });

  const { data: niveaux } = useQuery({ queryKey: ["niveaux"], queryFn: () => api.get<Niveau[]>("/secondaire/niveaux") });
  const { data: matieres } = useQuery({ queryKey: ["org", "matieres"], queryFn: () => api.get<Matiere[]>("/secondaire/matieres") });
  const params = new URLSearchParams();
  if (niveauFilter) params.set("niveau", niveauFilter);
  if (matiereFilter) params.set("matiere_id", matiereFilter);
  const qs = params.toString();
  const { data: cours } = useQuery({
    queryKey: ["org", "cours", qs],
    queryFn: () => api.get<Cours[]>(`/secondaire/cours${qs ? "?" + qs : ""}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Cours>("/secondaire/cours", {
        niveau_id: Number(form.niveau_id),
        matiere_id: Number(form.matiere_id),
        titre: form.titre,
        objectifs: form.objectifs,
        heures_prevues: Number(form.heures_prevues) || 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "cours"] });
      setForm({ niveau_id: "", matiere_id: "", titre: "", objectifs: "", heures_prevues: "1" });
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur création cours"),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Cours> }) =>
      api.patch<Cours>(`/secondaire/cours/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "cours"] });
      setEditingId(null);
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur modification cours"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/cours/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "cours"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur suppression cours"),
  });

  return (
    <Section title="Cours et programmes">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Filtrer par niveau">
              <select value={niveauFilter} onChange={(e) => setNiveauFilter(e.target.value)} className={inputCls}>
                <option value="">Tous</option>
                {niveaux?.map((n) => (
                  <option key={n.id} value={n.code}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Filtrer par matière">
              <select value={matiereFilter} onChange={(e) => setMatiereFilter(e.target.value)} className={inputCls}>
                <option value="">Toutes</option>
                {matieres?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <ul className="divide-y divide-card-border">
            {cours?.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editTitre}
                          onChange={(e) => setEditTitre(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="number"
                          value={editHeures}
                          onChange={(e) => setEditHeures(e.target.value)}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          title="Heures prévues"
                        />
                        <button
                          onClick={() =>
                            patch.mutate({
                              id: c.id,
                              data: { titre: editTitre, heures_prevues: Number(editHeures) || 1 },
                            })
                          }
                          className="flex items-center gap-1 rounded-md bg-primary text-white px-2 py-1 text-xs"
                        >
                          <Check className="w-3 h-3" /> OK
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm">
                          {c.titre}
                          <span className="text-muted-foreground font-normal"> — {c.heures_prevues} h</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.niveau_label} · {c.matiere_label}
                          {!c.is_active && <span className="ml-2 text-gray-400">(inactif)</span>}
                        </p>
                      </>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          editingId === c.id
                            ? setEditingId(null)
                            : (setEditingId(c.id), setEditTitre(c.titre), setEditHeures(String(c.heures_prevues)))
                        }
                        className="text-muted-foreground hover:text-primary"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove.mutate(c.id)}
                        className="text-muted-foreground hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {cours?.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Aucun cours. Filtrez ou créez-en un.</li>
            )}
          </ul>
          <ErrMsg msg={error} />
        </div>

        {canWrite && (
          <div className="space-y-3 bg-muted rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Nouveau cours</h4>
            <Field label="Niveau *">
              <select value={form.niveau_id} onChange={(e) => setForm({ ...form, niveau_id: e.target.value })} className={inputCls}>
                <option value="">— Choisir —</option>
                {niveaux?.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Matière *">
              <select value={form.matiere_id} onChange={(e) => setForm({ ...form, matiere_id: e.target.value })} className={inputCls}>
                <option value="">— Choisir —</option>
                {matieres?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titre *">
              <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className={inputCls} placeholder="Nombres entiers" />
            </Field>
            <Field label="Objectifs">
              <textarea
                value={form.objectifs}
                onChange={(e) => setForm({ ...form, objectifs: e.target.value })}
                className={inputCls}
                rows={3}
              />
            </Field>
            <Field label="Heures prévues">
              <input
                type="number"
                value={form.heures_prevues}
                onChange={(e) => setForm({ ...form, heures_prevues: e.target.value })}
                className={inputCls}
              />
            </Field>
            <button
              onClick={() => create.mutate()}
              disabled={!form.niveau_id || !form.matiere_id || !form.titre || create.isPending}
              className={`${btnPrimary} w-full`}
            >
              {create.isPending ? "Création…" : "Ajouter le cours"}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}
