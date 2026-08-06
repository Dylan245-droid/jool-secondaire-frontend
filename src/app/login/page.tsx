"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useSessionStore, type Role } from "@/stores/sessionStore";

interface MeResponse {
  success: boolean;
  data: {
    account: { id: number; email: string; first_name?: string; last_name?: string };
    memberships: Array<{ role: string; structure: { id: number; name: string }; is_active: boolean }>;
  };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useSessionStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: { requires_2fa?: boolean; dev_code?: string; message?: string } }>(
        "/auth/login",
        { email, password }
      );
      if (res.data?.requires_2fa) {
        setStep("2fa");
        setDevCode(res.data.dev_code ?? "");
        setCode(res.data.dev_code ?? "");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/verify-2fa", { email, password, code });
      const me = await api.get<MeResponse>("/auth/me");
      if (!me.data?.account) throw new Error("Profil introuvable");
      const active = me.data.memberships.find((m) => m.is_active) ?? me.data.memberships[0];
      setUser({
        id: me.data.account.id,
        email: me.data.account.email,
        first_name: me.data.account.first_name,
        last_name: me.data.account.last_name,
        role: (active?.role ?? "adm") as Role,
        structureId: active?.structure.id,
        structureName: active?.structure.name,
      });
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">Jool Secondaire</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "credentials" ? "Connectez-vous à votre établissement" : "Vérification en deux étapes"}
          </p>
        </div>

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@etablissement.ga"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary text-white py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Un code à 6 chiffres a été envoyé à <b>{email}</b>.
            </p>
            {devCode && (
              <p className="text-xs rounded-md bg-secondary px-3 py-2 text-primary-dark">
                Mode pilote — code : <b>{devCode}</b> (pré-rempli automatiquement)
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
              <input
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary text-white py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Vérification…" : "Valider le code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Retour
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
