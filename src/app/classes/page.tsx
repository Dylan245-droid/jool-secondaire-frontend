"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireCapabilities, useRequireRoles, useSessionUser } from "@/lib/roles";
import { Copy, Download, Upload, Users, Plus, QrCode, History, RefreshCw, Play } from "lucide-react";

interface Niveau {
  id: number;
  code: string;
  label: string;
  type_etablissement: string;
}

interface SchoolYear {
  id: number;
  label: string;
  is_active: boolean;
}

interface Serie {
  id: number;
  code: string;
  label: string;
  niveau_id: number;
}

interface Classe {
  id: number;
  label: string;
  niveau: { code: string; label: string };
  serie?: Serie | null;
  school_year_id: number;
  effectif: number;
  effectif_max: number;
}

interface Inscription {
  id: number;
  etudiant_nom: string;
  etudiant_prenom: string;
  matricule?: string;
  statut: string;
}

interface PromotionEleve {
  inscription_id: number;
  nom: string;
  prenom: string;
  decision: string;
  statut: string;
  cible?: string | null;
  cible_classe_id?: number | null;
}

interface PromotionSimulation {
  classe_id: number;
  annee_source: string;
  annee_cible?: string | null;
  annee_cible_existe: boolean;
  effectif: number;
  promus: number;
  redoublants: number;
  diplomes: number;
  manuels: number;
  exclus: number;
  cibles_manquantes: string[];
  eleves: PromotionEleve[];
}

interface PortabiliteInfos {
  inscription_id: number;
  consentement: boolean;
  transfere: boolean;
  qr_data_url?: string;
  export_url?: string;
}

interface ExportPortabilite {
  version: string;
  exported_at: string;
  eleve: { matricule: string; nom: string; prenom: string };
  parcours: { annee: string; classe: string; niveau: string; etablissement: string }[];
  bulletins: { trimestre: string; annee: string; moyenne_generale: number; mention: string }[];
  signature: string;
}

export default function ClassesPage() {
  useRequireRoles(["owner", "adm", "tch"]);
  useRequireCapabilities("scolarite");
  const sessionUser = useSessionUser();
  const canGerePromotion = sessionUser?.role === "owner" || sessionUser?.role === "adm";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<string>("");
  const [promotion, setPromotion] = useState<PromotionSimulation | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  // Portabilité
  const [selectedInscription, setSelectedInscription] = useState<number | null>(null);
  const [portMsg, setPortMsg] = useState("");

  const [form, setForm] = useState({ label: "", niveau_id: "", school_year_id: "", effectif_max: "35", serie_id: "" });
  const [error, setError] = useState("");

  const { data: niveaux } = useQuery({ queryKey: ["niveaux"], queryFn: () => api.get<Niveau[]>("/secondaire/niveaux") });
  const { data: schoolYears } = useQuery({ queryKey: ["school-years"], queryFn: () => api.get<SchoolYear[]>("/secondaire/school-years") });
  const selectedNiveau = niveaux?.find((n) => String(n.id) === form.niveau_id);
  const { data: series } = useQuery({
    queryKey: ["series", form.niveau_id],
    queryFn: () => api.get<Serie[]>(`/secondaire/series?niveau_id=${form.niveau_id}`),
    enabled: !!form.niveau_id,
  });
  const { data: classes, isLoading } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classe[]>("/secondaire/classes") });
  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions", selectedClasse],
    queryFn: () => api.get<Inscription[]>(`/secondaire/inscriptions?classe_id=${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const selectedMatricule = inscriptions?.find((i) => i.id === selectedInscription)?.matricule;
  const { data: portabilite } = useQuery({
    queryKey: ["portabilite", selectedMatricule],
    queryFn: () => api.get<PortabiliteInfos>(`/portability/student/${selectedMatricule}/qr`),
    enabled: !!selectedMatricule,
  });
  const { data: exportData } = useQuery({
    queryKey: ["portabilite-export", selectedMatricule],
    queryFn: () => api.get<ExportPortabilite>(`/portability/student/${selectedMatricule}/export`),
    enabled: !!selectedMatricule && !!portabilite?.consentement,
  });
  const { data: historique } = useQuery({
    queryKey: ["portabilite-history", selectedMatricule],
    queryFn: () => api.get<ExportPortabilite | null>(`/portability/student/${selectedMatricule}/history`),
    enabled: !!selectedMatricule,
  });

  const createClasse = useMutation({
    mutationFn: () =>
      api.post<Classe>("/secondaire/classes", {
        label: form.label,
        niveau_id: Number(form.niveau_id),
        school_year_id: Number(form.school_year_id),
        effectif_max: Number(form.effectif_max) || 35,
        serie_id: form.serie_id ? Number(form.serie_id) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowForm(false);
      setForm({ label: "", niveau_id: "", school_year_id: "", effectif_max: "35", serie_id: "" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erreur création classe"),
  });

  async function importCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClasse) return;
    const file = (e.currentTarget.elements.namedItem("csv") as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setImportResult("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || "/api/v2"}/secondaire/classes/${selectedClasse}/import-eleves`,
        { method: "POST", body: fd, credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new ApiError(res.status, data.detail || res.statusText);
      setImportResult(`Importés : ${data.importes}, ignorés : ${data.ignores}`);
      queryClient.invalidateQueries({ queryKey: ["inscriptions", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (err) {
      setImportResult(err instanceof Error ? `Erreur : ${err.message}` : "Erreur d'import");
    }
  }

  async function importPortabilite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPortMsg("");
    const file = (e.currentTarget.elements.namedItem("json") as HTMLInputElement).files?.[0];
    if (!file || !selectedClasse) return;
    try {
      const exportJson = JSON.parse(await file.text());
      const res = await api.post<{ matricule: string; classe_id: number; historique: boolean }>(
        "/portability/import",
        { export: exportJson, classe_id: selectedClasse }
      );
      setPortMsg(
        `Élève ${res.matricule} importé en classe ${res.classe_id}` +
          (res.historique ? " (historique complet restauré en lecture)." : ".")
      );
      queryClient.invalidateQueries({ queryKey: ["inscriptions", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (err) {
      setPortMsg(err instanceof Error ? `Erreur : ${err.message}` : "Erreur d'import");
    }
  }

  function copierExport() {
    if (!exportData) return;
    navigator.clipboard.writeText(JSON.stringify(exportData));
    setPortMsg("Export copié dans le presse-papier (à fournir à l'établissement d'accueil).");
  }

  function telechargerExport() {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portabilite_${selectedMatricule}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-muted">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Classes & Élèves</h2>
            <p className="text-sm text-muted-foreground">Gestion des classes, inscriptions et import CSV</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" /> Nouvelle classe
          </button>
        </header>

        {showForm && (
          <div className="mb-8 bg-card rounded-lg border border-card-border shadow-card p-5 max-w-lg">
            <h3 className="font-semibold mb-4">Créer une classe</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label (ex : 6A)</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Effectif max</label>
                  <input
                    type="number"
                    value={form.effectif_max}
                    onChange={(e) => setForm({ ...form, effectif_max: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Niveau</label>
                <select
                  value={form.niveau_id}
                  onChange={(e) => setForm({ ...form, niveau_id: e.target.value, serie_id: "" })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {niveaux?.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.type_etablissement})
                    </option>
                  ))}
                </select>
              </div>
              {selectedNiveau?.type_etablissement === "lycee" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Série <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.serie_id}
                    onChange={(e) => setForm({ ...form, serie_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {series?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Année scolaire</label>
                <select
                  value={form.school_year_id}
                  onChange={(e) => setForm({ ...form, school_year_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {schoolYears?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.is_active ? "(active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={() => createClasse.mutate()}
                disabled={
                  !form.label ||
                  !form.niveau_id ||
                  !form.school_year_id ||
                  (selectedNiveau?.type_etablissement === "lycee" && !form.serie_id) ||
                  createClasse.isPending
                }
                className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
              >
                {createClasse.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
            <h3 className="font-semibold mb-4">Classes ({classes?.length ?? 0})</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <ul className="divide-y divide-card-border">
                {classes?.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelectedClasse(c.id === selectedClasse ? null : c.id);
                        setPromotion(null);
                        setPromoMsg("");
                      }}
                      className={`w-full flex items-center justify-between py-3 text-left hover:bg-muted px-2 rounded ${
                        c.id === selectedClasse ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="font-medium text-sm">
                        {c.label}{" "}
                        <span className="text-muted-foreground font-normal">
                          — {c.niveau.label}
                          {c.serie ? ` (${c.serie.code})` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {c.effectif}/{c.effectif_max}
                      </span>
                    </button>
                  </li>
                ))}
                {classes?.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Aucune classe créée.</p>
                )}
              </ul>
            )}
          </section>

          {canGerePromotion && selectedClasse && (
            <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
              <h3 className="font-semibold mb-3">Promotion de masse (fin d&apos;année)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Basée sur les décisions du conseil de classe du 3ème trimestre. Les promus
                partent vers le niveau supérieur, les redoublants restent dans la même classe
                (même niveau, même série) de l&apos;année suivante.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={async () => {
                    setPromoMsg("");
                    try {
                      const data = await api.post<PromotionSimulation>(
                        `/secondaire/promotions/classe/${selectedClasse}/simuler`
                      );
                      setPromotion(data);
                    } catch (e) {
                      setPromoMsg(e instanceof ApiError ? e.message : "Erreur simulation");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Simuler
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm("Exécuter la promotion : les inscriptions de l'année courante seront clôturées et les élèves réinscrits dans l'année suivante. Continuer ?")) return;
                    setPromoMsg("");
                    try {
                      const data = await api.post<{ creees: number; sans_cible: string[] }>(
                        `/secondaire/promotions/classe/${selectedClasse}/executer`
                      );
                      setPromoMsg(
                        `${data.creees} réinscription(s) créée(s)` +
                          (data.sans_cible.length ? ` — sans cible : ${data.sans_cible.join(", ")}` : "")
                      );
                      setPromotion(null);
                      queryClient.invalidateQueries({ queryKey: ["classes"] });
                      queryClient.invalidateQueries({ queryKey: ["inscriptions", selectedClasse] });
                    } catch (e) {
                      setPromoMsg(e instanceof ApiError ? e.message : "Erreur exécution");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-dark"
                >
                  <Play className="w-3.5 h-3.5" /> Exécuter
                </button>
              </div>
              {promoMsg && <p className="text-xs mb-3 rounded-md bg-secondary px-3 py-2 text-primary-dark">{promoMsg}</p>}
              {promotion && (
                <div className="text-xs space-y-2">
                  <p className="text-muted-foreground">
                    {promotion.annee_source} → {promotion.annee_cible ?? "année suivante"}
                    {!promotion.annee_cible_existe && " (à créer — onglet Organisation > Année)"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Promus : {promotion.promus}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Redoublants : {promotion.redoublants}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Diplômés : {promotion.diplomes}</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-gray-600">À traiter : {promotion.manuels}</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">Exclus : {promotion.exclus}</span>
                  </div>
                  {promotion.cibles_manquantes.length > 0 && (
                    <p className="text-red-600">
                      Cibles manquantes (créer les classes dans l&apos;année suivante) :{" "}
                      {promotion.cibles_manquantes.join(" ; ")}
                    </p>
                  )}
                  <ul className="max-h-48 overflow-y-auto divide-y divide-card-border border border-border rounded-md">
                    {promotion.eleves.map((e) => (
                      <li key={e.inscription_id} className="flex items-center justify-between px-2 py-1.5">
                        <span>
                          {e.nom} {e.prenom} — {e.decision}
                        </span>
                        <span className="text-muted-foreground">{e.cible ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
            <h3 className="font-semibold mb-4">
              {selectedClasse
                ? `Élèves de la classe (${inscriptions?.length ?? 0})`
                : "Élèves — sélectionnez une classe"}
            </h3>
            {selectedClasse ? (
              <>
                <form onSubmit={importCsv} className="flex items-center gap-3 mb-4">
                  <input
                    name="csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="text-xs text-gray-600"
                  />
                  <button className="flex items-center gap-1 rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                    <Upload className="w-3.5 h-3.5" /> Importer CSV
                  </button>
                </form>
                {importResult && (
                  <p className="text-xs mb-3 rounded-md bg-secondary px-3 py-2 text-primary-dark">{importResult}</p>
                )}
                <ul className="divide-y divide-card-border max-h-96 overflow-y-auto">
                  {inscriptions?.map((i) => (
                    <li key={i.id}>
                      <button
                        onClick={() =>
                          setSelectedInscription(i.id === selectedInscription ? null : i.id)
                        }
                        className={`w-full flex items-center justify-between py-2 text-sm text-left hover:bg-muted px-2 rounded ${
                          i.id === selectedInscription ? "bg-secondary" : ""
                        }`}
                      >
                        <span>
                          {i.etudiant_nom} {i.etudiant_prenom}
                          {i.matricule && <span className="text-xs text-muted-foreground ml-2">({i.matricule})</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{i.statut}</span>
                      </button>
                    </li>
                  ))}
                  {inscriptions?.length === 0 && (
                    <p className="text-sm text-muted-foreground py-3">
                      Aucun élève. CSV : colonnes <code>nom,prenom</code> (option : sexe, date_naissance,
                      lieu_naissance, matricule, boursier, redoublant).
                    </p>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cliquez sur une classe pour voir ses élèves.</p>
            )}
          </section>
        </div>

        {selectedInscription && (
          <section className="mt-6 bg-card rounded-lg border border-card-border shadow-card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-purple-600" /> Portabilité —
              {inscriptions?.find((i) => i.id === selectedInscription)?.etudiant_nom}{" "}
              {inscriptions?.find((i) => i.id === selectedInscription)?.etudiant_prenom} (
              {selectedMatricule})
            </h3>
            {portMsg && (
              <p className="text-sm mb-3 rounded-md bg-secondary px-3 py-2 text-primary-dark max-w-xl">{portMsg}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <p className="text-sm">
                  <span className="font-medium">Consentement parent :</span>{" "}
                  {portabilite?.consentement ? (
                    <span className="text-green-700">accordé</span>
                  ) : (
                    <span className="text-red-600">non accordé — export et QR indisponibles</span>
                  )}
                </p>
                {portabilite?.consentement && portabilite.qr_data_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">QR portabilité (scannable par l&apos;établissement d&apos;accueil) :</p>
                    <img
                      src={portabilite.qr_data_url}
                      alt={`QR portabilité ${selectedMatricule}`}
                      className="w-40 h-40 border border-border rounded-lg"
                    />
                    {portabilite.export_url && (
                      <p className="text-xs text-muted-foreground mt-2 break-all">
                        URL publique signée :{" "}
                        <code className="text-[10px]">{portabilite.export_url.slice(0, 80)}…</code>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Export JSON signé (historique complet)</p>
                {portabilite?.consentement ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={telechargerExport}
                      className="flex items-center gap-1 rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </button>
                    <button
                      onClick={copierExport}
                      className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copier
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Demandez au parent d&apos;accorder le consentement dans l&apos;espace parent.
                  </p>
                )}
                {exportData && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Voir le contenu de l&apos;export ({JSON.stringify(exportData).length} octets)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto bg-muted rounded-md p-3 text-[10px] whitespace-pre-wrap">
                      {JSON.stringify(exportData, null, 2).slice(0, 4000)}
                    </pre>
                  </details>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> Parcours & historique
                </p>
                {historique && historique.parcours?.length ? (
                  <ul className="divide-y divide-card-border text-sm">
                    {historique.parcours.map((p, idx) => (
                      <li key={idx} className="py-2">
                        <p className="font-medium">
                          {p.classe} ({p.niveau}) — {p.annee}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.etablissement}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun parcours antérieur.</p>
                )}
                {portabilite?.transfere && historique?.bulletins?.length ? (
                  <>
                    <p className="text-sm font-medium mt-3 mb-1">Bulletins antérieurs (importés) :</p>
                    <ul className="divide-y divide-card-border text-sm">
                      {historique.bulletins.map((b, idx) => (
                        <li key={idx} className="py-1.5 text-xs">
                          {b.annee} — {b.trimestre} :{" "}
                          <span className="font-medium">{b.moyenne_generale}/20</span> ({b.mention})
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-6 border-t border-card-border pt-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-purple-600" /> Importer un élève transféré (fichier JSON signé)
              </p>
              <form onSubmit={importPortabilite} className="flex items-center gap-3">
                <input
                  name="json"
                  type="file"
                  accept=".json,application/json"
                  className="text-xs text-gray-600"
                />
                <button className="flex items-center gap-1 rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                  Importer dans la classe sélectionnée
                </button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                L&apos;élève est réinscrit dans la classe actuellement sélectionnée, avec son parcours et ses
                bulletins antérieurs consultables (lecture seule).
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
