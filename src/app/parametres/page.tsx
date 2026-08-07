"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles, ROLE_LABELS } from "@/lib/roles";
import { Building2, UserPlus, Trash2, Save } from "lucide-react";

interface Structure {
  id: number;
  label: string;
  short_name?: string | null;
  email: string;
  phone_number_1?: string | null;
  phone_number_2?: string | null;
  address?: string | null;
  is_active: boolean;
}

interface Membre {
  id: number;
  membership_id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: "adm", label: "Administration" },
  { value: "tch", label: "Professeur" },
  { value: "prt", label: "Parent" },
  { value: "std", label: "Élève" },
];

export default function ParametresPage() {
  const user = useRequireRoles(["owner", "adm"]);
  const isOwner = user?.role === "owner";
  const qc = useQueryClient();

  const [form, setForm] = useState<Structure | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [newMembre, setNewMembre] = useState({
    email: "", first_name: "", last_name: "", role: "tch", password: "",
  });
  const [showForm, setShowForm] = useState(false);

  const { data: structure, isLoading } = useQuery({
    queryKey: ["structure"],
    queryFn: () => api.get<Structure>("/secondaire/structure"),
    enabled: Boolean(user),
  });

  const { data: membres } = useQuery({
    queryKey: ["membres"],
    queryFn: () => api.get<Membre[]>("/secondaire/membres"),
    enabled: Boolean(user),
  });

  const sauver = useMutation({
    mutationFn: () => api.patch<Structure>("/secondaire/structure", form ?? {}),
    onSuccess: () => {
      setMsg("Établissement mis à jour.");
      setError("");
      qc.invalidateQueries({ queryKey: ["structure"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
      setMsg("");
    },
  });

  const creer = useMutation({
    mutationFn: () => api.post<Membre>("/secondaire/membres", newMembre),
    onSuccess: () => {
      setMsg("Membre ajouté.");
      setError("");
      setNewMembre({ email: "", first_name: "", last_name: "", role: "tch", password: "" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["membres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'ajout du membre");
      setMsg("");
    },
  });

  const changerRole = useMutation({
    mutationFn: ({ id, role, is_active }: { id: number; role?: string; is_active?: boolean }) =>
      api.patch<Membre>(`/secondaire/membres/${id}`, { role, is_active }),
    onSuccess: () => {
      setMsg("Membre mis à jour.");
      qc.invalidateQueries({ queryKey: ["membres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour");
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/membres/${id}`),
    onSuccess: () => {
      setMsg("Membre retiré.");
      qc.invalidateQueries({ queryKey: ["membres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression");
    },
  });

  if (isLoading || !user) {
    return (
      <div className="flex h-screen overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Paramètres</h2>
          <p className="text-sm text-muted-foreground">
            Établissement et membres — {isOwner ? "vous êtes propriétaire" : "lecture seule (propriétaire requis)"}
          </p>
        </header>

        {msg && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{msg}</p>}
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" /> Établissement
          </h3>
          {structure && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  ["label", "Nom de l'établissement"],
                  ["short_name", "Sigle"],
                  ["email", "Email"],
                  ["phone_number_1", "Téléphone"],
                  ["phone_number_2", "Téléphone 2"],
                  ["address", "Adresse"],
                ] as const
              ).map(([champ, libelle]) => (
                <div key={champ}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{libelle}</label>
                  <input
                    value={form ? (form[champ] ?? "") : (structure[champ] ?? "")}
                    disabled={!isOwner}
                    onChange={(e) => {
                      setForm({ ...(form ?? structure), [champ]: e.target.value });
                      setMsg("");
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              ))}
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => sauver.mutate()}
              disabled={sauver.isPending}
              className="mt-4 flex items-center gap-2 rounded-md bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
            >
              <Save className="w-4 h-4" /> {sauver.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Membres de l'établissement
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 rounded-md bg-primary-dark text-white px-3 py-2 text-sm font-medium hover:opacity-90"
              >
                <UserPlus className="w-4 h-4" /> Ajouter un membre
              </button>
            )}
          </div>

          {isOwner && showForm && (
            <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                placeholder="Email"
                value={newMembre.email}
                onChange={(e) => setNewMembre({ ...newMembre, email: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Prénom"
                value={newMembre.first_name}
                onChange={(e) => setNewMembre({ ...newMembre, first_name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Nom"
                value={newMembre.last_name}
                onChange={(e) => setNewMembre({ ...newMembre, last_name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={newMembre.role}
                onChange={(e) => setNewMembre({ ...newMembre, role: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                type="password"
                placeholder="Mot de passe (8+ car.)"
                value={newMembre.password}
                onChange={(e) => setNewMembre({ ...newMembre, password: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => creer.mutate()}
                disabled={creer.isPending || !newMembre.email || !newMembre.password}
                className="rounded-md bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-40 lg:col-span-2"
              >
                {creer.isPending ? "Ajout…" : "Créer le compte"}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Rôle</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  {isOwner && <th className="py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(membres ?? []).map((m) => (
                  <tr key={m.membership_id}>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-900">
                        {m.nom} {m.prenom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </p>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{m.email}</td>
                    <td className="py-2 pr-4">
                      {isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => changerRole.mutate({ id: m.membership_id, role: e.target.value })}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                          {m.role === "owner" && <option value="owner">Propriétaire</option>}
                        </select>
                      ) : (
                        ROLE_LABELS[m.role] ?? m.role
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {isOwner ? (
                        <button
                          onClick={() => changerRole.mutate({ id: m.membership_id, is_active: !m.is_active })}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {m.is_active ? "Actif" : "Inactif"}
                        </button>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {m.is_active ? "Actif" : "Inactif"}
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="py-2">
                        <button
                          onClick={() => {
                            if (confirm(`Retirer ${m.email} de l'établissement ?`)) {
                              supprimer.mutate(m.membership_id);
                            }
                          }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Retirer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
