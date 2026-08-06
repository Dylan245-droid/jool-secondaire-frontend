"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Coins, Download, Plus, Trash2, Wallet } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8003/api/v2";

interface Classe {
  id: number;
  label: string;
  niveau: { code: string; label: string };
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

interface Frais {
  id: number;
  label: string;
  type: string;
  montant: number;
  niveau_id: number | null;
  trimestre_id: number | null;
  obligatoire: boolean;
  is_active: boolean;
}

interface RecapEleve {
  inscription_id: number;
  matricule: string;
  eleve: string;
  total_du: number;
  total_paye: number;
  reste: number;
  statut: string;
}

interface Paiement {
  id: number;
  inscription_id: number;
  matricule: string;
  eleve: string;
  frais: string;
  montant: number;
  mode: string;
  reference: string;
  date: string;
  statut: string;
}

const TYPES_FRAIS = [
  { value: "scolarite", label: "Scolarité" },
  { value: "inscription", label: "Frais d'inscription" },
  { value: "cantine", label: "Cantine" },
  { value: "transport", label: "Transport" },
  { value: "uniforme", label: "Uniforme" },
  { value: "activite", label: "Activités" },
  { value: "autre", label: "Autre" },
];

const MODES = [
  { value: "om", label: "Orange Money" },
  { value: "wave", label: "Wave" },
  { value: "virement", label: "Virement" },
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
];

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default function FinancesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"frais" | "encaissement" | "impayes">("frais");
  const [selectedClasse, setSelectedClasse] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [fraisForm, setFraisForm] = useState({
    label: "", type: "scolarite", montant: "", niveau_id: "", obligatoire: true,
  });
  const [payForm, setPayForm] = useState({
    inscription_id: "", montant: "", mode: "om", reference: "",
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions", selectedClasse],
    queryFn: () => api.get<Inscription[]>(`/secondaire/inscriptions?classe_id=${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: niveaux } = useQuery({
    queryKey: ["niveaux"],
    queryFn: () => api.get<{ id: number; label: string; code: string }[]>("/secondaire/niveaux"),
  });
  const { data: frais } = useQuery({
    queryKey: ["frais"],
    queryFn: () => api.get<Frais[]>("/secondaire/frais"),
  });
  const { data: recap } = useQuery({
    queryKey: ["recap", selectedClasse],
    queryFn: () => api.get<{ classe_id: number; eleves: RecapEleve[] }>(`/secondaire/recap/${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: paiements } = useQuery({
    queryKey: ["paiements"],
    queryFn: () => api.get<Paiement[]>("/secondaire/paiements"),
  });

  const creerFrais = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>("/secondaire/frais", {
        label: fraisForm.label,
        type: fraisForm.type,
        montant: Number(fraisForm.montant),
        niveau_id: fraisForm.niveau_id ? Number(fraisForm.niveau_id) : null,
        obligatoire: fraisForm.obligatoire,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frais"] });
      setFraisForm({ label: "", type: "scolarite", montant: "", niveau_id: "", obligatoire: true });
      setMsg("Frais créés.");
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur création frais"),
  });

  const supprimerFrais = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/frais/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frais"] });
    },
  });

  const enregistrerPaiement = useMutation({
    mutationFn: () =>
      api.post<{ id: number; total_paye: number }>("/secondaire/paiements", {
        inscription_id: Number(payForm.inscription_id),
        montant: Number(payForm.montant),
        mode: payForm.mode,
        reference: payForm.reference,
      }),
    onSuccess: (data) => {
      setMsg(`Paiement enregistré. Total payé par l'élève : ${fmt(data.total_paye)}.`);
      setPayForm({ inscription_id: "", montant: "", mode: "om", reference: "" });
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur d'enregistrement"),
  });

  const annulerPaiement = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/paiements/${id}/annuler`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paiements"] }),
  });

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary-dark" /> Finances
          </h2>
          <p className="text-sm text-muted-foreground">
            Frais de scolarité, encaissements (déclaration caisse) et suivi des impayés
          </p>
        </header>

        <div className="flex gap-2 mb-6">
          {[
            { key: "frais", label: "Frais de scolarité" },
            { key: "encaissement", label: "Encaissement" },
            { key: "impayes", label: "Impayés" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium border ${
                tab === t.key ? "bg-primary text-white border-primary" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <p className="text-sm mb-4 rounded-md bg-secondary px-3 py-2 text-primary-dark max-w-xl">{msg}</p>
        )}

        {tab === "frais" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" /> Définir un frais (année active)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Libellé</label>
                  <input
                    value={fraisForm.label}
                    onChange={(e) => setFraisForm({ ...fraisForm, label: e.target.value })}
                    placeholder="Ex : Scolarité 6e — T1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={fraisForm.type}
                      onChange={(e) => setFraisForm({ ...fraisForm, type: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {TYPES_FRAIS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={fraisForm.montant}
                      onChange={(e) => setFraisForm({ ...fraisForm, montant: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Niveau (vide = tous)
                    </label>
                    <select
                      value={fraisForm.niveau_id}
                      onChange={(e) => setFraisForm({ ...fraisForm, niveau_id: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Tous niveaux —</option>
                      {niveaux?.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Obligatoire</label>
                    <label className="flex items-center gap-2 pt-2 text-sm">
                      <input
                        type="checkbox"
                        checked={fraisForm.obligatoire}
                        onChange={(e) => setFraisForm({ ...fraisForm, obligatoire: e.target.checked })}
                      />
                      Oui
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => creerFrais.mutate()}
                  disabled={!fraisForm.label || !fraisForm.montant || creerFrais.isPending}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {creerFrais.isPending ? "Création…" : "Créer"}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" /> Frais en vigueur ({frais?.length ?? 0})
              </h3>
              {frais?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun frais défini pour l&apos;année en cours.
                </p>
              )}
              <ul className="divide-y divide-gray-100">
                {frais?.map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {f.label}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          — {TYPES_FRAIS.find((t) => t.value === f.type)?.label ?? f.type}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {f.obligatoire ? "Obligatoire" : "Facultatif"}
                        {f.niveau_id ? " — niveau restreint" : " — tous niveaux"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary-dark">{fmt(f.montant)}</span>
                      <button
                        onClick={() => supprimerFrais.mutate(f.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "encaissement" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Encaisser un paiement</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
                  <select
                    value={selectedClasse ?? ""}
                    onChange={(e) => {
                      setSelectedClasse(e.target.value ? Number(e.target.value) : null);
                      setPayForm({ ...payForm, inscription_id: "" });
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir une classe —</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} — {c.niveau.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Élève</label>
                  <select
                    value={payForm.inscription_id}
                    onChange={(e) => setPayForm({ ...payForm, inscription_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {inscriptions?.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.etudiant_nom} {i.etudiant_prenom} ({i.matricule})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={payForm.montant}
                      onChange={(e) => setPayForm({ ...payForm, montant: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                    <select
                      value={payForm.mode}
                      onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Référence (OM/Wave/virement, optionnel)
                  </label>
                  <input
                    value={payForm.reference}
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                    placeholder="Ex : OM2026-000123"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => enregistrerPaiement.mutate()}
                  disabled={!payForm.inscription_id || !payForm.montant || enregistrerPaiement.isPending}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {enregistrerPaiement.isPending ? "Enregistrement…" : "Encaisser"}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Derniers encaissements</h3>
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {paiements?.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {fmt(p.montant)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({MODES.find((m) => m.value === p.mode)?.label ?? p.mode}
                          {p.reference && ` — ${p.reference}`})
                        </span>
                      </p>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          p.statut === "valide"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.statut}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.eleve} ({p.matricule}) — {p.frais} — {new Date(p.date).toLocaleDateString("fr-FR")}
                    </p>
                    {p.statut === "valide" && (
                      <button
                        onClick={() => annulerPaiement.mutate(p.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Annuler
                      </button>
                    )}
                  </li>
                ))}
                {paiements?.length === 0 && (
                  <li className="text-sm text-muted-foreground py-3">Aucun encaissement.</li>
                )}
              </ul>
            </section>
          </div>
        )}

        {tab === "impayes" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <select
                value={selectedClasse ?? ""}
                onChange={(e) => setSelectedClasse(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">— Choisir une classe —</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} — {c.niveau.label}
                  </option>
                ))}
              </select>
              {selectedClasse && (
                <a
                  href={`${API_BASE}/secondaire/export-csv?classe_id=${selectedClasse}`}
                  className="flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Download className="w-4 h-4" /> Exporter CSV
                </a>
              )}
            </div>

            {selectedClasse && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-4">Récapitulatif — {recap?.eleves.length ?? 0} élèves</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2">Élève</th>
                        <th className="py-2">Matricule</th>
                        <th className="py-2 text-right">Dû</th>
                        <th className="py-2 text-right">Payé</th>
                        <th className="py-2 text-right">Reste</th>
                        <th className="py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recap?.eleves.map((e) => (
                        <tr key={e.inscription_id} className="border-b border-gray-100">
                          <td className="py-2">{e.eleve}</td>
                          <td className="py-2 text-xs text-muted-foreground">{e.matricule}</td>
                          <td className="py-2 text-right">{fmt(e.total_du)}</td>
                          <td className="py-2 text-right text-green-700">{fmt(e.total_paye)}</td>
                          <td className="py-2 text-right font-medium">
                            {e.reste > 0 ? (
                              <span className="text-red-600">{fmt(e.reste)}</span>
                            ) : (
                              <span className="text-gray-500">0 FCFA</span>
                            )}
                          </td>
                          <td className="py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                e.statut === "paye"
                                  ? "bg-green-100 text-green-800"
                                  : e.statut === "partiel"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {e.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
