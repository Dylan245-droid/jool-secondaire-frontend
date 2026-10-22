"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useRequireCapabilities, useRequireRoles } from "@/lib/roles";
import { api } from "@/lib/api";
import { Banknote, Lock, LockOpen, Scale } from "lucide-react";

interface Caisse {
  id: number;
  label: string;
  solde_initiale: number;
  statut: "ouverte" | "fermee";
  ouverte_le: string | null;
  session_ouverte_id: number | null;
  session_ouverte_le: string | null;
  total_especes_session: number;
  nb_paiements_session: number;
}

interface Bordereau {
  id: number;
  caisse_id: number;
  caisse_label: string;
  ouverte_le: string;
  fermee_le: string | null;
  montant_ouverture: number;
  montant_attendu: number | null;
  montant_fermeture: number | null;
  ecart: number | null;
  nb_paiements: number;
  total_especes: number;
  statut: "ouverte" | "fermee";
  notes: string;
}

interface Rapprochement {
  caisses: number;
  sessions_fermees: number;
  session_ouverte: Bordereau | null;
  encaisse_especes_total: number;
  ecart_total: number;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function StatCard({
  label, value, sub, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Badge variant="default">{icon}</Badge>
        </div>
        <p className="text-3xl font-bold text-primary-dark mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActionCaisse({ caisse }: { caisse: Caisse }) {
  const queryClient = useQueryClient();
  const [montantFermeture, setMontantFermeture] = useState("");

  const open = useMutation({
    mutationFn: () => api.post(`/secondaire/caisses/${caisse.id}/ouvrir`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["caisses"] }),
  });
  const close = useMutation({
    mutationFn: () =>
      api.post(`/secondaire/caisses/${caisse.id}/fermer`, {
        montant_fermeture: Number(montantFermeture),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      setMontantFermeture("");
    },
  });

  if (caisse.statut === "ouverte") {
    return (
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Session en cours — {caisse.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ouverte le</p>
              <p className="font-semibold">
                {caisse.session_ouverte_le ? fmtDate(caisse.session_ouverte_le) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Encaissé espèces</p>
              <p className="font-semibold">{fmt(caisse.total_especes_session)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paiements</p>
              <p className="font-semibold">{caisse.nb_paiements_session}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Montant compté à la clôture (FCFA)</Label>
            <Input
              value={montantFermeture}
              onChange={(e) => setMontantFermeture(e.target.value)}
              placeholder="Ex. 35000"
              inputMode="numeric"
            />
          </div>
          <Button
            variant="destructive"
            disabled={close.isPending || montantFermeture === ""}
            onClick={() => close.mutate()}
          >
            <Lock className="w-4 h-4" /> Fermer la caisse (bordereau)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold">{caisse.label}</p>
          <p className="text-sm text-muted-foreground">
            Solde initial : {fmt(caisse.solde_initiale)} — caisse fermée
          </p>
        </div>
        <Button disabled={open.isPending} onClick={() => open.mutate()}>
          <LockOpen className="w-4 h-4" /> Ouvrir la caisse
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionsHistory({ caisseId }: { caisseId: number }) {
  const { data: sessions } = useQuery({
    queryKey: ["caisses", "sessions", caisseId],
    queryFn: () => api.get<Bordereau[]>(`/secondaire/caisses/${caisseId}/sessions`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bordereaux (historique)</CardTitle>
      </CardHeader>
      <CardContent>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session enregistrée.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {sessions.map((s) => (
              <li key={s.id} className="py-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <p className="font-medium">
                    {fmtDate(s.ouverte_le)}
                    {s.statut === "ouverte" && <Badge variant="success" className="ml-2">En cours</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.nb_paiements} paiement(s) · {fmt(s.total_especes)} espèces
                  </p>
                </div>
                <p className="text-muted-foreground">Ouverture<br /><span className="text-foreground">{fmt(s.montant_ouverture)}</span></p>
                <p className="text-muted-foreground">Attendu<br /><span className="text-foreground">{fmt(s.montant_attendu)}</span></p>
                <p className="text-muted-foreground">Compté<br /><span className="text-foreground">{fmt(s.montant_fermeture)}</span></p>
                <div>
                  <p className="text-muted-foreground">Écart</p>
                  <span
                    className={
                      (s.ecart ?? 0) === 0
                        ? "text-gray-700 font-semibold"
                        : (s.ecart ?? 0) < 0
                          ? "text-rose font-semibold"
                          : "text-emerald-600 font-semibold"
                    }
                  >
                    {fmt(s.ecart)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function CaissesPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("finance");

  const { data: caisses } = useQuery({
    queryKey: ["caisses"],
    queryFn: () => api.get<Caisse[]>("/secondaire/caisses"),
  });
  const { data: rapprochement } = useQuery({
    queryKey: ["caisses", "rapprochement"],
    queryFn: () => api.get<Rapprochement>("/secondaire/caisses/rapprochement"),
  });
  const list = caisses ?? [];
  const active = list.find((c) => c.statut === "ouverte");
  const current = list[0]?.id ?? null;
  const hasAnyOpen = list.some((c) => c.statut === "ouverte");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Caisses & sessions</h2>
            <p className="text-sm text-muted-foreground">
              Ouverture/fermeture, bordereaux et rapprochement des encaissements
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Caisses" value={rapprochement?.caisses ?? list.length} icon={<Banknote className="w-3 h-3" />} />
          <StatCard
            label="Sessions clôturées"
            value={rapprochement?.sessions_fermees ?? 0}
            icon={<Lock className="w-3 h-3" />}
          />
          <StatCard
            label="Encaissé espèces (total)"
            value={fmt(rapprochement?.encaisse_especes_total)}
            icon={<Banknote className="w-3 h-3" />}
          />
          <StatCard
            label="Écart cumulé"
            value={fmt(rapprochement?.ecart_total)}
            sub={rapprochement?.session_ouverte ? "Une session est ouverte" : "Toutes les caisses sont fermées"}
            icon={<Scale className="w-3 h-3" />}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {active ? (
            <ActionCaisse caisse={active} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Aucune session ouverte{list.length > 1 ? ` — ${list.length} caisses disponibles` : ""}.
              </p>
              {list.map((c) => (
                <ActionCaisse key={c.id} caisse={c} />
              ))}
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune caisse. La création d&apos;une caisse arrive dans une prochaine version.
                </p>
              )}
            </div>
          )}

          {current != null && !hasAnyOpen && (
            <SessionsHistory caisseId={current} />
          )}
          {current != null && hasAnyOpen && active && (
            <SessionsHistory caisseId={active.id} />
          )}
        </div>
      </main>
    </div>
  );
}
