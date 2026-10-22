"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Coins, FileText, GraduationCap, Landmark, UserX, Users } from "lucide-react";

interface StatsGlobale {
  effectifs: { total: number; classes: Record<string, number> };
  reussite: {
    bulletins_emis: number;
    moyenne_etablissement: number | null;
    taux_reussite: number | null;
  };
  assiduite: {
    absences: number;
    absences_non_justifiees: number;
    retards: number;
    sanctions_actives: number;
  };
  finances: {
    encaisse: number;
    total_du: number;
    reste: number;
    taux_recouvrement: number | null;
  };
}

interface SeanceRecente {
  id: number;
  date: string;
  heure_debut?: string | null;
  titre: string;
  statut: string;
  statut_label: string;
  pv?: string | null;
  date_validation?: string | null;
  nb_resolutions: number;
}

interface SyntheseConseil {
  structure: { id: number; label: string; annee_scolaire: string | null };
  stats: StatsGlobale;
  seances_recentes: SeanceRecente[];
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

/** F10 : tableau de bord lecture seule du Conseil d'administration (rôle boa).
 * Consomme /secondaire/conseil/synthese (synthèse globale + séances récentes). */
export function BoaDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["conseil-synthese"],
    queryFn: () => api.get<SyntheseConseil>("/secondaire/conseil/synthese"),
  });

  const stats = data?.stats;

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Landmark className="w-6 h-6 text-primary" /> Tableau de bord du Conseil
            </h2>
            <p className="text-sm text-muted-foreground">
              {data?.structure.label ?? "Établissement"} — {data?.structure.annee_scolaire ?? ""} ·{" "}
              {userName}
            </p>
          </div>
          <Badge variant="outline">Consultation · lecture seule</Badge>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de la synthèse…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Effectifs</p>
                    <Badge variant="default">
                      <Users className="w-3 h-3" />
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    {stats?.effectifs.total ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.keys(stats?.effectifs.classes ?? {}).length} classe(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Résultats (bulletins émis)</p>
                    <Badge variant="success">
                      <GraduationCap className="w-3 h-3" />
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    {stats?.reussite.moyenne_etablissement ?? "—"}
                    <span className="text-sm font-normal text-muted-foreground"> /20</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.reussite.taux_reussite != null
                      ? `${stats.reussite.taux_reussite}% de réussite`
                      : "Aucun bulletin émis"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Assiduité</p>
                    <Badge variant="warning">
                      <UserX className="w-3 h-3" />
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    {stats?.assiduite.absences_non_justifiees ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    abs. non justifiées — {stats?.assiduite.retards ?? 0} retards
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Finances</p>
                    <Badge variant="turquoise">
                      <Coins className="w-3 h-3" />
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary-dark mt-1">
                    {fmt(stats?.finances.encaisse ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    recouvrement : {stats?.finances.taux_recouvrement ?? 0}% — reste{" "}
                    {fmt(stats?.finances.reste ?? 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <CardTitle>Séances récentes du conseil</CardTitle>
                    </div>
                    <Link
                      href="/conseil"
                      className="text-sm text-primary-dark font-medium hover:underline"
                    >
                      Tout voir →
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {data?.seances_recentes && data.seances_recentes.length > 0 ? (
                    <ul className="divide-y divide-card-border">
                      {data.seances_recentes.map((s) => (
                        <li key={s.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {s.titre || "Séance du conseil"}
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                — {fmtDate(s.date)}
                                {s.heure_debut ? ` à ${s.heure_debut.slice(0, 5)}` : ""}
                              </span>
                            </p>
                            <span className="flex items-center gap-2">
                              <Badge variant="secondary">{s.nb_resolutions} résolution(s)</Badge>
                              <Badge
                                variant={
                                  s.statut === "validee"
                                    ? "success"
                                    : s.statut === "tenue"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {s.statut_label}
                              </Badge>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucune séance enregistrée pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
