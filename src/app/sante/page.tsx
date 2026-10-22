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
import { useRequireCapabilitiesRead, useRequireRoles, hasModule } from "@/lib/roles";
import { api } from "@/lib/api";
import {
  Activity, AlertTriangle, Home, PhoneCall, Plus, Search, Users,
} from "lucide-react";

interface StatsSante {
  passages_total: number;
  passages_annee: number;
  renvois_domicile: number;
  parents_notifies: number;
  fiches_sante: number;
  par_motif: Record<string, number>;
  par_niveau: Record<string, number>;
  passages_recents: Passage[];
}

interface Passage {
  id: number;
  inscription_id: number;
  eleve: string;
  matricule: string;
  classe: string;
  date: string;
  motif: string;
  motif_label: string;
  temperature: number | null;
  soins_apportes: string;
  renvoi_domicile: boolean;
  parent_notifie: boolean;
  notes_infirmiere: string;
}

interface Fiche {
  inscription_id: number;
  eleve: string;
  matricule: string;
  classe: string;
  allergies: string;
  traitements: string;
  updated_at: string;
}

interface InscriptionLite {
  id: number;
  matricule?: string;
  etudiant_nom: string;
  etudiant_prenom: string;
}

const MOTIFS: Record<string, string> = {
  malaise: "Malaise",
  blessure: "Blessure",
  migraine: "Migraine",
  fievre: "Fièvre",
  medicament: "Prise de médicament",
  traitement: "Traitement suivi",
  renvoi: "Renvoi à domicile",
  autre: "Autre",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function StatCard({
  label, value, sub, icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Badge variant="default">{icon}</Badge>
        </div>
        <p className="text-3xl font-bold text-primary-dark mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PassageForm({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [inscriptionId, setInscriptionId] = useState("");
  const [motif, setMotif] = useState("malaise");
  const [description, setDescription] = useState("");
  const [temperature, setTemperature] = useState("");
  const [soins, setSoins] = useState("");
  const [renvoi, setRenvoi] = useState(false);
  const [parentNotifie, setParentNotifie] = useState(false);

  const { data: inscriptions } = useQuery({
    queryKey: ["sante-inscriptions"],
    queryFn: () => api.get<InscriptionLite[]>("/secondaire/inscriptions"),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/secondaire/sante/passages", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sante"] });
      setMotif("malaise");
      setDescription("");
      setTemperature("");
      setSoins("");
      setRenvoi(false);
      setParentNotifie(false);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau passage à l&apos;infirmerie</CardTitle>
      </CardHeader>
      {canWrite && (
      <CardContent>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!inscriptionId) return;
            mutation.mutate({
              inscription_id: Number(inscriptionId),
              motif,
              description,
              temperature: temperature ? Number(temperature) : null,
              soins_apportes: soins,
              renvoi_domicile: renvoi,
              parent_notifie: parentNotifie,
              notes_infirmiere: "",
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Élève</Label>
            <Select value={inscriptionId} onChange={(e) => setInscriptionId(e.target.value)} required>
              <option value="">Sélectionner un élève…</option>
              {(inscriptions ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.etudiant_nom} {i.etudiant_prenom} ({i.matricule ?? i.id})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Motif</Label>
            <Select value={motif} onChange={(e) => setMotif(e.target.value)}>
              {Object.entries(MOTIFS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Circonstances, plainte…" />
          </div>
          <div className="space-y-1.5">
            <Label>Température (°C)</Label>
            <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="38.5" inputMode="decimal" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Soins apportés</Label>
            <Input value={soins} onChange={(e) => setSoins(e.target.value)} placeholder="Paracétamol, pansement…" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={renvoi} onChange={(e) => setRenvoi(e.target.checked)} className="w-4 h-4" />
            Renvoi à domicile
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={parentNotifie} onChange={(e) => setParentNotifie(e.target.checked)} className="w-4 h-4" />
            Parent notifié
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!inscriptionId || mutation.isPending}>
              <Plus className="w-4 h-4" /> Enregistrer le passage
            </Button>
          </div>
        </form>
      </CardContent>
      )}
    </Card>
  );
}

function PassagesSection() {
  const { data: stats } = useQuery({
    queryKey: ["sante", "stats"],
    queryFn: () => api.get<StatsSante>("/secondaire/sante/stats"),
  });
  const passages = stats?.passages_recents ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passages récents</CardTitle>
      </CardHeader>
      <CardContent>
        {passages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun passage enregistré pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-card-border">
            {passages.map((p) => (
              <li key={p.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {p.eleve}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({p.matricule} — {p.classe})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDate(p.date)} · {p.motif_label}
                    {p.temperature != null && ` · ${p.temperature}°C`}
                    {p.soins_apportes && ` · ${p.soins_apportes}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {p.renvoi_domicile && (
                    <Badge variant="warning">
                      <Home className="w-3 h-3" /> Renvoi
                    </Badge>
                  )}
                  {p.parent_notifie && (
                    <Badge variant="success">
                      <PhoneCall className="w-3 h-3" /> Parent notifié
                    </Badge>
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

function FichesSection({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [edition, setEdition] = useState<Record<string, string> | null>(null);

  const { data: fiches } = useQuery({
    queryKey: ["sante", "fiches", search],
    queryFn: () => api.get<Fiche[]>(`/secondaire/sante/fiches?search=${encodeURIComponent(search)}`),
  });

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, string> }) =>
      api.put(`/secondaire/sante/fiches/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sante"] });
      setEdition(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dossiers de santé</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un élève (nom, matricule)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(fiches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun dossier de santé. Utilisez la page fiche d&apos;un élève pour en créer un.
          </p>
        ) : (
          <ul className="divide-y divide-card-border">
            {fiches?.map((f) => (
              <li key={f.inscription_id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {f.eleve}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({f.matricule} — {f.classe})
                      </span>
                    </p>
                    {f.allergies && (
                      <p className="text-xs mt-0.5">
                        <Badge variant="destructive" className="mr-1">Allergies</Badge>
                        {f.allergies}
                      </p>
                    )}
                    {f.traitements && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Traitements : {f.traitements}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Mise à jour : {new Date(f.updated_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canWrite}
                    onClick={() =>
                      setEdition({
                        inscription_id: String(f.inscription_id),
                        allergies: f.allergies ?? "",
                        traitements: f.traitements ?? "",
                      })
                    }
                  >
                    Éditer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {edition && (
          <div className="border border-card-border rounded-lg p-4 space-y-3 bg-white">
            <p className="text-sm font-semibold">Modifier le dossier</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Allergies</Label>
                <Input
                  value={edition.allergies}
                  onChange={(e) => setEdition({ ...edition, allergies: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Traitements</Label>
                <Input
                  value={edition.traitements}
                  onChange={(e) => setEdition({ ...edition, traitements: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: Number(edition.inscription_id),
                    body: { allergies: edition.allergies, traitements: edition.traitements },
                  })
                }
              >
                Enregistrer
              </Button>
              <Button variant="ghost" onClick={() => setEdition(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SantePage() {
  const user = useRequireRoles(["owner", "adm"]);
  useRequireCapabilitiesRead("sante");
  const canWrite = hasModule(user, "sante");

  const { data: stats } = useQuery({
    queryKey: ["sante", "stats"],
    queryFn: () => api.get<StatsSante>("/secondaire/sante/stats"),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Infirmerie — Santé scolaire</h2>
            <p className="text-sm text-muted-foreground">
              Dossiers de santé confidentiels · accès réservé au service santé et à la direction
            </p>
          </div>
          {!canWrite && <Badge variant="warning">Lecture seule</Badge>}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Passages (année)" value={stats?.passages_annee ?? 0} icon={<Activity className="w-3 h-3" />} />
          <StatCard
            label="Renvois à domicile"
            value={stats?.renvois_domicile ?? 0}
            icon={<Home className="w-3 h-3" />}
          />
          <StatCard
            label="Parents notifiés"
            value={stats?.parents_notifies ?? 0}
            sub={`${stats?.par_motif.fievre ?? 0} cas de fièvre`}
            icon={<PhoneCall className="w-3 h-3" />}
          />
          <StatCard
            label="Dossiers de santé"
            value={stats?.fiches_sante ?? 0}
            icon={<Users className="w-3 h-3" />}
          />
        </div>

        {stats && Object.keys(stats.par_niveau).length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <AlertTriangle className="w-3 h-3 inline" /> Incidents par niveau :{" "}
            {Object.entries(stats.par_niveau)
              .map(([niveau, n]) => `${niveau}: ${n}`)
              .join(" · ")}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {canWrite && <PassageForm canWrite={canWrite} />}
          <PassagesSection />
        </div>

        <div className="mt-6">
          <FichesSection canWrite={canWrite} />
        </div>
      </main>
    </div>
  );
}
