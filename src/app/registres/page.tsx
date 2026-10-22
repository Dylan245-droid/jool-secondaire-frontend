"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useRequireRoles, hasModule } from "@/lib/roles";
import { api, downloadFile } from "@/lib/api";
import {
  BookOpenCheck, ClipboardCheck, Download, FileText, ShieldAlert,
} from "lucide-react";

interface AppelRow {
  id: number;
  date: string;
  eleve: string;
  matricule: string;
  classe: string;
  type_label: string;
  statut_label: string;
  matiere: string | null;
  notifie_parent: boolean;
}

interface ConseilRow {
  id: number;
  classe: string;
  trimestre: string;
  statut_label: string;
  date_validation: string | null;
  nb_decisions: number;
  admis: number;
  conseils: number;
}

interface SanctionRow {
  id: number;
  date_sanction: string;
  eleve: string;
  matricule: string;
  classe: string;
  type_label: string;
  duree_jours: number | null;
  description: string;
  validee_direction: boolean;
  levee: boolean;
}

interface VisiteRow {
  id: number;
  date: string;
  eleve: string;
  matricule: string;
  classe: string;
  motif_label: string;
  soins_apportes: string;
  renvoi_domicile: boolean;
  parent_notifie: boolean;
}

function RegistreAppel() {
  const [date, setDate] = useState("");
  const { data } = useQuery({
    queryKey: ["registre", "appel", date],
    queryFn: () => api.get<AppelRow[]>(`/secondaire/registres/appel${date ? `?date=${date}` : ""}`),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registre d&apos;appel</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/appel/export/csv", "registre_appel.csv")}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/appel/export/pdf", "registre_appel.pdf")}>
              <FileText className="w-3 h-3" /> Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune absence/retard enregistré.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {data?.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.eleve} <span className="text-xs text-muted-foreground">({r.matricule} — {r.classe})</span></p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("fr-FR")}{r.matiere && ` · ${r.matiere}`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Badge variant="secondary">{r.type_label}</Badge>
                  {r.statut_label === "Justifiée" ? (
                    <Badge variant="success">{r.statut_label}</Badge>
                  ) : (
                    <Badge variant="warning">{r.statut_label}</Badge>
                  )}
                  {r.notifie_parent && <Badge variant="turquoise">Parent notifié</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RegistreConseils() {
  const { data } = useQuery({
    queryKey: ["registre", "conseils"],
    queryFn: () => api.get<ConseilRow[]>("/secondaire/registres/conseils"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registre des PV de conseils</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/conseils/export/csv", "registre_pv_conseils.csv")}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/conseils/export/pdf", "registre_pv_conseils.pdf")}>
              <FileText className="w-3 h-3" /> Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun conseil de classe enregistré.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {data?.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.classe} — {c.trimestre}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.nb_decisions} décisions ({c.admis} admis, {c.conseils} passage conseil)
                    {c.date_validation && ` · validé le ${new Date(c.date_validation).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                <Badge variant={c.statut_label === "Validé" ? "success" : "secondary"}>{c.statut_label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RegistreSanctions() {
  const { data } = useQuery({
    queryKey: ["registre", "sanctions"],
    queryFn: () => api.get<SanctionRow[]>("/secondaire/registres/sanctions"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registre des sanctions</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/sanctions/export/csv", "registre_sanctions.csv")}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/sanctions/export/pdf", "registre_sanctions.pdf")}>
              <FileText className="w-3 h-3" /> Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune sanction enregistrée.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {data?.map((s) => (
              <li key={s.id} className="py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.eleve} <span className="text-xs text-muted-foreground">({s.matricule} — {s.classe})</span></p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.date_sanction).toLocaleDateString("fr-FR")} · {s.description}
                      {s.duree_jours && ` · ${s.duree_jours} j`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Badge variant={s.type_label.includes("Exclusion") ? "destructive" : "secondary"}>{s.type_label}</Badge>
                    {s.validee_direction ? <Badge variant="success">Validée direction</Badge> : <Badge variant="warning">Non validée</Badge>}
                    {s.levee && <Badge variant="turquoise">Levée</Badge>}
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

function RegistreVisites() {
  const { data } = useQuery({
    queryKey: ["registre", "visites"],
    queryFn: () => api.get<VisiteRow[]>("/secondaire/registres/visites"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registre des visites à l&apos;infirmerie</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/visites/export/csv", "registre_visites.csv")}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile("/secondaire/registres/visites/export/pdf", "registre_visites.pdf")}>
              <FileText className="w-3 h-3" /> Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {data?.map((v) => (
              <li key={v.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{v.eleve} <span className="text-xs text-muted-foreground">({v.matricule} — {v.classe})</span></p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.date).toLocaleDateString("fr-FR")} · {v.motif_label}
                    {v.soins_apportes && ` · ${v.soins_apportes}`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {v.renvoi_domicile && <Badge variant="warning">Renvoi</Badge>}
                  {v.parent_notifie && <Badge variant="success">Parent notifié</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegistresPage() {
  const user = useRequireRoles(["owner", "adm"]);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role !== "adm") return;
    if (!hasModule(user, "viescolaire") && !hasModule(user, "pedagogie") && !hasModule(user, "sante")) {
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.capabilities]);

  const showAppel = user?.role === "owner" || hasModule(user, "viescolaire");
  const showConseils = user?.role === "owner" || hasModule(user, "pedagogie");
  const showVisites = user?.role === "owner" || hasModule(user, "sante");

  const tabs = [
    showAppel && { value: "appel", label: "Registre d'appel", icon: BookOpenCheck },
    showConseils && { value: "conseils", label: "PV de conseils", icon: ClipboardCheck },
    showAppel && { value: "sanctions", label: "Sanctions", icon: ShieldAlert },
    showVisites && { value: "visites", label: "Visites infirmerie", icon: ShieldAlert },
  ].filter(Boolean) as { value: string; label: string; icon: typeof BookOpenCheck }[];

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registres réglementaires</h2>
            <p className="text-sm text-muted-foreground">
              Conformité : chaque registre est consultable et exportable selon votre service
            </p>
          </div>
          <Badge variant="violet">
            <BookOpenCheck className="w-3 h-3" /> VSC · AMG · HSA
          </Badge>
        </header>

        <Tabs defaultValue={tabs[0]?.value}>
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                <t.icon className="w-3.5 h-3.5 mr-1.5" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="appel"><RegistreAppel /></TabsContent>
          <TabsContent value="conseils"><RegistreConseils /></TabsContent>
          <TabsContent value="sanctions"><RegistreSanctions /></TabsContent>
          <TabsContent value="visites"><RegistreVisites /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
