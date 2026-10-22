"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";

type Plan = {
  id: number;
  name: string;
  description: string;
  is_free: boolean;
  is_recommended: boolean;
  max_students: number | null;
  pricing: Record<string, { price: number }>;
};

function InscriptionForm() {
  const searchParams = useSearchParams();
  const planId = Number(searchParams.get("plan")) || 0;

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    name: "",
    short_name: "",
    address: "",
    accept_terms: false,
  });

  useEffect(() => {
    fetch(`${API_BASE}/saas/plans`)
      .then((r) => r.json())
      .then((data: Plan[]) => {
        const p = data.find((x) => x.id === planId) ?? null;
        setSelectedPlan(p);
        setChecking(false);
      })
      .catch(() => {
        setError("Impossible de charger les plans — réessayez dans un instant.");
        setChecking(false);
      });
  }, [planId]);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
  const phoneValid = (form.phone.replace(/\D/g, "").length ?? 0) >= 9;
  const step1Valid =
    form.first_name.trim() && form.last_name.trim() && emailValid && phoneValid;
  const step2Valid = form.name.trim().length >= 3;

  async function submit() {
    if (!form.accept_terms || !selectedPlan) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/saas/structures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founder: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
          },
          structure: {
            name: form.name.trim(),
            short_name: form.short_name.trim(),
            address: form.address.trim(),
          },
          subscription: { plan_id: selectedPlan.id, billing_cycle: "monthly" },
          accept_terms: form.accept_terms,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail || body.error || "Erreur lors de l'inscription.");
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="jool-brutal-card max-w-xl mx-auto p-8 text-center">
        <p className="text-5xl font-extrabold tracking-tight text-turquoise">C&apos;est fait !</p>
        <p className="mt-4 text-muted-foreground">
          Votre établissement <strong>{form.name}</strong> est créé. Vos identifiants viennent
          d&apos;être envoyés par email à <strong>{form.email}</strong>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedPlan?.is_free
            ? "Votre plan Découverte est actif — connectez-vous pour commencer."
            : "Vous êtes en essai gratuit de 14 jours. L'équipe Jool vous recontacte très vite pour finaliser votre abonnement."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="jool-btn">Accéder à la plateforme</Link>
          <Link href="/" className="jool-btn jool-btn-secondary">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 jool-mono text-xs uppercase tracking-widest mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold ${
                step >= s ? "border-primary text-primary" : "border-black/20 text-muted-foreground"
              }`}
            >
              {s}
            </span>
            <span className={step >= s ? "text-primary font-bold" : "text-muted-foreground"}>
              {s === 1 ? "Administrateur" : s === 2 ? "Établissement" : "Confirmation"}
            </span>
            {s < 3 && <span className="w-6 h-0.5 bg-black/10" />}
          </div>
        ))}
      </div>

      {error && (
        <p className="mb-4 p-3 border-2 border-red-300 bg-red-50 text-red-700 text-sm font-semibold rounded">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="jool-brutal-card p-6 space-y-4">
          <h2 className="text-xl font-extrabold">Qui crée l&apos;établissement ?</h2>
          <p className="text-sm text-muted-foreground">
            Vous recevrez vos identifiants par email, et votre structure sera active immédiatement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide">Prénom</label>
              <input
                className="jool-input mt-1"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="Ex. : Sylvie"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide">Nom</label>
              <input
                className="jool-input mt-1"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="Ex. : Mba"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide">Email</label>
            <input
              type="email"
              className="jool-input mt-1"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="direction@ecole.ga"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide">
              Téléphone (WhatsApp idéalement)
            </label>
            <input
              type="tel"
              className="jool-input mt-1"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+241 06 23 45 67 89"
            />
          </div>
          <button
            className="jool-btn w-full disabled:opacity-40"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
          >
            Continuer
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="jool-brutal-card p-6 space-y-4">
          <h2 className="text-xl font-extrabold">Votre établissement</h2>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide">Nom de l&apos;établissement</label>
            <input
              className="jool-input mt-1"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex. : Collège de la Sablière"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide">Sigle (optionnel)</label>
              <input
                className="jool-input mt-1"
                maxLength={10}
                value={form.short_name}
                onChange={(e) => set("short_name", e.target.value)}
                placeholder="Ex. : CSAB"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide">Adresse (optionnel)</label>
              <input
                className="jool-input mt-1"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Ex. : Libreville, Derrière la poste"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="jool-btn jool-btn-secondary" onClick={() => setStep(1)}>
              Retour
            </button>
            <button
              className="jool-btn flex-1 disabled:opacity-40"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="jool-brutal-card p-6 space-y-4">
          <h2 className="text-xl font-extrabold">Confirmation</h2>
          {checking ? (
            <p className="text-sm text-muted-foreground">Chargement du plan…</p>
          ) : selectedPlan ? (
            <div className="p-4 border-2 border-black/10 rounded bg-background">
              <div className="flex items-center gap-2">
                <span className="jool-badge">{selectedPlan.name}</span>
                {selectedPlan.is_free && (
                  <span className="jool-badge jool-badge-turquoise">Gratuit</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{selectedPlan.description}</p>
              <p className="mt-3 text-sm font-semibold">
                {selectedPlan.is_free
                  ? "Plan gratuit pour toujours, sans carte."
                  : "Essai gratuit de 14 jours — sans carte bancaire. L'équipe Jool vous recontacte pour finaliser votre abonnement."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600 font-semibold">
              Plan introuvable. <Link href="/#tarifs" className="underline">Revenir aux tarifs</Link>
            </p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.accept_terms}
              onChange={(e) => set("accept_terms", e.target.checked)}
            />
            <span>
              J&apos;accepte les conditions d&apos;utilisation et la politique de
              confidentialité de Jool Secondaire.
            </span>
          </label>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

          <div className="flex gap-3">
            <button className="jool-btn jool-btn-secondary" onClick={() => setStep(2)} disabled={submitting}>
              Retour
            </button>
            <button
              className="jool-btn flex-1 disabled:opacity-40"
              disabled={!selectedPlan || !form.accept_terms || submitting}
              onClick={submit}
            >
              {submitting ? "Création en cours…" : "Créer mon établissement"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Une question ?{" "}
        <a
          href="https://wa.me/24166659851"
          target="_blank"
          rel="noopener"
          className="underline hover:text-primary"
        >
          Écrivez-nous sur WhatsApp
        </a>{" "}
        — réponse sous 24h.
      </p>
    </div>
  );
}

export default function CreerMonEtablissementPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container max-w-6xl px-4 pt-6">
        <Link href="/" className="flex items-center gap-2 shrink-0 font-extrabold text-lg">
          <span className="w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center">
            J
          </span>
          Jool Secondaire
        </Link>
      </header>
      <main className="container max-w-6xl px-4 flex-1 flex items-center py-10">
        <div className="w-full">
          <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight">
            Créer mon établissement
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            3 étapes, 2 minutes. Votre école est prête immédiatement.
          </p>
          <div className="mt-8">
            <Suspense fallback={<p className="text-center text-sm">Chargement…</p>}>
              <InscriptionForm />
            </Suspense>
          </div>
        </div>
      </main>
      <footer className="container max-w-6xl px-4 py-6 border-t-2 border-black/10 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} Jool Secondaire. Tous droits réservés.</p>
        <p>Made in Gabon 🇬🇦</p>
      </footer>
    </div>
  );
}
