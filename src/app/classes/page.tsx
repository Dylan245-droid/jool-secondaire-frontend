"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Users, Upload, Plus } from "lucide-react";

interface Niveau {
  id: number;
  code: string;
  label: string;
  type_etablissement: string;
}

interface SchoolYear {
  id: number;
  label: string;
  is_active: boolean;
}

interface Classe {
  id: number;
  label: string;
  niveau: { code: string; label: string };
  school_year_id: number;
  effectif: number;
  effectif_max: number;
}

interface Inscription {
  id: number;
  etudiant_nom: string;
  etudiant_prenom: string;
  matricule?: string;
  statut: string;
}

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<string>("");

  const [form, setForm] = useState({ label: "", niveau_id: "", school_year_id: "", effectif_max: "35" });
  const [error, setError] = useState("");

  const { data: niveaux } = useQuery({ queryKey: ["niveaux"], queryFn: () => api.get<Niveau[]>("/secondaire/niveaux") });
  const { data: schoolYears } = useQuery({ queryKey: ["school-years"], queryFn: () => api.get<SchoolYear[]>("/secondaire/school-years") });
  const { data: classes, isLoading } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classe[]>("/secondaire/classes") });
  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions", selectedClasse],
    queryFn: () => api.get<Inscription[]>(`/secondaire/inscriptions?classe_id=${selectedClasse}`),
    enabled: selectedClasse !== null,
  });

  const createClasse = useMutation({
    mutationFn: () =>
      api.post<Classe>("/secondaire/classes", {
        label: form.label,
        niveau_id: Number(form.niveau_id),
        school_year_id: Number(form.school_year_id),
        effectif_max: Number(form.effectif_max) || 35,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowForm(false);
      setForm({ label: "", niveau_id: "", school_year_id: "", effectif_max: "35" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erreur création classe"),
  });

  async function importCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClasse) return;
    const file = (e.currentTarget.elements.namedItem("csv") as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setImportResult("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8003/api/v2"}/secondaire/classes/${selectedClasse}/import-eleves`,
        { method: "POST", body: fd, credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new ApiError(res.status, data.detail || res.statusText);
      setImportResult(`Importés : ${data.importes}, ignorés : ${data.ignores}`);
      queryClient.invalidateQueries({ queryKey: ["inscriptions", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (err) {
      setImportResult(err instanceof Error ? `Erreur : ${err.message}` : "Erreur d'import");
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8 bg-gray-50">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Classes & Élèves</h2>
            <p className="text-sm text-muted-foreground">Gestion des classes, inscriptions et import CSV</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" /> Nouvelle classe
          </button>
        </header>

        {showForm && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-5 max-w-lg">
            <h3 className="font-semibold mb-4">Créer une classe</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label (ex : 6A)</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Effectif max</label>
                  <input
                    type="number"
                    value={form.effectif_max}
                    onChange={(e) => setForm({ ...form, effectif_max: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Niveau</label>
                <select
                  value={form.niveau_id}
                  onChange={(e) => setForm({ ...form, niveau_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {niveaux?.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.type_etablissement})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Année scolaire</label>
                <select
                  value={form.school_year_id}
                  onChange={(e) => setForm({ ...form, school_year_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {schoolYears?.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.is_active ? "(active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={() => createClasse.mutate()}
                disabled={!form.label || !form.niveau_id || !form.school_year_id || createClasse.isPending}
                className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
              >
                {createClasse.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">Classes ({classes?.length ?? 0})</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {classes?.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedClasse(c.id === selectedClasse ? null : c.id)}
                      className={`w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 px-2 rounded ${
                        c.id === selectedClasse ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="font-medium text-sm">
                        {c.label} <span className="text-muted-foreground font-normal">— {c.niveau.label}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {c.effectif}/{c.effectif_max}
                      </span>
                    </button>
                  </li>
                ))}
                {classes?.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Aucune classe créée.</p>
                )}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">
              {selectedClasse
                ? `Élèves de la classe (${inscriptions?.length ?? 0})`
                : "Élèves — sélectionnez une classe"}
            </h3>
            {selectedClasse ? (
              <>
                <form onSubmit={importCsv} className="flex items-center gap-3 mb-4">
                  <input
                    name="csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="text-xs text-gray-600"
                  />
                  <button className="flex items-center gap-1 rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                    <Upload className="w-3.5 h-3.5" /> Importer CSV
                  </button>
                </form>
                {importResult && (
                  <p className="text-xs mb-3 rounded-md bg-secondary px-3 py-2 text-primary-dark">{importResult}</p>
                )}
                <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {inscriptions?.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {i.etudiant_nom} {i.etudiant_prenom}
                        {i.matricule && <span className="text-xs text-muted-foreground ml-2">({i.matricule})</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{i.statut}</span>
                    </li>
                  ))}
                  {inscriptions?.length === 0 && (
                    <p className="text-sm text-muted-foreground py-3">
                      Aucun élève. CSV : colonnes <code>nom,prenom</code> (option : sexe, date_naissance,
                      lieu_naissance, matricule, boursier, redoublant).
                    </p>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cliquez sur une classe pour voir ses élèves.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
