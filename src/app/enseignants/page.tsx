"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus, Search, Trash2, Power, CheckCircle2, XCircle, Mail, Copy, KeyRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireCapabilities, useRequireRoles } from "@/lib/roles";

interface AffectationEnseignant {
  classe_id: number;
  classe_label: string;
  matiere_id: number;
  matiere_label: string;
  est_principal: boolean;
}

interface Enseignant {
  id: number;
  membership_id: number;
  nom: string;
  prenom: string;
  email: string;
  is_active: boolean;
  created_at: string;
  nb_affectations: number;
  nb_classes: number;
  affectations: AffectationEnseignant[];
}

const btnPrimary =
  "rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2";

const initiales = (nom?: string, prenom?: string, email?: string) => {
  if (nom && prenom) return `${nom[0]}${prenom[0]}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "E";
};

export default function EnseignantsPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("rh");
  const qc = useQueryClient();

  const [recherche, setRecherche] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [identifiants, setIdentifiants] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({
    email: "", first_name: "", last_name: "", password: "",
  });

  const { data: enseignants, isLoading } = useQuery({
    queryKey: ["enseignants"],
    queryFn: () => api.get<Enseignant[]>("/secondaire/enseignants"),
  });

  const invalider = () => {
    qc.invalidateQueries({ queryKey: ["enseignants"] });
    qc.invalidateQueries({ queryKey: ["membres"] });
  };

  const creer = useMutation({
    mutationFn: () =>
      api.post<Enseignant>("/secondaire/membres", { ...form, role: "tch" }),
    onSuccess: () => {
      setMsg("Enseignant créé avec succès.");
      setError("");
      setIdentifiants({ email: form.email.trim().toLowerCase(), password: form.password });
      setForm({ email: "", first_name: "", last_name: "", password: "" });
      setShowForm(false);
      invalider();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la création");
      setMsg("");
    },
  });

  const envoyerLien = useMutation({
    mutationFn: (email: string) =>
      api.post("/auth/magic-link-request", { email }),
    onSuccess: () => {
      setMsg("Lien de connexion envoyé par email (valable 15 minutes).");
      setError("");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'envoi du lien");
      setMsg("");
    },
  });

  const toggleActif = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch<Enseignant>(`/secondaire/membres/${id}`, { is_active }),
    onSuccess: () => {
      setMsg("Statut de l'enseignant mis à jour.");
      setError("");
      invalider();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour");
      setMsg("");
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/membres/${id}`),
    onSuccess: () => {
      setMsg("Enseignant retiré de l'établissement.");
      setError("");
      invalider();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression");
      setMsg("");
    },
  });

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return enseignants ?? [];
    return (enseignants ?? []).filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [enseignants, recherche]);

  const total = enseignants?.length ?? 0;
  const actifs = enseignants?.filter((e) => e.is_active).length ?? 0;
  const nonAffectes = enseignants?.filter((e) => e.nb_affectations === 0).length ?? 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary-dark" /> Enseignants
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comptes des professeurs de l&apos;établissement, leurs matières et classes
            affectées, et leur statut.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
              {total} enseignant(s)
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
              {actifs} actif(s)
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800">
              {nonAffectes} non affecté(s)
            </span>
          </div>
        </header>

        {msg && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </p>
        )}

        {identifiants && (
          <div className="mb-4 rounded-md border border-primary-light bg-primary-light/40 px-4 py-3">
            <p className="text-sm font-semibold text-primary-dark flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Compte créé — transmettez ces identifiants à l&apos;enseignant
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <code className="rounded bg-white border border-gray-200 px-2 py-1">
                {identifiants.email}
              </code>
              <span className="text-muted-foreground">mot de passe :</span>
              <code className="rounded bg-white border border-gray-200 px-2 py-1">
                {identifiants.password}
              </code>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      `Jool Secondaire — Connexion : ${identifiants.email} / Mot de passe : ${identifiants.password}`
                    )
                    .then(() => setMsg("Identifiants copiés."))
                }
                className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-muted"
              >
                <Copy className="w-3.5 h-3.5" /> Copier
              </button>
              <button
                onClick={() => envoyerLien.mutate(identifiants.email)}
                disabled={envoyerLien.isPending}
                className="flex items-center gap-1 rounded-md bg-primary text-white px-2 py-1 text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                {envoyerLien.isPending ? "Envoi…" : "Envoyer un lien de connexion par email"}
              </button>
              <button
                onClick={() => setIdentifiants(null)}
                className="text-xs text-muted-foreground underline hover:text-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        <section className="bg-card rounded-lg border border-card-border shadow-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher (nom, prénom, email)…"
                className="w-64 rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={btnPrimary}
            >
              <UserPlus className="w-4 h-4" /> Nouvel enseignant
            </button>
          </div>

          {showForm && (
            <div className="mb-4 rounded-md border border-border bg-muted p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                placeholder="Prénom"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Nom"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Mot de passe (8+ car.)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => creer.mutate()}
                disabled={creer.isPending || !form.email || !form.password}
                className="rounded-md bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
              >
                {creer.isPending ? "Création…" : "Créer le compte"}
              </button>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filtres.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8 text-center">
              {enseignants?.length
                ? "Aucun enseignant ne correspond à la recherche."
                : "Aucun enseignant pour le moment. Cliquez sur « Nouvel enseignant » pour créer le premier compte."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Enseignant</th>
                    <th className="py-2 pr-4 font-medium">Matières</th>
                    <th className="py-2 pr-4 font-medium">Classes</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filtres.map((e) => {
                    const matieres = e.affectations
                      .map((a) => a.matiere_label)
                      .filter((m, i, arr) => arr.indexOf(m) === i);
                    const classes = e.affectations
                      .map((a) => a.classe_label)
                      .filter((c, i, arr) => arr.indexOf(c) === i);
                    const principal = e.affectations.some((a) => a.est_principal);
                    return (
                      <tr key={e.membership_id}>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
                              {initiales(e.nom, e.prenom, e.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">
                                {e.prenom} {e.nom}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                              {principal && (
                                <span className="rounded-full bg-primary-light text-primary-dark px-2 py-0.5 text-[10px] font-semibold">
                                  Prof principal
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {matieres.length ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {matieres.map((m) => (
                                <span
                                  key={m}
                                  className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Non affecté</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {classes.length ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {classes.map((c) => (
                                <span
                                  key={c}
                                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-gray-700 font-mono"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() =>
                              toggleActif.mutate({ id: e.membership_id, is_active: !e.is_active })
                            }
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              e.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                            title={e.is_active ? "Désactiver" : "Réactiver"}
                          >
                            {e.is_active ? "Actif" : "Inactif"}
                          </button>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => envoyerLien.mutate(e.email)}
                            disabled={envoyerLien.isPending || !e.is_active}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-muted disabled:opacity-40"
                            title="Envoyer un lien de connexion par email (15 min)"
                          >
                            <Mail className="w-3.5 h-3.5" /> Lien
                          </button>
                          <button
                            onClick={() =>
                              toggleActif.mutate({ id: e.membership_id, is_active: !e.is_active })
                            }
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-muted"
                          >
                            <Power className="w-3.5 h-3.5" />
                            {e.is_active ? "Désactiver" : "Réactiver"}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Retirer ${e.prenom} ${e.nom} (${e.email}) de l'établissement ? Ses affectations seront supprimées.`,
                                )
                              ) {
                                supprimer.mutate(e.membership_id);
                              }
                            }}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Retirer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
