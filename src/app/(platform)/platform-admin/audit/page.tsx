"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create_superuser: "Création d'un super admin",
  update_settings: "Modification des paramètres",
};

const ACTION_COLORS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  create_superuser: "success",
  update_settings: "warning",
};

export default function AuditPage() {
  const [filter, setFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["platform-audit-logs"],
    queryFn: () => api.get<AuditLog[]>("/platform/audit-logs"),
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.user_name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q),
    );
  }, [logs, filter]);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit & logs</h2>
          <p className="text-sm text-muted-foreground">
            Actions critiques de la plateforme (création de comptes, paramètres…)
          </p>
        </div>
        <input
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Filtrer…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </header>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-5">Chargement…</p>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Acteur</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Cible</th>
                    <th className="px-5 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium">{l.user_name}</td>
                      <td className="px-5 py-3">
                        <Badge variant={ACTION_COLORS[l.action] ?? "secondary"}>
                          {ACTION_LABELS[l.action] ?? l.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{l.target || "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                        {l.ip_address || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucun log d&apos;audit.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
