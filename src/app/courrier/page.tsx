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
import { api, downloadFile } from "@/lib/api";
import {
  Archive, ArrowDownLeft, ArrowUpRight, Download, FileText, FolderOpen,
  Mail, Paperclip, Plus, Search, Trash2,
} from "lucide-react";

const CATEGORIES: Record<string, string> = {
  administratif: "Administratif",
  pedagogique: "Pédagogique",
  financier: "Financier",
  disciplinaire: "Disciplinaire",
  sante: "Santé",
  autre: "Autre",
};

const STATUTS: Record<string, string> = {
  recu: "Reçu",
  en_cours: "En cours",
  traite: "Traité",
  classe: "Classé",
};

const ARCH_CATEGORIES: Record<string, string> = {
  courrier: "Courrier",
  dossier_eleve: "Dossier élève",
  administratif: "Administratif",
  pedagogique: "Pédagogique",
  financier: "Financier",
  juridique: "Juridique",
};

interface Courrier {
  id: number;
  numero: string;
  sens: "entree" | "sortie";
  sens_label: string;
  categorie_label: string;
  reference_externe: string;
  correspondant: string;
  objet: string;
  date_document: string;
  statut: string;
  statut_label: string;
  has_piece: boolean;
  piece_nom: string;
  notes: string;
  traite_par: string | null;
}

interface ArchiveDoc {
  id: number;
  categorie_label: string;
  titre: string;
  description: string;
  has_fichier: boolean;
  fichier_nom: string;
  eleve: string | null;
  matricule: string | null;
}

interface InscriptionLite {
  id: number;
  matricule?: string;
  etudiant_nom: string;
  etudiant_prenom: string;
}

function statutVariant(statut: string) {
  if (statut === "classe") return "secondary" as const;
  if (statut === "traite") return "success" as const;
  if (statut === "en_cours") return "warning" as const;
  return "default" as const;
}

function RegistreSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sensFilter, setSensFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sens, setSens] = useState("entree");
  const [categorie, setCategorie] = useState("administratif");
  const [correspondant, setCorrespondant] = useState("");
  const [objet, setObjet] = useState("");
  const [dateDocument, setDateDocument] = useState(new Date().toISOString().slice(0, 10));
  const [statut, setStatut] = useState("recu");
  const [notes, setNotes] = useState("");

  const { data: courriers } = useQuery({
    queryKey: ["courrier", search, sensFilter],
    queryFn: () =>
      api.get<Courrier[]>(
        `/secondaire/courrier?search=${encodeURIComponent(search)}${sensFilter ? `&sens=${sensFilter}` : ""}`
      ),
  });

  const creation = useMutation({
    mutationFn: (body: Record<string, string>) => api.post("/secondaire/courrier", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courrier"] });
      setShowForm(false);
      setCorrespondant("");
      setObjet("");
      setNotes("");
    },
  });

  const maj = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, string> }) =>
      api.patch(`/secondaire/courrier/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courrier"] }),
  });

  const piece = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload(`/secondaire/courrier/${id}/piece`, fd);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courrier"] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registre de courrier</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/courrier/export/csv", "courrier.csv")}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/courrier/export/pdf", "courrier.pdf")}>
              <FileText className="w-3 h-3" /> Export PDF
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3 h-3" /> Nouveau courrier
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Objet, correspondant, référence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={sensFilter} onChange={(e) => setSensFilter(e.target.value)} className="max-w-xs">
            <option value="">Tous les sens</option>
            <option value="entree">Arrivées</option>
            <option value="sortie">Départs</option>
          </Select>
        </div>

        {showForm && (
          <form
            className="border border-card-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              creation.mutate({
                sens, categorie, correspondant, objet,
                date_document: dateDocument, statut, notes,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Sens</Label>
              <Select value={sens} onChange={(e) => setSens(e.target.value)}>
                <option value="entree">Arrivée</option>
                <option value="sortie">Départ</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {Object.entries(CATEGORIES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date du document</Label>
              <Input type="date" value={dateDocument} onChange={(e) => setDateDocument(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Correspondant</Label>
              <Input value={correspondant} onChange={(e) => setCorrespondant(e.target.value)} placeholder="Expéditeur ou destinataire" required />
            </div>
            <div className="space-y-1.5">
              <Label>Objet</Label>
              <Input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet du courrier" required />
            </div>
            <div className="space-y-1.5">
              <Label>Statut initial</Label>
              <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                {Object.entries(STATUTS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Suivi, transmission…" />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={creation.isPending}>
                Enregistrer
              </Button>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {(courriers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun courrier enregistré.
          </p>
        ) : (
          <ul className="divide-y divide-card-border">
            {courriers?.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.sens === "entree" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-turquoise" />
                      )}
                      <p className="text-sm font-medium">{c.objet}</p>
                      <Badge variant="secondary">{c.numero}</Badge>
                      <Badge variant={statutVariant(c.statut)}>{c.statut_label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.sens_label} · {c.correspondant}
                      {c.reference_externe && ` · réf. ${c.reference_externe}`}
                      {c.categorie_label && ` · ${c.categorie_label}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(c.date_document).toLocaleDateString("fr-FR")}
                      {c.traite_par && ` · traité par ${c.traite_par}`}
                      {c.notes && ` · ${c.notes}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Select
                      className="h-8 w-32 text-xs"
                      value={c.statut}
                      onChange={(e) => maj.mutate({ id: c.id, body: { statut: e.target.value } })}
                    >
                      {Object.entries(STATUTS).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </Select>
                    <div className="flex gap-1">
                      {c.has_piece && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(`/secondaire/courrier/${c.id}/piece`, c.piece_nom)}
                        >
                          <Paperclip className="w-3 h-3" /> Pièce
                        </Button>
                      )}
                      <label className="inline-flex">
                        <span className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-gray-600 hover:bg-muted">
                          <Paperclip className="w-3 h-3" /> Joindre
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) piece.mutate({ id: c.id, file: f });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ArchivesSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categorie, setCategorie] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [cat, setCat] = useState("administratif");
  const [inscriptionId, setInscriptionId] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);

  const { data: docs } = useQuery({
    queryKey: ["archives", search, categorie],
    queryFn: () =>
      api.get<ArchiveDoc[]>(
        `/secondaire/archives?search=${encodeURIComponent(search)}${categorie ? `&categorie=${categorie}` : ""}`
      ),
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["archives-inscriptions"],
    queryFn: () => api.get<InscriptionLite[]>("/secondaire/inscriptions"),
  });

  const creation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const doc = await api.post<ArchiveDoc>("/secondaire/archives", body);
      if (fichier) {
        const fd = new FormData();
        fd.append("file", fichier);
        return api.upload<ArchiveDoc>(`/secondaire/archives/${doc.id}/fichier`, fd);
      }
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archives"] });
      setShowForm(false);
      setTitre("");
      setDescription("");
      setInscriptionId("");
      setFichier(null);
    },
  });

  const suppression = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/archives/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["archives"] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Classement numérique & dossiers élèves</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3 h-3" /> Classer un document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Titre du document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="max-w-xs">
            <option value="">Toutes les catégories</option>
            {Object.entries(ARCH_CATEGORIES).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </Select>
        </div>

        {showForm && (
          <form
            className="border border-card-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              creation.mutate({
                categorie: cat, titre, description,
                inscription_id: inscriptionId ? Number(inscriptionId) : null,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                {Object.entries(ARCH_CATEGORIES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du document" required />
            </div>
            <div className="space-y-1.5">
              <Label>Élève (dossier)</Label>
              <Select value={inscriptionId} onChange={(e) => setInscriptionId(e.target.value)}>
                <option value="">— Document général —</option>
                {(inscriptions ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.etudiant_nom} {i.etudiant_prenom} ({i.matricule ?? i.id})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes, référence papier…" />
            </div>
            <div className="space-y-1.5">
              <Label>Fichier (PDF, image…)</Label>
              <input
                type="file"
                className="text-xs"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={creation.isPending}>
                Classer
              </Button>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {(docs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document classé.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {docs?.map((d) => (
              <li key={d.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <p className="text-sm font-medium">{d.titre}</p>
                    <Badge variant="secondary">{d.categorie_label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.eleve ? `${d.eleve} (${d.matricule})` : "Document général"}
                    {d.description && ` · ${d.description}`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {d.has_fichier && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(`/secondaire/archives/${d.id}/fichier`, d.fichier_nom)}
                    >
                      <Download className="w-3 h-3" /> Télécharger
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => suppression.mutate(d.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function CourrierPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("scolarite");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Courrier & archivage
            </h2>
            <p className="text-sm text-muted-foreground">
              Secrétariat général · registre de courrier, pièces jointes,
              classement numérique des dossiers élèves
            </p>
          </div>
          <Badge variant="violet">
            <Mail className="w-3 h-3" /> GST
          </Badge>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Archive className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Registre numéroté</p>
                <p className="text-sm font-semibold">COU-{new Date().getFullYear()}-XXXX</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Paperclip className="w-8 h-8 text-turquoise" />
              <div>
                <p className="text-xs text-muted-foreground">Pièces jointes</p>
                <p className="text-sm font-semibold">Scans des courriers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Dossiers élèves</p>
                <p className="text-sm font-semibold">Archivage par élève</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="registre">
          <TabsList>
            <TabsTrigger value="registre">Registre de courrier</TabsTrigger>
            <TabsTrigger value="archives">Archives</TabsTrigger>
          </TabsList>
          <TabsContent value="registre">
            <RegistreSection />
          </TabsContent>
          <TabsContent value="archives">
            <ArchivesSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
