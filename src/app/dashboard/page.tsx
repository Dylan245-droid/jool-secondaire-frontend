"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useSessionStore } from "@/stores/sessionStore";
import { AlertTriangle, Coins, GraduationCap, LogOut, TrendingUp, Users } from "lucide-react";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const clear = useSessionStore((s) => s.clear);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats-global"],
    queryFn: () => api.get<StatsGlobales>("/secondaire/stats/global"),
  });
  const { data: risque } = useQuery({
    queryKey: ["eleves-risque"],
    queryFn: () => api.get<{ count: number; eleves: EleveRisque[] }>("/secondaire/stats/eleves-a-risque"),
  });

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // cookie nettoyé côté client de toute façon
    }
    clear();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  const mentions = Object.entries(stats?.reussite.mentions ?? {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
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
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Effectifs</p>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-primary-dark">
                  {stats?.effectifs.total ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.keys(stats?.effectifs.classes ?? {}).length} classe(s)
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Réussite (bulletins émis)</p>
                  <GraduationCap className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-primary-dark">
                  {stats?.reussite.moyenne_etablissement ?? "—"}
                  <span className="text-sm font-normal text-muted-foreground"> /20</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.reussite.taux_reussite != null
                    ? `${stats.reussite.taux_reussite}% de réussite`
                    : "Aucun bulletin émis"}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Assiduité</p>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-primary-dark">
                  {stats?.assiduite.absences_non_justifiees ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  abs. non justifiées — {stats?.assiduite.retards ?? 0} retards
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Encaissé / Dû</p>
                  <Coins className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-primary-dark">
                  {fmt(stats?.finances.encaisse ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  recouvrement : {stats?.finances.taux_recouvrement ?? 0}% — reste{" "}
                  {fmt(stats?.finances.reste ?? 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-3">Effectifs par classe</h3>
                {Object.keys(stats?.effectifs.classes ?? {}).length ? (
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(stats?.effectifs.classes ?? {}).map(([classe, n]) => (
                      <li key={classe} className="flex items-center justify-between py-2 text-sm">
                        <span>{classe}</span>
                        <span className="font-medium">{n} élève(s)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune classe pour l&apos;année.</p>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-3">Répartition des mentions</h3>
                {mentions.length ? (
                  <ul className="divide-y divide-gray-100">
                    {mentions.map(([mention, n]) => (
                      <li key={mention} className="flex items-center justify-between py-2 text-sm">
                        <span>{MENTIONS_LABELS[mention] ?? mention}</span>
                        <span className="font-medium">{n}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun bulletin émis pour le moment.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Alertes élèves à risque
                {risque && risque.count > 0 && (
                  <span className="text-xs rounded-full bg-red-100 text-red-800 px-2 py-0.5">
                    {risque.count}
                  </span>
                )}
              </h3>
              {risque && risque.eleves.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {risque.eleves.map((e) => (
                    <li key={e.inscription_id} className="py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {e.eleve} <span className="text-xs text-muted-foreground">({e.matricule})</span>
                          <span className="text-xs text-muted-foreground ml-2">— {e.classe}</span>
                        </p>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 ${
                            e.score >= 4
                              ? "bg-red-100 text-red-800"
                              : e.score >= 3
                              ? "bg-amber-100 text-amber-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          score {e.score}
                        </span>
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
