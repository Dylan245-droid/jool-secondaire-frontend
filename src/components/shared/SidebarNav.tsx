"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Users, ClipboardList, GraduationCap, LayoutDashboard,
  Award, FileCheck2, ShieldAlert, Wallet, Settings, LogOut, Home,
  CalendarDays, Database, UserCheck, UserRound, HeartPulse, Banknote,
  FileBadge, Mail, Megaphone, Building2, BookOpenCheck, History,
  Handshake, Landmark,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSessionUser, ROLE_LABELS, switchStructure } from "@/lib/roles";
import { useSessionStore } from "@/stores/sessionStore";
import { SubscriptionBanner } from "@/components/shared/SubscriptionBanner";
import type { Role } from "@/stores/sessionStore";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  /** Modules admin requis (un seul suffit) ; absent = visible pour tout adm. */
  capabilities?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "adm", "tch", "prt", "std"] },
      { href: "/audit", label: "Journal d'audit", icon: History, roles: ["owner", "adm"], capabilities: ["direction"] },
    ],
  },
  {
    title: "Scolarité",
    items: [
      { href: "/classes", label: "Classes", icon: BookOpen, roles: ["owner", "adm", "tch"], capabilities: ["scolarite"] },
      { href: "/organisation", label: "Année & trimestres", icon: CalendarDays, roles: ["owner", "adm", "tch"], capabilities: ["pedagogie"] },
      { href: "/eleves", label: "Élèves", icon: Users, roles: ["owner", "adm"], capabilities: ["scolarite"] },
      { href: "/attestations", label: "Attestations", icon: FileBadge, roles: ["owner", "adm"], capabilities: ["scolarite"] },
      { href: "/courrier", label: "Courrier & archives", icon: Mail, roles: ["owner", "adm"], capabilities: ["scolarite"] },
      { href: "/enseignants", label: "Enseignants", icon: UserCheck, roles: ["owner", "adm"], capabilities: ["rh"] },
      { href: "/rh", label: "RH & Paie", icon: ClipboardList, roles: ["owner", "adm"], capabilities: ["rh"] },
    ],
  },
  {
    title: "Pédagogie",
    items: [
      { href: "/notes", label: "Notes", icon: ClipboardList, roles: ["owner", "adm", "tch"], capabilities: ["pedagogie"] },
      { href: "/bulletins", label: "Bulletins", icon: GraduationCap, roles: ["owner", "adm"], capabilities: ["pedagogie"] },
      { href: "/examens", label: "Examens", icon: Award, roles: ["owner", "adm", "tch"], capabilities: ["pedagogie"] },
      { href: "/conseils", label: "Conseils", icon: FileCheck2, roles: ["owner", "adm"], capabilities: ["pedagogie"] },
    ],
  },
  {
    title: "Vie de l'établissement",
    items: [
      { href: "/viescolaire", label: "Vie scolaire", icon: ShieldAlert, roles: ["owner", "adm", "tch"], capabilities: ["viescolaire"] },
      { href: "/registres", label: "Registres réglementaires", icon: BookOpenCheck, roles: ["owner", "adm"], capabilities: ["viescolaire", "pedagogie", "sante"] },
      { href: "/decisions", label: "Décisions sensibles", icon: ShieldAlert, roles: ["owner", "adm"], capabilities: ["direction"] },
      { href: "/conseil", label: "Conseil d'administration", icon: Landmark, roles: ["owner", "adm"], capabilities: ["direction"] },
      { href: "/finances", label: "Finances", icon: Wallet, roles: ["owner", "adm"], capabilities: ["finance"] },
      { href: "/caisses", label: "Caisses & sessions", icon: Banknote, roles: ["owner", "adm"], capabilities: ["finance"] },
      { href: "/sante", label: "Infirmerie", icon: HeartPulse, roles: ["owner", "adm"], capabilities: ["sante"] },
      { href: "/communication", label: "Communication", icon: Megaphone, roles: ["owner", "adm"], capabilities: ["communication"] },
      { href: "/infrastructures", label: "Infrastructures", icon: Building2, roles: ["owner", "adm"], capabilities: ["infrastructures"] },
      { href: "/imports", label: "Import / Onboarding", icon: Database, roles: ["owner"] },
    ],
  },
  {
    title: "Coordination",
    items: [
      { href: "/taches", label: "Tâches inter-services", icon: Handshake, roles: ["owner", "adm"], capabilities: ["taches"] },
      { href: "/annuaire", label: "Annuaire", icon: Users, roles: ["owner", "adm", "tch"], capabilities: ["annuaire"] },
    ],
  },
  {
    title: "Mon espace",
    items: [
      { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["owner", "adm"] },
      { href: "/profil", label: "Mon profil", icon: UserRound, roles: ["owner", "adm", "tch", "prt", "std"] },
      { href: "/parent", label: "Portail parent", icon: Home, roles: ["prt"] },
      { href: "/eleve", label: "Mes résultats", icon: GraduationCap, roles: ["std"] },
    ],
  },
];

const initiales = (nom?: string, prenom?: string, email?: string) => {
  if (nom && prenom) return `${nom[0]}${prenom[0]}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
};

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSessionUser();
  const clear = useSessionStore((s) => s.clear);
  const setUser = useSessionStore((s) => s.setUser);

  async function changeStructure(structureId: number) {
    if (structureId === user?.structureId) return;
    const updated = await switchStructure(structureId);
    if (!updated) return;
    setUser(updated);
    router.refresh();
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // cookie nettoyé côté client de toute façon
    }
    clear();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  const visible = (item: NavItem, u: NonNullable<typeof user>): boolean => {
    if (!item.roles.includes(u.role)) return false;
    if (u.role !== "adm") return true;
    if (!item.capabilities) return true;
    const caps = u.capabilities ?? [];
    if (caps.length === 0) return true;
    // Capability complète ou lecture seule (suffixe ":read", F9)
    return item.capabilities.some(
      (c) => caps.includes(c) || caps.includes(`${c}:read`)
    );
  };

  const sections = user
    ? NAV_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => visible(i, user)),
      })).filter((s) => s.items.length > 0)
    : [];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav className="flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-card border-r border-card-border">
      <div className="px-4 py-5 border-b border-card-border">
        <h1 className="text-lg font-bold text-primary-dark">Jool Secondaire</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Collèges & Lycées</p>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-card-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {initiales(user.last_name, user.first_name, user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.first_name || user.last_name
                ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                : user.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ROLE_LABELS[user.role] ?? user.role} · {user.structureName ?? ""}
            </p>
            {(user.structures?.length ?? 0) > 1 && (
              <select
                value={user.structureId ?? ""}
                onChange={(e) => changeStructure(Number(e.target.value))}
                className="mt-1 w-full border border-border rounded-md px-2 py-1 text-xs bg-white text-gray-700"
                title="Bascule d'établissement (F24)"
              >
                {user.structures
                  ?.filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>
      )}

      <SubscriptionBanner />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={isActive}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-white font-medium shadow-sm"
                        : "text-gray-700 hover:bg-muted hover:text-primary-dark"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className="p-4 border-t border-card-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-gray-600 hover:bg-rose/10 hover:text-rose transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}
