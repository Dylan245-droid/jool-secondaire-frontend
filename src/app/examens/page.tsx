"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { FileText, GraduationCap, Plus } from "lucide-react";

interface Examen {
  id: number;
  type: string;
  session: string;
  annee: number;
  date_debut_epreuves: string;
  date_fin_epreuves: string;
  is_publie: boolean;
  candidats: number;
}

interface Candidat {
  id: number;
  numero_table: string;
  nom: string;
  prenom: string;
  matricule?: string;
  classe: string;
  resultat: string;
  mention: string;
}

interface Inscription {
  id: number;
  etudiant_nom: string;
  etudiant_prenom: string;
  classe_id: number;
}

const RESULTATS = [
  { value: "absent", label: "Non renseigné" },
  { value: "admis", label: "Admis" },
  { value: "admis_mention", label: "Admis avec mention" },
  { value: "ajourne", label: "Ajourné" },
  { value: "elimine", label: "Éliminé" },
];

export default function ExamensPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Examen | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "brevet", session: "normale", annee: 2026, date_debut_epreuves: "", date_fin_epreuves: "" });
  const [error, setError] = useState("");

  const { data: examens } = useQuery({ queryKey: ["examens"], queryFn: () => api.get<Examen[]>("/secondaire/examens") });
  const { data: candidats } = useQuery({
    queryKey: ["candidats", selected?.id],
    queryFn: () => api.get<Candidat[]>(`/secondaire/examens/${selected!.id}/candidats`),
    enabled: selected !== null,
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions"],
    queryFn: () => api.get<Inscription[]>("/secondaire/inscriptions"),
    enabled: selected !== null,
  });

  const run = useMutation({
    mutationFn: (action: { url: string; method?: "post" | "patch"; body?: unknown }) =>
      action.method === "patch" ? api.patch(action.url, action.body) : api.post(action.url, action.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens"] });
      queryClient.invalidateQueries({ queryKey: ["candidats"] });
      setError("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erreur"),
  });

  async function creerSession(e: React.FormEvent) {
    e.preventDefault();
    run.mutate(
      { url: "/secondaire/examens", body: form },
      {
        onSuccess: () => setShowForm(false),
      }
    );
  }

  async function inscrireTous() {
    if (!selected || !inscriptions) return;
    run.mutate({
      url: `/secondaire/examens/${selected.id}/candidats`,
      body: { inscription_ids: inscriptions.map((i) => i.id) },
    });
  }

  async function changerResultat(candidatId: number, resultat: string) {
    run.mutate({
      url: `/secondaire/examens/candidats/${candidatId}`,
      method: "patch",
      body: { resultat, mention: resultat === "admis_mention" ? "ab" : "" },
    });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8007/api/v2";

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Examens officiels</h2>
            <p className="text-sm text-muted-foreground">
              Sessions Brevet/Bac — inscriptions candidats, convocations, attestations
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" /> Nouvelle session
          </button>
        </header>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {showForm && (
          <form onSubmit={creerSession} className="mb-8 bg-white rounded-lg border border-gray-200 p-5 max-w-lg space-y-3">
            <h3 className="font-semibold">Créer une session</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="brevet">Brevet des Collèges</option>
                  <option value="bac">Baccalauréat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
                <select value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="normale">Normale (juin)</option>
                  <option value="rattrapage">Rattrapage (sept.)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
                <input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Début épreuves</label>
                <input type="date" value={form.date_debut_epreuves} onChange={(e) => setForm({ ...form, date_debut_epreuves: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fin épreuves</label>
                <input type="date" value={form.date_fin_epreuves} onChange={(e) => setForm({ ...form, date_fin_epreuves: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={!form.date_debut_epreuves || !form.date_fin_epreuves || run.isPending} className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
              {run.isPending ? "Création…" : "Créer"}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">Sessions ({examens?.length ?? 0})</h3>
            <ul className="divide-y divide-gray-100">
              {examens?.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e)}
                    className={`w-full flex items-center justify-between py-3 px-2 rounded text-left hover:bg-gray-50 ${selected?.id === e.id ? "bg-secondary" : ""}`}
                  >
                    <span className="text-sm font-medium">
                      {e.type === "brevet" ? "Brevet" : "Baccalauréat"} {e.annee}
                      <span className="text-muted-foreground font-normal"> — {e.session}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GraduationCap className="w-3.5 h-3.5" /> {e.candidats}
                      {e.is_publie && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>}
                    </span>
                  </button>
                </li>
              ))}
              {examens?.length === 0 && <p className="text-sm text-muted-foreground py-4">Aucune session créée.</p>}
            </ul>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">
              {selected ? `Candidats (${candidats?.length ?? 0})` : "Candidats"}
            </h3>
            {selected ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={inscrireTous}
                    disabled={!inscriptions?.length || run.isPending}
                    className="flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inscrire tous les élèves
                  </button>
                  <span className="text-xs text-muted-foreground">({inscriptions?.length ?? 0} inscrits scolaires dispo.)</span>
                  {!selected.is_publie && (
                    <button onClick={() => run.mutate({ url: `/secondaire/examens/${selected.id}/publier` })} className="ml-auto text-xs text-primary font-medium hover:underline">
                      Publier les résultats
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3">N° table</th>
                        <th className="py-2 pr-3">Élève</th>
                        <th className="py-2 pr-3">Classe</th>
                        <th className="py-2">Résultat</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidats?.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-mono text-xs">{c.numero_table}</td>
                          <td className="py-2 pr-3">{c.nom} {c.prenom}</td>
                          <td className="py-2 pr-3">{c.classe}</td>
                          <td className="py-2">
                            <select
                              value={c.resultat}
                              onChange={(e) => changerResultat(c.id, e.target.value)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                            >
                              {RESULTATS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {c.mention && c.resultat === "admis_mention" && (
                              <span className="ml-2 text-xs text-primary-dark font-medium">({c.mention})</span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <a
                                href={`${apiBase}/secondaire/examens/candidats/${c.id}/convocation`}
                                target="_blank"
                                title="Convocation"
                                className="text-primary hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                              </a>
                              {["admis", "admis_mention"].includes(c.resultat) && (
                                <a
                                  href={`${apiBase}/secondaire/examens/candidats/${c.id}/attestation`}
                                  target="_blank"
                                  title="Attestation"
                                  className="text-green-600 hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {candidats?.length === 0 && (
                        <tr><td colSpan={5} className="py-3 text-sm text-muted-foreground">Aucun candidat inscrit.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sélectionnez une session.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
