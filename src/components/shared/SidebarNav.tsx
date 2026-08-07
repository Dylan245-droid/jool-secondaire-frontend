"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Users, ClipboardList, GraduationCap, LayoutDashboard,
  Award, FileCheck2, ShieldAlert, Wallet, Settings, LogOut, Home,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSessionUser, ROLE_LABELS } from "@/lib/roles";
import { useSessionStore } from "@/stores/sessionStore";
import type { Role } from "@/stores/sessionStore";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "adm", "tch"] },
  { href: "/classes", label: "Classes", icon: BookOpen, roles: ["owner", "adm", "tch"] },
  { href: "/eleves", label: "Élèves", icon: Users, roles: ["owner", "adm"] },
  { href: "/notes", label: "Notes", icon: ClipboardList, roles: ["owner", "adm", "tch"] },
  { href: "/bulletins", label: "Bulletins", icon: GraduationCap, roles: ["owner", "adm"] },
  { href: "/conseils", label: "Conseils", icon: FileCheck2, roles: ["owner", "adm"] },
  { href: "/examens", label: "Examens", icon: Award, roles: ["owner", "adm", "tch"] },
  { href: "/viescolaire", label: "Vie scolaire", icon: ShieldAlert, roles: ["owner", "adm", "tch"] },
  { href: "/finances", label: "Finances", icon: Wallet, roles: ["owner", "adm"] },
  { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["owner", "adm"] },
  { href: "/parent", label: "Portail parent", icon: Home, roles: ["prt"] },
  { href: "/eleve", label: "Mes résultats", icon: GraduationCap, roles: ["std"] },
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

  const items = user ? NAV_ITEMS.filter((i) => i.roles.includes(user.role)) : [];

  return (
    <nav className="flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200">
      <div className="px-4 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-primary-dark">Jool Secondaire</h1>
        <p className="text-xs text-muted-foreground">Collèges & Lycées</p>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
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
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary text-white font-medium shadow-sm"
                  : "text-gray-700 hover:bg-secondary hover:text-primary-dark"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}
