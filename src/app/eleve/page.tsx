"use client";

import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { GraduationCap, FileDown, Award } from "lucide-react";

interface BulletinLeger {
  id: number;
  trimestre_label: string;
  moyenne_generale: number | null;
  rang_classe: number | null;
  mention: string | null;
  is_emise: boolean;
}

interface Apercu {
  inscription_id: number;
  matricule: string | null;
  nom: string;
  prenom: string;
  classe: string;
  bulletins: BulletinLeger[];
}

const MENTIONS_LABELS: Record<string, string> = {
  tb: "Très Bien",
  b: "Bien",
  ab: "Assez Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
  mediocre: "Médiocre",
};

export default function ElevePage() {
  const user = useRequireRoles(["std"]);

  const { data: apercu, isLoading, isError } = useQuery({
    queryKey: ["eleve-apercu"],
    queryFn: () => api.get<Apercu>("/secondaire/eleve/apercu"),
    enabled: Boolean(user),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Mes résultats</h2>
          <p className="text-sm text-muted-foreground">
            {apercu ? `${apercu.prenom} ${apercu.nom} — ${apercu.classe} (${apercu.matricule ?? "—"})` : "Portail élève"}
          </p>
        </header>

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Aucun profil élève trouvé pour ce compte. Contactez l&apos;administration.
          </p>
        )}

        {apercu && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apercu.bulletins.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">
                Aucun bulletin disponible pour le moment.
              </p>
            )}
            {apercu.bulletins.map((b) => (
              <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" /> Bulletin {b.trimestre_label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.is_emise ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.is_emise ? "Émis" : "En préparation"}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Moyenne générale</span>
                    <span className="font-semibold text-primary-dark">
                      {b.moyenne_generale ?? "—"} /20
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Rang</span>
                    <span className="font-medium">{b.rang_classe ? `${b.rang_classe}ᵉ` : "—"}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Mention</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {b.mention ? (MENTIONS_LABELS[b.mention] ?? b.mention) : "—"}
                    </span>
                  </p>
                </div>
                {b.is_emise && (
                  <a
                    href={`${API_BASE}/secondaire/bulletins/${b.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-md border border-primary text-primary px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    <FileDown className="w-4 h-4" /> Télécharger le PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
