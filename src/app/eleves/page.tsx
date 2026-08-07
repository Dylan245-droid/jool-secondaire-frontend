"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { useState } from "react";
import { ArrowRightLeft, Users } from "lucide-react";

interface Classe {
  id: number;
  label: string;
  effectif: number;
}

interface Inscription {
  id: number;
  matricule: string | null;
  etudiant_nom: string;
  etudiant_prenom: string;
  sexe: string | null;
  classe_id: number;
  statut: string;
  boursier: boolean;
  est_repeating: boolean;
}

const STATUTS: Record<string, string> = {
  active: "Actif",
  transferee: "Transféré",
  exclue: "Exclu",
  abandon: "Abandon",
};

export default function ElevesPage() {
  useRequireRoles(["owner", "adm"]);
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [statut, setStatut] = useState("active");
  const [transferTarget, setTransferTarget] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });

  const { data: inscriptions, isLoading } = useQuery({
    queryKey: ["inscriptions", classeId, statut],
    queryFn: () => {
      const params = new URLSearchParams();
      if (classeId) params.set("classe_id", classeId);
      if (statut) params.set("statut", statut);
      return api.get<Inscription[]>(`/secondaire/inscriptions?${params.toString()}`);
    },
  });

  const transferer = useMutation({
    mutationFn: ({ inscriptionId, target }: { inscriptionId: number; target: number }) =>
      api.post<Inscription>(`/secondaire/inscriptions/${inscriptionId}/transferer`, {
        classe_id: target,
      }),
    onSuccess: () => {
      setMsg("Élève transféré vers la nouvelle classe.");
      setError("");
      qc.invalidateQueries({ queryKey: ["inscriptions"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors du transfert");
      setMsg("");
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Élèves</h2>
            <p className="text-sm text-muted-foreground">
              Inscriptions, filtres et transferts de classe
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {inscriptions?.length ?? 0} élève(s) affiché(s)
          </div>
        </header>

        {msg && (
          <p className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            {msg}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Toutes les classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.effectif})
              </option>
            ))}
          </select>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {Object.entries(STATUTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
            <option value="">Tous les statuts</option>
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-5">Chargement…</p>
          ) : inscriptions?.length === 0 ? (
            <p className="text-sm text-muted-foreground p-5">Aucun élève.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 px-4">Matricule</th>
                  <th className="py-2 px-4">Nom</th>
                  <th className="py-2 px-4">Prénom</th>
                  <th className="py-2 px-4">Sexe</th>
                  <th className="py-2 px-4">Classe</th>
                  <th className="py-2 px-4">Statut</th>
                  <th className="py-2 px-4">Boursier</th>
                  <th className="py-2 px-4">Redoublant</th>
                  <th className="py-2 px-4">Transfert</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions?.map((ins) => (
                  <tr key={ins.id} className="border-t border-gray-100">
                    <td className="py-2 px-4 font-mono text-xs">{ins.matricule ?? "—"}</td>
                    <td className="py-2 px-4">{ins.etudiant_nom}</td>
                    <td className="py-2 px-4">{ins.etudiant_prenom}</td>
                    <td className="py-2 px-4">{ins.sexe ?? "—"}</td>
                    <td className="py-2 px-4">
                      {classes?.find((c) => c.id === ins.classe_id)?.label ?? ins.classe_id}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          ins.statut === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUTS[ins.statut] ?? ins.statut}
                      </span>
                    </td>
                    <td className="py-2 px-4">{ins.boursier ? "Oui" : "Non"}</td>
                    <td className="py-2 px-4">{ins.est_repeating ? "Oui" : "Non"}</td>
                    <td className="py-2 px-4">
                      {ins.statut === "active" && (
                        <div className="flex items-center gap-2">
                          <select
                            value={transferTarget[ins.id] ?? ""}
                            onChange={(e) =>
                              setTransferTarget((t) => ({ ...t, [ins.id]: e.target.value }))
                            }
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs bg-white"
                          >
                            <option value="">—</option>
                            {classes
                              ?.filter((c) => c.id !== ins.classe_id)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() =>
                              transferTarget[ins.id] &&
                              transferer.mutate({
                                inscriptionId: ins.id,
                                target: Number(transferTarget[ins.id]),
                              })
                            }
                            disabled={!transferTarget[ins.id] || transferer.isPending}
                            className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:text-primary-dark disabled:opacity-40"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Transférer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
