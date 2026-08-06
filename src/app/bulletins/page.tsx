"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useState } from "react";
import { Calculator, Download, FilePlus2, Send } from "lucide-react";

interface Classe {
  id: number;
  label: string;
}

interface Trimestre {
  id: number;
  label: string;
  notes_cloturees: boolean;
  moyennes_calculees: boolean;
  bulletins_emises: boolean;
}

interface LigneMoyenne {
  inscription_id: number;
  nom: string;
  prenom: string;
  matricule: string | null;
  moyenne_generale: number | null;
  rang: number | null;
  effectif: number;
  moyennes_matieres: {
    matiere: string;
    coefficient: number;
    moyenne: number;
    rang: number;
  }[];
}

interface Bulletin {
  id: number;
  inscription_id: number;
  moyenne_generale: number;
  rang_classe: number;
  mention: string;
  is_emise: boolean;
  is_signee: boolean;
  secret_code: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8007/api/v2";

export default function BulletinsPage() {
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [trimestreId, setTrimestreId] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [bulletins, setBulletins] = useState<Record<number, Bulletin | null>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });
  const { data: trimestres } = useQuery({
    queryKey: ["trimestres"],
    queryFn: () => api.get<Trimestre[]>("/secondaire/trimestres"),
  });

  const { data: tableau, isLoading } = useQuery({
    queryKey: ["moyennes-tableau", classeId, trimestreId],
    queryFn: () =>
      api.get<LigneMoyenne[]>(
        `/secondaire/moyennes/tableau/classe/${classeId}/trimestre/${trimestreId}`
      ),
    enabled: !!classeId && !!trimestreId,
  });

  const calculer = useMutation({
    mutationFn: () =>
      api.post<{ calculees: number; total: number }>(
        `/secondaire/moyennes/calculer/classe/${classeId}/trimestre/${trimestreId}`
      ),
    onSuccess: (d) => {
      setMsg(`Moyennes calculées : ${d.calculees}/${d.total} élèves.`);
      setError("");
      qc.invalidateQueries({ queryKey: ["moyennes-tableau"] });
      qc.invalidateQueries({ queryKey: ["trimestres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur calcul moyennes");
      setMsg("");
    },
  });

  const generer = useMutation({
    mutationFn: () =>
      api.post<{ generes: number }>(
        `/secondaire/bulletins/generer/classe/${classeId}/trimestre/${trimestreId}`
      ),
    onSuccess: (d) => {
      setMsg(`${d.generes} bulletin(s) généré(s).`);
      setError("");
      qc.invalidateQueries({ queryKey: ["trimestres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur génération bulletins");
      setMsg("");
    },
  });

  async function chargerBulletin(inscriptionId: number) {
    try {
      const b = await api.get<Bulletin>(
        `/secondaire/bulletins/inscription/${inscriptionId}/trimestre/${trimestreId}`
      );
      setBulletins((m) => ({ ...m, [inscriptionId]: b }));
    } catch {
      setBulletins((m) => ({ ...m, [inscriptionId]: null }));
    }
  }

  const emettre = useMutation({
    mutationFn: (bulletinId: number) =>
      api.post<Bulletin>(`/secondaire/bulletins/${bulletinId}/emettre`),
    onSuccess: (b) => {
      setBulletins((m) => ({ ...m, [b.inscription_id]: b }));
      setMsg("Bulletin émis.");
      setError("");
      qc.invalidateQueries({ queryKey: ["trimestres"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur émission bulletin");
      setMsg("");
    },
  });

  async function telechargerPdf(bulletinId: number) {
    const res = await fetch(`${API_BASE}/secondaire/bulletins/${bulletinId}/pdf`, {
      credentials: "include",
    });
    if (!res.ok) {
      setError("Téléchargement PDF impossible.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulletin_${bulletinId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const trimestre = trimestres?.find((t) => t.id === Number(trimestreId));

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Bulletins</h2>
          <p className="text-sm text-muted-foreground">
            Calcul des moyennes, génération, émission et téléchargement des bulletins
          </p>
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

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">— Classe —</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={trimestreId}
            onChange={(e) => setTrimestreId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">— Trimestre —</option>
            {trimestres?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
                {t.bulletins_emises ? " (bulletins émis)" : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => calculer.mutate()}
              disabled={!classeId || !trimestreId || calculer.isPending}
              className="flex items-center gap-2 rounded-md bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
            >
              <Calculator className="w-4 h-4" />
              {calculer.isPending ? "Calcul…" : "Calculer moyennes"}
            </button>
            <button
              onClick={() => generer.mutate()}
              disabled={!classeId || !trimestreId || generer.isPending}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <FilePlus2 className="w-4 h-4" />
              {generer.isPending ? "Génération…" : "Générer bulletins"}
            </button>
          </div>
        </div>

        {trimestre && (
          <div className="mb-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
              Notes {trimestre.notes_cloturees ? "clôturées" : "ouvertes"}
            </span>
            <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
              Moyennes {trimestre.moyennes_calculees ? "calculées" : "non calculées"}
            </span>
            <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
              Bulletins {trimestre.bulletins_emises ? "émis" : "non émis"}
            </span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {!classeId || !trimestreId ? (
            <p className="text-sm text-muted-foreground p-5">
              Sélectionnez une classe et un trimestre.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground p-5">Chargement…</p>
          ) : tableau?.length === 0 ? (
            <p className="text-sm text-muted-foreground p-5">
              Aucun élève dans cette classe pour ce trimestre.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 px-4">Rang</th>
                  <th className="py-2 px-4">Élève</th>
                  <th className="py-2 px-4">Matricule</th>
                  <th className="py-2 px-4">Moyenne</th>
                  <th className="py-2 px-4">Bulletin</th>
                </tr>
              </thead>
              <tbody>
                {tableau?.map((l) => {
                  const b = bulletins[l.inscription_id];
                  return (
                    <tr key={l.inscription_id} className="border-t border-gray-100 align-top">
                      <td className="py-2 px-4">{l.rang ?? "—"}</td>
                      <td className="py-2 px-4">
                        {l.nom} {l.prenom}
                        {l.moyennes_matieres.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {l.moyennes_matieres.map((m) => (
                              <span
                                key={m.matiere}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                                title={`Coef ${m.coefficient}`}
                              >
                                {m.matiere} {m.moyenne}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 font-mono text-xs">{l.matricule ?? "—"}</td>
                      <td className="py-2 px-4">
                        <span className="font-semibold">{l.moyenne_generale ?? "—"}</span>
                        {b && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Mention : {b.mention}
                            {b.is_emise ? " · Émis" : ""}
                            {b.is_signee ? " · Signé" : ""}
                            {b.secret_code ? (
                              <span className="block font-mono text-[10px]">
                                Code : {b.secret_code}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {b === undefined && (
                          <button
                            onClick={() => chargerBulletin(l.inscription_id)}
                            className="text-xs text-primary-dark hover:underline"
                          >
                            Charger le bulletin
                          </button>
                        )}
                        {b === null && (
                          <span className="text-xs text-red-600">
                            Générer les bulletins pour ce trimestre
                          </span>
                        )}
                        {b && (
                          <div className="flex flex-col gap-1.5">
                            {!b.is_emise && (
                              <button
                                onClick={() => emettre.mutate(b.id)}
                                disabled={emettre.isPending}
                                className="flex items-center gap-1 rounded-md bg-primary text-white px-2 py-1 text-xs font-medium hover:bg-primary-dark disabled:opacity-40"
                              >
                                <Send className="w-3 h-3" /> Émettre
                              </button>
                            )}
                            <button
                              onClick={() => telechargerPdf(b.id)}
                              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
