"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSessionStore, type Role } from "@/stores/sessionStore";

interface MeResponse {
  success: boolean;
  data: {
    account: { id: number; email: string; first_name?: string; last_name?: string; is_superuser?: boolean };
    capabilities?: string[];
    memberships: Array<{
      role: string;
      structure: { id: number; name: string };
      is_active: boolean;
      admin_profile?: {
        service_code?: string | null;
        service_label?: string | null;
        poste_code?: string | null;
        poste_label?: string | null;
      } | null;
    }>;
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

  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/login", { phone_number: identifiant, password });
      const me = await api.get<MeResponse>("/auth/me");
      if (!me.data?.account) throw new Error("Profil introuvable");
      const isSuperuser = Boolean(me.data.account.is_superuser);
      const active = me.data.memberships.find((m) => m.is_active) ?? me.data.memberships[0];
      const profile = active?.admin_profile;
      setUser({
        id: me.data.account.id,
        email: me.data.account.email,
        first_name: me.data.account.first_name,
        last_name: me.data.account.last_name,
        role: (active?.role ?? "adm") as Role,
        structureId: active?.structure.id,
        structureName: active?.structure.name,
        isSuperuser,
        capabilities: me.data.capabilities ?? [],
        adminProfile: profile
          ? {
              serviceCode: profile.service_code ?? null,
              serviceLabel: profile.service_label ?? null,
              posteCode: profile.poste_code ?? null,
              posteLabel: profile.poste_label ?? null,
            }
          : null,
      });
      router.push(isSuperuser ? "/platform-admin" : searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jool-landing min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(123,31,162,0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(0,191,165,0.08), transparent 50%)",
        }}
      />
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary text-white rounded flex items-center justify-center shadow-brutal-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="jool-logo leading-none">Jool</h1>
            <p className="jool-mono text-xs uppercase tracking-[3px] text-muted-foreground mt-1">
              Secondaire · Gabon
            </p>
          </div>
        </div>

        <div className="jool-brutal-card p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Accédez à votre établissement
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="jool-label">Email ou numéro de téléphone</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="jool-input"
                placeholder="email@etablissement.com ou 06 00 00 00 01"
              />
            </div>
            <div>
              <label className="jool-label">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="jool-input"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-rose font-medium bg-rose/10 rounded px-3 py-2 border-2 border-rose">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="jool-btn w-full justify-center"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 jool-mono uppercase tracking-wide">
          ERP Collèges & Lycées — pilote Gabon
        </p>
      </div>
    </main>
  );
}
