"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { PremiersPasWidget } from "@/components/shared/PremiersPasWidget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { CroissanceSection } from "@/components/dashboard/CroissanceSection";
import { PilotageSection } from "@/components/dashboard/PilotageSection";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Coins,
  GraduationCap,
  HeartPulse,
  UserX,
  Users,
} from "lucide-react";

interface MentionStats {
  [mention: string]: number;
}

interface EvolutionTrimestre {
  position: number;
  label: string;
  nb_bulletins: number;
  moyenne: number;
  taux_reussite: number;
}

interface ClasseAcad {
  classe_id: number;
  classe: string;
  effectif: number;
  moyenne: number | null;
  taux_reussite: number | null;
}

interface ClasseFin {
  classe_id: number;
  classe: string;
  effectif: number;
  total_du: number;
  encaisse: number;
  taux: number | null;
}

interface Debiteur {
  inscription_id: number;
  matricule: string;
  eleve: string;
  classe: string;
  reste: number;
}

interface ClasseAssiduite {
  classe: string;
  absences_non_justifiees: number;
  retards: number;
}

interface FortAbsenteisme {
  inscription_id: number;
  eleve: string;
  classe: string;
  absences_non_justifiees: number;
}

interface NiveauEffectif {
  niveau_id: number;
  code: string;
  label: string;
  type_etablissement: string;
  nb_classes: number;
  classes: string[];
  eleves: number;
  filles: number;
  redoublants: number;
}

interface ClasseEffectif {
  classe_id: number;
  classe: string;
  effectif: number;
  effectif_max: number;
  taux_remplissage: number | null;
}

interface Alerte {
  type: string;
  niveau: string;
  titre: string;
  message: string;
}

interface Action {
  label: string;
  href: string;
}

interface DirigeantData {
  bandeau: {
    effectif_total: number;
    evolution_effectif: number;
    sorties: number;
    taux_recouvrement: number | null;
    encaisse: number;
    reste_a_encaisser: number;
    taux_reussite: number | null;
    moyenne_etablissement: number | null;
    trimestre_label: string | null;
    eleves_a_risque: number;
    sante: { score: number; niveau: string; label: string };
  };
  blocs: {
    academique: {
      dernier_trimestre: EvolutionTrimestre | null;
      evolution: EvolutionTrimestre[];
      mentions: MentionStats;
      par_classe: ClasseAcad[];
    };
    finances: {
      total_du: number;
      encaisse: number;
      reste: number;
      taux_recouvrement: number | null;
      echeances_en_retard: { nb: number; montant: number };
      top_debiteurs: Debiteur[];
      par_classe: ClasseFin[];
    };
    assiduite: {
      absences: number;
      absences_non_justifiees: number;
      retards: number;
      sanctions_actives: number;
      par_classe: ClasseAssiduite[];
      fort_absenteisme: FortAbsenteisme[];
    };
    effectifs: {
      total: number;
      redoublants: number;
      taux_redoublants: number;
      sorties: number;
      par_niveau: NiveauEffectif[];
      par_classe: ClasseEffectif[];
    };
  };
  alertes: Alerte[];
  actions: Action[];
}

const MENTIONS_LABELS: Record<string, string> = {
  tb: "Très Bien",
  b: "Bien",
  ab: "Assez Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
  mediocre: "Médiocre",
};

const fmtMontant = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

const SANTE_BADGE: Record<string, { variant: "success" | "warning" | "destructive"; text: string }> = {
  vert: { variant: "success", text: "text-emerald-700" },
  orange: { variant: "warning", text: "text-amber-700" },
  rouge: { variant: "destructive", text: "text-rose" },
};

function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number | null;
  suffix?: string;
  decimals?: number;
}) {
  const v = useCountUp(value);
  if (value == null) return <span>—</span>;
  return (
    <span>
      {v.toLocaleString("fr-FR", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function SkeletonDashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg p-5 bg-card border border-card-border">
              <div className="jool-skeleton h-3 w-24 rounded" />
              <div className="jool-skeleton h-8 w-16 rounded mt-3" />
              <div className="jool-skeleton h-3 w-32 rounded mt-3" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-5 bg-card border border-card-border">
              <div className="jool-skeleton h-4 w-36 rounded" />
              <div className="jool-skeleton h-4 w-full rounded mt-4" />
              <div className="jool-skeleton h-4 w-3/4 rounded mt-3" />
              <div className="jool-skeleton h-4 w-1/2 rounded mt-3" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function DirigeantDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-dirigeant"],
    queryFn: () => api.get<DirigeantData>("/secondaire/stats/dirigeant"),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  if (isLoading || !data) {
    return <SkeletonDashboard />;
  }

  const b = data.bandeau;
  const sante = SANTE_BADGE[b.sante.niveau] ?? SANTE_BADGE.rouge;

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tableau de bord du dirigeant</h2>
            <p className="text-sm text-muted-foreground">
              {userName} — vue d&apos;ensemble de l&apos;établissement
            </p>
          </div>
        </header>

        <Tabs defaultValue="synthese" className="w-full">
          <TabsList>
            <TabsTrigger value="synthese">Synthèse</TabsTrigger>
            <TabsTrigger value="croissance">Croissance</TabsTrigger>
            <TabsTrigger value="pilotage">Pilotage</TabsTrigger>
          </TabsList>

          <TabsContent value="synthese">
          <div className="mb-6">
            <PremiersPasWidget />
          </div>

            {/* ── Bandeau de synthèse ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <Card className="jool-card-lift jool-anim-fade-up jool-anim-delay-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Effectif total</p>
                    <Badge variant="default"><Users className="w-3 h-3" /></Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    <AnimatedNumber value={b.effectif_total} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.sorties > 0
                      ? `${b.evolution_effectif}% de sorties (${b.sorties})`
                      : "aucune sortie"}
                  </p>
                </CardContent>
              </Card>

              <Card className="jool-card-lift jool-anim-fade-up jool-anim-delay-2">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Taux de recouvrement</p>
                    <Badge variant="turquoise"><Coins className="w-3 h-3" /></Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    <AnimatedNumber value={b.taux_recouvrement} suffix=" %" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    reste à encaisser : {fmtMontant(b.reste_a_encaisser)}
                  </p>
                </CardContent>
              </Card>

              <Card className="jool-card-lift jool-anim-fade-up jool-anim-delay-3">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Réussite</p>
                    <Badge variant="success"><GraduationCap className="w-3 h-3" /></Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    <AnimatedNumber value={b.taux_reussite} suffix=" %" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.trimestre_label ?? "aucun bulletin"} — moyenne{" "}
                    {b.moyenne_etablissement ?? "—"}/20
                  </p>
                </CardContent>
              </Card>

              <Card className="jool-card-lift jool-anim-fade-up jool-anim-delay-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Élèves à risque</p>
                    <Badge variant="destructive"><UserX className="w-3 h-3" /></Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    <AnimatedNumber value={b.eleves_a_risque} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    moyenne &lt; 8, absences ≥ 3, sanction
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "jool-card-lift jool-anim-fade-up jool-anim-delay-5",
                  b.sante.niveau === "vert" && "border-emerald-300 bg-emerald-50/50",
                  b.sante.niveau === "orange" && "border-amber-300 bg-amber-50/50",
                  b.sante.niveau === "rouge" && "border-rose-300 bg-rose-50/50"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Santé de l&apos;établissement</p>
                    <Badge variant={sante.variant}>
                      <HeartPulse className="w-3 h-3" />
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    <AnimatedNumber value={b.sante.score} />
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className={cn("text-xs mt-1 font-medium", sante.text)}>
                    {b.sante.label}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Alertes prioritaires ── */}
            {data.alertes.length > 0 && (
              <div className="mt-6">
                <Card className="border-amber-300 bg-amber-50/60 jool-anim-fade-up jool-anim-delay-1">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Alertes prioritaires
                    </h3>
                    <Badge variant="warning">{data.alertes.length}</Badge>
                  </div>
                    {data.alertes.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span
                          className={cn(
                            "mt-1.5 w-2 h-2 rounded-full shrink-0",
                            a.niveau === "danger"
                              ? "bg-rose jool-pulse-soft"
                              : a.niveau === "warning"
                                ? "bg-amber-500"
                                : "bg-primary"
                          )}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{a.titre}</p>
                          <p className="text-xs text-muted-foreground">{a.message}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Accès rapides ── */}
            <div className="mt-6 flex flex-wrap gap-2">
              {data.actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary-dark hover:bg-primary/10"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {a.label}
                </Link>
              ))}
            </div>

            {/* ── Bloc 1 : Pilotage académique ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Réussite par classe</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.academique.par_classe.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.academique.par_classe.map((c) => (
                        <li key={c.classe_id} className="flex items-center justify-between py-2 text-sm">
                          <span>{c.classe}</span>
                          <span className="flex items-center gap-2">
                            {c.moyenne != null && (
                              <span className="text-xs text-muted-foreground">
                                {c.moyenne}/20
                              </span>
                            )}
                            <Badge
                              variant={
                                c.taux_reussite == null
                                  ? "outline"
                                  : c.taux_reussite >= 60
                                    ? "success"
                                    : "destructive"
                              }
                            >
                              {c.taux_reussite != null ? `${c.taux_reussite}%` : "—"}
                            </Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun bulletin émis.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Évolution trimestrielle</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.academique.evolution.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.academique.evolution.map((t) => (
                        <li key={t.position} className="flex items-center justify-between py-2 text-sm">
                          <span className="font-medium">{t.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.nb_bulletins} bulletin(s) — moyenne {t.moyenne}/20
                          </span>
                          <Badge variant={t.taux_reussite >= 60 ? "success" : "warning"}>
                            {t.taux_reussite}%
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun trimestre clôturé.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution des mentions</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.blocs.academique.mentions).length ? (
                    <ul className="divide-y divide-card-border">
                      {Object.entries(data.blocs.academique.mentions)
                        .sort((a, b) => b[1] - a[1])
                        .map(([mention, n]) => (
                          <li key={mention} className="flex items-center justify-between py-2 text-sm">
                            <span>{MENTIONS_LABELS[mention] ?? mention}</span>
                            <Badge variant="default">{n}</Badge>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune mention pour le moment.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Bloc 2 : Finances & recouvrement ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recouvrement par classe</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.finances.par_classe.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.finances.par_classe.map((c) => (
                        <li key={c.classe_id} className="py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>{c.classe}</span>
                            <Badge
                              variant={
                                c.taux == null
                                  ? "outline"
                                  : c.taux >= 80
                                    ? "success"
                                    : c.taux >= 50
                                      ? "warning"
                                      : "destructive"
                              }
                            >
                              {c.taux != null ? `${c.taux}%` : "—"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtMontant(c.encaisse)} / {fmtMontant(c.total_du)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune donnée financière.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top débiteurs</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {data.blocs.finances.echeances_en_retard.nb} échéance(s) en retard —{" "}
                    {fmtMontant(data.blocs.finances.echeances_en_retard.montant)}
                  </p>
                </CardHeader>
                <CardContent>
                  {data.blocs.finances.top_debiteurs.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.finances.top_debiteurs.map((d) => (
                        <li key={d.inscription_id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <p className="font-medium">{d.eleve}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.matricule} — {d.classe}
                            </p>
                          </div>
                          <Badge variant="destructive">{fmtMontant(d.reste)}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun débiteur — tout est encaissé.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Synthèse financière</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total dû</p>
                    <p className="text-2xl font-bold text-primary-dark">
                      {fmtMontant(data.blocs.finances.total_du)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Encaissé</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {fmtMontant(data.blocs.finances.encaisse)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reste à encaisser</p>
                    <p className="text-2xl font-bold text-rose">
                      {fmtMontant(data.blocs.finances.reste)}
                    </p>
                  </div>
                  <Link
                    href="/finances"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary-dark underline underline-offset-4"
                  >
                    Gérer les impayés <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* ── Bloc 3 : Assiduité & vie scolaire ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Absences non justifiées par classe</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.assiduite.par_classe.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.assiduite.par_classe.map((c) => (
                        <li key={c.classe} className="flex items-center justify-between py-2 text-sm">
                          <span>{c.classe}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.retards} retard(s)
                          </span>
                          <Badge variant={c.absences_non_justifiees >= 5 ? "destructive" : "warning"}>
                            {c.absences_non_justifiees} abs.
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune absence signalée.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Élèves à fort absentéisme</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.assiduite.fort_absenteisme.length ? (
                    <ul className="divide-y divide-card-border">
                      {data.blocs.assiduite.fort_absenteisme.map((e) => (
                        <li key={e.inscription_id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <p className="font-medium">{e.eleve}</p>
                            <p className="text-xs text-muted-foreground">{e.classe}</p>
                          </div>
                          <Badge variant="destructive">
                            {e.absences_non_justifiees} abs. non just.
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun élève en dessous du seuil (≥ 3 absences).
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chiffres clés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Absences totales</span>
                    <Badge variant="outline">{data.blocs.assiduite.absences}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Non justifiées</span>
                    <Badge variant="destructive">{data.blocs.assiduite.absences_non_justifiees}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retards</span>
                    <Badge variant="warning">{data.blocs.assiduite.retards}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sanctions actives</span>
                    <Badge variant="default">{data.blocs.assiduite.sanctions_actives}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Bloc 4 : Effectifs & rentrée ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Effectifs par niveau</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.blocs.effectifs.par_niveau.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.blocs.effectifs.par_niveau.map((n) => (
                        <div key={n.niveau_id} className="border border-card-border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {n.code} — {n.label}
                            </p>
                            <Badge variant="default">{n.nb_classes} classe(s)</Badge>
                          </div>
                          <p className="text-2xl font-bold text-primary-dark mt-2">
                            {n.eleves}{" "}
                            <span className="text-sm font-normal text-muted-foreground">élève(s)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {n.filles} fille(s) — {n.redoublants} redoublant(s)
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun effectif pour l&apos;année.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Remplissage des classes</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {data.blocs.effectifs.redoublants} redoublant(s) ({data.blocs.effectifs.taux_redoublants}%)
                    — {data.blocs.effectifs.sorties} sortie(s) cette année
                  </p>
                </CardHeader>
                <CardContent>
                  {data.blocs.effectifs.par_classe.length ? (
                    <ul className="space-y-3">
                      {data.blocs.effectifs.par_classe.map((c) => (
                        <li key={c.classe_id}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{c.classe}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.effectif} / {c.effectif_max} —{" "}
                              {c.taux_remplissage != null ? `${c.taux_remplissage}%` : "—"}
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full jool-bar-grow",
                                c.taux_remplissage != null && c.taux_remplissage > 100
                                  ? "bg-rose"
                                  : c.taux_remplissage != null && c.taux_remplissage > 85
                                    ? "bg-amber-500"
                                    : "bg-primary"
                              )}
                              style={{
                                width: `${Math.min(100, c.taux_remplissage ?? 0)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune classe.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              Données de l&apos;année scolaire en cours — bulletins émis du dernier trimestre,
              paiements validés, absences signalées.
            </div>
          </TabsContent>

          <TabsContent value="croissance">
            <CroissanceSection />
          </TabsContent>

          <TabsContent value="pilotage">
            <PilotageSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
