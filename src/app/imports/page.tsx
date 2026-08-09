"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { API_BASE, ApiError } from "@/lib/api";
import { useRequireRoles } from "@/lib/roles";

interface Probleme {
  ligne: number;
  message: string;
}

interface BilanPaiements {
  montant_total: number;
  montant_sur_echeance: number;
  montant_sur_frais: number;
  montant_libre: number;
  versements_libres: number;
  eleves_conernes: number;
  impayes_restants: number;
}

interface Rapport {
  type: string;
  fichier: string;
  total: number;
  ok: number;
  crees: number;
  mis_a_jour: number;
  ignores: number;
  parents_crees: number;
  erreurs: Probleme[];
  avertissements: Probleme[];
  bilan: BilanPaiements | null;
}

interface Reference {
  niveaux: {
    code: string;
    label: string;
    type_etablissement: string;
    age_min: number;
    age_max: number;
  }[];
  classes: { label: string; niveau: string; serie: string | null }[];
  series: { code: string; niveau: string; label: string }[];
  trimestres: {
    label: string;
    position: number;
    start_date: string;
    end_date: string;
  }[];
  matieres: {
    code: string;
    label: string;
    groupe: string;
    coefficient_defaut: number;
  }[];
  frais: {
    label: string;
    montant: number;
    type: string;
    niveau: string | null;
    trimestre: string | null;
  }[];
}

const TYPES = [
  {
    code: "matieres",
    label: "1. Matières",
    desc: "Référentiel des matières de l'établissement",
    colonnes: "code, label, groupe, coefficient_defaut, est_obligatoire",
  },
  {
    code: "series",
    label: "2. Séries (lycée)",
    desc: "Séries avec matières obligatoires / optionnelles (format code:coef, séparées par |)",
    colonnes: "code, niveau, label, matieres_obligatoires, matieres_optionnelles",
  },
  {
    code: "frais",
    label: "3. Frais de scolarité",
    desc: "Frais par niveau et par trimestre (optionnels)",
    colonnes: "label, type, montant, niveau, trimestre, obligatoire",
  },
  {
    code: "classes",
    label: "4. Classes",
    desc: "Classes de l'année scolaire active (série requise au lycée)",
    colonnes: "label, niveau, serie, effectif_max",
  },
  {
    code: "eleves",
    label: "5. Élèves + parents",
    desc: "Inscription des élèves, création automatique des comptes et des parents (liés par téléphone)",
    colonnes:
      "classe, nom, prenom, matricule, sexe, date_naissance, lieu_naissance, boursier, redoublant, tel_parent_1, tel_parent_2, parent_nom, parent_prenom",
  },
  {
    code: "notes",
    label: "6. Notes",
    desc: "Notes sur 20 par élève, matière et trimestre (élève résolu par matricule)",
    colonnes: "classe, matricule, matiere, trimestre, type, valeur, coefficient, date, appreciation",
  },
  {
    code: "paiements",
    label: "7. Paiements",
    desc: "Encaissements : montant, mode, frais/échéance, payeur (téléphone ou nom)",
    colonnes: "classe, matricule, montant, mode, reference, frais, echeance, payeur",
  },
];

const btnPrimary =
  "rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2";
const btnOutline =
  "rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-muted flex items-center gap-2";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function Chips({ titre, items }: { titre: string; items: string[] }) {
  return (
    <div className="mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {items.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">
            Aucun pour le moment
          </span>
        ) : (
          items.map((s, i) => (
            <span
              key={i}
              className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 font-mono"
            >
              {s}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function AideRemplissage({ type, donnees }: { type: string; donnees: Reference }) {
  const niveaux = donnees.niveaux.map((n) => `${n.code} — ${n.label}`);
  const niveauxLycee = donnees.niveaux
    .filter((n) => n.type_etablissement === "lycee")
    .map((n) => `${n.code} — ${n.label}`);
  const trimestres = donnees.trimestres.map(
    (t) =>
      `${t.label} — ${t.position === 1 ? "1er" : `${t.position}ème`} Trimestre`
  );
  const matieres = donnees.matieres.map(
    (m) => `${m.code} — ${m.label} (coef ${m.coefficient_defaut})`
  );
  const series = donnees.series.map(
    (s) => `${s.code} (${s.niveau}) — ${s.label}`
  );
  const classes = donnees.classes.map((c) =>
    c.serie ? `${c.label} — ${c.niveau} (${c.serie})` : `${c.label} — ${c.niveau}`
  );
  const frais = donnees.frais.map((f) => {
    const scope = [
      f.trimestre ? `T${f.trimestre.replace("t", "")}` : "",
      f.niveau ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return `${f.label} — ${fmt(f.montant)} FCFA${scope ? ` (${scope})` : ""}`;
  });

  if (type === "classes") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Chips titre="Niveaux acceptés (colonne niveau)" items={niveaux} />
        <Chips titre="Séries existantes (colonne serie, lycée)" items={series} />
      </div>
    );
  }
  if (type === "series") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Chips titre="Niveaux (lycée uniquement)" items={niveauxLycee} />
        <Chips titre="Séries existantes" items={series} />
        <p className="text-[11px] text-muted-foreground md:col-span-2">
          Format des matières : <code className="font-mono">CODE:coef</code>{" "}
          séparés par <code className="font-mono">|</code> (ex.{" "}
          <code className="font-mono">MATH:5|FR:4</code>).
        </p>
      </div>
    );
  }
  if (type === "frais") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Chips titre="Niveaux (colonne niveau, optionnelle)" items={niveaux} />
        <Chips titre="Trimestres (colonne trimestre, optionnelle)" items={trimestres} />
        <p className="text-[11px] text-muted-foreground md:col-span-2">
          Types acceptés : scolarite, inscription, cantine, transport, uniforme,
          activite, autre. Trimestre vide = frais annuel (échéances découpées
          automatiquement par trimestre).
        </p>
      </div>
    );
  }
  if (type === "eleves") {
    return (
      <div>
        <Chips titre="Classes existantes (colonne classe)" items={classes} />
        <p className="text-[11px] text-muted-foreground">
          Écrivez le <strong>label exact</strong> de la classe (ex.{" "}
          <code className="font-mono">6A</code>). En cas d&apos;ambiguïté entre
          deux niveaux : <code className="font-mono">niveau:label</code> (ex.{" "}
          <code className="font-mono">6e:6A</code>).
        </p>
      </div>
    );
  }
  if (type === "notes") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Chips titre="Matières (colonne matiere)" items={matieres} />
        <Chips titre="Trimestres (colonne trimestre)" items={trimestres} />
        <p className="text-[11px] text-muted-foreground md:col-span-2">
          Types de notes acceptés : devoir, composition, examen, oral, pratique,
          devoir_maison, controle. Le coefficient est celui de la note (défaut 1).
        </p>
      </div>
    );
  }
  if (type === "paiements") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Chips titre="Frais de scolarité (colonne frais)" items={frais} />
        <Chips
          titre="Modes de paiement"
          items={["om", "wave", "virement", "especes", "cheque"]}
        />
        <p className="text-[11px] text-muted-foreground md:col-span-2">
          <code className="font-mono">echeance</code> = libellé exact de
          l&apos;échéance de l&apos;élève (ex.{" "}
          <code className="font-mono">Scolarité — 1er Trimestre</code>), visible
          dans Finances. Laissez frais/échéance vides pour un versement libre
          (signalé dans le rapport).
        </p>
      </div>
    );
  }
  return (
    <Chips
      titre="Groupes acceptés (colonne groupe)"
      items={["scientifique", "litteraire", "langue", "sport", "technologique", "artistique", "autre"]}
    />
  );
}

export default function ImportsPage() {
  useRequireRoles(["owner"]);
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>("matieres");
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [reference, setReference] = useState<Reference | null>(null);
  const [rafraichir, setRafraichir] = useState(0);

  useEffect(() => {
    let actif = true;
    fetch(`${API_BASE}/onboarding/reference`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (actif) setReference(data);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [rafraichir, type]);

  const meta = TYPES.find((t) => t.code === type)!;

  async function envoyer(dryRun: boolean) {
    if (!fichier) return;
    setEnCours(true);
    setMsg("");
    setErreur("");
    const fd = new FormData();
    fd.append("file", fichier);
    try {
      const res = await fetch(
        `${API_BASE}/onboarding/${dryRun ? "dry-run" : "import"}?type=${type}`,
        { method: "POST", body: fd, credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new ApiError(res.status, data.detail || res.statusText);
      setRapport(data);
      if (!dryRun) {
        setMsg(
          `Import appliqué : ${data.crees} créé(s), ${data.mis_a_jour} déjà présent(s)${
            data.parents_crees ? `, ${data.parents_crees} parent(s) créé(s)` : ""
          }.`
        );
        queryClient.invalidateQueries();
        setRafraichir((n) => n + 1);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary-dark" /> Import / Onboarding
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Importez en masse les données de votre établissement (CSV ou Excel). Chaque
            import est d&apos;abord <strong>analysé</strong> (aucune écriture), puis{" "}
            <strong>appliqué</strong> : les lignes valides sont importées, les lignes en
            erreur sont ignorées avec un rapport détaillé.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ordre recommandé :{" "}
            {TYPES.map((t) => t.label.replace(/^\d+\.\s*/, "")).join(" → ")}. Un élève
            existant (même matricule ou même classe) est mis à jour, jamais dupliqué.
          </p>
        </header>

        {msg && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </p>
        )}
        {erreur && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {erreur}
          </p>
        )}

        <section className="bg-card rounded-lg border border-card-border shadow-card p-5 mb-6">
          <h3 className="font-semibold mb-4">1. Choisissez le type de données</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => {
                  setType(t.code);
                  setRapport(null);
                  setMsg("");
                  setErreur("");
                }}
                className={`text-left rounded-md border p-3 transition-colors ${
                  type === t.code
                    ? "border-primary bg-primary-light ring-1 ring-primary"
                    : "border-gray-200 hover:border-primary hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-semibold text-gray-900">
                  {t.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
          <h3 className="font-semibold mb-1">
            2. Téléchargez le modèle, remplissez-le, puis importez-le
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Le modèle contient des lignes d&apos;exemple à remplacer. Colonnes attendues :{" "}
            <code className="text-primary-dark">{meta.colonnes}</code>
          </p>
          {reference && (
            <div className="rounded-md border border-card-border bg-muted/50 p-3 mb-4">
              <h4 className="text-xs font-semibold text-primary-dark mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Aide au remplissage — valeurs
                disponibles dans votre établissement
              </h4>
              <AideRemplissage type={type} donnees={reference} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <a
              href={`${API_BASE}/onboarding/templates/${type}?format=csv`}
              className={btnOutline}
              download
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Modèle CSV
            </a>
            <a
              href={`${API_BASE}/onboarding/templates/${type}?format=xlsx`}
              className={btnOutline}
              download
            >
              <Download className="w-3.5 h-3.5" /> Modèle Excel (.xlsx)
            </a>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFichier(e.target.files?.[0] ?? null);
              setRapport(null);
              setMsg("");
              setErreur("");
            }}
            className="text-xs text-gray-600 mb-4"
          />
          {fichier && (
            <p className="text-xs text-muted-foreground mb-4">
              Fichier : {fichier.name} — {meta.label.replace(/^\d+\.\s*/, "")}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              className={btnPrimary}
              disabled={!fichier || enCours}
              onClick={() => envoyer(true)}
            >
              {enCours ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Analyser (sans écrire)
            </button>
            <button
              className={btnPrimary}
              disabled={!fichier || enCours || !rapport}
              onClick={() => envoyer(false)}
            >
              Importer les données
            </button>
            {rapport && rapport.erreurs.length > 0 && (
              <span className="text-xs text-red-600">
                {rapport.ignores} ligne(s) en erreur seront ignorées à L&apos;import.
              </span>
            )}
          </div>
        </section>

        {rapport && (
          <section className="bg-card rounded-lg border border-card-border shadow-card p-5 mt-6">
            <h3 className="font-semibold mb-4">
              Rapport d&apos;analyse — {rapport.fichier}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                {rapport.total} ligne(s)
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                {rapport.ok} valide(s)
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-primary-light text-primary-dark">
                {rapport.crees} à créer
              </span>
              {rapport.mis_a_jour > 0 && (
                <span className="rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                  {rapport.mis_a_jour} déjà présent(s)
                </span>
              )}
              {rapport.parents_crees > 0 && (
                <span className="rounded-full px-3 py-1 text-xs font-medium bg-violet-100 text-violet-dark">
                  {rapport.parents_crees} parent(s)
                </span>
              )}
              {rapport.ignores > 0 && (
                <span className="rounded-full px-3 py-1 text-xs font-medium bg-red-100 text-red-800">
                  {rapport.ignores} en erreur
                </span>
              )}
            </div>

            {rapport.bilan && (
              <div className="rounded-md border border-primary-light bg-primary-light/40 p-3 mb-4">
                <h4 className="text-xs font-semibold text-primary-dark mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Récapitulatif financier
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-800">
                    Total du fichier : {fmt(rapport.bilan.montant_total)} FCFA
                  </span>
                  {rapport.bilan.montant_sur_echeance > 0 && (
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                      {fmt(rapport.bilan.montant_sur_echeance)} FCFA sur échéance
                    </span>
                  )}
                  {rapport.bilan.montant_sur_frais > 0 && (
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                      {fmt(rapport.bilan.montant_sur_frais)} FCFA sur frais
                    </span>
                  )}
                  {rapport.bilan.versements_libres > 0 && (
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800">
                      {rapport.bilan.versements_libres} versement(s) libre(s) —{" "}
                      {fmt(rapport.bilan.montant_libre)} FCFA
                    </span>
                  )}
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-800">
                    {rapport.bilan.eleves_conernes} élève(s) concerné(s)
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      rapport.bilan.impayes_restants > 0
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    Impayés restants après import :{" "}
                    {fmt(rapport.bilan.impayes_restants)} FCFA
                  </span>
                </div>
              </div>
            )}

            {rapport.avertissements.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Avertissements
                </h4>
                <ul className="divide-y divide-card-border rounded-md border border-amber-200 bg-amber-50">
                  {rapport.avertissements.map((a, i) => (
                    <li key={i} className="px-3 py-2 text-xs text-amber-900">
                      <span className="font-mono text-amber-700 mr-2">Ligne {a.ligne}</span>
                      {a.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rapport.erreurs.length > 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Lignes ignorées
                </h4>
                <ul className="divide-y divide-card-border rounded-md border border-red-200 bg-red-50">
                  {rapport.erreurs.map((e, i) => (
                    <li key={i} className="px-3 py-2 text-xs text-red-800">
                      <span className="font-mono text-red-600 mr-2">Ligne {e.ligne}</span>
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Aucune erreur — le fichier est prêt à être importé.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

