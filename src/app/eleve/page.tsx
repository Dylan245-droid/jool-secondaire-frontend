"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { fmtDate } from "@/lib/utils";
import {
  Award, BookOpen, FileDown, FileText, GraduationCap, UserX, Wallet,
} from "lucide-react";

interface BulletinLeger {
  id: number;
  trimestre_label: string;
  moyenne_generale: number | null;
  rang_classe: number | null;
  mention: string | null;
  is_emise: boolean;
}

interface Apercu {
  inscription_id: number;
  matricule: string | null;
  nom: string;
  prenom: string;
  classe: string;
  bulletins: BulletinLeger[];
}

interface AbsenceEleve {
  id: number;
  date: string;
  type: string;
  statut: string;
  motif: string;
  matiere: string | null;
}

interface SanctionEleve {
  id: number;
  type: string;
  date_sanction: string;
  description: string;
  levee: boolean;
}

interface VieScolaireEleve {
  inscription_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  classe_label: string;
  trimestre_courant: string | null;
  bulletins_emis: number;
  absences: AbsenceEleve[];
  sanctions: SanctionEleve[];
}

interface SeanceCahier {
  id: number;
  matiere_code: string;
  matiere_label: string;
  date_seance: string;
  numero_seance: number;
  contenu_cours: string;
  devoirs: string;
  ressources: string[];
  enseignant_nom: string;
}

interface CahierTextesEleve {
  classe_label: string;
  trimestre: string | null;
  seances: SeanceCahier[];
}

interface FinancesEleve {
  inscription_id: number;
  total_du: number;
  total_paye: number;
  reste: number;
  frais: { label: string; montant: number; type: string }[];
  paiements: { id: number; montant: number; mode: string; reference: string; date: string; statut: string; frais: string }[];
}

const MENTIONS_LABELS: Record<string, string> = {
  tb: "Très Bien",
  b: "Bien",
  ab: "Assez Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
  mediocre: "Médiocre",
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

type Tab = "resultats" | "viescolaire" | "cahier" | "finances";

export default function ElevePage() {
  const user = useRequireRoles(["std"]);
  const [tab, setTab] = useState<Tab>("resultats");

  const { data: apercu, isLoading, isError } = useQuery({
    queryKey: ["eleve-apercu"],
    queryFn: () => api.get<Apercu>("/secondaire/eleve/apercu"),
    enabled: Boolean(user),
  });
  const { data: viescolaire } = useQuery({
    queryKey: ["eleve-viescolaire"],
    queryFn: () => api.get<VieScolaireEleve>("/secondaire/eleve/viescolaire"),
    enabled: Boolean(user),
  });
  const { data: cahier } = useQuery({
    queryKey: ["eleve-cahier"],
    queryFn: () => api.get<CahierTextesEleve>("/secondaire/eleve/cahier-textes"),
    enabled: Boolean(user),
  });
  const { data: finances } = useQuery({
    queryKey: ["eleve-finances"],
    queryFn: () => api.get<FinancesEleve>("/secondaire/eleve/finances"),
    enabled: Boolean(user),
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "resultats", label: "Mes résultats" },
    { key: "viescolaire", label: "Vie scolaire" },
    { key: "cahier", label: "Cahier de textes" },
    { key: "finances", label: "Finances" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-muted">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Espace élève</h2>
          <p className="text-sm text-muted-foreground">
            {apercu ? `${apercu.prenom} ${apercu.nom} — ${apercu.classe} (${apercu.matricule ?? "—"})` : "Portail élève"}
          </p>
        </header>

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Aucun profil élève trouvé pour ce compte. Contactez l&apos;administration.
          </p>
        )}

        {apercu && (
          <>
            <div className="flex gap-2 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? "bg-primary text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "resultats" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {apercu.bulletins.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    Aucun bulletin disponible pour le moment.
                  </p>
                )}
                {apercu.bulletins.map((b) => (
                  <div key={b.id} className="bg-card rounded-lg border border-card-border shadow-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" /> Bulletin {b.trimestre_label}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.is_emise ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.is_emise ? "Émis" : "En préparation"}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Moyenne générale</span>
                        <span className="font-semibold text-primary-dark">
                          {b.moyenne_generale ?? "—"} /20
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Rang</span>
                        <span className="font-medium">{b.rang_classe ? `${b.rang_classe}ᵉ` : "—"}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Mention</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {b.mention ? (MENTIONS_LABELS[b.mention] ?? b.mention) : "—"}
                        </span>
                      </p>
                    </div>
                    {b.is_emise && (
                      <a
                        href={`${API_BASE}/secondaire/bulletins/${b.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 rounded-md border border-primary text-primary px-3 py-2 text-sm font-medium hover:bg-secondary"
                      >
                        <FileDown className="w-4 h-4" /> Télécharger le PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "viescolaire" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-500" /> Absences & retards
                    {viescolaire?.trimestre_courant && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({viescolaire.trimestre_courant})
                      </span>
                    )}
                  </h3>
                  {viescolaire?.absences.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune absence signalée.</p>
                  )}
                  <ul className="divide-y divide-card-border">
                    {viescolaire?.absences.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                        <span>
                          {new Date(a.date).toLocaleDateString("fr-FR")} —{" "}
                          {a.type === "retard" ? "Retard" : a.type === "sortie" ? "Sortie anticipée" : "Absence"}
                          {a.matiere && <span className="text-muted-foreground"> ({a.matiere})</span>}
                        </span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 ${
                            a.statut === "justifiee"
                              ? "bg-green-100 text-green-800"
                              : a.statut === "dispensee"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {a.statut}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {viescolaire?.absences.some((a) => a.statut === "non_justifiee") && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Veuillez fournir un justificatif à la direction (certificat médical, mot des parents).
                    </p>
                  )}
                </section>

                <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" /> Sanctions
                  </h3>
                  {viescolaire?.sanctions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune sanction.</p>
                  )}
                  <ul className="divide-y divide-card-border">
                    {viescolaire?.sanctions.map((s) => (
                      <li key={s.id} className="py-2 text-sm">
                        <p>
                          <span className="font-medium">{s.type}</span>
                          <span className="text-muted-foreground"> le {fmtDate(s.date_sanction)}</span>
                          {s.levee && (
                            <span className="ml-2 text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">
                              levée
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {tab === "cahier" && (
              <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Cahier de textes
                  <span className="text-xs font-normal text-muted-foreground">
                    {cahier?.classe_label} {cahier?.trimestre ? `— ${cahier.trimestre}` : ""}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Suivez les cours dispensés et les devoirs à faire.
                </p>
                {cahier?.seances.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune séance publiée pour le moment.</p>
                )}
                <ul className="divide-y divide-card-border">
                  {cahier?.seances.map((s) => (
                    <li key={s.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {s.matiere_label}{" "}
                          <span className="text-muted-foreground font-normal">
                            — séance n°{s.numero_seance} du{" "}
                            {new Date(s.date_seance).toLocaleDateString("fr-FR")}
                          </span>
                        </p>
                        {s.enseignant_nom && (
                          <span className="text-xs text-muted-foreground">Prof : {s.enseignant_nom}</span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{s.contenu_cours}</p>
                      {s.devoirs && (
                        <p className="text-xs mt-1 rounded-md bg-secondary px-3 py-2">
                          <span className="font-medium">Devoirs :</span> {s.devoirs}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === "finances" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600" /> Situation financière
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">Dû</p>
                      <p className="text-lg font-bold">{fmt(finances?.total_du ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Payé</p>
                      <p className="text-lg font-bold text-green-700">{fmt(finances?.total_paye ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Reste</p>
                      <p className="text-lg font-bold text-red-600">{fmt(finances?.reste ?? 0)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2">Frais de l&apos;année</p>
                  <ul className="divide-y divide-card-border">
                    {finances?.frais.map((f, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2 text-sm">
                        <span>{f.label}</span>
                        <span className="font-medium">{fmt(f.montant)}</span>
                      </li>
                    ))}
                    {finances?.frais.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">Aucun frais défini.</li>
                    )}
                  </ul>
                </section>

                <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
                  <h3 className="font-semibold mb-4">Paiements enregistrés</h3>
                  <ul className="divide-y divide-card-border">
                    {finances?.paiements.map((p) => (
                      <li key={p.id} className="py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{fmt(p.montant)}</p>
                          <span
                            className={`text-xs rounded-full px-2 py-0.5 ${
                              p.statut === "valide"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {p.statut}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.frais} — {p.mode}
                          {p.reference && ` (${p.reference})`} —{" "}
                          {new Date(p.date).toLocaleDateString("fr-FR")}
                        </p>
                      </li>
                    ))}
                    {finances?.paiements.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">Aucun paiement enregistré.</li>
                    )}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
