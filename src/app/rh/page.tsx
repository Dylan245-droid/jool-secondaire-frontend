"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useRequireCapabilities, useRequireRoles } from "@/lib/roles";
import { api } from "@/lib/api";
import {
  Banknote, CalendarCheck2, CheckCircle2, ClipboardList, FileText,
  Plus, Search, Users, XCircle,
} from "lucide-react";

const CONTRAT_TYPES: Record<string, string> = {
  cdi: "CDI", cdd: "CDD", stage: "Stage", vacataire: "Vacataire",
};
const CONGE_TYPES: Record<string, string> = {
  paye: "Congé payé", maladie: "Maladie", maternite: "Maternité", sans_solde: "Sans solde",
};
const PRESENCE_STATUTS: Record<string, string> = {
  present: "Présent", absent: "Absent", retard: "Retard", conge: "En congé", exterieur: "En mission",
};

interface Membre {
  membership_id: number;
  nom: string;
  role: string;
}

interface Contrat {
  id: number;
  membre_id: number;
  membre: string;
  type_label: string;
  date_debut: string;
  date_fin: string | null;
  salaire_base: number;
  prime_transport: number;
  statut: string;
  statut_label: string;
  notes: string;
}

interface Conge {
  id: number;
  membre_id: number;
  membre: string;
  type_label: string;
  date_debut: string;
  date_fin: string;
  motif: string;
  statut: string;
  statut_label: string;
}

interface Presence {
  id: number;
  membre_id: number;
  membre: string;
  date: string;
  statut: string;
  statut_label: string;
  heure_arrivee: string | null;
  notes: string;
}

interface FichePaie {
  id: number;
  membre_id: number;
  membre: string;
  mois: number;
  annee: number;
  salaire_base: number;
  primes: number;
  retenues: number;
  net: number;
  statut: string;
  statut_label: string;
  validee_le: string | null;
  payee_le: string | null;
}

interface PaieStats {
  mois: number;
  annee: number;
  nb_fiches: number;
  nb_generees: number;
  nb_validees: number;
  nb_payees: number;
  total_net: number;
  total_paye: number;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

function paieVariant(statut: string) {
  if (statut === "payee") return "success" as const;
  if (statut === "validee") return "turquoise" as const;
  return "warning" as const;
}

function ContratsSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [membreId, setMembreId] = useState("");
  const [type, setType] = useState("cdi");
  const [dateDebut, setDateDebut] = useState("");
  const [salaire, setSalaire] = useState("");
  const [prime, setPrime] = useState("");
  const [search, setSearch] = useState("");

  const { data: contrats } = useQuery({
    queryKey: ["contrats", search],
    queryFn: () => api.get<Contrat[]>(`/secondaire/contrats?search=${encodeURIComponent(search)}`),
  });
  const { data: membres } = useQuery({
    queryKey: ["rh-membres"],
    queryFn: () => api.get<Membre[]>("/secondaire/membres"),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/contrats", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      setShowForm(false);
      setSalaire("");
      setPrime("");
    },
  });
  const maj = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.patch(`/secondaire/contrats/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contrats"] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Contrats</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3 h-3" /> Nouveau contrat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un membre…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {showForm && (
          <form
            className="border border-card-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              creation.mutate({
                membre_id: Number(membreId), type, date_debut: dateDebut,
                salaire_base: Number(salaire || 0),
                prime_transport: Number(prime || 0),
              });
            }}
          >
            <div className="space-y-1.5 md:col-span-2">
              <Label>Membre</Label>
              <Select value={membreId} onChange={(e) => setMembreId(e.target.value)} required>
                <option value="">Choisir…</option>
                {(membres ?? []).map((m) => (
                  <option key={m.membership_id} value={m.membership_id}>{m.nom} ({m.role})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(CONTRAT_TYPES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Salaire de base (FCFA)</Label>
              <Input type="number" min="0" value={salaire} onChange={(e) => setSalaire(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prime transport</Label>
              <Input type="number" min="0" value={prime} onChange={(e) => setPrime(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={!membreId || !dateDebut || creation.isPending}>Enregistrer</Button>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {(contrats ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun contrat.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {contrats?.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{c.membre}</p>
                    <Badge variant="secondary">{c.type_label}</Badge>
                    <Badge variant={c.statut === "actif" ? "success" : c.statut === "termine" ? "secondary" : "destructive"}>
                      {c.statut_label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    du {new Date(c.date_debut).toLocaleDateString("fr-FR")}
                    {c.date_fin && ` au ${new Date(c.date_fin).toLocaleDateString("fr-FR")}`}
                    {" · "}{fmt(c.salaire_base)}{c.prime_transport > 0 && ` + ${fmt(c.prime_transport)} transport`}
                  </p>
                </div>
                {c.statut === "actif" && (
                  <Select
                    className="h-8 w-32 text-xs"
                    value={c.statut}
                    onChange={(e) => maj.mutate({ id: c.id, body: { statut: e.target.value } })}
                  >
                    <option value="actif">Actif</option>
                    <option value="termine">Terminer</option>
                    <option value="resilie">Résilier</option>
                  </Select>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CongesSection() {
  const queryClient = useQueryClient();
  const [membreId, setMembreId] = useState("");
  const [type, setType] = useState("paye");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [filtre, setFiltre] = useState("");

  const { data: conges } = useQuery({
    queryKey: ["conges", filtre],
    queryFn: () => api.get<Conge[]>(`/secondaire/conges${filtre ? `?statut=${filtre}` : ""}`),
  });
  const { data: membres } = useQuery({
    queryKey: ["rh-membres"],
    queryFn: () => api.get<Membre[]>("/secondaire/membres"),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/conges", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conges"] });
      setMotif("");
    },
  });
  const decider = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      api.post(`/secondaire/conges/${id}/decider?statut=${statut}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conges"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Congés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            creation.mutate({ membre_id: Number(membreId), type, date_debut: debut, date_fin: fin, motif });
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label>Membre</Label>
            <Select value={membreId} onChange={(e) => setMembreId(e.target.value)} required>
              <option value="">Choisir…</option>
              {(membres ?? []).map((m) => (
                <option key={m.membership_id} value={m.membership_id}>{m.nom}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(CONGE_TYPES).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Du</Label>
            <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Au</Label>
            <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Motif</Label>
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} />
          </div>
          <div>
            <Button type="submit" disabled={!membreId || !debut || !fin || creation.isPending}>
              <Plus className="w-4 h-4" /> Demander
            </Button>
          </div>
        </form>

        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="max-w-xs">
          <option value="">Tous les statuts</option>
          <option value="demande">Demandés</option>
          <option value="valide">Validés</option>
          <option value="refuse">Refusés</option>
        </Select>

        {(conges ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun congé.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {conges?.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarCheck2 className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{c.membre}</p>
                    <Badge variant="secondary">{c.type_label}</Badge>
                    <Badge variant={c.statut === "valide" ? "success" : c.statut === "refuse" ? "destructive" : "warning"}>
                      {c.statut_label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    du {new Date(c.date_debut).toLocaleDateString("fr-FR")} au {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                    {c.motif && ` · ${c.motif}`}
                  </p>
                </div>
                {c.statut === "demande" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => decider.mutate({ id: c.id, statut: "valide" })}>
                      <CheckCircle2 className="w-3 h-3" /> Valider
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => decider.mutate({ id: c.id, statut: "refuse" })}>
                      <XCircle className="w-3 h-3" /> Refuser
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PresencesSection() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lignes, setLignes] = useState<Record<number, string>>({});

  const { data: membres } = useQuery({
    queryKey: ["rh-membres"],
    queryFn: () => api.get<Membre[]>("/secondaire/membres"),
  });
  const { data: presences } = useQuery({
    queryKey: ["presences", date],
    queryFn: () => api.get<Presence[]>(`/secondaire/presences?date=${date}`),
    enabled: Boolean(date),
  });

  const enregistrer = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/presences", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presences"] });
      setLignes({});
    },
  });

  const valeur = (membershipId: number) => {
    const existante = presences?.find((p) => p.membre_id === membershipId);
    return lignes[membershipId] ?? existante?.statut ?? "present";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pointage du personnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 max-w-xs">
            <Label>Date du pointage</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button
            disabled={Object.keys(lignes).length === 0 || enregistrer.isPending}
            onClick={() =>
              enregistrer.mutate({
                date,
                lignes: Object.entries(lignes).map(([id, statut]) => ({ membre_id: Number(id), statut })),
              })
            }
          >
            <ClipboardList className="w-4 h-4" /> Enregistrer
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(membres ?? []).map((m) => (
            <div key={m.membership_id} className="border border-card-border rounded-lg p-3 bg-white">
              <p className="text-sm font-medium truncate">{m.nom}</p>
              <p className="text-[11px] text-muted-foreground">{m.role}</p>
              <Select
                className="mt-2 h-8 text-xs"
                value={valeur(m.membership_id)}
                onChange={(e) => setLignes((l) => ({ ...l, [m.membership_id]: e.target.value }))}
              >
                {Object.entries(PRESENCE_STATUTS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PaieSection() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [mois, setMois] = useState(String(now.getMonth() + 1));
  const [annee, setAnnee] = useState(String(now.getFullYear()));

  const { data: fiches } = useQuery({
    queryKey: ["paie", mois, annee],
    queryFn: () => api.get<FichePaie[]>(`/secondaire/paie?mois=${mois}&annee=${annee}`),
  });
  const { data: stats } = useQuery({
    queryKey: ["paie-stats", mois, annee],
    queryFn: () => api.get<PaieStats>(`/secondaire/paie/stats?mois=${mois}&annee=${annee}`),
  });

  const generer = useMutation({
    mutationFn: () => api.post("/secondaire/paie/generer", { mois: Number(mois), annee: Number(annee) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paie"] });
      queryClient.invalidateQueries({ queryKey: ["paie-stats"] });
    },
  });
  const action = useMutation({
    mutationFn: ({ id, type }: { id: number; type: "valider" | "payer" }) =>
      api.post(`/secondaire/paie/${id}/${type}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paie"] });
      queryClient.invalidateQueries({ queryKey: ["paie-stats"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fiches de paie</CardTitle>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>Mois</Label>
              <Select value={mois} onChange={(e) => setMois(e.target.value)} className="w-28">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{new Date(2026, i, 1).toLocaleDateString("fr-FR", { month: "long" })}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année</Label>
              <Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-24" />
            </div>
            <Button onClick={() => generer.mutate()} disabled={generer.isPending}>
              <Banknote className="w-4 h-4" /> Générer la paie
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Fiches</p><p className="text-lg font-bold">{stats.nb_fiches}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Générées</p><p className="text-lg font-bold text-amber-600">{stats.nb_generees}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Validées</p><p className="text-lg font-bold text-teal-600">{stats.nb_validees}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Payées</p><p className="text-lg font-bold text-emerald-600">{stats.nb_payees}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total net</p><p className="text-lg font-bold text-primary-dark">{fmt(stats.total_net)}</p></CardContent></Card>
          </div>
        )}

        {(fiches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune fiche pour {mois}/{annee}. Cliquez sur « Générer la paie ».
          </p>
        ) : (
          <ul className="divide-y divide-card-border">
            {fiches?.map((f) => (
              <li key={f.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{f.membre}</p>
                    <Badge variant={paieVariant(f.statut)}>{f.statut_label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Base {fmt(f.salaire_base)}{f.primes > 0 && ` + ${fmt(f.primes)} primes`}{f.retenues > 0 && ` − ${fmt(f.retenues)}`}
                    {f.payee_le && ` · payée le ${new Date(f.payee_le).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold text-primary-dark">{fmt(f.net)}</p>
                  {f.statut === "generee" && (
                    <Button variant="outline" size="sm" onClick={() => action.mutate({ id: f.id, type: "valider" })}>
                      <CheckCircle2 className="w-3 h-3" /> Valider
                    </Button>
                  )}
                  {f.statut === "validee" && (
                    <Button size="sm" onClick={() => action.mutate({ id: f.id, type: "payer" })}>
                      <Banknote className="w-3 h-3" /> Payer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function RHPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("rh");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">RH & Paie</h2>
            <p className="text-sm text-muted-foreground">
              Contrats, congés, pointage et fiches de paie du personnel
            </p>
          </div>
          <Badge variant="violet">
            <Users className="w-3 h-3" /> HRS
          </Badge>
        </header>

        <Tabs defaultValue="contrats">
          <TabsList>
            <TabsTrigger value="contrats">Contrats</TabsTrigger>
            <TabsTrigger value="conges">Congés</TabsTrigger>
            <TabsTrigger value="presences">Présences</TabsTrigger>
            <TabsTrigger value="paie">Paie</TabsTrigger>
          </TabsList>
          <TabsContent value="contrats"><ContratsSection /></TabsContent>
          <TabsContent value="conges"><CongesSection /></TabsContent>
          <TabsContent value="presences"><PresencesSection /></TabsContent>
          <TabsContent value="paie"><PaieSection /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
