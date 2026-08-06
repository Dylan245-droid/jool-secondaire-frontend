"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { FileText, PenLine, CheckCircle2, Lock, ScrollText } from "lucide-react";

interface Classe {
  id: number;
  label: string;
  niveau: { label: string };
}

interface Trimestre {
  id: number;
  label: string;
  conseil_classe_fait: boolean;
}

interface Conseil {
  id: number;
  classe_id: number;
  trimestre_id: number;
  date: string;
  statut: "prevu" | "en_cours" | "cloture" | "valide";
  pv_signe_president: boolean;
  pv_signe_secretaire: boolean;
}

interface Decision {
  id: number;
  inscription_id: number;
  decision: string;
  moyenne_generale: number;
  rang: number;
  mention: string;
  appreciation_generale?: string;
}

const STATUTS: Record<Conseil["statut"], string> = {
  prevu: "Prévu",
  en_cours: "En cours",
  cloture: "Clôturé",
  valide: "Validé",
};

const DECISIONS = [
  { value: "passage", label: "Passage classe supérieure" },
  { value: "passage_conditionnel", label: "Passage conditionnel" },
  { value: "redoublement", label: "Redoublement" },
  { value: "orientation_pro", label: "Orientation voie pro" },
  { value: "reorientation", label: "Réorientation" },
  { value: "exclusion", label: "Exclusion définitive" },
];

export default function ConseilsPage() {
  const queryClient = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [selected, setSelected] = useState<Conseil | null>(null);
  const [error, setError] = useState("");

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classe[]>("/secondaire/classes") });
  const { data: trimestres } = useQuery({
    queryKey: ["trimestres"],
    queryFn: () => api.get<Trimestre[]>("/secondaire/trimestres"),
  });
  const { data: conseils, isLoading } = useQuery({
    queryKey: ["conseils", classeId],
    queryFn: () =>
      classeId
        ? api.get<Conseil[]>(`/secondaire/conseils?classe_id=${classeId}`)
        : Promise.resolve([] as Conseil[]),
    enabled: !!classeId,
  });
  const { data: decisions } = useQuery({
    queryKey: ["decisions-conseil", selected?.id],
    queryFn: () => api.get<Decision[]>(`/secondaire/conseils/${selected!.id}/decisions`),
    enabled: selected !== null && selected.statut !== "prevu",
  });

  const run = useMutation({
    mutationFn: async (action: { url: string; method?: "post" | "patch"; body?: unknown }) => {
      const res = action.method === "patch"
        ? await api.patch(action.url, action.body)
        : await api.post(action.url, action.body);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conseils", classeId] });
      queryClient.invalidateQueries({ queryKey: ["decisions-conseil"] });
      setError("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erreur"),
  });

  async function planifier() {
    if (!classeId) return;
    const trimestre = trimestres?.find((t) => !t.conseil_classe_fait) ?? trimestres?.[0];
    if (!trimestre) {
      setError("Aucun trimestre disponible. Créez d'abord un trimestre.");
      return;
    }
    run.mutate({
      url: "/secondaire/conseils",
      method: "post",
      body: {
        classe_id: Number(classeId),
        trimestre_id: trimestre.id,
        date: new Date().toISOString().slice(0, 10),
        heure_debut: "14:00",
      },
    });
  }

  async function changerDecision(decisionId: number, decision: string) {
    if (!selected) return;
    run.mutate({
      url: `/secondaire/conseils/${selected.id}/decisions/${decisionId}`,
      method: "patch",
      body: { decision },
    });
  }

  const stepper: Conseil["statut"][] = ["prevu", "en_cours", "cloture", "valide"];
  const idxStatut = selected ? stepper.indexOf(selected.statut) : -1;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8 bg-gray-50">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conseils de classe</h2>
            <p className="text-sm text-muted-foreground">Workflow : prévu → en cours → clôturé → validé</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={classeId}
              onChange={(e) => { setClasseId(e.target.value); setSelected(null); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Classe —</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.label} — {c.niveau.label}</option>
              ))}
            </select>
            <button
              onClick={planifier}
              disabled={!classeId || run.isPending}
              className="flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              <ScrollText className="w-4 h-4" /> Planifier
            </button>
          </div>
        </header>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">Conseils ({conseils?.length ?? 0})</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {conseils?.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c)}
                      className={`w-full flex items-center justify-between py-3 px-2 rounded text-left hover:bg-gray-50 ${
                        selected?.id === c.id ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {c.date} <span className="text-muted-foreground">— {trimestres?.find((t) => t.id === c.trimestre_id)?.label ?? "T?"}</span>
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.statut === "valide" ? "bg-green-100 text-green-700"
                        : c.statut === "cloture" ? "bg-amber-100 text-amber-700"
                        : c.statut === "en_cours" ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                      }`}>
                        {STATUTS[c.statut]}
                      </span>
                    </button>
                  </li>
                ))}
                {conseils?.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Aucun conseil pour cette classe.</p>
                )}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-4">
              {selected ? `Conseil du ${selected.date} — ${STATUTS[selected.statut]}` : "Détail du conseil"}
            </h3>

            {selected && (
              <>
                {/* Stepper */}
                <div className="flex items-center gap-1 mb-6">
                  {stepper.map((s, i) => (
                    <div key={s} className="flex items-center flex-1">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${
                        i <= idxStatut ? "text-primary-dark" : "text-gray-400"
                      }`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                          i < idxStatut ? "bg-primary border-primary text-white"
                          : i === idxStatut ? "border-primary text-primary"
                          : "border-gray-300"
                        }`}>
                          {i < idxStatut ? "✓" : i + 1}
                        </span>
                        {STATUTS[s]}
                      </div>
                      {i < stepper.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < idxStatut ? "bg-primary" : "bg-gray-200"}`} />}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selected.statut === "prevu" && (
                    <button
                      onClick={() => run.mutate({ url: `/secondaire/conseils/${selected.id}/ouvrir` })}
                      className="flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Ouvrir (pré-remplir décisions)
                    </button>
                  )}
                  {selected.statut === "en_cours" && (
                    <button
                      onClick={() => run.mutate({ url: `/secondaire/conseils/${selected.id}/cloturer` })}
                      className="flex items-center gap-1.5 rounded-md bg-amber-600 text-white px-3 py-1.5 text-xs font-medium"
                    >
                      <Lock className="w-3.5 h-3.5" /> Clôturer
                    </button>
                  )}
                  {selected.statut === "cloture" && (
                    <>
                      {!selected.pv_signe_president && (
                        <button
                          onClick={() => run.mutate({ url: `/secondaire/conseils/${selected.id}/signer`, body: { role: "president" } })}
                          className="rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium"
                        >
                          Signer président
                        </button>
                      )}
                      {!selected.pv_signe_secretaire && (
                        <button
                          onClick={() => run.mutate({ url: `/secondaire/conseils/${selected.id}/signer`, body: { role: "secretaire" } })}
                          className="rounded-md border border-primary text-primary px-3 py-1.5 text-xs font-medium"
                        >
                          Signer secrétaire
                        </button>
                      )}
                      {selected.pv_signe_president && selected.pv_signe_secretaire && (
                        <button
                          onClick={() => run.mutate({ url: `/secondaire/conseils/${selected.id}/valider` })}
                          className="flex items-center gap-1.5 rounded-md bg-green-600 text-white px-3 py-1.5 text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valider le PV
                        </button>
                      )}
                    </>
                  )}
                  {(selected.statut === "cloture" || selected.statut === "valide") && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8003/api/v2"}/secondaire/conseils/${selected.id}/pv`}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                    >
                      <FileText className="w-3.5 h-3.5" /> PV PDF
                    </a>
                  )}
                </div>

                {/* Décisions */}
                {selected.statut !== "prevu" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2 pr-3">Rang</th>
                          <th className="py-2 pr-3">Moyenne</th>
                          <th className="py-2 pr-3">Mention</th>
                          <th className="py-2">Décision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decisions?.map((d) => (
                          <tr key={d.id} className="border-b border-gray-100">
                            <td className="py-2 pr-3">{d.rang}</td>
                            <td className="py-2 pr-3 font-medium">{d.moyenne_generale.toFixed(2)}</td>
                            <td className="py-2 pr-3 capitalize">{d.mention}</td>
                            <td className="py-2">
                              <select
                                value={d.decision}
                                disabled={selected.statut === "cloture" || selected.statut === "valide"}
                                onChange={(e) => changerDecision(d.id, e.target.value)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-50"
                              >
                                {DECISIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            {!selected && (
              <p className="text-sm text-muted-foreground">Sélectionnez une classe puis un conseil.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
