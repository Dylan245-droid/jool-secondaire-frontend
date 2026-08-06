"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { AlertTriangle, BookOpen, Check, UserX } from "lucide-react";

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

interface Absence {
  id: number;
  inscription_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  matricule: string;
  date: string;
  type: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  matiere?: string | null;
  statut: string;
  motif: string;
  notifie_parent: boolean;
}

interface Assiduite {
  inscription_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  matricule: string;
  absences_total: number;
  absences_non_justifiees: number;
  retards: number;
  sanctions: number;
}

interface Sanction {
  id: number;
  inscription_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  type: string;
  date_sanction: string;
  description: string;
  validee_direction: boolean;
  levee: boolean;
}

interface Seance {
  id: number;
  classe_id: number;
  matiere_id: number;
  matiere_code: string;
  matiere_label: string;
  trimestre_id: number;
  date_seance: string;
  numero_seance: number;
  contenu_cours: string;
  devoirs: string;
  ressources: string[];
  is_published: boolean;
}

const TYPES_ABSENCE = [
  { value: "absence", label: "Absence" },
  { value: "retard", label: "Retard" },
  { value: "sortie", label: "Sortie anticipée" },
];

const TYPES_SANCTION = [
  { value: "avertissement", label: "Avertissement" },
  { value: "blame", label: "Blâme" },
  { value: "exclusion_temporaire", label: "Exclusion temporaire" },
  { value: "travail_interet_general", label: "Travail d'intérêt général" },
];

export default function VieScolairePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"absences" | "sanctions" | "cahier">("absences");
  const [selectedClasse, setSelectedClasse] = useState<number | null>(null);

  // Formulaire absences
  const [dateAbs, setDateAbs] = useState(new Date().toISOString().slice(0, 10));
  const [typeAbs, setTypeAbs] = useState("absence");
  const [coche, setCoche] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");

  // Formulaire sanction
  const [sancIns, setSancIns] = useState("");
  const [sancType, setSancType] = useState("avertissement");
  const [sancDate, setSancDate] = useState(new Date().toISOString().slice(0, 10));
  const [sancDesc, setSancDesc] = useState("");

  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<Classe[]>("/secondaire/classes"),
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["inscriptions", selectedClasse],
    queryFn: () => api.get<Inscription[]>(`/secondaire/inscriptions?classe_id=${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: absences } = useQuery({
    queryKey: ["absences", selectedClasse],
    queryFn: () => api.get<Absence[]>(`/secondaire/viescolaire/absences/classe/${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: assiduite } = useQuery({
    queryKey: ["assiduite", selectedClasse],
    queryFn: () => api.get<Assiduite[]>(`/secondaire/viescolaire/assiduite/classe/${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: sanctions } = useQuery({
    queryKey: ["sanctions", selectedClasse],
    queryFn: () => api.get<Sanction[]>(`/secondaire/viescolaire/sanctions/classe/${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: seances } = useQuery({
    queryKey: ["cahier-textes", selectedClasse],
    queryFn: () => api.get<Seance[]>(`/secondaire/viescolaire/cahier-textes/classe/${selectedClasse}`),
    enabled: selectedClasse !== null,
  });
  const { data: trimestres } = useQuery({
    queryKey: ["trimestres"],
    queryFn: () => api.get<{ id: number; label: string }[]>("/secondaire/trimestres"),
  });
  const { data: matieres } = useQuery({
    queryKey: ["matieres"],
    queryFn: () => api.get<{ id: number; code: string; label: string }[]>("/secondaire/matieres"),
  });

  const refetch = () => {
    ["absences", "assiduite", "sanctions", "cahier-textes"].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k, selectedClasse] })
    );
  };

  const enregistrerAbsences = useMutation({
    mutationFn: () => {
      const items = Array.from(coche).map((inscription_id) => ({
        inscription_id,
        date: dateAbs,
        type: typeAbs,
        motif: "",
      }));
      return api.post<Absence[]>("/secondaire/viescolaire/absences/bulk", items);
    },
    onSuccess: (data) => {
      setMsg(`Enregistrées : ${data.length} (parents notifiés : ${data.filter((a) => a.notifie_parent).length})`);
      setCoche(new Set());
      refetch();
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur d'enregistrement"),
  });

  const creerSanction = useMutation({
    mutationFn: () =>
      api.post<Sanction>("/secondaire/viescolaire/sanctions", {
        inscription_id: Number(sancIns),
        type: sancType,
        date_faits: sancDate,
        date_sanction: sancDate,
        description: sancDesc,
      }),
    onSuccess: () => {
      setSancIns("");
      setSancDesc("");
      refetch();
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur création sanction"),
  });

  const leverSanction = useMutation({
    mutationFn: (id: number) => api.patch<Sanction>(`/secondaire/viescolaire/sanctions/${id}`, { levee: true }),
    onSuccess: () => refetch(),
  });

  const toggle = (id: number) => {
    setCoche((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8 bg-gray-50">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Vie scolaire</h2>
          <p className="text-sm text-muted-foreground">Absences, retards, sanctions et cahier de textes</p>
        </header>

        <div className="flex gap-2 mb-6">
          <select
            value={selectedClasse ?? ""}
            onChange={(e) => {
              setSelectedClasse(e.target.value ? Number(e.target.value) : null);
              setCoche(new Set());
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">— Choisir une classe —</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {c.niveau.label} ({c.effectif})
              </option>
            ))}
          </select>
          {["absences", "sanctions", "cahier"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as typeof tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium border ${
                tab === t ? "bg-primary text-white border-primary" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {t === "absences" ? "Absences & Retards" : t === "sanctions" ? "Sanctions" : "Cahier de textes"}
            </button>
          ))}
        </div>

        {!selectedClasse && (
          <p className="text-sm text-muted-foreground">Sélectionnez une classe pour commencer.</p>
        )}
        {loadingClasses && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {selectedClasse && tab === "absences" && (
          <div className="space-y-6">
            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" /> Signaler absences / retards
              </h3>
              <div className="flex flex-wrap items-end gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={dateAbs}
                    onChange={(e) => setDateAbs(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={typeAbs}
                    onChange={(e) => setTypeAbs(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {TYPES_ABSENCE.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => enregistrerAbsences.mutate()}
                  disabled={coche.size === 0 || enregistrerAbsences.isPending}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {enregistrerAbsences.isPending ? "Enregistrement…" : `Enregistrer (${coche.size})`}
                </button>
              </div>
              {msg && <p className="text-sm mb-3 rounded-md bg-secondary px-3 py-2 text-primary-dark">{msg}</p>}
              <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {inscriptions?.map((i) => (
                  <li key={i.id}>
                    <label className="flex items-center gap-3 py-2 text-sm cursor-pointer hover:bg-gray-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={coche.has(i.id)}
                        onChange={() => toggle(i.id)}
                        className="rounded border-gray-300"
                      />
                      <span>
                        {i.etudiant_nom} {i.etudiant_prenom}
                        {i.matricule && (
                          <span className="text-xs text-muted-foreground ml-2">({i.matricule})</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Assiduité de la classe</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2">Élève</th>
                      <th className="py-2">Absences</th>
                      <th className="py-2">Non justifiées</th>
                      <th className="py-2">Retards</th>
                      <th className="py-2">Sanctions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assiduite?.map((a) => (
                      <tr key={a.inscription_id} className="border-b border-gray-100">
                        <td className="py-2">
                          {a.eleve_nom} {a.eleve_prenom}
                        </td>
                        <td className="py-2">{a.absences_total}</td>
                        <td className="py-2">
                          <span
                            className={
                              a.absences_non_justifiees > 0 ? "text-red-600 font-medium" : "text-gray-600"
                            }
                          >
                            {a.absences_non_justifiees}
                          </span>
                        </td>
                        <td className="py-2">{a.retards}</td>
                        <td className="py-2">{a.sanctions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Dernières déclarations</h3>
              <ul className="divide-y divide-gray-100">
                {absences?.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="font-medium">
                        {a.eleve_nom} {a.eleve_prenom}
                      </span>{" "}
                      — {TYPES_ABSENCE.find((t) => t.value === a.type)?.label ?? a.type} du {a.date}
                      {a.matiere && <span className="text-muted-foreground"> ({a.matiere})</span>}
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      {a.notifie_parent && (
                        <span className="text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" /> parent notifié
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          a.statut === "justifiee"
                            ? "bg-green-100 text-green-800"
                            : a.statut === "dispensee"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {a.statut}
                      </span>
                    </span>
                  </li>
                ))}
                {absences?.length === 0 && (
                  <li className="text-sm text-muted-foreground py-3">Aucune déclaration.</li>
                )}
              </ul>
            </section>
          </div>
        )}

        {selectedClasse && tab === "sanctions" && (
          <div className="space-y-6">
            <section className="bg-white rounded-lg border border-gray-200 p-5 max-w-xl">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Prononcer une sanction (direction)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Élève</label>
                  <select
                    value={sancIns}
                    onChange={(e) => setSancIns(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {inscriptions?.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.etudiant_nom} {i.etudiant_prenom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={sancType}
                      onChange={(e) => setSancType(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {TYPES_SANCTION.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date des faits</label>
                    <input
                      type="date"
                      value={sancDate}
                      onChange={(e) => setSancDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    value={sancDesc}
                    onChange={(e) => setSancDesc(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => creerSanction.mutate()}
                  disabled={!sancIns || !sancDesc || creerSanction.isPending}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {creerSanction.isPending ? "Création…" : "Prononcer"}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Sanctions ({sanctions?.length ?? 0})</h3>
              <ul className="divide-y divide-gray-100">
                {sanctions?.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p>
                        <span className="font-medium">
                          {s.eleve_nom} {s.eleve_prenom}
                        </span>{" "}
                        — {TYPES_SANCTION.find((t) => t.value === s.type)?.label ?? s.type}
                        <span className="text-muted-foreground"> le {s.date_sanction}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      {s.levee ? (
                        <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">Levée</span>
                      ) : (
                        <button
                          onClick={() => leverSanction.mutate(s.id)}
                          className="text-xs rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50"
                        >
                          Lever
                        </button>
                      )}
                    </span>
                  </li>
                ))}
                {sanctions?.length === 0 && (
                  <li className="text-sm text-muted-foreground py-3">Aucune sanction.</li>
                )}
              </ul>
            </section>
          </div>
        )}

        {selectedClasse && tab === "cahier" && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Cahier de textes
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Séances saisies par les professeurs — consultables par les parents.
            </p>
            {seances?.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune séance saisie pour cette classe.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {seances?.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {s.matiere_label}{" "}
                      <span className="text-muted-foreground font-normal">
                        — séance n°{s.numero_seance} du {s.date_seance}
                      </span>
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {trimestres?.find((t) => t.id === s.trimestre_id)?.label ?? "T?"}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{s.contenu_cours}</p>
                  {s.devoirs && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Devoirs :</span> {s.devoirs}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {seances?.length ? (
              <p className="text-xs text-muted-foreground mt-3">
                Saisie par les professeurs : {matieres?.length} matières disponibles côté prof (à venir).
              </p>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
