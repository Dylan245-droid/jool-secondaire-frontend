"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { hasModule, useRequireCapabilitiesRead, useRequireRoles } from "@/lib/roles";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Coins, Download, Plus, Trash2, Wallet, Bell, ReceiptText, Pencil, RefreshCw, BookOpenCheck, Scale, FileText } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v2";

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
  echeances?: { total: number; payees: number; en_retard: number };
}

interface Echeance {
  id: number;
  label: string;
  montant: number;
  date_limite: string;
  position: number;
  total_paye: number;
  reste: number;
  statut: "payee" | "en_retard" | "en_attente";
  frais_label: string | null;
}

interface Paiement {
  id: number;
  inscription_id: number;
  matricule: string;
  eleve: string;
  frais: string;
  echeance: string | null;
  montant: number;
  mode: string;
  reference: string;
  payeur: string;
  date: string;
  statut: string;
  recu_numero?: string | null;
}

interface Facture {
  id: number;
  numero: string;
  inscription_id: number;
  matricule: string;
  eleve: string;
  classe: string;
  date_emission: string;
  date_echeance: string | null;
  montant_total: number;
  montant_paye: number;
  reste: number;
  taux_paye: number;
  statut: "emise" | "partielle" | "payee" | "annulee";
  mode_echeances: "auto" | "manuel";
}

interface FactureDetail {
  facture: Facture;
  echeances: Echeance[];
  paiements: Paiement[];
}

interface LigneEcriture {
  compte: string;
  compte_label: string;
  libelle: string;
  debit: number;
  credit: number;
}

interface Ecriture {
  id: number;
  numero: string;
  journal: string;
  date: string;
  libelle: string;
  nature: string;
  total_debit: number;
  total_credit: number;
  equilibree: boolean;
  lignes: LigneEcriture[];
}

interface BalanceRow {
  code: string;
  label: string;
  sens: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

interface Balance {
  balance: BalanceRow[];
  total_debit: number;
  total_credit: number;
  equilibree: boolean;
}

interface Compte {
  code: string;
  label: string;
  sens: string;
  classe: string;
}

interface Parent {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  nb_enfants: number;
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

const JOURNAUX = [
  { value: "vt", label: "Ventes (VT)" },
  { value: "ca", label: "Caisse (CA)" },
  { value: "bq", label: "Banque (BQ)" },
  { value: "od", label: "Opérations diverses (OD)" },
];

const FACTURE_STATUT: Record<string, { label: string; className: string }> = {
  emise: { label: "Émise", className: "bg-sky-100 text-sky-800" },
  partielle: { label: "Partielle", className: "bg-amber-100 text-amber-800" },
  payee: { label: "Payée", className: "bg-emerald-100 text-emerald-800" },
  annulee: { label: "Annulée", className: "bg-gray-200 text-gray-600" },
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

const ECH_STATUT = {
  payee: { label: "Payée", className: "bg-emerald-100 text-emerald-800" },
  en_retard: { label: "En retard", className: "bg-red-100 text-red-800" },
  en_attente: { label: "En attente", className: "bg-amber-100 text-amber-800" },
};

export default function FinancesPage() {
  const user = useRequireRoles(["owner", "adm"]);
  useRequireCapabilitiesRead("finance");
  const canWrite = hasModule(user, "finance");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("frais");
  const [selectedClasse, setSelectedClasse] = useState<number | null>(null);
  const [selectedInscription, setSelectedInscription] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [fraisForm, setFraisForm] = useState({
    label: "", type: "scolarite", montant: "", niveau_id: "", obligatoire: true,
  });
  const [payForm, setPayForm] = useState({
    inscription_id: "", echeance_id: "", montant: "", mode: "om", reference: "",
    payeur_parent_id: "", nom_payeur: "",
  });
  const [echForm, setEchForm] = useState<{
    id: number | null; label: string; montant: string; date_limite: string;
  }>({ id: null, label: "", montant: "", date_limite: "" });
  const [journalFilter, setJournalFilter] = useState("all");
  const [compteFilter, setCompteFilter] = useState("411");

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
  const { data: parents } = useQuery({
    queryKey: ["parents"],
    queryFn: () => api.get<Parent[]>("/secondaire/parents"),
  });
  const { data: factureDetail, isError: factureError } = useQuery({
    queryKey: ["facture", selectedInscription],
    queryFn: () =>
      api.get<FactureDetail>(`/secondaire/factures/${selectedInscription}`),
    enabled: selectedInscription !== null,
  });
  const { data: echeancesCaisse } = useQuery({
    queryKey: ["echeances-caisse", payForm.inscription_id],
    queryFn: () =>
      api.get<Echeance[]>(`/secondaire/inscriptions/${payForm.inscription_id}/echeances`),
    enabled: payForm.inscription_id !== "",
  });
  const { data: ecritures } = useQuery({
    queryKey: ["compta-journal", journalFilter],
    queryFn: () => {
      const q = journalFilter === "all" ? "" : `?journal=${journalFilter}`;
      return api.get<Ecriture[]>(`/secondaire/compta/journal${q}`);
    },
  });
  const { data: balance } = useQuery({
    queryKey: ["compta-balance"],
    queryFn: () => api.get<Balance>("/secondaire/compta/balance"),
  });
  const { data: plan } = useQuery({
    queryKey: ["compta-plan"],
    queryFn: () => api.get<Compte[]>("/secondaire/compta/plan"),
  });
  const { data: grandLivre } = useQuery({
    queryKey: ["compta-grand-livre", compteFilter],
    queryFn: () =>
      api.get<{ compte: string; label: string; lignes: { date: string; numero: string; libelle: string; debit: number; credit: number; solde: number }[] }>(
        `/secondaire/compta/grand-livre/${compteFilter}`
      ),
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
        echeance_id: payForm.echeance_id ? Number(payForm.echeance_id) : null,
        montant: payForm.montant ? Number(payForm.montant) : null,
        mode: payForm.mode,
        reference: payForm.reference,
        payeur_parent_id: payForm.payeur_parent_id ? Number(payForm.payeur_parent_id) : null,
        nom_payeur: payForm.nom_payeur,
      }),
    onSuccess: (data) => {
      setMsg(`Paiement enregistré. Total payé par l'élève : ${fmt(data.total_paye)}.`);
      setPayForm({ inscription_id: "", echeance_id: "", montant: "", mode: "om", reference: "", payeur_parent_id: "", nom_payeur: "" });
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["facture", selectedInscription] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur d'enregistrement"),
  });

  const annulerPaiement = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/paiements/${id}/annuler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["facture", selectedInscription] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
    },
  });

  const relancer = useMutation({
    mutationFn: (echeanceId: number) =>
      api.post<{ relances: number }>(`/secondaire/echeances/${echeanceId}/relancer`),
    onSuccess: (data) => setMsg(`Relance envoyée à ${data.relances} parent(s).`),
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur relance"),
  });

  const sauverEcheance = useMutation({
    mutationFn: (ech: { id: number | null; label: string; montant: string; date_limite: string }) => {
      const body = {
        label: ech.label,
        montant: Number(ech.montant),
        date_limite: ech.date_limite,
      };
      return ech.id
        ? api.patch<Echeance>(`/secondaire/echeances/${ech.id}`, body)
        : api.post<Echeance>(`/secondaire/inscriptions/${selectedInscription}/echeances`, body);
    },
    onSuccess: () => {
      setEchForm({ id: null, label: "", montant: "", date_limite: "" });
      setMsg("Échéance enregistrée.");
      queryClient.invalidateQueries({ queryKey: ["facture", selectedInscription] });
      queryClient.invalidateQueries({ queryKey: ["echeances-caisse"] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["compta-journal"] });
      queryClient.invalidateQueries({ queryKey: ["compta-balance"] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur échéance"),
  });

  const supprimerEcheance = useMutation({
    mutationFn: (echeanceId: number) => api.delete(`/secondaire/echeances/${echeanceId}`),
    onSuccess: () => {
      setMsg("Échéance supprimée.");
      queryClient.invalidateQueries({ queryKey: ["facture", selectedInscription] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
      queryClient.invalidateQueries({ queryKey: ["compta-journal"] });
      queryClient.invalidateQueries({ queryKey: ["compta-balance"] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur suppression"),
  });

  const regenererEcheances = useMutation({
    mutationFn: () =>
      api.post(`/secondaire/inscriptions/${selectedInscription}/echeances/generer`),
    onSuccess: () => {
      setMsg("Échéancier régénéré depuis les frais actifs.");
      queryClient.invalidateQueries({ queryKey: ["facture", selectedInscription] });
      queryClient.invalidateQueries({ queryKey: ["compta-journal"] });
      queryClient.invalidateQueries({ queryKey: ["compta-balance"] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur régénération"),
  });

  function ouvrirEcheancier(inscriptionId: number) {
    setSelectedInscription(inscriptionId);
    setTab("echeances");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary-dark" /> Finances
            {!canWrite && <Badge variant="warning">Lecture seule</Badge>}
          </h2>
          <p className="text-sm text-muted-foreground">
            Frais de scolarité, échéancier par élève, encaissements (payeur) et suivi des impayés
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="frais">Frais de scolarité</TabsTrigger>
            <TabsTrigger value="encaissement">Encaissement</TabsTrigger>
            <TabsTrigger value="echeances">Échéancier & facture</TabsTrigger>
            <TabsTrigger value="impayes">Impayés</TabsTrigger>
            <TabsTrigger value="compta">Comptabilité OHADA</TabsTrigger>
          </TabsList>

          {msg && (
            <p className="text-sm mb-4 rounded-md bg-primary-light px-3 py-2 text-primary-dark max-w-xl">
              {msg}
            </p>
          )}

          <TabsContent value="frais">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {canWrite && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" /> Définir un frais (année active)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Libellé</Label>
                    <Input
                      value={fraisForm.label}
                      onChange={(e) => setFraisForm({ ...fraisForm, label: e.target.value })}
                      placeholder="Ex : Scolarité 6e"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={fraisForm.type}
                        onChange={(e) => setFraisForm({ ...fraisForm, type: e.target.value })}
                      >
                        {TYPES_FRAIS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Montant (FCFA)</Label>
                      <Input
                        type="number"
                        value={fraisForm.montant}
                        onChange={(e) => setFraisForm({ ...fraisForm, montant: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Niveau (vide = tous)</Label>
                      <Select
                        value={fraisForm.niveau_id}
                        onChange={(e) => setFraisForm({ ...fraisForm, niveau_id: e.target.value })}
                      >
                        <option value="">— Tous niveaux —</option>
                        {niveaux?.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Obligatoire</Label>
                      <label className="flex items-center gap-2 pt-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fraisForm.obligatoire}
                          onChange={(e) =>
                            setFraisForm({ ...fraisForm, obligatoire: e.target.checked })
                          }
                        />
                        Oui
                      </label>
                    </div>
                  </div>
                  <Button
                    onClick={() => creerFrais.mutate()}
                    disabled={!fraisForm.label || !fraisForm.montant || creerFrais.isPending}
                  >
                    {creerFrais.isPending ? "Création…" : "Créer"}
                  </Button>
                </CardContent>
              </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" /> Frais en vigueur ({frais?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {frais?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucun frais défini pour l&apos;année en cours.
                    </p>
                  )}
                  <ul className="divide-y divide-card-border">
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
                          {canWrite && (
                          <button
                            onClick={() => supprimerFrais.mutate(f.id)}
                            className="text-rose hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4">
                    Les frais de type « Scolarité » sont automatiquement répartis en tranches
                    alignées sur les trimestres (échéancier de chaque élève).
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="encaissement">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {canWrite && (
              <Card>
                <CardHeader>
                  <CardTitle>Encaisser un paiement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Classe</Label>
                    <Select
                      value={selectedClasse ?? ""}
                      onChange={(e) => {
                        setSelectedClasse(e.target.value ? Number(e.target.value) : null);
                        setPayForm({ ...payForm, inscription_id: "", echeance_id: "" });
                      }}
                    >
                      <option value="">— Choisir une classe —</option>
                      {classes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} — {c.niveau.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Élève</Label>
                    <Select
                      value={payForm.inscription_id}
                      onChange={(e) =>
                        setPayForm({ ...payForm, inscription_id: e.target.value, echeance_id: "" })
                      }
                    >
                      <option value="">— Choisir —</option>
                      {inscriptions?.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.etudiant_nom} {i.etudiant_prenom} ({i.matricule})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Échéance concernée (optionnel)</Label>
                    <Select
                      value={payForm.echeance_id}
                      onChange={(e) => setPayForm({ ...payForm, echeance_id: e.target.value })}
                      disabled={!payForm.inscription_id}
                    >
                      <option value="">— Sans échéance —</option>
                      {echeancesCaisse?.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.label} — {fmt(e.reste)} restants ({e.statut})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Montant (FCFA)</Label>
                      <Input
                        type="number"
                        value={payForm.montant}
                        onChange={(e) => setPayForm({ ...payForm, montant: e.target.value })}
                        placeholder="laisser vide = solde de l'échéance"
                      />
                    </div>
                    <div>
                      <Label>Mode</Label>
                      <Select
                        value={payForm.mode}
                        onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}
                      >
                        {MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Référence (OM/Wave/virement, optionnel)</Label>
                    <Input
                      value={payForm.reference}
                      onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                      placeholder="Ex : OM2026-000123"
                    />
                  </div>
                  <div>
                    <Label>Payé par</Label>
                    <Select
                      value={payForm.payeur_parent_id}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const parent = parents?.find((p) => String(p.id) === pid);
                        setPayForm({
                          ...payForm,
                          payeur_parent_id: pid,
                          nom_payeur: parent ? `${parent.nom} ${parent.prenom}` : payForm.nom_payeur,
                        });
                      }}
                    >
                      <option value="">— Parent lié —</option>
                      {parents?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom} {p.prenom} ({p.telephone || "sans tél."})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Nom du payeur (si non lié)</Label>
                    <Input
                      value={payForm.nom_payeur}
                      onChange={(e) => setPayForm({ ...payForm, nom_payeur: e.target.value })}
                      placeholder="Ex : Tante Marie"
                    />
                  </div>
                  <Button
                    onClick={() => enregistrerPaiement.mutate()}
                    disabled={!payForm.inscription_id || enregistrerPaiement.isPending}
                  >
                    {enregistrerPaiement.isPending ? "Enregistrement…" : "Encaisser"}
                  </Button>
                </CardContent>
              </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Derniers encaissements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-card-border max-h-[36rem] overflow-y-auto">
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
                          <Badge variant={p.statut === "valide" ? "success" : "destructive"}>
                            {p.statut}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.eleve} ({p.matricule}) — {p.frais}
                          {p.echeance && ` — ${p.echeance}`} — payé par {p.payeur} —{" "}
                          {fmtDate(p.date)}
                        </p>
                        {p.statut === "valide" && (
                          <div className="flex gap-3 mt-1">
                            <a
                              href={`${API_BASE}/secondaire/paiements/${p.id}/recu`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ReceiptText className="w-3 h-3" />
                              {p.recu_numero ? `Reçu ${p.recu_numero}` : "Reçu PDF"}
                            </a>
                            {canWrite && (
                            <button
                              onClick={() => annulerPaiement.mutate(p.id)}
                              className="text-xs text-rose hover:underline"
                            >
                              Annuler
                            </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                    {paiements?.length === 0 && (
                      <li className="text-sm text-muted-foreground py-3">Aucun encaissement.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="echeances">
            <Card>
              <CardHeader>
                <CardTitle>Échéancier — {selectedInscriptionLabel(inscriptions, selectedInscription)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label>Classe</Label>
                    <Select
                      value={selectedClasse ?? ""}
                      onChange={(e) => {
                        setSelectedClasse(e.target.value ? Number(e.target.value) : null);
                        setSelectedInscription(null);
                      }}
                    >
                      <option value="">— Choisir une classe —</option>
                      {classes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} — {c.niveau.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Élève</Label>
                    <Select
                      value={selectedInscription ?? ""}
                      onChange={(e) => setSelectedInscription(e.target.value ? Number(e.target.value) : null)}
                      disabled={selectedClasse === null}
                    >
                      <option value="">— Choisir un élève —</option>
                      {inscriptions?.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.etudiant_nom} {i.etudiant_prenom} ({i.matricule})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {factureDetail && (
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 rounded-lg border border-card-border bg-card p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Facture</p>
                      <p className="font-semibold">{factureDetail.facture.numero}</p>
                      <Badge variant="secondary" className={FACTURE_STATUT[factureDetail.facture.statut]?.className}>
                        {FACTURE_STATUT[factureDetail.facture.statut]?.label ?? factureDetail.facture.statut}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mode échéances</p>
                      <p className="font-medium">
                        {factureDetail.facture.mode_echeances === "manuel" ? "Manuel" : "Automatique"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Émise le {fmtDate(factureDetail.facture.date_emission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold">{fmt(factureDetail.facture.montant_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payé</p>
                      <p className="font-semibold text-emerald-700">{fmt(factureDetail.facture.montant_paye)}</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, factureDetail.facture.taux_paye)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reste dû</p>
                      <p className={`font-bold ${factureDetail.facture.reste > 0 ? "text-rose" : "text-emerald-700"}`}>
                        {fmt(factureDetail.facture.reste)}
                      </p>
                      {factureDetail.facture.date_echeance && (
                        <p className="text-xs text-muted-foreground">
                          échéance {fmtDate(factureDetail.facture.date_echeance)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {factureDetail && canWrite && (
                  <div className="mb-4 rounded-lg border border-card-border bg-card p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-56">
                        <Label>Libellé</Label>
                        <Input
                          value={echForm.label}
                          onChange={(e) => setEchForm({ ...echForm, label: e.target.value })}
                          placeholder="Ex : Scolarité 2e trimestre"
                        />
                      </div>
                      <div className="w-36">
                        <Label>Montant (FCFA)</Label>
                        <Input
                          type="number"
                          value={echForm.montant}
                          onChange={(e) => setEchForm({ ...echForm, montant: e.target.value })}
                        />
                      </div>
                      <div className="w-44">
                        <Label>Date limite</Label>
                        <Input
                          type="date"
                          value={echForm.date_limite}
                          onChange={(e) => setEchForm({ ...echForm, date_limite: e.target.value })}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sauverEcheance.mutate(echForm)}
                        disabled={!echForm.label || !echForm.montant || !echForm.date_limite || sauverEcheance.isPending}
                      >
                        {echForm.id ? "Enregistrer la modification" : "Ajouter une échéance"}
                      </Button>
                      {echForm.id && (
                        <Button size="sm" variant="outline" onClick={() => setEchForm({ id: null, label: "", montant: "", date_limite: "" })}>
                          Annuler
                        </Button>
                      )}
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm("Régénérer l'échéancier automatiquement depuis les frais actifs ? (les échéances saisies manuellement seront remplacées)")) {
                              regenererEcheances.mutate();
                            }
                          }}
                          disabled={regenererEcheances.isPending}
                          title="Remplace l'échéancier par les tranches calculées depuis les frais actifs"
                        >
                          <RefreshCw className="w-3 h-3" /> Régénérer auto
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {factureDetail.facture.mode_echeances === "manuel"
                        ? "Échéancier défini manuellement : les tranches ajoutées ici alimentent la facture de l'élève."
                        : "Échéancier généré automatiquement à l'inscription. Vous pouvez ajuster les tranches ici ; l'échéancier passe alors en mode manuel."}
                    </p>
                  </div>
                )}

                {factureDetail && factureDetail.echeances.length > 0 ? (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Échéance</TH>
                        <TH className="text-right">Montant</TH>
                        <TH className="text-right">Payé</TH>
                        <TH className="text-right">Reste</TH>
                        <TH>Date limite</TH>
                        <TH>Statut</TH>
                        <TH className="text-right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {factureDetail.echeances.map((e) => {
                        const st = ECH_STATUT[e.statut];
                        return (
                          <TR key={e.id}>
                            <TD>
                              <span className="font-medium">{e.label}</span>
                              {e.frais_label && (
                                <span className="block text-xs text-muted-foreground">{e.frais_label}</span>
                              )}
                            </TD>
                            <TD className="text-right">{fmt(e.montant)}</TD>
                            <TD className="text-right text-emerald-700">{fmt(e.total_paye)}</TD>
                            <TD className="text-right font-medium">
                              {e.reste > 0 ? <span className="text-rose">{fmt(e.reste)}</span> : "0 FCFA"}
                            </TD>
                            <TD>{fmtDate(e.date_limite)}</TD>
                            <TD>
                              <Badge variant="secondary" className={st.className}>
                                {st.label}
                              </Badge>
                            </TD>
                            <TD className="text-right">
                              <div className="flex justify-end gap-2">
                                {canWrite && e.statut !== "payee" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => relancer.mutate(e.id)}
                                  >
                                    <Bell className="w-3 h-3" /> Relancer
                                  </Button>
                                )}
                                {canWrite && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEchForm({
                                      id: e.id, label: e.label,
                                      montant: String(e.montant), date_limite: e.date_limite,
                                    })
                                  }
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                )}
                                {canWrite && e.reste >= e.montant && e.total_paye === 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (window.confirm(`Supprimer l'échéance « ${e.label} » ?`)) {
                                        supprimerEcheance.mutate(e.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                                {canWrite && e.reste > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setTab("encaissement");
                                      setPayForm({
                                        ...payForm,
                                        inscription_id: String(selectedInscription),
                                        echeance_id: String(e.id),
                                        montant: String(e.reste),
                                      });
                                    }}
                                  >
                                    <Coins className="w-3 h-3" /> Encaisser
                                  </Button>
                                )}
                              </div>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedInscription
                      ? factureError
                        ? "Aucune facture pour cet élève."
                        : "Aucune échéance pour cet élève — utilisez « Ajouter une échéance » ci-dessus."
                      : "Choisissez un élève pour voir son échéancier et sa facture."}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impayes">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Select
                  value={selectedClasse ?? ""}
                  onChange={(e) => setSelectedClasse(e.target.value ? Number(e.target.value) : null)}
                  className="max-w-xs"
                >
                  <option value="">— Choisir une classe —</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — {c.niveau.label}
                    </option>
                  ))}
                </Select>
                {selectedClasse && (
                  <div className="flex gap-2">
                    <a
                      href={`${API_BASE}/secondaire/export-csv?classe_id=${selectedClasse}`}
                      className="inline-flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary-light"
                    >
                      <Download className="w-4 h-4" /> Exporter CSV
                    </a>
                    <a
                      href={`${API_BASE}/secondaire/export-pdf?classe_id=${selectedClasse}`}
                      className="inline-flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary-light"
                    >
                      <FileText className="w-4 h-4" /> Exporter PDF
                    </a>
                  </div>
                )}
              </div>

              {selectedClasse && (
                <Card>
                  <CardHeader>
                    <CardTitle>Récapitulatif — {recap?.eleves.length ?? 0} élèves</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <THead>
                        <TR>
                          <TH>Élève</TH>
                          <TH>Matricule</TH>
                          <TH className="text-right">Dû</TH>
                          <TH className="text-right">Payé</TH>
                          <TH className="text-right">Reste</TH>
                          <TH>Échéances</TH>
                          <TH>Statut</TH>
                          <TH className="text-right">Échéancier</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {recap?.eleves.map((e) => (
                          <TR key={e.inscription_id}>
                            <TD className="font-medium">{e.eleve}</TD>
                            <TD className="text-xs text-muted-foreground">{e.matricule}</TD>
                            <TD className="text-right">{fmt(e.total_du)}</TD>
                            <TD className="text-right text-emerald-700">{fmt(e.total_paye)}</TD>
                            <TD className="text-right font-medium">
                              {e.reste > 0 ? (
                                <span className="text-rose">{fmt(e.reste)}</span>
                              ) : (
                                <span className="text-gray-500">0 FCFA</span>
                              )}
                            </TD>
                            <TD>
                              {e.echeances ? (
                                <span className="text-xs text-muted-foreground">
                                  {e.echeances.payees}/{e.echeances.total} payées
                                  {e.echeances.en_retard > 0 && (
                                    <span className="text-rose"> · {e.echeances.en_retard} en retard</span>
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TD>
                            <TD>
                              <Badge
                                variant={
                                  e.statut === "paye"
                                    ? "success"
                                    : e.statut === "partiel"
                                    ? "warning"
                                    : "destructive"
                                }
                              >
                                {e.statut}
                              </Badge>
                            </TD>
                            <TD className="text-right">
                              <Button size="sm" variant="outline" onClick={() => ouvrirEcheancier(e.inscription_id)}>
                                Voir
                              </Button>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compta">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpenCheck className="w-4 h-4 text-primary" /> Journal comptable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Select
                      value={journalFilter}
                      onChange={(e) => setJournalFilter(e.target.value)}
                      className="max-w-xs"
                    >
                      <option value="all">— Tous les journaux —</option>
                      {JOURNAUX.map((j) => (
                        <option key={j.value} value={j.value}>
                          {j.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Écritures OHADA générées automatiquement (ventes à la facture, encaissements au règlement).
                    </p>
                  </div>
                  {ecritures && ecritures.length > 0 ? (
                    <div className="space-y-3">
                      {ecritures.map((ec) => (
                        <div key={ec.id} className="rounded-lg border border-card-border p-3">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-mono">
                              {ec.numero}
                            </Badge>
                            <Badge variant="secondary">
                              {JOURNAUX.find((j) => j.value === ec.journal)?.label ?? ec.journal}
                            </Badge>
                            <span className="text-muted-foreground">{fmtDate(ec.date)}</span>
                            <span className="font-medium">{ec.libelle}</span>
                            {!ec.equilibree && (
                              <Badge variant="destructive">Non équilibrée</Badge>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              D {fmt(ec.total_debit)} / C {fmt(ec.total_credit)}
                            </span>
                          </div>
                          <table className="mt-2 w-full text-xs">
                            <tbody>
                              {ec.lignes.map((l, idx) => (
                                <tr key={idx} className="border-t border-card-border">
                                  <td className="py-1 font-mono w-16">{l.compte}</td>
                                  <td className="py-1 text-muted-foreground w-56">{l.compte_label}</td>
                                  <td className="py-1">{l.libelle}</td>
                                  <td className="py-1 text-right w-32">{l.debit > 0 ? fmt(l.debit) : ""}</td>
                                  <td className="py-1 text-right w-32">{l.credit > 0 ? fmt(l.credit) : ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune écriture pour ce filtre.</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" /> Balance
                      {balance && (
                        <Badge variant={balance.equilibree ? "success" : "destructive"}>
                          {balance.equilibree ? "Équilibrée" : "Déséquilibrée"}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {balance && balance.balance.length > 0 ? (
                      <Table>
                        <THead>
                          <TR>
                            <TH>Compte</TH>
                            <TH>Libellé</TH>
                            <TH className="text-right">Débit</TH>
                            <TH className="text-right">Crédit</TH>
                            <TH className="text-right">Solde</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {balance.balance.map((b) => (
                            <TR key={b.code}>
                              <TD className="font-mono">{b.code}</TD>
                              <TD>{b.label}</TD>
                              <TD className="text-right">{fmt(b.total_debit)}</TD>
                              <TD className="text-right">{fmt(b.total_credit)}</TD>
                              <TD className="text-right">
                                {b.solde_debiteur > 0 && <span>{fmt(b.solde_debiteur)} D</span>}
                                {b.solde_crediteur > 0 && (
                                  <span className="text-emerald-700">{fmt(b.solde_crediteur)} C</span>
                                )}
                              </TD>
                            </TR>
                          ))}
                          <TR className="font-semibold">
                            <TD colSpan={2}>Totaux</TD>
                            <TD className="text-right">{fmt(balance.total_debit)}</TD>
                            <TD className="text-right">{fmt(balance.total_credit)}</TD>
                            <TD />
                          </TR>
                        </TBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune écriture comptable.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpenCheck className="w-4 h-4 text-primary" /> Grand livre
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={compteFilter}
                      onChange={(e) => setCompteFilter(e.target.value)}
                      className="mb-3"
                    >
                      {plan?.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.label}
                        </option>
                      ))}
                    </Select>
                    {grandLivre && grandLivre.lignes.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <THead>
                            <TR>
                              <TH>Date</TH>
                              <TH>Pièce</TH>
                              <TH>Libellé</TH>
                              <TH className="text-right">Débit</TH>
                              <TH className="text-right">Crédit</TH>
                              <TH className="text-right">Solde</TH>
                            </TR>
                          </THead>
                          <TBody>
                            {grandLivre.lignes.map((l, idx) => (
                              <TR key={idx}>
                                <TD>{fmtDate(l.date)}</TD>
                                <TD className="font-mono text-xs">{l.numero}</TD>
                                <TD className="text-xs">{l.libelle}</TD>
                                <TD className="text-right">{l.debit > 0 ? fmt(l.debit) : ""}</TD>
                                <TD className="text-right">{l.credit > 0 ? fmt(l.credit) : ""}</TD>
                                <TD className="text-right font-medium">{fmt(l.solde)}</TD>
                              </TR>
                            ))}
                          </TBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun mouvement sur ce compte.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function selectedInscriptionLabel(inscriptions: Inscription[] | undefined, id: number | null) {
  if (!id) return "— choisissez un élève —";
  const i = inscriptions?.find((x) => x.id === id);
  return i ? `${i.etudiant_nom} ${i.etudiant_prenom} (${i.matricule ?? ""})` : `#${id}`;
}
