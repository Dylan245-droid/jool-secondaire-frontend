"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Building2, Coins, Receipt, ShieldCheck, TrendingUp, Users,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  total_structures: number;
  active_subscriptions: number;
  free_subscriptions: number;
  paid_subscriptions: number;
  conversion_rate: number;
  mrr: number;
  arpu: number;
  unpaid_count: number;
  unpaid_total: number;
  recent_subscriptions: Array<{
    structure_name: string;
    structure_short_name: string | null;
    plan_name: string;
    is_active: boolean;
    start_date: string;
  }>;
  audit_events_30d: number;
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} FCFA`;

export default function PlatformAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => api.get<Stats>("/platform/stats"),
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard SaaS</h2>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de la plateforme
          </p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Établissements</p>
                  <Badge variant="default"><Building2 className="w-3 h-3" /></Badge>
                </div>
                <p className="text-3xl font-bold text-primary-dark mt-1">
                  {stats?.total_structures ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.active_subscriptions ?? 0} abonnement(s) actif(s)
                  {" · "}{stats?.free_subscriptions ?? 0} gratuit(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <Badge variant="success"><TrendingUp className="w-3 h-3" /></Badge>
                </div>
                <p className="text-3xl font-bold text-primary-dark mt-1">
                  {stats?.conversion_rate ?? 0} %
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.paid_subscriptions ?? 0} abonnement(s) payant(s) /{" "}
                  {stats?.total_structures ?? 0} établissement(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Factures impayées</p>
                  <Badge variant="warning"><Receipt className="w-3 h-3" /></Badge>
                </div>
                <p className="text-3xl font-bold text-primary-dark mt-1">
                  {stats?.unpaid_count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmt(stats?.unpaid_total ?? 0)} en attente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Activité (30 jours)</p>
                  <Badge variant="turquoise"><ShieldCheck className="w-3 h-3" /></Badge>
                </div>
                <p className="text-3xl font-bold text-primary-dark mt-1">
                  {stats?.audit_events_30d ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">événements d&apos;audit</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Derniers abonnements</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recent_subscriptions?.length ? (
                  <ul className="divide-y divide-card-border">
                    {stats.recent_subscriptions.map((s) => (
                      <li key={`${s.structure_name}-${s.start_date}`} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className="font-medium">{s.structure_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.plan_name} · depuis le {new Date(s.start_date).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <Badge variant={s.is_active ? "success" : "secondary"}>
                          {s.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun abonnement récent.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/platform-admin/structures/new"
                  className="flex items-center gap-3 rounded-lg border border-card-border p-4 bg-white hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Onboarder un nouvel établissement</p>
                    <p className="text-xs text-muted-foreground">
                      Créer l&apos;école, l&apos;administrateur et prendre l&apos;abonnement
                    </p>
                  </div>
                </Link>
                <Link
                  href="/platform-admin/comptabilite"
                  className="flex items-center gap-3 rounded-lg border border-card-border p-4 bg-white hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Comptabilité & factures</p>
                    <p className="text-xs text-muted-foreground">
                      Journal, grand livre, balance et encaissements
                    </p>
                  </div>
                </Link>
                <Link
                  href="/platform-admin/users"
                  className="flex items-center gap-3 rounded-lg border border-card-border p-4 bg-white hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 bg-turquoise/15 text-teal-800 rounded flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Super administrateurs</p>
                    <p className="text-xs text-muted-foreground">
                      Gérer les comptes d&apos;administration de la plateforme
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
