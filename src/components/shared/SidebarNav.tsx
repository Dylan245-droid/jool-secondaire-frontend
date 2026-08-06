"use client";

import Link from "next/link";
import { BookOpen, Users, ClipboardList, GraduationCap, LayoutDashboard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eleves", label: "Élèves", icon: Users },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: ClipboardList },
  { href: "/bulletins", label: "Bulletins", icon: GraduationCap },
];

export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1 w-56 shrink-0 min-h-screen bg-white border-r border-gray-200 p-4">
      <div className="px-3 py-4">
        <h1 className="text-lg font-bold text-primary-dark">Jool Secondaire</h1>
        <p className="text-xs text-muted-foreground">Collèges & Lycées</p>
      </div>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-secondary hover:text-primary-dark transition-colors"
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
