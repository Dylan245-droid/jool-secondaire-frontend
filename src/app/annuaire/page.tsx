"use client";

import { useCallback, useEffect, useState } from "react";

import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useSessionUser } from "@/lib/roles";
import { SidebarNav } from "@/components/shared/SidebarNav";

interface AnnuaireMembre {
  id: number;
  account_id: number;
  nom: string;
  role: string;
  role_label: string;
  service_code: string | null;
  service_label: string | null;
  poste_label: string | null;
  actif: boolean;
  email: string | null;
  telephone: string | null;
}

interface AnnuaireService {
  code: string;
  label: string;
  order: number;
}

const ROLE_OPTIONS = [
  { value: "", label: "Tous les rôles" },
  { value: "owner", label: "Direction" },
  { value: "adm", label: "Administration" },
  { value: "tch", label: "Professeurs" },
];

export default function AnnuairePage() {
  const user = useSessionUser();
  const [membres, setMembres] = useState<AnnuaireMembre[]>([]);
  const [services, setServices] = useState<AnnuaireService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [recherche, setRecherche] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (serviceCode) params.set("service_code", serviceCode);
      if (recherche.trim()) params.set("recherche", recherche.trim());
      const qs = params.toString();
      setMembres(await api.get<AnnuaireMembre[]>(`/secondaire/annuaire${qs ? `?${qs}` : ""}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement de l'annuaire");
    } finally {
      setLoading(false);
    }
  }, [role, serviceCode, recherche]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    api
      .get<AnnuaireService[]>("/secondaire/annuaire/services")
      .then(setServices)
      .catch(() => {});
  }, []);

  const estPersonnel = user?.role === "owner" || user?.role === "adm" || user?.role === "tch";

  if (!estPersonnel) {
    return (
      <div className="flex h-screen overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
            <p className="mt-2 text-gray-600">Vous n&apos;avez pas accès à l&apos;annuaire de l&apos;établissement.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <div className="space-y-6">
          <header>
            <h2 className="text-2xl font-bold text-gray-900">Annuaire de l&apos;établissement</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Personnel de l&apos;établissement — {user?.role === "owner" ? "contacts visibles (direction)" : "les coordonnées personnelles ne sont visibles que par la direction"}
            </p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Recherche et filtres */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={recherche}
                    onChange={e => setRecherche(e.target.value)}
                    placeholder="Nom, prénom, email..."
                    className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={serviceCode}
                  onChange={e => setServiceCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Tous les services</option>
                  {services.map(s => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : membres.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun membre trouvé.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Poste</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {membres.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{m.nom}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {m.role_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.service_label ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.poste_label ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.email ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.telephone ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}