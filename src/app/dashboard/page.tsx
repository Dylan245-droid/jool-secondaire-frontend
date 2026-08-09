"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { useSessionStore } from "@/stores/sessionStore";
import { AlertTriangle, Coins, GraduationCap, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import ParentPage from "@/app/parent/page";
import ElevePage from "@/app/eleve/page";

interface StatsGlobales {
  effectifs: { total: number; classes: Record<string, number> };
  reussite: {
    bulletins_emis: number;
    moyenne_etablissement: number | null;
    taux_reussite: number | null;
    mentions: Record<string, number>;
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

interface EleveRisque {
  inscription_id: number;
  matricule: string;
  eleve: string;
  classe: string;
  moyenne: number | null;
  absences_non_justifiees: number;
  sanction_active: boolean;
  score: number;
  raisons: string[];
}

interface NiveauStats {
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

const MENTIONS_LABELS: Record<string, string> = {
  tb: "Très Bien",
  b: "Bien",
  ab: "Assez Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
  mediocre: "Médiocre",
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default function DashboardPage() {
  // Page d'accueil par rôle : chaque type d'utilisateur a son tableau de bord.
  const user = useRequireRoles(["owner", "adm", "tch", "prt", "std"]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (user.role === "prt") return <ParentPage />;
  if (user.role === "std") return <ElevePage />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const user = useSessionStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats-global"],
    queryFn: () => api.get<StatsGlobales>("/secondaire/stats/global"),
  });
  const { data: risque } = useQuery({
    queryKey: ["eleves-risque"],
    queryFn: () => api.get<{ count: number; eleves: EleveRisque[] }>("/secondaire/stats/eleves-a-risque"),
  });
  const { data: niveaux } = useQuery({
    queryKey: ["stats-niveaux"],
    queryFn: () => api.get<NiveauStats[]>("/secondaire/stats/niveaux"),
  });

  const mentions = Object.entries(stats?.reussite.mentions ?? {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
            <p className="text-sm text-muted-foreground">
              {user?.structureName ?? "Établissement"} —{" "}
              {user?.first_name || user?.last_name
                ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                : user?.email}
            </p>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
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
                    <p className="text-sm text-muted-foreground">Réussite (bulletins émis)</p>
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
                      <TrendingUp className="w-3 h-3" />
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

              {user?.role !== "tch" && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Encaissé / Dû</p>
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
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Effectifs par classe</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(stats?.effectifs.classes ?? {}).length ? (
                    <ul className="divide-y divide-card-border">
                      {Object.entries(stats?.effectifs.classes ?? {}).map(([classe, n]) => (
                        <li key={classe} className="flex items-center justify-between py-2 text-sm">
                          <span>{classe}</span>
                          <Badge variant="secondary">{n} élève(s)</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune classe pour l&apos;année.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition des mentions</CardTitle>
                </CardHeader>
                <CardContent>
                  {mentions.length ? (
                    <ul className="divide-y divide-card-border">
                      {mentions.map(([mention, n]) => (
                        <li key={mention} className="flex items-center justify-between py-2 text-sm">
                          <span>{MENTIONS_LABELS[mention] ?? mention}</span>
                          <Badge variant="default">{n}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun bulletin émis pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Effectifs par niveau</CardTitle>
                </CardHeader>
                <CardContent>
                  {niveaux && niveaux.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {niveaux.map((n) => (
                        <div key={n.niveau_id} className="border border-card-border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {n.code} — {n.label}
                            </p>
                            <Badge variant="default">{n.nb_classes} classe(s)</Badge>
                          </div>
                          <p className="text-2xl font-bold text-primary-dark mt-2">
                            {n.eleves} <span className="text-sm font-normal text-muted-foreground">élève(s)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {n.filles} fille(s) — {n.redoublants} redoublant(s)
                          </p>
                          {n.classes.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {n.classes.join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun effectif pour l&apos;année en cours.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose" />
                    <CardTitle>Alertes élèves à risque</CardTitle>
                    {risque && risque.count > 0 && (
                      <Badge variant="destructive">{risque.count}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {risque && risque.eleves.length > 0 ? (
                    <ul className="divide-y divide-card-border">
                      {risque.eleves.map((e) => (
                        <li key={e.inscription_id} className="py-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {e.eleve} <span className="text-xs text-muted-foreground">({e.matricule})</span>
                              <span className="text-xs text-muted-foreground ml-2">— {e.classe}</span>
                            </p>
                            <Badge
                              variant={e.score >= 4 ? "destructive" : e.score >= 3 ? "warning" : "outline"}
                            >
                              score {e.score}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{e.raisons.join(" · ")}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun élève en difficulté détecté. Les alertes apparaissent ici (moyenne &lt; 8/20,
                      absences non justifiées ≥ 3, sanctions actives).
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
