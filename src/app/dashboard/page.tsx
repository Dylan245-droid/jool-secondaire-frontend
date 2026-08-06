"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";

interface Niveau {
  id: number;
  code: string;
  label: string;
  type_etablissement: string;
}

export default function DashboardPage() {
  const { data: niveaux, isLoading } = useQuery({
    queryKey: ["niveaux"],
    queryFn: () => api.get<Niveau[]>("/secondaire/niveaux"),
  });

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Tableau de bord</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Niveaux actifs</p>
            <p className="text-3xl font-bold text-primary">
              {isLoading ? "…" : niveaux?.length ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Trimestres</p>
            <p className="text-3xl font-bold text-primary">3</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-muted-foreground">Portabilité</p>
            <p className="text-3xl font-bold text-accent">QR</p>
          </div>
        </div>

        {niveaux && niveaux.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-3">Référentiel niveaux (Gabon)</h3>
            <div className="flex flex-wrap gap-2">
              {niveaux.map((n) => (
                <span
                  key={n.code}
                  className="px-3 py-1 rounded-full text-xs bg-secondary text-primary-dark"
                >
                  {n.label} ({n.type_etablissement})
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
