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
  CheckCircle2, ClipboardCheck, Plus, Scale,
  Search, XCircle,
} from "lucide-react";

const TYPES: Record<string, string> = {
  exclusion: "Exclusion",
  abandon: "Abandon",
  echeancier: "Aménagement d'échéancier",
  promotion: "Décision de promotion",
};

interface Inscription {
  id: number;
  matricule: string | null;
  etudiant_nom: string;
  etudiant_prenom: string;
  classe_id: number;
  statut: string;
}

interface Decision {
  id: number;
  type: string;
  type_label: string;
  inscription_id: number | null;
  eleve: string | null;
  matricule: string | null;
  classe: string | null;
  description: string;
  detail: Record<string, unknown>;
  statut: string;
  statut_label: string;
  demandee_par: string | null;
  date_demande: string;
  decidee_par: string | null;
  date_decision: string | null;
  note_decision: string;
  signature: string;
}

function statutVariant(statut: string) {
  if (statut === "validee") return "success" as const;
  if (statut === "refusee") return "destructive" as const;
  return "warning" as const;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

function ListeSection() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  const { data: decisions } = useQuery({
    queryKey: ["decisions", filtre, search],
    queryFn: () =>
      api.get<Decision[]>(
        `/secondaire/decisions${filtre ? `?statut=${filtre}` : ""}${search ? `${filtre ? "&" : "?"}search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const decider = useMutation({
    mutationFn: ({ id, statut, note }: { id: number; statut: string; note: string }) =>
      api.post(
        `/secondaire/decisions/${id}/decider?statut=${statut}` +
          (note ? `&note_decision=${encodeURIComponent(note)}` : ""),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      setNotes({});
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registre des décisions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un élève…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="max-w-xs">
            <option value="">Tous les statuts</option>
            <option value="demande">Demandées</option>
            <option value="validee">Validées</option>
            <option value="refusee">Refusées</option>
          </Select>
        </div>

        {(decisions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune décision.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {decisions?.map((d) => (
              <li key={d.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{d.eleve ?? "—"}</p>
                    {d.matricule && <Badge variant="secondary">{d.matricule}</Badge>}
                    <Badge variant="secondary">{d.type_label}</Badge>
                    <Badge variant={statutVariant(d.statut)}>{d.statut_label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.classe && `${d.classe} · `}demandée le {fmtDate(d.date_demande)}
                    {d.demandee_par && ` par ${d.demandee_par}`}
                  </p>
                  <p className="text-sm mt-1">{d.description}</p>
                  {d.statut !== "demande" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Décision du {fmtDate(d.date_decision)}
                      {d.decidee_par && ` par ${d.decidee_par}`}
                      {d.signature && ` · signée ${d.signature}`}
                      {d.note_decision && ` · « ${d.note_decision} »`}
                    </p>
                  )}
                  {d.statut === "demande" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        className="h-8 max-w-xs text-xs"
                        placeholder="Note de décision (optionnel)…"
                        value={notes[d.id] ?? ""}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [d.id]: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
                {d.statut === "demande" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() =>
                        decider.mutate({ id: d.id, statut: "validee", note: notes[d.id] ?? "" })
                      }
                    >
                      <CheckCircle2 className="w-3 h-3" /> Valider
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        decider.mutate({ id: d.id, statut: "refusee", note: notes[d.id] ?? "" })
                      }
                    >
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

function NouvelleSection() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("exclusion");
  const [inscriptionId, setInscriptionId] = useState("");
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [detail, setDetail] = useState("");

  const { data: inscriptions } = useQuery({
    queryKey: ["decisions-inscriptions", search],
    queryFn: () =>
      api.get<Inscription[]>(
        `/secondaire/inscriptions${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/decisions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      setInscriptionId("");
      setDescription("");
      setDetail("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle décision sensible</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            creation.mutate({
              type,
              inscription_id: inscriptionId ? Number(inscriptionId) : null,
              description,
              detail: detail ? { note: detail } : {},
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Type de décision</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(TYPES).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Élève</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher un élève…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                className="flex-1"
                value={inscriptionId}
                onChange={(e) => setInscriptionId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {(inscriptions ?? []).map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.etudiant_nom} {ins.etudiant_prenom}
                    {ins.matricule ? ` (${ins.matricule})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description de la décision</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Motif, contexte, références…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Éléments complémentaires (optionnel)</Label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Montants, tranches, séance concernée…"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!description || creation.isPending}>
              <Plus className="w-4 h-4" /> Demander la décision
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function DecisionsPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("direction");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Décisions sensibles</h2>
            <p className="text-sm text-muted-foreground">
              Exclusions, abandons, aménagements d&apos;échéancier et promotions —
              workflow de validation tracé, daté et signé
            </p>
          </div>
          <Badge variant="violet">
            <ClipboardCheck className="w-3 h-3" /> GMM
          </Badge>
        </header>

        <Tabs defaultValue="liste">
          <TabsList>
            <TabsTrigger value="liste">Registre</TabsTrigger>
            <TabsTrigger value="nouvelle">Nouvelle demande</TabsTrigger>
          </TabsList>
          <TabsContent value="liste"><ListeSection /></TabsContent>
          <TabsContent value="nouvelle"><NouvelleSection /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
