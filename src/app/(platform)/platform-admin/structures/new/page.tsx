"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

interface Plan {
  id: number;
  name: string;
  description: string;
  is_recommended: boolean;
  is_free: boolean;
  max_students: number | null;
  max_staff: number | null;
  overage_per_student_monthly: number;
  features: string[];
  pricing: Record<string, { price: number; original: number; savings: number }>;
}

interface OnboardResult {
  success: boolean;
  message: string;
  data?: {
    structure_id: number;
    account_id: number;
    subscription_id: number;
    founder_password: string | null;
    trial_end_date: string | null;
  };
}

const STEPS = ["Administrateur", "École", "Abonnement"];
const CYCLES = [
  { value: "monthly", label: "Mensuel" },
  { value: "quarterly", label: "Trimestriel (x3)" },
  { value: "semiannual", label: "Semestriel (x6)" },
  { value: "yearly", label: "Annuel (x12)" },
];
const PAYMENT_METHODS = [
  { value: "CASH", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CHEQUE", label: "Chèque" },
];
const PRICING_KEYS: Record<string, string> = {
  monthly: "mensuel",
  quarterly: "trimestriel",
  semiannual: "semestriel",
  yearly: "annuel",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} FCFA`;

export default function OnboardStructurePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardResult | null>(null);

  const [founder, setFounder] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [school, setSchool] = useState({ name: "", short_name: "", address: "" });
  const [sub, setSub] = useState({
    plan_id: 0,
    billing_cycle: "yearly",
    payment_method: "CASH",
    payment_reference: "",
    activation_mode: "trial" as "trial" | "now",
  });
  const [plans, setPlans] = useState<Plan[]>([]);

  const [loadingPlans, setLoadingPlans] = useState(false);

  async function loadPlans() {
    if (plans.length) return;
    setLoadingPlans(true);
    try {
      const data = await api.get<Plan[]>("/platform/plans");
      setPlans(data);
      if (data.length) {
        const recommended = data.find((p) => p.is_recommended) ?? data[0];
        setSub((s) => ({ ...s, plan_id: recommended.id }));
      }
    } catch {
      setError("Impossible de charger les plans");
    } finally {
      setLoadingPlans(false);
    }
  }

  const founderValid =
    founder.first_name && founder.last_name && founder.email && founder.phone;
  const schoolValid = school.name;
  const subValid = sub.plan_id > 0;

  function next() {
    if (step === 0 && !founderValid) return;
    if (step === 1 && !schoolValid) return;
    if (step === 2) {
      submit();
      return;
    }
    if (step === 1) loadPlans();
    setStep(step + 1);
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<OnboardResult>("/platform/onboard", {
        founder,
        structure: school,
        subscription: {
          plan_id: sub.plan_id,
          billing_cycle: sub.billing_cycle,
        },
      });
      setResult(res);
      const isFree = plans.find((p) => p.id === sub.plan_id)?.is_free;
      if (res.data?.subscription_id && (isFree || sub.activation_mode === "now")) {
        await api.post(`/platform/subscriptions/${res.data.subscription_id}/activate`, {
          payment_method: sub.payment_method,
          payment_reference: sub.payment_reference,
          send_email: true,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'onboarding");
    } finally {
      setLoading(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === sub.plan_id);

  if (result?.data) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold">Établissement créé avec succès</h2>
            <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
            <div className="mt-6 text-left space-y-2 text-sm bg-muted rounded-lg p-4">
              <p><strong>École :</strong> {school.name}</p>
              <p><strong>Administrateur :</strong> {founder.first_name} {founder.last_name} ({founder.email})</p>
              {result.data.founder_password && (
                <>
                  <p><strong>Mot de passe provisoire :</strong> <code className="bg-white px-2 py-0.5 rounded border border-card-border">{result.data.founder_password}</code></p>
                  <p className="text-xs text-muted-foreground">
                    Transmettez-le à l&apos;administrateur — à changer à la première connexion.
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                L&apos;année scolaire active et les 3 trimestres ont été créés automatiquement.
                {selectedPlan?.is_free
                  ? " Aucune facture : le plan Découverte est gratuit pour toujours."
                  : sub.activation_mode === "trial"
                    ? ` Essai gratuit de 14 jours démarré (fin le ${fmtDate(result.data.trial_end_date)}) : l'école utilise toute la plateforme, la facturation se fera à la conversion.`
                    : " Facture et reçu envoyés par email."}
              </p>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => router.push("/platform-admin/structures")}>
                Voir les établissements
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  setStep(0);
                  setFounder({ first_name: "", last_name: "", email: "", phone: "" });
                  setSchool({ name: "", short_name: "", address: "" });
                }}
              >
                Onboarder une autre école
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Onboarder un établissement</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Créer l&apos;école, son administrateur et prendre l&apos;abonnement choisi
        </p>
      </header>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                i === step
                  ? "bg-primary text-white"
                  : i < step
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="text-xs font-bold">{i + 1}</span> {label}
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-card-border" />}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-rose font-medium bg-rose/10 rounded px-3 py-2 border-2 border-rose mb-4">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-6 space-y-5">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={founder.first_name}
                  onChange={(e) => setFounder({ ...founder, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={founder.last_name}
                  onChange={(e) => setFounder({ ...founder, last_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={founder.email}
                  onChange={(e) => setFounder({ ...founder, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone (login) *</label>
                <input
                  type="tel"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="06 00 00 00 00"
                  value={founder.phone}
                  onChange={(e) => setFounder({ ...founder, phone: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l&apos;établissement *</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Collège Saint Exupéry"
                  value={school.name}
                  onChange={(e) => setSchool({ ...school, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sigle (court)</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="CSE"
                    maxLength={10}
                    value={school.short_name}
                    onChange={(e) => setSchool({ ...school, short_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Libreville, Gabon"
                    value={school.address}
                    onChange={(e) => setSchool({ ...school, address: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                L&apos;année scolaire active et les 3 trimestres seront créés automatiquement
                pour que l&apos;import des données fonctionne dès la première connexion.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan d&apos;abonnement</label>
                {loadingPlans ? (
                  <p className="text-sm text-muted-foreground">Chargement des plans…</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSub({ ...sub, plan_id: p.id })}
                        className={`rounded-lg border-2 p-4 text-left transition-colors ${
                          sub.plan_id === p.id
                            ? "border-primary bg-primary/5"
                            : "border-card-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{p.name}</p>
                          {p.is_recommended && <Badge variant="violet">Populaire</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                        {p.is_free ? (
                          <p className="text-lg font-bold text-emerald-700 mt-2">
                            Gratuit
                            <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                          </p>
                        ) : (
                          <p className="text-lg font-bold text-primary-dark mt-2">
                            {fmt(p.pricing.mensuel?.price ?? 0)}
                            <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {p.max_students ? `jusqu'à ${p.max_students} élèves` : "élèves illimités"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPlan && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inclus</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.features.map((f) => (
                      <Badge key={f} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!selectedPlan?.is_free && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cycle de facturation</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={sub.billing_cycle}
                    onChange={(e) => setSub({ ...sub, billing_cycle: e.target.value })}
                  >
                    {CYCLES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {!selectedPlan?.is_free && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Démarrage de l&apos;abonnement</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSub({ ...sub, activation_mode: "trial" })}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        sub.activation_mode === "trial"
                          ? "border-primary bg-primary/5"
                          : "border-card-border hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-bold">Essai gratuit de 14 jours</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        L&apos;école utilise toute la plateforme pendant 14 jours. Aucune facture
                        maintenant — rappels automatiques J-7 / J-1, facturation à la conversion.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSub({ ...sub, activation_mode: "now" })}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        sub.activation_mode === "now"
                          ? "border-primary bg-primary/5"
                          : "border-card-border hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-bold">Activer immédiatement (facturation)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Facture et reçu générés maintenant, l&apos;école est active dès la première
                        connexion.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {!selectedPlan?.is_free && sub.activation_mode === "now" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mode de paiement</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={sub.payment_method}
                      onChange={(e) => setSub({ ...sub, payment_method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Référence de paiement</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="N° transaction / chèque"
                      value={sub.payment_reference}
                      onChange={(e) => setSub({ ...sub, payment_reference: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {selectedPlan?.is_free && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded-lg px-3 py-2">
                  Plan gratuit : aucune facture, aucun paiement. L&apos;établissement est activé immédiatement.
                </p>
              )}

              {selectedPlan && sub.plan_id > 0 && (
                <div className="bg-muted rounded-lg p-4 text-sm flex justify-between items-center">
                  <span className="font-medium">
                    {selectedPlan.is_free
                      ? "Coût"
                      : `Total ${CYCLES.find((c) => c.value === sub.billing_cycle)?.label.toLowerCase()}`}
                  </span>
                  <span className="text-lg font-bold text-primary-dark">
                    {selectedPlan.is_free
                      ? "0 FCFA"
                      : fmt(selectedPlan.pricing[PRICING_KEYS[sub.billing_cycle]]?.price ?? 0)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Retour
            </Button>
            <Button onClick={next} disabled={loading || (step === 2 && !subValid)}>
              {loading ? "Création en cours…" : step === STEPS.length - 1 ? "Créer l'établissement" : "Continuer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
