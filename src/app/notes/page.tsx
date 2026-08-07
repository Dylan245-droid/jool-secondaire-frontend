"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";

interface Classe {
  id: number;
  label: string;
}

interface Trimestre {
  id: number;
  label: string;
  notes_cloturees: boolean;
}

interface Matiere {
  id: number;
  label: string;
  coefficient_defaut: number;
}

interface Inscription {
  id: number;
  etudiant_nom: string;
  etudiant_prenom: string;
}

interface Note {
  id: number;
  inscription_id: number;
  matiere_id: number;
  type: string;
  valeur: number;
  coefficient: number;
}

const TYPES = [
  { value: "devoir", label: "Devoir / Interrogation" },
  { value: "controle", label: "Contrôle" },
  { value: "composition", label: "Composition" },
  { value: "examen", label: "Examen trimestriel" },
  { value: "oral", label: "Oral" },
  { value: "pratique", label: "Pratique / TP" },
  { value: "devoir_maison", label: "Devoir maison" },
];

export default function NotesPage() {
  useRequireRoles(["owner", "adm", "tch"]);
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [trimestreId, setTrimestreId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [type, setType] = useState("devoir");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });
  const { data: trimestres } = useQuery({
    queryKey: ["trimestres"],
    queryFn: () => api.get<Trimestre[]>("/secondaire/trimestres"),
  });
  const { data: matieres } = useQuery({
    queryKey: ["matieres"],
    queryFn: () => api.get<Matiere[]>("/secondaire/matieres"),
  });

  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions", classeId, "active"],
    queryFn: () =>
      api.get<Inscription[]>(`/secondaire/inscriptions?classe_id=${classeId}&statut=active`),
    enabled: !!classeId,
  });

  const { data: existing } = useQuery({
    queryKey: ["notes", classeId, trimestreId, matiereId],
    queryFn: () =>
      api.get<Note[]>(
        `/secondaire/notes?classe_id=${classeId}&trimestre_id=${trimestreId}&matiere_id=${matiereId}`
      ),
    enabled: !!classeId && !!trimestreId && !!matiereId,
  });

  useEffect(() => {
    if (!existing) return;
    const last: Record<number, number> = {};
    for (const n of existing) {
      if (!(n.inscription_id in last)) last[n.inscription_id] = n.valeur;
    }
    const v: Record<number, string> = {};
    for (const [id, val] of Object.entries(last)) v[Number(id)] = String(val);
    setValues(v);
  }, [existing]);

  const save = useMutation({
    mutationFn: () =>
      api.post<Note[]>("/secondaire/notes/bulk", {
        trimestre_id: Number(trimestreId),
        classe_id: Number(classeId),
        matiere_id: Number(matiereId),
        type,
        date,
        notes: (inscriptions ?? []).map((i) => ({
          inscription_id: i.id,
          valeur: values[i.id] !== undefined && values[i.id] !== "" ? Number(values[i.id]) : 0,
          coefficient: 1,
        })),
      }),
    onSuccess: () => {
      setMsg("Notes enregistrées.");
      setError("");
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
      setMsg("");
    },
  });

  const trimestre = trimestres?.find((t) => t.id === Number(trimestreId));

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
          <p className="text-sm text-muted-foreground">
            Saisie grille des notes par classe, matière et type d&apos;évaluation
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
                {t.notes_cloturees ? " (clôturé)" : ""}
              </option>
            ))}
          </select>
          <select
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">— Matière —</option>
            {matieres?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} (coef {m.coefficient_defaut})
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {trimestre?.notes_cloturees && (
          <p className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            Les notes de ce trimestre sont clôturées : la saisie est bloquée côté serveur.
          </p>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {!classeId || !trimestreId || !matiereId ? (
            <p className="text-sm text-muted-foreground p-5">
              Sélectionnez une classe, un trimestre et une matière.
            </p>
          ) : inscriptions?.length === 0 ? (
            <p className="text-sm text-muted-foreground p-5">Aucun élève actif dans cette classe.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 px-4">Élève</th>
                  <th className="py-2 px-4 w-40">Note /20</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions?.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="py-2 px-4">
                      {i.etudiant_nom} {i.etudiant_prenom}
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.25}
                        value={values[i.id] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [i.id]: e.target.value }))
                        }
                        className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {classeId && trimestreId && matiereId && inscriptions?.length ? (
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !!trimestre?.notes_cloturees}
            className="mt-6 flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {save.isPending ? "Enregistrement…" : "Enregistrer les notes"}
          </button>
        ) : null}
      </main>
    </div>
  );
}
