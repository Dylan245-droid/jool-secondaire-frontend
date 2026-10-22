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
  AlertTriangle, CalendarX2, DoorOpen, Package, Plus, RefreshCcw,
  Wrench,
} from "lucide-react";

interface SalleLite {
  id: number;
  code: string;
  capacite: number;
}

interface Reservation {
  id: number;
  salle_id: number;
  salle: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  motif: string;
  statut: string;
  statut_label: string;
  reserve_par: string | null;
}

interface Maintenance {
  id: number;
  salle_id: number;
  salle: string;
  date: string;
  description: string;
  statut: string;
  statut_label: string;
}

interface Materiel {
  id: number;
  code: string;
  libelle: string;
  quantite_totale: number;
  disponible: number;
}

interface Pret {
  id: number;
  materiel_id: number;
  materiel: string;
  quantite: number;
  emprunteur: string;
  date_debut: string;
  date_fin_prevue: string | null;
  date_retour: string | null;
  statut: string;
  statut_label: string;
}

function ReservationsSection() {
  const queryClient = useQueryClient();
  const [salleId, setSalleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("10:00");
  const [motif, setMotif] = useState("");
  const [filtreDate, setFiltreDate] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: salles } = useQuery({
    queryKey: ["infra-salles"],
    queryFn: () => api.get<SalleLite[]>("/secondaire/salles"),
  });
  const { data: reservations } = useQuery({
    queryKey: ["reservations", filtreDate],
    queryFn: () =>
      api.get<Reservation[]>(`/secondaire/reservations${filtreDate ? `?date=${filtreDate}` : ""}`),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/reservations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setMotif("");
      setErreur(null);
    },
    onError: (e: Error) => setErreur(e.message),
  });

  const annulation = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/reservations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réservations de salles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!salleId) return;
            creation.mutate({
              salle_id: Number(salleId), date, heure_debut: debut,
              heure_fin: fin, motif,
            });
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label>Salle</Label>
            <Select value={salleId} onChange={(e) => setSalleId(e.target.value)} required>
              <option value="">Choisir…</option>
              {(salles ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.code} (cap. {s.capacite})</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>De</Label>
            <Input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>À</Label>
            <Input type="time" value={fin} onChange={(e) => setFin(e.target.value)} required />
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Label>Motif</Label>
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Réunion, cours, événement…" required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!salleId || !motif || creation.isPending}>
              <Plus className="w-4 h-4" /> Réserver
            </Button>
          </div>
        </form>

        {erreur && (
          <p className="text-xs text-rose bg-rose/10 rounded px-3 py-2 border-2 border-rose">
            <AlertTriangle className="w-3 h-3 inline" /> {erreur}
          </p>
        )}

        <div className="max-w-xs">
          <Label>Filtrer par date</Label>
          <Input type="date" value={filtreDate} onChange={(e) => setFiltreDate(e.target.value)} />
        </div>

        {(reservations ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune réservation.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {reservations?.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DoorOpen className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{r.salle}</p>
                    <Badge variant="secondary">{r.date} · {r.heure_debut}-{r.heure_fin}</Badge>
                    {r.statut === "annulee" ? (
                      <Badge variant="destructive">Annulée</Badge>
                    ) : (
                      <Badge variant="success">Réservée</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.motif}{r.reserve_par && ` · par ${r.reserve_par}`}
                  </p>
                </div>
                {r.statut === "reservee" && (
                  <Button variant="ghost" size="sm" onClick={() => annulation.mutate(r.id)}>
                    <CalendarX2 className="w-3 h-3" /> Annuler
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceSection() {
  const queryClient = useQueryClient();
  const [salleId, setSalleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const { data: salles } = useQuery({
    queryKey: ["infra-salles"],
    queryFn: () => api.get<SalleLite[]>("/secondaire/salles"),
  });
  const { data: maintenances } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => api.get<Maintenance[]>("/secondaire/maintenances"),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/maintenances", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      setDescription("");
    },
  });
  const terminer = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/maintenances/${id}/terminer`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!salleId) return;
            creation.mutate({ salle_id: Number(salleId), date, description });
          }}
        >
          <div className="space-y-1.5">
            <Label>Salle</Label>
            <Select value={salleId} onChange={(e) => setSalleId(e.target.value)} required>
              <option value="">Choisir…</option>
              {(salles ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.code}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={!salleId || !description || creation.isPending}>
              <Wrench className="w-4 h-4" /> Planifier
            </Button>
          </div>
        </form>

        {(maintenances ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune maintenance planifiée.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {maintenances?.map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.salle} — {m.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.date).toLocaleDateString("fr-FR")} · {m.statut_label}
                  </p>
                </div>
                {m.statut !== "terminee" && (
                  <Button variant="outline" size="sm" onClick={() => terminer.mutate(m.id)}>
                    <RefreshCcw className="w-3 h-3" /> Terminer
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MaterielSection() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [materielId, setMaterielId] = useState("");
  const [qtePret, setQtePret] = useState("1");
  const [emprunteur, setEmprunteur] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: materiels } = useQuery({
    queryKey: ["materiels"],
    queryFn: () => api.get<Materiel[]>("/secondaire/materiels"),
  });
  const { data: prets } = useQuery({
    queryKey: ["prets"],
    queryFn: () => api.get<Pret[]>("/secondaire/prets"),
  });

  const creer = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/materiels", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiels"] });
      setCode("");
      setLibelle("");
    },
    onError: (e: Error) => setErreur(e.message),
  });
  const pret = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/prets", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prets", "materiels"] });
      setEmprunteur("");
      setErreur(null);
    },
    onError: (e: Error) => setErreur(e.message),
  });
  const retour = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/prets/${id}/retour`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prets", "materiels"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matériel & prêts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {erreur && (
          <p className="text-xs text-rose bg-rose/10 rounded px-3 py-2 border-2 border-rose">
            <AlertTriangle className="w-3 h-3 inline" /> {erreur}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Nouveau matériel</p>
            <form
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                creer.mutate({ code, libelle, quantite_totale: Number(quantite) });
              }}
            >
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VP1" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Libellé</Label>
                <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Quantité</Label>
                <Input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              </div>
              <div>
                <Button type="submit" disabled={!code || !libelle || creer.isPending}>
                  <Package className="w-4 h-4" /> Ajouter
                </Button>
              </div>
            </form>

            <ul className="mt-3 divide-y divide-card-border">
              {(materiels ?? []).map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.libelle}</p>
                    <p className="text-xs text-muted-foreground">{m.code}</p>
                  </div>
                  <Badge variant={m.disponible > 0 ? "success" : "warning"}>
                    {m.disponible}/{m.quantite_totale} dispo.
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Nouveau prêt</p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!materielId) return;
                pret.mutate({
                  materiel_id: Number(materielId), quantite: Number(qtePret),
                  emprunteur, date_debut: new Date().toISOString().slice(0, 10),
                });
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Matériel</Label>
                  <Select value={materielId} onChange={(e) => setMaterielId(e.target.value)} required>
                    <option value="">Choisir…</option>
                    {(materiels ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.libelle} ({m.disponible} dispo.)
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantité</Label>
                  <Input type="number" min="1" value={qtePret} onChange={(e) => setQtePret(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Emprunteur</Label>
                <Input value={emprunteur} onChange={(e) => setEmprunteur(e.target.value)} placeholder="Nom de l'emprunteur" required />
              </div>
              <Button type="submit" disabled={!materielId || !emprunteur || pret.isPending}>
                <Plus className="w-4 h-4" /> Sortir le matériel
              </Button>
            </form>

            <ul className="mt-3 divide-y divide-card-border">
              {(prets ?? []).map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.quantite}x {p.materiel}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.emprunteur} · depuis le {new Date(p.date_debut).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  {p.statut === "encours" ? (
                    <Button variant="outline" size="sm" onClick={() => retour.mutate(p.id)}>
                      <RefreshCcw className="w-3 h-3" /> Retour
                    </Button>
                  ) : (
                    <Badge variant="success">Rendu</Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InfrastructuresPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("infrastructures");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Infrastructures</h2>
            <p className="text-sm text-muted-foreground">
              Réservations de salles, maintenance, prêts de matériel
            </p>
          </div>
          <Badge variant="violet">
            <DoorOpen className="w-3 h-3" /> TCH
          </Badge>
        </header>

        <Tabs defaultValue="reservations">
          <TabsList>
            <TabsTrigger value="reservations">Réservations</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="materiel">Matériel & prêts</TabsTrigger>
          </TabsList>
          <TabsContent value="reservations">
            <ReservationsSection />
          </TabsContent>
          <TabsContent value="maintenance">
            <MaintenanceSection />
          </TabsContent>
          <TabsContent value="materiel">
            <MaterielSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
