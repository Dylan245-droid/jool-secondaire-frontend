"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useSessionStore } from "@/stores/sessionStore";
import { LogOut } from "lucide-react";

interface Classe {
  id: number;
  label: string;
  niveau: { code: string; label: string };
  effectif: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const clear = useSessionStore((s) => s.clear);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });

  const effectifTotal = classes?.reduce((acc, c) => acc + (c.effectif || 0), 0) ?? 0;

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
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8 bg-gray-50">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
            <p className="text-sm text-muted-foreground">
              {user?.structureName ?? "Établissement"} —{" "}
              {user?.first_name || user?.last_name
                ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                : user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Classes</p>
            <p className="text-3xl font-bold text-primary-dark">
              {isLoading ? "…" : classes?.length ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Élèves inscrits</p>
            <p className="text-3xl font-bold text-primary-dark">
              {isLoading ? "…" : effectifTotal}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Trimestres</p>
            <p className="text-3xl font-bold text-primary-dark">3</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold mb-3">Classes de l&apos;année</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : classes && classes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 rounded-full text-xs bg-secondary text-primary-dark"
                >
                  {c.label} — {c.niveau.label} ({c.effectif} élèves)
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune classe. Créez votre première classe dans le module Classes.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
