"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useRequireRoles } from "@/lib/roles";
import { useSessionStore } from "@/stores/sessionStore";
import { AlertCircle, Bell, BookOpen, FileText, LogOut, MessageSquare, QrCode, UserX, Wallet, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8007/api/v2";

interface Enfant {
  inscription_id: number;
  matricule: string;
  nom: string;
  prenom: string;
  classe_label: string;
  niveau_label: string;
  annee_scolaire: string;
  bulletins_emis: number;
  absences_non_justifiees: number;
  retards: number;
  sanctions: number;
}

interface BulletinParent {
  id: number;
  trimestre: string;
  moyenne_generale: number;
  mention: string;
  rang_classe: number;
  effectif_classe: number;
  absences_justifiees: number;
  absences_non_justifiees: number;
  retards: number;
  secret_code: string;
  pdf_url: string;
  date_emission?: string | null;
}

interface VieScolaireEnfant {
  eleve_nom: string;
  eleve_prenom: string;
  classe_label: string;
  trimestre_courant?: string | null;
  bulletins_emis: number;
  absences: { id: number; date: string; type: string; statut: string; motif: string; matiere?: string | null }[];
  sanctions: { id: number; type: string; date_sanction: string; description: string; levee: boolean }[];
}

interface CahierTextesEnfant {
  classe_label: string;
  trimestre?: string | null;
  seances: {
    id: number;
    matiere_code: string;
    matiere_label: string;
    date_seance: string;
    numero_seance: number;
    contenu_cours: string;
    devoirs: string;
    ressources: string[];
    enseignant_nom: string;
  }[];
}

interface Message {
  id: number;
  subject: string;
  message: string;
  replied: boolean;
  reply: string;
  replied_at?: string | null;
  created_at: string;
}

interface Alerte {
  id: number;
  inscription_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  type: string;
  message: string;
  lue: boolean;
  created_at: string;
}

interface PortabiliteEnfant {
  inscription_id: number;
  consentement: boolean;
  transfere: boolean;
  qr_data_url?: string;
  export_url?: string;
}

interface FinancesEnfant {
  inscription_id: number;
  total_du: number;
  total_paye: number;
  reste: number;
  frais: { label: string; montant: number; type: string }[];
  paiements: { id: number; montant: number; mode: string; reference: string; date: string; statut: string; frais: string }[];
}

const MENTIONS: Record<string, string> = {
  tb: "Très Bien",
  b: "Bien",
  ab: "Assez Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
};

export default function ParentPage() {
  useRequireRoles(["prt"]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const clear = useSessionStore((s) => s.clear);
  const [selectedEnfant, setSelectedEnfant] = useState<number | null>(null);
  const [tab, setTab] = useState<"bulletins" | "viescolaire" | "cahier" | "portabilite" | "finances">("bulletins");
  const [showAlertes, setShowAlertes] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: enfants, isLoading } = useQuery({
    queryKey: ["parent-enfants"],
    queryFn: () => api.get<Enfant[]>("/secondaire/parent/enfants"),
  });
  const { data: alertes } = useQuery({
    queryKey: ["parent-alertes"],
    queryFn: () => api.get<Alerte[]>("/secondaire/parent/alertes"),
  });
  const { data: nonLues } = useQuery({
    queryKey: ["parent-alertes-non-lues"],
    queryFn: () => api.get<{ non_lues: number }>("/secondaire/parent/alertes/non-lues"),
  });
  const { data: messages } = useQuery({
    queryKey: ["parent-messages"],
    queryFn: () => api.get<Message[]>("/secondaire/parent/messages"),
  });
  const { data: bulletins } = useQuery({
    queryKey: ["parent-bulletins", selectedEnfant],
    queryFn: () => api.get<BulletinParent[]>(`/secondaire/parent/enfants/${selectedEnfant}/bulletins`),
    enabled: selectedEnfant !== null,
  });
  const { data: viescolaire } = useQuery({
    queryKey: ["parent-viescolaire", selectedEnfant],
    queryFn: () => api.get<VieScolaireEnfant>(`/secondaire/parent/enfants/${selectedEnfant}/viescolaire`),
    enabled: selectedEnfant !== null,
  });
  const { data: cahier } = useQuery({
    queryKey: ["parent-cahier", selectedEnfant],
    queryFn: () => api.get<CahierTextesEnfant>(`/secondaire/parent/enfants/${selectedEnfant}/cahier-textes`),
    enabled: selectedEnfant !== null,
  });
  const { data: portabilite } = useQuery({
    queryKey: ["parent-portabilite", selectedEnfant],
    queryFn: () => api.get<PortabiliteEnfant>(`/secondaire/parent/enfants/${selectedEnfant}/portabilite`),
    enabled: selectedEnfant !== null,
  });
  const { data: finances } = useQuery({
    queryKey: ["parent-finances", selectedEnfant],
    queryFn: () => api.get<FinancesEnfant>(`/secondaire/parent/enfants/${selectedEnfant}/finances`),
    enabled: selectedEnfant !== null,
  });

  const accorderConsentement = useMutation({
    mutationFn: (consentement: boolean) =>
      api.patch(`/secondaire/parent/enfants/${selectedEnfant}/consentement`, { consentement }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-portabilite", selectedEnfant] }),
    onError: (err) => alert(err instanceof ApiError ? err.message : "Erreur de consentement"),
  });

  const envoyerMessage = useMutation({
    mutationFn: () => api.post<Message>("/secondaire/parent/messages", { subject, message }),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["parent-messages"] });
    },
    onError: (err) => alert(err instanceof ApiError ? err.message : "Erreur d'envoi"),
  });

  const marquerLue = useMutation({
    mutationFn: (id: number) => api.patch(`/secondaire/parent/alertes/${id}/lue`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-alertes"] });
      queryClient.invalidateQueries({ queryKey: ["parent-alertes-non-lues"] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary-dark">Espace Parent — Jool Secondaire</h1>
          <p className="text-xs text-muted-foreground">
            Suivi de la scolarité de vos enfants{user?.first_name ? ` — ${user.first_name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlertes((v) => !v)}
            className="relative flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Bell className="w-4 h-4" /> Alertes
            {nonLues && nonLues.non_lues > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0.5">
                {nonLues.non_lues}
              </span>
            )}
          </button>
          <button
            onClick={async () => {
              try {
                await api.post("/auth/logout");
              } catch {
                // cookie nettoyé côté client de toute façon
              }
              clear();
              queryClient.clear();
              router.push("/login");
              router.refresh();
            }}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      {showAlertes && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-semibold text-sm">Mes alertes</h3>
              <button onClick={() => setShowAlertes(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {alertes?.map((a) => (
                <li
                  key={a.id}
                  onClick={() => marquerLue.mutate(a.id)}
                  className={`px-5 py-3 cursor-pointer ${a.lue ? "opacity-60" : "bg-secondary/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {a.eleve_prenom} {a.eleve_nom}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{a.message}</p>
                </li>
              ))}
              {alertes?.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">Aucune alerte.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <main className="p-8 max-w-6xl mx-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {enfants?.map((e) => (
            <button
              key={e.inscription_id}
              onClick={() => {
                setSelectedEnfant(e.inscription_id);
                setTab("bulletins");
              }}
              className={`text-left bg-white rounded-lg border p-5 hover:shadow-md transition-shadow ${
                selectedEnfant === e.inscription_id ? "border-primary ring-1 ring-primary" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">
                  {e.prenom} {e.nom}
                </p>
                <span className="text-xs text-muted-foreground">{e.matricule}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {e.niveau_label} {e.classe_label} — {e.annee_scolaire}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5">
                  {e.bulletins_emis} bulletin{e.bulletins_emis > 1 ? "s" : ""}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    e.absences_non_justifiees > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {e.absences_non_justifiees} abs. non just.
                </span>
                <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{e.retards} retard(s)</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    e.sanctions > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {e.sanctions} sanction{e.sanctions > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>

        {!isLoading && enfants?.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun enfant lié à ce compte. Contactez l&apos;administration de l&apos;établissement.
            </p>
          </div>
        )}

        {selectedEnfant && (
          <div className="space-y-6">
            <div className="flex gap-2">
              {[
                { key: "bulletins", label: "Bulletins" },
                { key: "viescolaire", label: "Vie scolaire" },
                { key: "cahier", label: "Cahier de textes" },
                { key: "portabilite", label: "Portabilité" },
                { key: "finances", label: "Finances" },
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

            {tab === "bulletins" && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" /> Bulletins signés
                </h3>
                {bulletins?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun bulletin émis pour le moment. L&apos;administration les publie après le conseil de classe.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bulletins?.map((b) => (
                    <div key={b.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Bulletin {b.trimestre}</p>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 ${
                            b.moyenne_generale >= 12
                              ? "bg-green-100 text-green-800"
                              : b.moyenne_generale >= 10
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {MENTIONS[b.mention] ?? b.mention}
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-primary-dark">
                        {b.moyenne_generale.toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground"> /20</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Rang : {b.rang_classe}/{b.effectif_classe} — abs. : {b.absences_non_justifiees} non just. /{" "}
                        {b.absences_justifiees} just. — retards : {b.retards}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          Code vérification : <code>{b.secret_code}</code>
                        </span>
                        <a
                          href={`${API_BASE}${b.pdf_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-dark"
                        >
                          <FileText className="w-3 h-3" /> PDF signé
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "viescolaire" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-500" /> Absences & retards
                    {viescolaire?.trimestre_courant && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({viescolaire.trimestre_courant})
                      </span>
                    )}
                  </h3>
                  {viescolaire?.absences.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune absence signalée.</p>
                  )}
                  <ul className="divide-y divide-gray-100">
                    {viescolaire?.absences.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                        <span>
                          {new Date(a.date).toLocaleDateString("fr-FR")} —{" "}
                          {a.type === "retard" ? "Retard" : a.type === "sortie" ? "Sortie anticipée" : "Absence"}
                          {a.matiere && <span className="text-muted-foreground"> ({a.matiere})</span>}
                        </span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 ${
                            a.statut === "justifiee"
                              ? "bg-green-100 text-green-800"
                              : a.statut === "dispensee"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {a.statut}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {viescolaire?.absences.some((a) => a.statut === "non_justifiee") && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Veuillez fournir un justificatif à la direction (certificat médical, mot des parents).
                    </p>
                  )}
                </section>

                <section className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" /> Sanctions
                  </h3>
                  {viescolaire?.sanctions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune sanction.</p>
                  )}
                  <ul className="divide-y divide-gray-100">
                    {viescolaire?.sanctions.map((s) => (
                      <li key={s.id} className="py-2 text-sm">
                        <p>
                          <span className="font-medium">{s.type}</span>
                          <span className="text-muted-foreground"> le {s.date_sanction}</span>
                          {s.levee && (
                            <span className="ml-2 text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">
                              levée
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {tab === "cahier" && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Cahier de textes
                  <span className="text-xs font-normal text-muted-foreground">
                    {cahier?.classe_label} {cahier?.trimestre ? `— ${cahier.trimestre}` : ""}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Suivez les cours dispensés et les devoirs à faire.
                </p>
                {cahier?.seances.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune séance publiée pour le moment.</p>
                )}
                <ul className="divide-y divide-gray-100">
                  {cahier?.seances.map((s) => (
                    <li key={s.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {s.matiere_label}{" "}
                          <span className="text-muted-foreground font-normal">
                            — séance n°{s.numero_seance} du{" "}
                            {new Date(s.date_seance).toLocaleDateString("fr-FR")}
                          </span>
                        </p>
                        {s.enseignant_nom && (
                          <span className="text-xs text-muted-foreground">Prof : {s.enseignant_nom}</span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{s.contenu_cours}</p>
                      {s.devoirs && (
                        <p className="text-xs mt-1 rounded-md bg-secondary px-3 py-2">
                          <span className="font-medium">Devoirs :</span> {s.devoirs}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === "portabilite" && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-purple-600" /> Portabilité scolaire
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Autorisez le transfert du dossier scolaire de votre enfant (parcours, bulletins,
                  examens, vie scolaire) vers un autre établissement du réseau, via un QR code signé.
                </p>
                <div className="rounded-lg border border-gray-200 p-4 max-w-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-medium">Consentement actuel :</span>{" "}
                      {portabilite?.consentement ? (
                        <span className="text-green-700 font-medium">accordé</span>
                      ) : (
                        <span className="text-red-600 font-medium">non accordé</span>
                      )}
                    </p>
                    <button
                      onClick={() => accorderConsentement.mutate(!portabilite?.consentement)}
                      disabled={accorderConsentement.isPending}
                      className={`rounded-md px-4 py-2 text-sm font-medium border ${
                        portabilite?.consentement
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "bg-primary text-white border-primary hover:bg-primary-dark"
                      } disabled:opacity-50`}
                    >
                      {portabilite?.consentement
                        ? "Retirer le consentement"
                        : accorderConsentement.isPending
                        ? "Enregistrement…"
                        : "Accorder le consentement"}
                    </button>
                  </div>
                  {portabilite?.transfere && (
                    <p className="text-xs rounded-md bg-secondary px-3 py-2 text-primary-dark mt-3">
                      Cet enfant a été transféré depuis un autre établissement : son historique est
                      consultable par l&apos;administration.
                    </p>
                  )}
                  {portabilite?.consentement && portabilite.qr_data_url && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        QR code à présenter lors de l&apos;inscription dans le nouvel établissement :
                      </p>
                      <img
                        src={portabilite.qr_data_url}
                        alt="QR portabilité"
                        className="w-40 h-40 border border-gray-200 rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground mt-2 break-all">
                        <code className="text-[10px]">{portabilite.export_url}</code>
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {tab === "finances" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600" /> Situation financière
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Dû</p>
                      <p className="text-lg font-bold">{finances?.total_du.toLocaleString("fr-FR")} F</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Payé</p>
                      <p className="text-lg font-bold text-green-700">
                        {finances?.total_paye.toLocaleString("fr-FR")} F
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Reste</p>
                      <p className="text-lg font-bold text-red-600">
                        {finances?.reste.toLocaleString("fr-FR")} F
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2">Frais de l&apos;année</p>
                  <ul className="divide-y divide-gray-100">
                    {finances?.frais.map((f, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2 text-sm">
                        <span>{f.label}</span>
                        <span className="font-medium">{f.montant.toLocaleString("fr-FR")} F</span>
                      </li>
                    ))}
                    {finances?.frais.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">Aucun frais défini.</li>
                    )}
                  </ul>
                </section>

                <section className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold mb-4">Paiements enregistrés</h3>
                  <ul className="divide-y divide-gray-100">
                    {finances?.paiements.map((p) => (
                      <li key={p.id} className="py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{p.montant.toLocaleString("fr-FR")} F</p>
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
                          {p.frais} — {p.mode}
                          {p.reference && ` (${p.reference})`} —{" "}
                          {new Date(p.date).toLocaleDateString("fr-FR")}
                        </p>
                      </li>
                    ))}
                    {finances?.paiements.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">Aucun paiement enregistré.</li>
                    )}
                  </ul>
                </section>
              </div>
            )}

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" /> Messages à l&apos;établissement
              </h3>
              <div className="max-w-xl space-y-3 mb-6">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet (optionnel)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre message…"
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => envoyerMessage.mutate()}
                  disabled={!message || envoyerMessage.isPending}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {envoyerMessage.isPending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
              <ul className="divide-y divide-gray-100 max-w-2xl">
                {messages?.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{m.subject || "Sans objet"}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{m.message}</p>
                    {m.replied && (
                      <p className="text-sm mt-2 rounded-md bg-green-50 border border-green-100 px-3 py-2">
                        <span className="font-medium text-green-800">Réponse de l&apos;établissement :</span>{" "}
                        {m.reply}
                      </p>
                    )}
                  </li>
                ))}
                {messages?.length === 0 && (
                  <li className="text-sm text-muted-foreground py-3">Aucun message envoyé.</li>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
