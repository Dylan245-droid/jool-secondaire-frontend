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

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/login", { phone_number: phoneNumber, password });
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
      setError(err instanceof ApiError ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">Jool Secondaire</h1>
          <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre établissement</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              required
              inputMode="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="06 00 00 00 01"
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
      </div>
    </main>
  );
}
