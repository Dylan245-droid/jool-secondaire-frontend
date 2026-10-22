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
import { useRequireCapabilities, useRequireRoles } from "@/lib/roles";
import { api } from "@/lib/api";
import {
  CalendarDays, CheckCircle2, Eye, Megaphone, Plus, Search,
  Trash2, Users,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Direction",
  adm: "Administration",
  tch: "Enseignants",
  prt: "Parents",
  std: "Élèves",
};

const EVENT_TYPES: Record<string, string> = {
  reunion: "Réunion",
  ceremonie: "Cérémonie",
  examen: "Examen",
  sportif: "Sportif",
  culturel: "Culturel",
  autre: "Autre",
};

interface Communique {
  id: number;
  titre: string;
  contenu: string;
  cible_roles: string[];
  cible_classes: string[];
  cree_le: string;
  publie_par: string | null;
  nb_destinataires: number;
  nb_lus: number;
  taux_lecture: number;
  accuses?: { nom: string; role: string; lu: boolean; lu_le: string | null }[];
}

interface ClasseLite {
  id: number;
  label: string;
}

interface Evenement {
  id: number;
  titre: string;
  description: string;
  type_label: string;
  date_debut: string;
  date_fin: string | null;
  lieu: string;
}

function PublierForm() {
  const queryClient = useQueryClient();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [roles, setRoles] = useState<string[]>(["tch", "prt", "std"]);
  const [classes, setClasses] = useState<number[]>([]);
  const [parClasse, setParClasse] = useState(false);

  const { data: classesList } = useQuery({
    queryKey: ["com-classes"],
    queryFn: () => api.get<ClasseLite[]>("/secondaire/classes"),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/communiques", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communiques"] });
      setTitre("");
      setContenu("");
      setClasses([]);
    },
  });

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publier un communiqué</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              titre, contenu, cible_roles: roles,
              cible_classes_ids: parClasse ? classes : [],
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Objet du communiqué" required />
          </div>
          <div className="space-y-1.5">
            <Label>Contenu</Label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              className="w-full min-h-[100px] rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Texte de la communication…"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Cibler les rôles</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_LABELS).map(([code, label]) => (
                <label
                  key={code}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${
                    roles.includes(code)
                      ? "border-primary bg-primary-light text-primary-dark font-medium"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={roles.includes(code)}
                    onChange={() => setRoles(toggle(roles, code))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={parClasse} onChange={(e) => setParClasse(e.target.checked)} className="w-4 h-4" />
            Limiter à certaines classes
          </label>
          {parClasse && (
            <div className="space-y-1.5">
              <Label>Classes</Label>
              <div className="flex flex-wrap gap-2">
                {(classesList ?? []).map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${
                      classes.includes(c.id)
                        ? "border-primary bg-primary-light text-primary-dark font-medium"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={classes.includes(c.id)}
                      onChange={() =>
                        setClasses(
                          classes.includes(c.id)
                            ? classes.filter((x) => x !== c.id)
                            : [...classes, c.id]
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" disabled={!titre || !contenu || roles.length === 0 || mutation.isPending}>
            <Megaphone className="w-4 h-4" /> Publier
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CommuniquesListe() {
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: communiques } = useQuery({
    queryKey: ["communiques", search],
    queryFn: () => api.get<Communique[]>(`/secondaire/communiques?search=${encodeURIComponent(search)}`),
  });
  const { data: detail } = useQuery({
    queryKey: ["communiques", detailId],
    queryFn: () => api.get<Communique>(`/secondaire/communiques/${detailId}`),
    enabled: detailId != null,
  });

  const suppression = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/communiques/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communiques"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diffusions & statistiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un communiqué…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(communiques ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun communiqué publié.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {communiques?.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <button className="min-w-0 text-left" onClick={() => setDetailId(detailId === c.id ? null : c.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{c.titre}</p>
                      {c.cible_roles.map((r) => (
                        <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>
                      ))}
                      {c.cible_classes.length > 0 && (
                        <Badge variant="turquoise">{c.cible_classes.join(", ")}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(c.cree_le).toLocaleDateString("fr-FR")}
                      {c.publie_par && ` · par ${c.publie_par}`}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-dark">{c.taux_lecture}%</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.nb_lus}/{c.nb_destinataires} lus
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDetailId(detailId === c.id ? null : c.id)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => suppression.mutate(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {detailId === c.id && detail?.id === c.id && (
                  <div className="mt-3 border border-card-border rounded-lg p-4 bg-white">
                    <p className="text-sm whitespace-pre-line">{detail.contenu}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      <Users className="w-3 h-3 inline" /> Accusés de lecture
                    </p>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs max-h-48 overflow-y-auto">
                      {(detail.accuses ?? []).map((a, i) => (
                        <li key={i} className="flex items-center justify-between py-1 border-b border-card-border/50">
                          <span>{a.nom} <span className="text-muted-foreground">({ROLE_LABELS[a.role] ?? a.role})</span></span>
                          {a.lu ? (
                            <Badge variant="success"><CheckCircle2 className="w-3 h-3" /> {a.lu_le ? new Date(a.lu_le).toLocaleDateString("fr-FR") : "Lu"}</Badge>
                          ) : (
                            <Badge variant="warning">Non lu</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
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

function EvenementsSection() {
  const queryClient = useQueryClient();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("reunion");
  const [dateDebut, setDateDebut] = useState("");
  const [lieu, setLieu] = useState("");

  const { data: evenements } = useQuery({
    queryKey: ["evenements"],
    queryFn: () => api.get<Evenement[]>("/secondaire/evenements?futur=true"),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, string>) => api.post("/secondaire/evenements", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evenements"] });
      setTitre("");
      setDescription("");
      setLieu("");
    },
  });

  const suppression = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/evenements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evenements"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Événements à venir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="border border-card-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white"
          onSubmit={(e) => {
            e.preventDefault();
            creation.mutate({
              titre, description, type,
              date_debut: new Date(dateDebut).toISOString(),
              lieu,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(EVENT_TYPES).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Début</Label>
            <Input type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Lieu</Label>
            <Input value={lieu} onChange={(e) => setLieu(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!titre || !dateDebut || creation.isPending}>
              <Plus className="w-4 h-4" /> Ajouter l&apos;événement
            </Button>
          </div>
        </form>

        {(evenements ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement planifié.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {evenements?.map((e) => (
              <li key={e.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{e.titre}</p>
                    <Badge variant="secondary">{e.type_label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.date_debut).toLocaleString("fr-FR")}
                    {e.lieu && ` · ${e.lieu}`}
                    {e.description && ` · ${e.description}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => suppression.mutate(e.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunicationPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("communication");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Communication ciblée</h2>
            <p className="text-sm text-muted-foreground">
              Communiqués par rôle/classe, accusés de lecture, événements
            </p>
          </div>
          <Badge variant="violet">
            <Megaphone className="w-3 h-3" /> CMM
          </Badge>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PublierForm />
          <EvenementsSection />
        </div>

        <div className="mt-6">
          <CommuniquesListe />
        </div>
      </main>
    </div>
  );
}
