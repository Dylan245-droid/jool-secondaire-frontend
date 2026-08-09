"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Building2 } from "lucide-react";

interface StructureUsage {
  plan_name: string | null;
  plan_is_free: boolean;
  students_count: number;
  max_students: number | null;
  staff_count: number;
  max_staff: number | null;
  status: string;
  grace_end_date: string | null;
  trial_end_date: string | null;
  trial_days_left: number | null;
  trial_expired: boolean;
  enrollment_blocked: boolean;
  message: string;
}

interface StructureItem {
  id: number;
  label: string;
  short_name: string | null;
  address: string;
  email: string;
  is_active: boolean;
  plan_name: string | null;
  billing_cycle: string | null;
  subscription_status: string;
  end_date: string | null;
  students_count: number;
  usage: StructureUsage;
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semiannual: "Semestriel",
  yearly: "Annuel",
};

export default function StructuresListPage() {
  const { data: structures, isLoading } = useQuery({
    queryKey: ["platform-structures"],
    queryFn: () => api.get<StructureItem[]>("/platform/structures"),
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Établissements</h2>
          <p className="text-sm text-muted-foreground">
            Écoles clientes et statut de leurs abonnements
          </p>
        </div>
        <Link href="/platform-admin/structures/new">
          <Button variant="default">
            <Building2 className="w-4 h-4" /> Onboarder un établissement
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            {structures && structures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3">Établissement</th>
                      <th className="px-5 py-3">Abonnement</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Élèves</th>
                      <th className="px-5 py-3">Échéance</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {structures.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium">{s.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.short_name ?? "—"} · {s.email}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {s.plan_name ? (
                            <>
                              <p className="font-medium">
                                {s.plan_name}
                          {s.usage?.plan_is_free && (
                            <Badge variant="success" className="ml-2">Gratuit</Badge>
                          )}
                          {s.usage?.trial_expired && (
                            <Badge variant="destructive" className="ml-2">Essai expiré</Badge>
                          )}
                          {s.usage?.trial_days_left != null && (
                            <Badge variant={s.usage.trial_days_left < 3 ? "destructive" : "warning"} className="ml-2">
                              Essai — {s.usage.trial_days_left} j
                            </Badge>
                          )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {CYCLE_LABELS[s.billing_cycle ?? ""] ?? s.billing_cycle}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Aucun</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={
                              s.subscription_status === "active"
                                ? "success"
                                : s.subscription_status === "inactive" && s.is_active
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {s.subscription_status === "active"
                              ? "Abonné"
                              : s.is_active
                                ? "Abonnement inactif"
                                : "À onboarder"}
                          </Badge>
                          {s.usage?.enrollment_blocked && (
                            <p className="mt-1">
                              <Badge variant="destructive">Inscriptions bloquées</Badge>
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {s.students_count}
                          {s.usage?.max_students != null && (
                            <p className="text-xs text-muted-foreground">
                              / {s.usage.max_students} max
                            </p>
                          )}
                          {s.usage?.status === "over_limit" && (
                            <p className="text-xs font-semibold text-rose">seuil atteint</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {s.end_date
                            ? new Date(s.end_date).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/platform-admin/structures/${s.id}`}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            Détails →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-5">
                Aucun établissement. Commencez par en onboarder un.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
