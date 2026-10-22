"use client";

import { useCallback, useEffect, useState } from "react";

import { Activity, Plus, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useSessionUser } from "@/lib/roles";
import { SidebarNav } from "@/components/shared/SidebarNav";

interface TaskEvent {
  id: number;
  type: string;
  type_label: string;
  auteur_id: number | null;
  auteur: string;
  message: string;
  cree_le: string;
  date_display: string;
}

interface Task {
  id: number;
  titre: string;
  description: string;
  priorite: string;
  priorite_label: string;
  statut: string;
  statut_label: string;
  service_demandeur: string;
  service_demandeur_label: string;
  service_destinataire: string;
  service_destinataire_label: string;
  demandee_par_id: number | null;
  demandee_par: string;
  echeance: string | null;
  reponse: string;
  decidee_par_id: number | null;
  decidee_par: string;
  date_decision: string | null;
  cree_le: string;
  maj_le: string;
  events: TaskEvent[];
}

interface ServiceInfo {
  code: string;
  label: string;
  order: number;
}

const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "demande", label: "Demande" },
  { value: "en_cours", label: "En cours" },
  { value: "reglee", label: "Réglée" },
  { value: "refusee", label: "Refusée" },
];

const STATUT_STYLES: Record<string, string> = {
  demande: "bg-amber-100 text-amber-700",
  en_cours: "bg-blue-100 text-blue-700",
  reglee: "bg-green-100 text-green-700",
  refusee: "bg-red-100 text-red-700",
};

const PRIORITE_STYLES: Record<string, string> = {
  basse: "bg-gray-100 text-gray-600",
  normale: "bg-gray-100 text-gray-600",
  haute: "bg-orange-100 text-orange-700",
};

export default function TachesPage() {
  const user = useSessionUser();
  const myService = user?.adminProfile?.serviceCode ?? null;

  const [view, setView] = useState<"toutes" | "recues" | "envoyees">(
    user?.adminProfile?.serviceCode ? "recues" : "toutes"
  );
  const [statut, setStatut] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    service_demandeur: myService ?? "",
    service_destinataire: "",
    titre: "",
    description: "",
    priorite: "normale",
    echeance: "",
  });

  const [reply, setReply] = useState<Record<number, { reponse: string; statut: string }>>({});

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statut) params.set("statut", statut);
      if (view !== "toutes") params.set("vue", view);
      const qs = params.toString();
      setTasks(await api.get<Task[]>(`/secondaire/taches${qs ? `?${qs}` : ""}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement des tâches");
    } finally {
      setLoading(false);
    }
  }, [view, statut]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    api
      .get<ServiceInfo[]>("/secondaire/taches/services")
      .then(setServices)
      .catch(() => {});
  }, []);

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<Task>("/secondaire/taches", { ...form, echeance: form.echeance || null });
      setForm({ service_demandeur: myService ?? "", service_destinataire: "", titre: "", description: "", priorite: "normale", echeance: "" });
      setShowForm(false);
      setView(user?.adminProfile?.serviceCode ? "envoyees" : "toutes");
      await fetchList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur création de la tâche");
    } finally {
      setBusy(false);
    }
  };

  const repondre = async (taskId: number) => {
    const r = reply[taskId];
    if (!r?.reponse?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post<Task>(`/secondaire/taches/${taskId}/repondre`, {
        reponse: r.reponse,
        statut: r.statut,
      });
      await fetchList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi de la réponse");
    } finally {
      setBusy(false);
    }
  };

  const peutRepondre = (t: Task) =>
    t.statut !== "reglee" &&
    t.statut !== "refusee" &&
    (user?.role === "owner" || t.service_destinataire === myService);

  if (user?.role !== "owner" && user?.role !== "adm") {
    return (
      <div className="flex h-screen overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
            <p className="mt-2 text-gray-600">Vous n&apos;avez pas accès aux tâches inter-services.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <div className="space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tâches inter-services</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Demandes et signalements entre services de l&apos;établissement
              </p>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            >
              <Plus className="w-4 h-4" /> Nouvelle tâche
            </button>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {showForm && (
            <form onSubmit={creer} className="bg-white p-5 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Créer une tâche</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service demandeur</label>
                  <select
                    value={form.service_demandeur}
                    onChange={e => setForm({ ...form, service_demandeur: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {services.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service destinataire</label>
                  <select
                    value={form.service_destinataire}
                    onChange={e => setForm({ ...form, service_destinataire: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {services
                      .filter(s => s.code !== form.service_demandeur)
                      .map(s => (
                        <option key={s.code} value={s.code}>{s.label}</option>
                      ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    value={form.titre}
                    onChange={e => setForm({ ...form, titre: e.target.value })}
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="Ex. : Demande de régularisation de dossier"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Détails de la demande, pièces attendues..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  <select
                    value={form.priorite}
                    onChange={e => setForm({ ...form, priorite: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={form.echeance}
                    onChange={e => setForm({ ...form, echeance: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Créer
                </button>
              </div>
            </form>
          )}

          {/* Filtres de liste */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              {(["recues", "envoyees", "toutes"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 text-sm ${
                    view === v ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {v === "recues" ? "Reçues" : v === "envoyees" ? "Envoyées" : "Toutes"}
                </button>
              ))}
            </div>
            <select
              value={statut}
              onChange={e => setStatut(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {STATUTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Liste des tâches */}
          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune tâche trouvée.
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(t => (
                <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{t.titre}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUT_STYLES[t.statut] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.statut_label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITE_STYLES[t.priorite] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.priorite_label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{t.service_demandeur_label}</span>
                    {" → "}
                    <span className="font-medium text-gray-800">{t.service_destinataire_label}</span>
                    {t.echeance && (
                      <span className="ml-2 text-gray-500">· échéance {t.echeance}</span>
                    )}
                  </p>
                  {t.description && (
                    <p className="mt-2 text-sm text-gray-700">{t.description}</p>
                  )}
                  {t.reponse && (
                    <div className="mt-3 bg-gray-50 border border-gray-100 rounded-md p-3 text-sm">
                      <span className="font-medium text-gray-700">Réponse de {t.decidee_par || t.service_destinataire_label} :</span>{" "}
                      {t.reponse}
                    </div>
                  )}

                  {peutRepondre(t) && (
                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                      <textarea
                        value={reply[t.id]?.reponse ?? ""}
                        onChange={e => setReply(prev => ({ ...prev, [t.id]: { ...prev[t.id], reponse: e.target.value } }))}
                        rows={2}
                        placeholder="Votre réponse au service demandeur..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <div className="flex items-center gap-2 justify-between">
                        <select
                          value={reply[t.id]?.statut ?? "reglee"}
                          onChange={e => setReply(prev => ({ ...prev, [t.id]: { ...prev[t.id], statut: e.target.value } }))}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="en_cours">En cours</option>
                          <option value="reglee">Réglée</option>
                          <option value="refusee">Refusée</option>
                        </select>
                        <button
                          onClick={() => repondre(t.id)}
                          disabled={busy || !reply[t.id]?.reponse?.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" /> Répondre
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fil d'activité */}
                  {t.events.length > 0 && (
                    <details className="mt-4 border-t border-gray-100 pt-3">
                      <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <Activity className="w-4 h-4" /> Fil d&apos;activité ({t.events.length})
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {t.events.map(ev => (
                          <li key={ev.id} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-gray-400 whitespace-nowrap">{ev.date_display}</span>
                            <span>
                              <span className="font-medium text-gray-800">{ev.auteur || "Système"}</span> — {ev.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}