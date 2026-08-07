"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSessionStore, type Role, type SessionUser } from "@/stores/sessionStore";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  adm: "Administration",
  tch: "Professeur",
  prt: "Parent",
  std: "Élève",
  boa: "Conseil d'administration",
};

interface MeResponse {
  success: boolean;
  data: {
    account: { id: number; email: string; first_name?: string; last_name?: string };
    memberships: Array<{ role: string; structure: { id: number; name: string }; is_active: boolean }>;
  };
}

/** Session utilisateur ; re-fetch /auth/me si le store est vide (nouvel onglet, refresh). */
export function useSessionUser(): SessionUser | null {
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user || pending) return;
    setPending(true);
    api
      .get<MeResponse>("/auth/me")
      .then((me) => {
        if (!me.data?.account) return;
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
      })
      .catch(() => {
        // session expirée : le middleware redirigera vers /login
      })
      .finally(() => setPending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return user;
}

/** Garde de page : redirige si le rôle du user connecté n'est pas autorisé. */
export function useRequireRoles(allowed: Role[]) {
  const user = useSessionUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (allowed.includes(user.role)) return;
    const fallback = user.role === "prt" ? "/parent" : user.role === "std" ? "/eleve" : "/login";
    router.replace(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  return user;
}
