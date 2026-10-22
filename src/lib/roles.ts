"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSessionStore, type Role, type SessionUser, type AdminProfile } from "@/stores/sessionStore";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Administrateur",
  adm: "Administration",
  tch: "Professeur",
  prt: "Parent",
  std: "Élève",
  boa: "Conseil d'administration",
};

/** Clé localStorage mémorisant la dernière structure active (F24). */
export const LAST_STRUCTURE_KEY = "jool-secondary-last-structure";

export interface MeResponse {
  success: boolean;
  data: {
    account: { id: number; email: string; first_name?: string; last_name?: string; is_superuser?: boolean };
    capabilities?: string[];
    active_structure_id?: number | null;
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

/** Construit la session utilisateur à partir du profil /auth/me, en retenant
 * la structure active (F24) ; sinon première membership active. */
export function buildUser(data: MeResponse["data"]): SessionUser {
  const memberships = data.memberships ?? [];
  const activeId = data.active_structure_id ?? null;
  const active =
    (activeId != null
      ? memberships.find((m) => m.is_active && m.structure.id === activeId)
      : undefined) ??
    memberships.find((m) => m.is_active) ??
    memberships[0];
  const profile: AdminProfile | null = active?.admin_profile
    ? {
        serviceCode: active.admin_profile.service_code ?? null,
        serviceLabel: active.admin_profile.service_label ?? null,
        posteCode: active.admin_profile.poste_code ?? null,
        posteLabel: active.admin_profile.poste_label ?? null,
      }
    : null;
  return {
    id: data.account.id,
    email: data.account.email,
    first_name: data.account.first_name,
    last_name: data.account.last_name,
    role: (active?.role ?? "adm") as Role,
    structureId: active?.structure.id,
    structureName: active?.structure.name,
    isSuperuser: Boolean(data.account.is_superuser),
    capabilities: data.capabilities ?? [],
    adminProfile: profile,
    structures: memberships.map((m) => ({
      id: m.structure.id,
      name: m.structure.name,
      role: m.role,
      is_active: m.is_active,
      adminProfile: m.admin_profile
        ? {
            serviceCode: m.admin_profile.service_code ?? null,
            serviceLabel: m.admin_profile.service_label ?? null,
            posteCode: m.admin_profile.poste_code ?? null,
            posteLabel: m.admin_profile.poste_label ?? null,
          }
        : null,
    })),
  };
}

/** true si l'utilisateur a accès au module admin demandé.
 * owner → tout ; adm sans service (legacy) → tout ; adm configuré → capabilities. */
export function hasModule(user: SessionUser | null, module: string): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (user.role !== "adm") return false;
  const caps = user.capabilities ?? [];
  if (caps.length === 0) return true;
  return caps.includes(module);
}

/** true si l'utilisateur a au moins la lecture du module (F9) :
 * capability complète ou suffixée ":read" (ex. "finance:read" pour SAG). */
export function hasModuleRead(user: SessionUser | null, module: string): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (user.role !== "adm") return false;
  const caps = user.capabilities ?? [];
  if (caps.length === 0) return true;
  return caps.includes(module) || caps.includes(`${module}:read`);
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
      .then(async (me) => {
        if (!me.data?.account) return;
        const remembered =
          typeof window !== "undefined"
            ? Number(window.localStorage.getItem(LAST_STRUCTURE_KEY))
            : null;
        const estMembre =
          remembered != null &&
          me.data.memberships.some((m) => m.is_active && m.structure.id === remembered);
        if (estMembre && me.data.active_structure_id !== remembered) {
          try {
            const res = await api.post<MeResponse>("/auth/structure", {
              structure_id: remembered,
            });
            setUser(buildUser(res.data));
            return;
          } catch {
            // repli : première structure
          }
        }
        setUser(buildUser(me.data));
      })
      .catch(() => {
        // session expirée : le middleware redirigera vers /login
      })
      .finally(() => setPending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return user;
}

/** Bascule d'établissement (F24) : appelle l'API, mémorise et met à jour la session. */
export async function switchStructure(id: number): Promise<SessionUser | null> {
  try {
    const res = await api.post<MeResponse>("/auth/structure", { structure_id: id });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_STRUCTURE_KEY, String(id));
    }
    return buildUser(res.data);
  } catch {
    return null;
  }
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

/** Garde de page par module admin : un adm configuré sans le module est renvoyé
 * vers /dashboard. owner, adm non configuré (legacy) et rôles non-admin passent
 * (ces derniers sont déjà filtrés par useRequireRoles). */
export function useRequireCapabilities(module: string) {
  const user = useSessionUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role !== "adm") return;
    if (hasModule(user, module)) return;
    router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.capabilities]);

  return user;
}

/** Garde de page par module en lecture seule (F9) : laisse passer les adm
 * disposant de la capability complète ou du suffixe ":read" du module. */
export function useRequireCapabilitiesRead(module: string) {
  const user = useSessionUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role !== "adm") return;
    if (hasModuleRead(user, module)) return;
    router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.capabilities]);

  return user;
}

/** Garde de la super administration : seul un superuser peut accéder. */
export function useRequireSuperuser() {
  const user = useSessionUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.isSuperuser) return;
    router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isSuperuser]);

  return user;
}
