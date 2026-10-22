"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

import {
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSessionUser } from "@/lib/roles";
import { SidebarNav } from "@/components/shared/SidebarNav";

interface AuditEntry {
  id: number;
  module: string;
  module_label: string;
  action: string;
  action_label: string;
  target: string;
  details: Record<string, unknown>;
  actor_id: number | null;
  actor_name: string;
  ip: string | null;
  created_at: string;
  date_display: string;
}

interface AuditStats {
  periode_jours: number;
  total: number;
  par_module: Record<string, number>;
  top_acteurs: Array<{ actor_name: string; total: number }>;
}

const MODULES = [
  "direction", "pedagogie", "scolarite", "finance",
  "viescolaire", "rh", "communication", "infrastructures", "sante",
];

export default function AuditPage() {
  const searchParams = useSearchParams();
  const user = useSessionUser();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [actions, setActions] = useState<{ module: string; action: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    module: searchParams.get("module") || "",
    action: searchParams.get("action") || "",
    actor_id: searchParams.get("actor_id") || "",
    depuis: searchParams.get("depuis") || "",
    jusqu: searchParams.get("jusqu") || "",
    limit: 100,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });
      params.set("limite", String(500));

      const [entriesRes, statsRes, actionsRes] = await Promise.all([
        api.get<AuditEntry[]>(`/secondaire/audit?${params.toString()}`),
        api.get<AuditStats>("/secondaire/audit/stats?jours=30"),
        api.get<{ module: string; action: string }[]>("/secondaire/audit/actions"),
      ]);

      setEntries(entriesRes);
      setStats(statsRes);
      setActions(actionsRes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur chargement audit";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      module: "", action: "", actor_id: "", depuis: "", jusqu: "", limit: 100,
    });
  };

  const paginatedEntries = entries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalPages = Math.ceil(entries.length / PAGE_SIZE) || 1;

  const hasActiveFilters =
    filters.module !== "" || filters.action !== "" ||
    filters.actor_id !== "" || filters.depuis !== "" || filters.jusqu !== "";

  if (user?.role !== "owner" && user?.role !== "adm") {
    return (
      <div className="flex h-screen overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
            <p className="mt-2 text-gray-600">Vous n&apos;avez pas les droits pour accéder au journal d&apos;audit.</p>
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
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Journal d&apos;audit</h2>
              <p className="text-sm text-muted-foreground mt-1">Suivi des actions sensibles dans l&apos;établissement</p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-1" /> Effacer filtres
              </button>
            )}
          </header>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Total actions (30j)</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Modules actifs</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.par_module).filter(k => stats.par_module[k] > 0).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Top acteur</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.top_acteurs[0]?.actor_name || "—"}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Période</p>
            <p className="text-2xl font-bold text-gray-900">{stats.periode_jours}j</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              value={filters.module}
              onChange={e => handleFilterChange("module", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tous les modules</option>
              {MODULES.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={e => {
                const val = e.target.value;
                if (!val) {
                  setFilters(prev => ({ ...prev, module: "", action: "" }));
                } else {
                  const [m, a] = val.split(":");
                  setFilters(prev => ({ ...prev, module: m, action: a }));
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Toutes les actions</option>
              {actions.map(a => (
                <option key={`${a.module}:${a.action}`} value={`${a.module}:${a.action}`}>
                  {a.module} - {a.action}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Depuis</label>
            <input
              type="date"
              value={filters.depuis}
              onChange={e => handleFilterChange("depuis", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Jusqu&apos;au</label>
            <input
              type="date"
              value={filters.jusqu}
              onChange={e => handleFilterChange("jusqu", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Entries table */}
      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucune entrée d&apos;audit trouvée.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cible
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acteur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {entry.date_display}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {entry.module_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.action_label}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {entry.target || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.actor_name || "Système"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {entry.ip || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage} / {totalPages} — {entries.length} entrées
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </> 
      )}
        </div>
      </main>
    </div>
  );
}