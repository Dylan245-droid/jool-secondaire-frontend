"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Download } from "lucide-react";

interface StructureUsage {
  plan_name: string | null;
  plan_is_free: boolean;
  students_count: number;
  max_students: number | null;
  students_ratio: number | null;
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

interface StructureDetail {
  id: number;
  label: string;
  short_name: string | null;
  address: string;
  email: string;
  phone_number_1: string;
  is_active: boolean;
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
  members: Array<{ role: string; is_active: boolean; first_name: string; last_name: string; email: string }>;
  subscriptions: Array<{
    id: number;
    plan_name: string;
    billing_cycle: string;
    snapshot_price: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    is_current: boolean;
  }>;
  current_subscription: {
    id: number;
    plan_name: string;
    plan_is_free: boolean;
    billing_cycle: string;
    snapshot_price: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    expired: boolean;
  } | null;
  usage: StructureUsage;
}

interface Plan {
  id: number;
  name: string;
  is_free: boolean;
  pricing: Record<string, { price: number }>;
}

interface Invoice {
  id: number;
  code: string;
  status: string;
  total_amount: number;
  date_issued: string;
  structure_id: number;
  plan_name: string;
  payment_method: string | null;
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semiannual: "Semestriel",
  yearly: "Annuel",
};

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  ok: { label: "Effectif normal", variant: "success" },
  warning: { label: "Effectif élevé", variant: "warning" },
  over_limit: { label: "Seuil atteint", variant: "destructive" },
  no_plan: { label: "Sans plan", variant: "secondary" },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  adm: "Administration",
  tch: "Professeur",
  prt: "Parent",
  std: "Élève",
  boa: "Conseil d'administration",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} FCFA`;

export default function StructureDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const { data: structure, isLoading } = useQuery({
    queryKey: ["platform-structure", id],
    queryFn: () => api.get<StructureDetail>(`/platform/structures/${id}`),
  });
  const { data: plans } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api.get<Plan[]>("/platform/plans"),
  });
  const { data: invoices } = useQuery({
    queryKey: ["platform-invoices"],
    queryFn: () => api.get<Invoice[]>("/platform/invoices"),
  });

  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [msg, setMsg] = useState("");

  const createSub = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ message?: string }>(`/platform/structures/${id}/subscriptions`, body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["platform-structure", id] });
      setMsg(typeof res?.message === "string" ? res.message : "Abonnement créé et activé.");
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : "Erreur"),
  });

  const cancelSub = useMutation({
    mutationFn: (subId: number) => api.post(`/platform/subscriptions/${subId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-structure", id] });
      setMsg("Abonnement annulé.");
    },
  });

  const extendTrial = useMutation({
    mutationFn: (subId: number) => api.post(`/platform/subscriptions/${subId}/extend-trial?days=7`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-structure", id] });
      setMsg("Essai prolongé de 7 jours.");
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : "Erreur"),
  });

  const download = (invoiceId: number, kind: "invoice" | "receipt") => {
    window.open(`/api/v2/platform/invoices/${invoiceId}/${kind === "invoice" ? "download" : "receipt"}`, "_blank");
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }
  if (!structure) {
    return <p className="text-sm text-muted-foreground">Établissement introuvable.</p>;
  }

  const structureInvoices = (invoices ?? []).filter((i) => i.structure_id === id);
  const selectedPlan = (plans ?? []).find((p) => p.id === Number(planId));
  const usage = structure.usage;
  const usagePct = usage?.students_ratio != null ? Math.min(Math.round(usage.students_ratio * 100), 100) : null;
  const usageLabel = usage ? (STATUS_LABELS[usage.status] ?? STATUS_LABELS.no_plan) : STATUS_LABELS.no_plan;

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/platform-admin/structures"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Établissements
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{structure.label}</h2>
            <p className="text-sm text-muted-foreground">
              {structure.short_name ?? "—"} · {structure.address || "Adresse non renseignée"}
            </p>
          </div>
          <Badge variant={structure.is_active ? "success" : "secondary"}>
            {structure.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>
      </header>

      {msg && (
        <p className="text-sm font-medium bg-emerald-50 text-emerald-800 rounded px-3 py-2 border-2 border-emerald-200 mb-4">
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Propriétaire</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {structure.owner ? (
                <>
                  <p className="font-medium">
                    {structure.owner.first_name} {structure.owner.last_name}
                  </p>
                  <p className="text-muted-foreground">{structure.owner.email}</p>
                  <p className="text-muted-foreground">{structure.owner.phone || "—"}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Aucun propriétaire rattaché.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membres ({structure.members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-card-border text-sm">
                {structure.members.map((m, i) => (
                  <li key={i} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <Badge variant={m.is_active ? "success" : "secondary"}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Effectif & plan</CardTitle>
                <div className="flex items-center gap-2">
                  {usage?.trial_expired && <Badge variant="destructive">Essai expiré</Badge>}
                  {usage?.trial_days_left != null && (
                    <Badge variant={usage.trial_days_left < 3 ? "destructive" : "warning"}>
                      Essai — {usage.trial_days_left} j
                    </Badge>
                  )}
                  {usage && <Badge variant={usageLabel.variant}>{usageLabel.label}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage?.max_students != null ? (
                <>
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold">
                        {usage.students_count} / {usage.max_students} élèves
                      </span>
                      <span className="text-muted-foreground">
                        {usage.plan_name}
                        {usage.plan_is_free && " · gratuit"}
                      </span>
                    </div>
                    <div className="mt-2 h-4 bg-muted rounded-full overflow-hidden border border-card-border">
                      <div
                        className={`h-full rounded-full transition-all ${usage.enrollment_blocked || usage.status === "over_limit" ? "bg-rose" : usage.status === "warning" ? "bg-amber-400" : "bg-emerald-500"}`}
                        style={{ width: `${Math.max(usagePct ?? 0, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>Personnel : {usage.staff_count} / {usage.max_staff ?? "illimité"}</span>
                    {usage.grace_end_date && (
                      <span>
                        Tolérance de dépassement jusqu&apos;au{" "}
                        {new Date(usage.grace_end_date).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  {usage.message && (
                    <p className={`text-xs rounded px-3 py-2 border-2 ${usage.enrollment_blocked ? "text-rose bg-rose/10 border-rose" : "text-amber-700 bg-amber-50 border-amber-300"}`}>
                      {usage.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {usage?.plan_name ? "Plan à effectif illimité." : "Aucun plan actif — sélectionnez un plan ci-dessous."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abonnement courant</CardTitle>
            </CardHeader>
            <CardContent>
              {structure.current_subscription ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {structure.current_subscription.plan_name}
                      {structure.current_subscription.plan_is_free && (
                        <Badge variant="success" className="ml-2">Gratuit</Badge>
                      )}
                    </span>
                    <Badge variant={structure.current_subscription.expired ? "destructive" : structure.current_subscription.is_active ? "success" : "warning"}>
                      {structure.current_subscription.expired
                        ? "Expiré"
                        : structure.current_subscription.is_active
                          ? "Actif"
                          : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {CYCLE_LABELS[structure.current_subscription.billing_cycle] ?? structure.current_subscription.billing_cycle} ·{" "}
                    {structure.current_subscription.snapshot_price === 0
                      ? "0 FCFA (gratuit)"
                      : fmt(structure.current_subscription.snapshot_price)}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(structure.current_subscription.start_date).toLocaleDateString("fr-FR")} →{" "}
                    {structure.current_subscription.end_date
                      ? new Date(structure.current_subscription.end_date).toLocaleDateString("fr-FR")
                      : "illimitée"}
                  </p>
                  {(usage?.trial_days_left != null || usage?.trial_expired) && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Essai gratuit de 14 jours{usage.trial_end_date ? ` — fin le ${new Date(usage.trial_end_date).toLocaleDateString("fr-FR")}` : ""}.
                        La conversion (facturation) se fait via « Créer un abonnement » ci-dessous.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => extendTrial.mutate(structure.current_subscription!.id)}
                        disabled={extendTrial.isPending}
                      >
                        Prolonger l&apos;essai (+7 jours)
                      </Button>
                    </div>
                  )}
                  {structure.current_subscription.is_active && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose hover:bg-rose/10 hover:text-rose border-rose/40"
                        onClick={() => cancelSub.mutate(structure.current_subscription!.id)}
                        disabled={cancelSub.isPending}
                      >
                        Annuler l&apos;abonnement
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun abonnement. Créez-en un ci-dessous.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Créer un abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="jool-label">Plan</label>
                  <select className="jool-input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    <option value="">Choisir…</option>
                    {(plans ?? []).map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}{p.is_free ? " (gratuit)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {!selectedPlan?.is_free && (
                  <>
                    <div>
                      <label className="jool-label">Cycle</label>
                      <select className="jool-input" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                        {Object.entries(CYCLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="jool-label">Mode de paiement</label>
                      <select className="jool-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="CASH">Espèces</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="BANK_TRANSFER">Virement bancaire</option>
                        <option value="CHEQUE">Chèque</option>
                      </select>
                    </div>
                    <div>
                      <label className="jool-label">Référence</label>
                      <input className="jool-input" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              {selectedPlan?.is_free && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded px-3 py-2">
                  Plan gratuit : activation immédiate, aucune facture.
                </p>
              )}
              <Button
                disabled={!planId || createSub.isPending}
                onClick={() =>
                  createSub.mutate({
                    plan_id: Number(planId),
                    billing_cycle: cycle,
                    payment_method: paymentMethod,
                    payment_reference: paymentRef,
                    send_email: true,
                  })
                }
              >
                {createSub.isPending ? "Création…" : "Créer & activer l'abonnement"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Factures & reçus</CardTitle>
            </CardHeader>
            <CardContent>
              {structureInvoices.length > 0 ? (
                <ul className="divide-y divide-card-border text-sm">
                  {structureInvoices.slice(0, 10).map((inv) => (
                    <li key={inv.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inv.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.plan_name} · {new Date(inv.date_issued).toLocaleDateString("fr-FR")} · {fmt(inv.total_amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={inv.status === "PAID" ? "success" : "warning"}>
                          {inv.status === "PAID" ? "Payée" : "Impayée"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => download(inv.id, "invoice")}>
                          <Download className="w-3 h-3" /> Facture
                        </Button>
                        {inv.status === "PAID" && (
                          <Button variant="outline" size="sm" onClick={() => download(inv.id, "receipt")}>
                            <Download className="w-3 h-3" /> Reçu
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune facture.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
