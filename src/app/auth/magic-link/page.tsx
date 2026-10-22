"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, XCircle, CheckCircle2 } from "lucide-react";
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

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkHandler />
    </Suspense>
  );
}

function MagicLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useSessionStore((s) => s.setUser);
  const [etat, setEtat] = useState<"en_cours" | "erreur" | "ok">("en_cours");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setEtat("erreur");
      setMessage("Lien invalide : aucun jeton de connexion fourni.");
      return;
    }
    api
      .post(`/auth/magic-link-verify?token=${encodeURIComponent(token)}`)
      .then(async () => {
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
        setEtat("ok");
        setTimeout(() => {
          router.push(isSuperuser ? "/platform-admin" : "/dashboard");
          router.refresh();
        }, 1200);
      })
      .catch((err) => {
        setEtat("erreur");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Ce lien est expiré ou déjà utilisé (il expire après 15 minutes)."
        );
      });
  }, [searchParams, router, setUser]);

  return (
    <main className="jool-landing min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
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

        <div className="jool-brutal-card p-8 text-center">
          {etat === "en_cours" && (
            <div>
              <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
              <h2 className="text-lg font-bold">Connexion en cours…</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Vérification du lien magique
              </p>
            </div>
          )}
          {etat === "ok" && (
            <div>
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-4" />
              <h2 className="text-lg font-bold">Connecté !</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Redirection vers votre espace…
              </p>
            </div>
          )}
          {etat === "erreur" && (
            <div>
              <XCircle className="w-8 h-8 mx-auto text-rose mb-4" />
              <h2 className="text-lg font-bold">Lien invalide ou expiré</h2>
              <p className="text-sm text-muted-foreground mt-2">{message}</p>
              <button
                onClick={() => router.push("/login")}
                className="jool-btn w-full justify-center mt-6"
              >
                Aller à la page de connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
