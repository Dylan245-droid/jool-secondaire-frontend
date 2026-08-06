"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, ClipboardList, GraduationCap, LayoutDashboard, Award, FileCheck2, ShieldAlert, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/eleves", label: "Élèves", icon: Users },
  { href: "/notes", label: "Notes", icon: ClipboardList },
  { href: "/bulletins", label: "Bulletins", icon: GraduationCap },
  { href: "/conseils", label: "Conseils", icon: FileCheck2 },
  { href: "/examens", label: "Examens", icon: Award },
  { href: "/viescolaire", label: "Vie scolaire", icon: ShieldAlert },
  { href: "/finances", label: "Finances", icon: Wallet },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200">
      <div className="px-4 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-primary-dark">Jool Secondaire</h1>
        <p className="text-xs text-muted-foreground">Collèges & Lycées</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
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
    </nav>
  );
}
