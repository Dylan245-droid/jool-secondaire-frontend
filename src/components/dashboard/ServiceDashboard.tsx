"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArrowRight, Building2, CalendarDays, ClipboardList, Coins,
  FileCheck2, GraduationCap, Home, Megaphone, ShieldAlert, UserCheck,
  Users, Wallet,
} from "lucide-react";
import type { SessionUser } from "@/stores/sessionStore";

// Labels alignés sur le référentiel backend (permissions.py / onboarding) :
// GMM = Direction, GST = Secrétariat général, TCH = Infrastructures, …
const SERVICE_LABELS: Record<string, string> = {
  gmm: "Direction (GMM)",
  gst: "Secrétariat général (GST)",
  amg: "Direction des études (AMG)",
  sag: "Scolarité et admissions (SAG)",
  faa: "Finances & Comptabilité (FAA)",
  vsc: "Vie scolaire (VSC)",
  hrs: "Ressources humaines (HRS)",
  cmm: "Communication et médias (CMM)",
  tch: "Infrastructures & techniques (TCH)",
  hsa: "Infirmerie / Santé scolaire (HSA)",
};

const MODULE_LINKS: Record<string, { href: string; label: string }[]> = {
  direction: [
    { href: "/decisions", label: "Décisions sensibles" },
    { href: "/conseil", label: "Conseil d'administration" },
  ],
  finance: [
    { href: "/finances", label: "Gestion financière" },
    { href: "/caisses", label: "Caisses & sessions" },
  ],
  pedagogie: [
    { href: "/notes", label: "Notes" },
    { href: "/bulletins", label: "Bulletins" },
    { href: "/examens", label: "Examens" },
    { href: "/conseils", label: "Conseils" },
    { href: "/organisation", label: "Année & trimestres" },
  ],
  scolarite: [
    { href: "/classes", label: "Classes" },
    { href: "/eleves", label: "Élèves" },
    { href: "/attestations", label: "Attestations" },
    { href: "/courrier", label: "Courrier & archives" },
  ],
  viescolaire: [
    { href: "/viescolaire", label: "Vie scolaire" },
    { href: "/registres", label: "Registres réglementaires" },
  ],
  sante: [{ href: "/sante", label: "Infirmerie" }],
  communication: [{ href: "/communication", label: "Communication ciblée" }],
  infrastructures: [
    { href: "/infrastructures", label: "Réservations & matériel" },
    { href: "/organisation", label: "Salles & emploi du temps" },
  ],
  rh: [
    { href: "/rh", label: "RH & Paie" },
    { href: "/enseignants", label: "Enseignants" },
    { href: "/parametres", label: "Paramètres" },
  ],
  taches: [{ href: "/taches", label: "Tâches inter-services" }],
  annuaire: [{ href: "/annuaire", label: "Annuaire" }],
};

const MODULES_EN_CONSTRUCTION: string[] = [];

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

interface Kpi {
  label: string;
  key: string;
  /** Format spécial pour les valeurs composées (objets). */
  format?: (v: unknown) => string;
  sub?: string | ((v: unknown) => string);
}

const ICONES_ORDONNEES: React.ReactNode[] = [
  <Coins key="i1" className="w-3 h-3" />,
  <Wallet key="i2" className="w-3 h-3" />,
  <Users key="i3" className="w-3 h-3" />,
  <GraduationCap key="i4" className="w-3 h-3" />,
  <ShieldAlert key="i5" className="w-3 h-3" />,
  <Home key="i6" className="w-3 h-3" />,
  <FileCheck2 key="i7" className="w-3 h-3" />,
  <ClipboardList key="i8" className="w-3 h-3" />,
  <CalendarDays key="i9" className="w-3 h-3" />,
  <Building2 key="i10" className="w-3 h-3" />,
  <Megaphone key="i11" className="w-3 h-3" />,
  <UserCheck key="i12" className="w-3 h-3" />,
];

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
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

/** Indicateurs fins par module (F11) : GET /secondaire/stats/module?module=… */
const KPIS_PAR_MODULE: Record<string, Kpi[]> = {
  finance: [
    { label: "Encaissé", key: "encaisse", format: (v) => fmt(Number(v ?? 0)) },
    { label: "Total dû", key: "total_du", format: (v) => fmt(Number(v ?? 0)) },
    { label: "Reste à encaisser", key: "reste", format: (v) => fmt(Number(v ?? 0)) },
    { label: "Taux de recouvrement", key: "taux_recouvrement", format: (v) => (v == null ? "—" : `${v}%`) },
    {
      label: "Échéances en retard", key: "echeances_en_retard",
      format: (v) => String(v ?? 0),
      sub: "échéances dépassées",
    },
    {
      label: "Paiements du mois", key: "paiements_mois",
      format: (v) => {
        const p = (v ?? { nb: 0 }) as { nb?: number };
        return String(p.nb ?? 0);
      },
      sub: (v?: unknown) => {
        const p = (v ?? {}) as { montant?: number };
        return `soit ${fmt(Number(p.montant ?? 0))}`;
      },
    },
  ],
  scolarite: [
    { label: "Inscriptions actives", key: "inscriptions_actives" },
    { label: "Classes", key: "classes" },
    { label: "Attestations (année)", key: "attestations_annee" },
    { label: "Courriers", key: "courriers" },
    { label: "Courriers en attente", key: "courriers_en_attente" },
  ],
  pedagogie: [
    { label: "Effectif", key: "effectif" },
    { label: "Classes", key: "classes" },
    { label: "Examens programmés", key: "examens_programmes" },
    { label: "Bulletins émis", key: "bulletins_emis" },
    { label: "Cahiers de textes", key: "cahiers_textes" },
  ],
  viescolaire: [
    { label: "Absences", key: "absences" },
    { label: "Absences non justifiées", key: "absences_non_justifiees" },
    { label: "Retards", key: "retards" },
    { label: "Sanctions actives", key: "sanctions_actives" },
    { label: "Cahiers de textes remplis", key: "cahiers_textes_remplis" },
  ],
  rh: [
    { label: "Personnel", key: "effectif_personnel" },
    { label: "Contrats actifs", key: "contrats_actifs" },
    { label: "Congés en cours", key: "conges_en_cours" },
    {
      label: "Fiches de paie (mois)", key: "fiches_paie_mois",
      format: (v) => String((v as { nb?: number } | undefined)?.nb ?? 0),
      sub: (v?: unknown) => `masse nette : ${fmt(Number((v as { masse_nette?: number } | undefined)?.masse_nette ?? 0))}`,
    },
  ],
  communication: [
    { label: "Communiqués", key: "communiques" },
    { label: "Taux de lecture moyen", key: "taux_lecture_moyen", format: (v) => (v == null ? "—" : `${v}%`) },
    { label: "Événements à venir", key: "evenements_a_venir" },
  ],
  infrastructures: [
    { label: "Réservations (mois)", key: "reservations_mois" },
    { label: "Maintenances en cours", key: "maintenances_en_cours" },
    { label: "Matériels actifs", key: "materiels" },
    { label: "Prêts en cours", key: "prets_en_cours" },
  ],
  sante: [
    { label: "Passages (année)", key: "passages_annee" },
    { label: "Renvois à domicile", key: "renvois_domicile" },
    { label: "Dossiers de santé", key: "fiches_sante" },
  ],
  taches: [
    { label: "Demandes", key: "demandes" },
    { label: "En cours", key: "en_cours" },
    { label: "En retard", key: "en_retard" },
    { label: "Réglées", key: "reglees" },
  ],
  annuaire: [
    { label: "Membres du personnel", key: "membres" },
    { label: "Services actifs", key: "services_actifs" },
  ],
};

function ModuleWidgets({ svcModule }: { svcModule: string }) {
  const { data, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["svc-indicateurs", svcModule],
    queryFn: () =>
      api.get<Record<string, unknown>>(`/secondaire/stats/module?module=${svcModule}`),
  });

  if (MODULES_EN_CONSTRUCTION.includes(svcModule)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Module en construction</p>
          <p className="text-sm text-muted-foreground mt-1">
            Le tableau de bord de ce service arrive dans une prochaine version.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis = KPIS_PAR_MODULE[svcModule];
  if (!kpis) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun indicateur spécifique pour ce module.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {isLoading
        ? <p className="text-sm text-muted-foreground col-span-full">Chargement des indicateurs…</p>
        : kpis.map((k, i) => (
            <KpiCard
              key={k.key}
              label={k.label}
              value={k.format ? k.format(data?.[k.key]) : String(data?.[k.key] ?? 0)}
              sub={k.sub ? (typeof k.sub === "function" ? k.sub(data?.[k.key]) : k.sub) : undefined}
              icon={ICONES_ORDONNEES[i % ICONES_ORDONNEES.length]}
            />
          ))}
    </div>
  );
}

export function ServiceDashboard({ userName, user }: { userName: string; user: SessionUser }) {
  const caps = user.capabilities ?? [];
  const svcModule =
    caps[0] ??
    (user.adminProfile?.serviceCode ? user.adminProfile.serviceCode.toLowerCase() : "") ??
    "";
  const serviceLabel =
    user.adminProfile?.serviceLabel ?? SERVICE_LABELS[svcModule] ?? "Service";
  const posteLabel = user.adminProfile?.posteLabel;
  const links = MODULE_LINKS[svcModule] ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tableau de bord — {serviceLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {user?.structureName ?? "Établissement"} — {userName}
              {posteLabel ? ` · ${posteLabel}` : ""}
            </p>
          </div>
        </header>

        <ModuleWidgets svcModule={svcModule} />

        {links.length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Accès rapides du service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between border border-card-border rounded-lg px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                      {l.label}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
