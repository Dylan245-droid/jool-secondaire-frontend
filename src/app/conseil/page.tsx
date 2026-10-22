"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { hasModule, useRequireRoles } from "@/lib/roles";
import { fmtDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Landmark } from "lucide-react";

interface Membre {
  id: number;
  nom: string;
}

interface Resolution {
  id: number;
  texte: string;
  statut: string;
  statut_label: string;
  responsable_id?: number | null;
  responsable?: string | null;
  date_echeance?: string | null;
}

interface Seance {
  id: number;
  date: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  titre: string;
  ordre_du_jour: string;
  statut: string;
  statut_label: string;
  president_id?: number | null;
  president?: string | null;
  secretaire_id?: number | null;
  secretaire?: string | null;
  pv?: string | null;
  date_validation?: string | null;
  nb_resolutions: number;
  resolutions: Resolution[];
}

const STATUTS_SEANCE = [
  { value: "preuve", label: "Prévue" },
  { value: "tenue", label: "Tenue" },
  { value: "validee", label: "Validée" },
];

const STATUTS_RESOLUTION = [
  { value: "adoptee", label: "Adoptée" },
  { value: "en_suivi", label: "En suivi" },
  { value: "cloturee", label: "Clôturée" },
];

const statutBadge = (statut: string) =>
  statut === "validee" || statut === "cloturee"
    ? "bg-green-100 text-green-800"
    : statut === "tenue" || statut === "adoptee"
    ? "bg-blue-100 text-blue-800"
    : "bg-gray-100 text-gray-700";

export default function ConseilPage() {
  const user = useRequireRoles(["owner", "adm", "boa"]);
  const canWrite = hasModule(user, "direction");
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  // Formulaire nouvelle séance (direction)
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newHeure, setNewHeure] = useState("");
  const [newTitre, setNewTitre] = useState("");
  const [newOdj, setNewOdj] = useState("");
  const [newPres, setNewPres] = useState("");
  const [newSecr, setNewSecr] = useState("");

  // Édition séance (PV / statut)
  const [pvDraft, setPvDraft] = useState<Record<number, string | undefined>>({});

  // Nouvelle résolution
  const [resTexte, setResTexte] = useState("");
  const [resResponsable, setResResponsable] = useState("");
  const [resEcheance, setResEcheance] = useState("");

  const { data: seances, isLoading } = useQuery({
    queryKey: ["conseil-seances"],
    queryFn: () => api.get<Seance[]>("/secondaire/conseil/seances"),
  });
  const { data: membres } = useQuery({
    queryKey: ["conseil-membres"],
    queryFn: () => api.get<Membre[]>("/secondaire/conseil/membres"),
    enabled: canWrite,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["conseil-seances"] });
    queryClient.invalidateQueries({ queryKey: ["conseil-synthese"] });
  };

  const creerSeance = useMutation({
    mutationFn: () =>
      api.post<Seance>("/secondaire/conseil/seances", {
        date: newDate,
        heure_debut: newHeure || null,
        heure_fin: null,
        titre: newTitre,
        ordre_du_jour: newOdj,
        president_id: newPres ? Number(newPres) : null,
        secretaire_id: newSecr ? Number(newSecr) : null,
      }),
    onSuccess: (s) => {
      setMsg(`Séance du ${fmtDate(s.date)} enregistrée.`);
      setNewTitre("");
      setNewOdj("");
      setNewHeure("");
      setNewPres("");
      setNewSecr("");
      setExpanded(s.id);
      refetch();
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur d'enregistrement"),
  });

  const majSeance = useMutation({
    mutationFn: (payload: { id: number; statut?: string; pv?: string }) =>
      api.patch<Seance>(`/secondaire/conseil/seances/${payload.id}`, {
        statut: payload.statut,
        pv: payload.pv,
      }),
    onSuccess: () => {
      setMsg("Séance mise à jour.");
      refetch();
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur de mise à jour"),
  });

  const ajouterResolution = useMutation({
    mutationFn: (seanceId: number) =>
      api.post<Resolution>(`/secondaire/conseil/seances/${seanceId}/resolutions`, {
        texte: resTexte,
        responsable_id: resResponsable ? Number(resResponsable) : null,
        date_echeance: resEcheance || null,
      }),
    onSuccess: () => {
      setResTexte("");
      setResResponsable("");
      setResEcheance("");
      refetch();
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur création résolution"),
  });

  const majResolution = useMutation({
    mutationFn: (payload: { id: number; statut: string }) =>
      api.patch<Resolution>(`/secondaire/conseil/resolutions/${payload.id}`, {
        statut: payload.statut,
      }),
    onSuccess: () => refetch(),
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur mise à jour résolution"),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-muted">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" /> Conseil d&apos;administration
            {!canWrite && (
              <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                Lecture seule
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Séances, procès-verbaux et résolutions — la direction anime, le conseil consulte.
          </p>
        </header>

        {msg && <p className="text-sm mb-4 rounded-md bg-secondary px-3 py-2 text-primary-dark">{msg}</p>}

        {canWrite && (
          <section className="bg-card rounded-lg border border-card-border shadow-card p-5 mb-6">
            <h3 className="font-semibold mb-4">Planifier une séance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure (début)</label>
                <input
                  type="time"
                  value={newHeure}
                  onChange={(e) => setNewHeure(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                <input
                  type="text"
                  value={newTitre}
                  onChange={(e) => setNewTitre(e.target.value)}
                  placeholder="Ex. Conseil ordinaire du 1er trimestre"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Président</label>
                <select
                  value={newPres}
                  onChange={(e) => setNewPres(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {membres?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Secrétaire</label>
                <select
                  value={newSecr}
                  onChange={(e) => setNewSecr(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {membres?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordre du jour</label>
                <input
                  type="text"
                  value={newOdj}
                  onChange={(e) => setNewOdj(e.target.value)}
                  placeholder="Points à l'ordre du jour…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => creerSeance.mutate()}
              disabled={!newDate || !newTitre || creerSeance.isPending}
              className="mt-4 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {creerSeance.isPending ? "Enregistrement…" : "Planifier la séance"}
            </button>
          </section>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des séances…</p>
        ) : seances && seances.length > 0 ? (
          <div className="space-y-4">
            {seances.map((s) => {
              const open = expanded === s.id;
              return (
                <section key={s.id} className="bg-card rounded-lg border border-card-border shadow-card">
                  <button
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {s.titre || "Séance du conseil"}
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}
                          — {fmtDate(s.date)}
                          {s.heure_debut ? ` à ${s.heure_debut.slice(0, 5)}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.nb_resolutions} résolution(s)
                        {s.president ? ` · Président : ${s.president}` : ""}
                        {s.date_validation ? ` · Validée le ${fmtDate(s.date_validation)}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs rounded-full px-2 py-0.5 ${statutBadge(s.statut)}`}>
                        {s.statut_label}
                      </span>
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {open && (
                    <div className="px-5 pb-5 border-t border-card-border">
                      {s.ordre_du_jour && (
                        <p className="text-sm mt-4">
                          <span className="font-medium">Ordre du jour :</span> {s.ordre_du_jour}
                        </p>
                      )}

                      {canWrite && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                            <select
                              value={s.statut}
                              onChange={(e) => majSeance.mutate({ id: s.id, statut: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                              {STATUTS_SEANCE.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Procès-verbal
                            </label>
                            <textarea
                              rows={3}
                              value={pvDraft[s.id] ?? s.pv ?? ""}
                              onChange={(e) =>
                                setPvDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                              }
                              placeholder="Rédigez le PV de la séance…"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => {
                                setPvDraft((prev) => ({ ...prev, [s.id]: undefined }));
                                majSeance.mutate({ id: s.id, pv: pvDraft[s.id] ?? "" });
                              }}
                              disabled={(pvDraft[s.id] ?? s.pv ?? "") === (s.pv ?? "")}
                              className="mt-2 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
                            >
                              Enregistrer le PV
                            </button>
                          </div>
                        </div>
                      )}

                      {!canWrite && s.pv && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-600 mb-1">Procès-verbal</p>
                          <p className="text-sm whitespace-pre-wrap bg-muted rounded-md p-3">{s.pv}</p>
                        </div>
                      )}

                      <div className="mt-5">
                        <p className="font-medium text-sm mb-2">Résolutions ({s.resolutions.length})</p>
                        {s.resolutions.length > 0 && (
                          <ul className="divide-y divide-card-border border border-card-border rounded-lg">
                            {s.resolutions.map((r) => (
                              <li key={r.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm">{r.texte}</p>
                                  <span className="flex items-center gap-2 shrink-0">
                                    {canWrite ? (
                                      <select
                                        value={r.statut}
                                        onChange={(e) =>
                                          majResolution.mutate({ id: r.id, statut: e.target.value })
                                        }
                                        className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                                      >
                                        {STATUTS_RESOLUTION.map((t) => (
                                          <option key={t.value} value={t.value}>
                                            {t.label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span
                                        className={`text-xs rounded-full px-2 py-0.5 ${statutBadge(r.statut)}`}
                                      >
                                        {r.statut_label}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {(r.responsable || r.date_echeance) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {r.responsable ? `Responsable : ${r.responsable}` : ""}
                                    {r.date_echeance
                                      ? `${r.responsable ? " · " : ""}Échéance : ${fmtDate(r.date_echeance)}`
                                      : ""}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        {canWrite && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Texte de la résolution
                              </label>
                              <input
                                type="text"
                                value={resTexte}
                                onChange={(e) => setResTexte(e.target.value)}
                                placeholder="Ex. Adoption du budget…"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Responsable
                              </label>
                              <select
                                value={resResponsable}
                                onChange={(e) => setResResponsable(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                              >
                                <option value="">— Choisir —</option>
                                {membres?.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.nom}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Échéance
                              </label>
                              <input
                                type="date"
                                value={resEcheance}
                                onChange={(e) => setResEcheance(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {canWrite && (
                          <button
                            onClick={() => ajouterResolution.mutate(s.id)}
                            disabled={!resTexte || ajouterResolution.isPending}
                            className="mt-3 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
                          >
                            {ajouterResolution.isPending ? "Ajout…" : "Ajouter la résolution"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune séance enregistrée pour le moment.</p>
        )}
      </main>
    </div>
  );
}