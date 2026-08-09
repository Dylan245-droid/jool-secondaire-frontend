"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { useRequireRoles } from "@/lib/roles";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Coins, Download, Plus, Trash2, Wallet, Bell, ReceiptText } from "lucide-react";

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

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

const ECH_STATUT = {
  payee: { label: "Payée", className: "bg-emerald-100 text-emerald-800" },
  en_retard: { label: "En retard", className: "bg-red-100 text-red-800" },
  en_attente: { label: "En attente", className: "bg-amber-100 text-amber-800" },
};

export default function FinancesPage() {
  useRequireRoles(["owner", "adm"]);
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
  const { data: echeances } = useQuery({
    queryKey: ["echeances", selectedInscription],
    queryFn: () =>
      api.get<Echeance[]>(`/secondaire/inscriptions/${selectedInscription}/echeances`),
    enabled: selectedInscription !== null,
  });
  const { data: echeancesCaisse } = useQuery({
    queryKey: ["echeances-caisse", payForm.inscription_id],
    queryFn: () =>
      api.get<Echeance[]>(`/secondaire/inscriptions/${payForm.inscription_id}/echeances`),
    enabled: payForm.inscription_id !== "",
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
      queryClient.invalidateQueries({ queryKey: ["echeances", selectedInscription] });
    },
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur d'enregistrement"),
  });

  const annulerPaiement = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/paiements/${id}/annuler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["echeances", selectedInscription] });
      queryClient.invalidateQueries({ queryKey: ["recap", selectedClasse] });
    },
  });

  const relancer = useMutation({
    mutationFn: (echeanceId: number) =>
      api.post<{ relances: number }>(`/secondaire/echeances/${echeanceId}/relancer`),
    onSuccess: (data) => setMsg(`Relance envoyée à ${data.relances} parent(s).`),
    onError: (err) => setMsg(err instanceof ApiError ? err.message : "Erreur relance"),
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
          </h2>
          <p className="text-sm text-muted-foreground">
            Frais de scolarité, échéancier par élève, encaissements (payeur) et suivi des impayés
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="frais">Frais de scolarité</TabsTrigger>
            <TabsTrigger value="encaissement">Encaissement</TabsTrigger>
            <TabsTrigger value="echeances">Échéancier</TabsTrigger>
            <TabsTrigger value="impayes">Impayés</TabsTrigger>
          </TabsList>

          {msg && (
            <p className="text-sm mb-4 rounded-md bg-primary-light px-3 py-2 text-primary-dark max-w-xl">
              {msg}
            </p>
          )}

          <TabsContent value="frais">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          <button
                            onClick={() => supprimerFrais.mutate(f.id)}
                            className="text-rose hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                              <ReceiptText className="w-3 h-3" /> Reçu PDF
                            </a>
                            <button
                              onClick={() => annulerPaiement.mutate(p.id)}
                              className="text-xs text-rose hover:underline"
                            >
                              Annuler
                            </button>
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

                {echeances && echeances.length > 0 ? (
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
                      {echeances.map((e) => {
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
                                {e.statut !== "payee" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => relancer.mutate(e.id)}
                                  >
                                    <Bell className="w-3 h-3" /> Relancer
                                  </Button>
                                )}
                                {e.reste > 0 && (
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
                      ? "Aucune échéance pour cet élève (les échéances sont générées à l'inscription)."
                      : "Choisissez un élève pour voir son échéancier."}
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
                  <a
                    href={`${API_BASE}/secondaire/export-csv?classe_id=${selectedClasse}`}
                    className="inline-flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary-light"
                  >
                    <Download className="w-4 h-4" /> Exporter CSV
                  </a>
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
