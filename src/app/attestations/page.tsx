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
import { Ban, Copy, FileBadge, Plus, Search } from "lucide-react";

const TYPES: Record<string, string> = {
  scolarite: "Certificat de scolarité",
  inscription: "Attestation d'inscription",
  assiduite: "Attestation d'assiduité",
  paiement: "Attestation de paiement",
  radiation: "Attestation de radiation",
  reussite: "Attestation de réussite",
};

interface Attestation {
  id: number;
  numero: string;
  type: string;
  type_label: string;
  date_emission: string;
  statut: "valide" | "annulee";
  secret_code: string;
  verifications: number;
  eleve: string;
  matricule: string;
  classe: string;
  contenu: Record<string, unknown>;
}

interface InscriptionLite {
  id: number;
  matricule?: string;
  etudiant_nom: string;
  etudiant_prenom: string;
}

const VERIFY_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/verification/attestation`
    : "/verification/attestation";

export default function AttestationsPage() {
  useRequireRoles(["owner", "adm"]);
  useRequireCapabilities("scolarite");

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [inscriptionId, setInscriptionId] = useState("");
  const [type, setType] = useState("scolarite");
  const [copied, setCopied] = useState<number | null>(null);

  const { data: attestations } = useQuery({
    queryKey: ["attestations", search, typeFilter],
    queryFn: () =>
      api.get<Attestation[]>(
        `/secondaire/attestations?search=${encodeURIComponent(search)}${typeFilter ? `&type=${typeFilter}` : ""}`
      ),
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["attestations-inscriptions"],
    queryFn: () => api.get<InscriptionLite[]>("/secondaire/inscriptions"),
  });

  const generate = useMutation({
    mutationFn: () =>
      api.post<Attestation>("/secondaire/attestations", {
        inscription_id: Number(inscriptionId),
        type,
      }),
    onSuccess: (data: Attestation) => {
      queryClient.invalidateQueries({ queryKey: ["attestations"] });
      navigator.clipboard?.writeText(`${VERIFY_BASE}/${data.secret_code}`);
      setCopied(data.id);
      setTimeout(() => setCopied(null), 2000);
      setInscriptionId("");
    },
  });

  const annuler = useMutation({
    mutationFn: (id: number) => api.post(`/secondaire/attestations/${id}/annuler`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attestations"] }),
  });

  const copyLink = (a: Attestation) => {
    navigator.clipboard?.writeText(`${VERIFY_BASE}/${a.secret_code}`);
    setCopied(a.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attestations</h2>
            <p className="text-sm text-muted-foreground">
              Attestations pré-remplies avec code secret de vérification publique
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Générer une attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (inscriptionId) generate.mutate();
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
                <Label>Type</Label>
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(TYPES).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={!inscriptionId || generate.isPending}>
                <Plus className="w-4 h-4" /> Générer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Attestations émises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher un élève…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-xs">
                <option value="">Tous les types</option>
                {Object.entries(TYPES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </div>

            {!attestations || attestations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune attestation émise.</p>
            ) : (
              <ul className="divide-y divide-card-border">
                {attestations.map((a) => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{a.numero}</p>
                        <Badge variant="secondary">{a.type_label}</Badge>
                        {a.statut === "annulee" ? (
                          <Badge variant="destructive">Annulée</Badge>
                        ) : (
                          <Badge variant="success">Valide</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.eleve} ({a.matricule} — {a.classe}) · émise le{" "}
                        {new Date(a.date_emission).toLocaleDateString("fr-FR")} ·{" "}
                        {a.verifications} vérification(s)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        Code : {a.secret_code}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.statut === "valide" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => copyLink(a)}>
                            {copied === a.id ? "Copié !" : (
                              <>
                                <Copy className="w-3 h-3" /> Lien vérif.
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => annuler.mutate(a.id)}
                          >
                            <Ban className="w-3 h-3" /> Annuler
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <FileBadge className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Le lien de vérification (code à 8 chiffres) peut être imprimé sur
            l&apos;attestation : toute personne peut vérifier son authenticité
            sans se connecter.
          </p>
        </div>
      </main>
    </div>
  );
}
