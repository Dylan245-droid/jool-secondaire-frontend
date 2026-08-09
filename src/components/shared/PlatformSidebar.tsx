"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, BookOpen, Users, Shield, Settings, LogOut, LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";

const NAV_ITEMS = [
  { href: "/platform-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/platform-admin/structures", label: "Établissements", icon: Building2 },
  { href: "/platform-admin/comptabilite", label: "Comptabilité", icon: BookOpen },
  { href: "/platform-admin/users", label: "Super admins", icon: Users },
  { href: "/platform-admin/audit", label: "Audit & logs", icon: Shield },
  { href: "/platform-admin/settings", label: "Paramètres", icon: Settings },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
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

  return (
    <nav className="flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-[#1a1a2e] text-white">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">Jool Secondaire</h1>
            <p className="text-[11px] text-white/50 font-mono uppercase tracking-wide mt-1">
              Super administration
            </p>
          </div>
        </div>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {((user.last_name ?? "")[0] ?? "U") + ((user.first_name ?? "")[0] ?? "")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {user.first_name || user.last_name
                ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                : user.email}
            </p>
            <p className="text-xs text-white/50 truncate">Super administrateur</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary text-white font-medium shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Building2 className="w-4 h-4" /> Espace établissement
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-rose/20 hover:text-rose transition-colors"
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </nav>
  );
}
