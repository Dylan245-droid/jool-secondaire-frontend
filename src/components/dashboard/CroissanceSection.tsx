"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCountUp } from "@/lib/useCountUp";
import {
  SuiviTargets,
  RegleAlerte,
  ScanResult,
  Historique,
  SerieStats,
  TargetOut,
  TARGET_TYPES,
  ALERT_TYPES,
  fmtMontant,
} from "@/lib/dirigeant";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import {
  Bell,
  Download,
  FileText,
  ScanSearch,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number | null | undefined, unite: string) =>
  n == null ? "—" : `${n.toLocaleString("fr-FR")}${unite === "%" ? " %" : ` ${unite}`}`;

function ObjectifCarte({
  s,
  cibles,
  setCibles,
  sauver,
  index,
}: {
  s: SuiviTargets["suivi"][number];
  cibles: Record<string, string>;
  setCibles: Dispatch<SetStateAction<Record<string, string>>>;
  sauver: { isPending: boolean; mutate: (body: { type: string; valeur_cible: number }) => void };
  index: number;
}) {
  const type = TARGET_TYPES.find((t) => t.value === s.type);
  const valeur = useCountUp(s.valeur, 800);
  const pct = s.cible && s.cible > 0 ? Math.min(100, (s.valeur / s.cible) * 100) : 0;
  return (
    <div
      className={cn(
        "border border-card-border rounded-lg p-4 bg-white jool-card-lift jool-anim-fade-up",
        `jool-anim-delay-${index + 1}`
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">{type?.label ?? s.label}</p>
        <Badge variant={s.sans_objectif ? "outline" : s.atteint ? "success" : "warning"}>
          {s.sans_objectif ? "sans cible" : s.atteint ? "atteint" : "à atteindre"}
        </Badge>
      </div>
      <p className="text-2xl font-bold text-primary-dark mt-2">
        {valeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
        <span className="text-sm font-normal text-muted-foreground">
          {type?.unite === "%" ? " %" : ` ${type?.unite ?? ""}`}
        </span>
      </p>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full jool-bar-grow",
            s.sans_objectif
              ? "bg-muted"
              : s.atteint
                ? "bg-emerald-500"
                : pct >= 80
                  ? "bg-amber-500"
                  : "bg-rose"
          )}
          style={{ width: `${s.sans_objectif ? 0 : pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        cible : {s.cible != null ? fmt(s.cible, type?.unite ?? "") : "—"}
        {s.ecart != null && (
          <span className={cn("ml-1", s.ecart < 0 ? "text-rose" : "text-emerald-700")}>
            ({s.ecart > 0 ? "+" : ""}
            {s.ecart})
          </span>
        )}
      </p>
      <div className="flex items-end gap-2 mt-3">
        <div className="flex-1">
          <Label className="text-xs">Cible</Label>
          <Input
            type="number"
            step="any"
            placeholder="valeur cible"
            value={cibles[s.type] ?? s.cible ?? ""}
            onChange={(e) => setCibles((prev) => ({ ...prev, [s.type]: e.target.value }))}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={sauver.isPending || !cibles[s.type]}
          onClick={() => sauver.mutate({ type: s.type, valeur_cible: Number(cibles[s.type]) })}
        >
          Fixer
        </Button>
      </div>
    </div>
  );
}

function ObjectifsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivi-targets"],
    queryFn: () => api.get<SuiviTargets>("/secondaire/targets/suivi"),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });
  const [cibles, setCibles] = useState<Record<string, string>>({});

  const sauver = useMutation({
    mutationFn: (body: { type: string; valeur_cible: number }) =>
      api.post<TargetOut>("/secondaire/targets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suivi-targets"] }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-card-border rounded-lg p-4">
            <div className="jool-skeleton h-3 w-28 rounded" />
            <div className="jool-skeleton h-8 w-20 rounded mt-3" />
            <div className="jool-skeleton h-2 w-full rounded mt-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Objectifs de rentrée — {data.annee}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.suivi.map((s, i) => (
          <ObjectifCarte key={s.type} s={s} cibles={cibles} setCibles={setCibles} sauver={sauver} index={i} />
        ))}
      </div>
    </div>
  );
}

function AlertesCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["regles-alertes"],
    queryFn: () => api.get<RegleAlerte[]>("/secondaire/alertes-regles"),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });
  const [form, setForm] = useState({
    type: "recouvrement",
    seuil: "80",
    comparateur: "lt",
    canal: "email",
  });
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const creer = useMutation({
    mutationFn: (body: { type: string; seuil: number; comparateur: string; canal: string }) =>
      api.post("/secondaire/alertes-regles", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regles-alertes"] });
      setForm((f) => ({ ...f, seuil: "80" }));
    },
  });

  const toggle = useMutation({
    mutationFn: (r: RegleAlerte) =>
      api.patch(`/secondaire/alertes-regles/${r.id}`, { actif: !r.actif }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regles-alertes"] }),
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/alertes-regles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regles-alertes"] }),
  });

  const scanner = useMutation({
    mutationFn: () => api.post<ScanResult>("/secondaire/alertes-regles/scan"),
    onSuccess: (r) => {
      setScanMsg(
        r.declenchees.length
          ? `Alerte(s) déclenchée(s) : ${r.declenchees.join(", ")}`
          : "Aucune alerte déclenchée."
      );
      qc.invalidateQueries({ queryKey: ["regles-alertes"] });
    },
    onError: () => setScanMsg("Échec du scan."),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement des alertes…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Alertes configurables</h3>
        </div>
        <Button
          size="sm"
          variant="turquoise"
          disabled={scanner.isPending}
          onClick={() => scanner.mutate()}
        >
          <ScanSearch className="w-3.5 h-3.5" />
          Scanner maintenant
        </Button>
      </div>
      {scanMsg && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">{scanMsg}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {data.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Règle</TH>
                  <TH>Condition</TH>
                  <TH>Canal</TH>
                  <TH>Dernier déclenchement</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.type_label}</TD>
                    <TD>
                      {r.comparateur === "lt" ? "inférieur à" : "supérieur à"} {fmtMontant(r.seuil)}
                      <Badge variant={r.actif ? "success" : "outline"} className="ml-2">
                        {r.actif ? "actif" : "inactif"}
                      </Badge>
                    </TD>
                    <TD className="uppercase text-xs">{r.canal}</TD>
                    <TD className="text-xs text-muted-foreground">
                      {r.dernier_declenchement
                        ? new Date(r.dernier_declenchement).toLocaleString("fr-FR")
                        : "jamais"}
                    </TD>
                    <TD className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => toggle.mutate(r)}>
                        {r.actif ? "Désactiver" : "Activer"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => supprimer.mutate(r.id)}>
                        Supprimer
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune règle — créez votre première alerte ci-contre.
            </p>
          )}
        </div>

        <div className="border border-card-border rounded-lg p-4 bg-white h-fit">
          <p className="text-sm font-semibold text-gray-900 mb-3">Nouvelle règle</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Indicateur</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Seuil</Label>
              <Input
                type="number"
                step="any"
                value={form.seuil}
                onChange={(e) => setForm({ ...form, seuil: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Condition</Label>
              <Select
                value={form.comparateur}
                onChange={(e) => setForm({ ...form, comparateur: e.target.value })}
              >
                <option value="lt">Inférieur au seuil</option>
                <option value="gt">Supérieur au seuil</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select
                value={form.canal}
                onChange={(e) => setForm({ ...form, canal: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={creer.isPending || !form.seuil}
              onClick={() =>
                creer.mutate({
                  type: form.type,
                  seuil: Number(form.seuil),
                  comparateur: form.comparateur,
                  canal: form.canal,
                })
              }
            >
              Créer la règle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoriqueCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["historique"],
    queryFn: () => api.get<Historique>("/secondaire/historique"),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement de l&apos;historique…</p>;
  }

  const lignes = [
    { key: "effectif", titre: "Effectif" },
    { key: "recouvrement", titre: "Taux de recouvrement" },
    { key: "encaisse", titre: "Encaissements" },
    { key: "reussite", titre: "Taux de réussite" },
    { key: "moyenne", titre: "Moyenne générale" },
    { key: "abandons", titre: "Sorties validées" },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-700" />
        <h3 className="text-sm font-semibold text-gray-900">
          Comparaison {data.annee ?? "N"} vs {data.precedente ?? "—"}
        </h3>
      </div>
      <div className="mt-3">
        <Table>
          <THead>
            <TR>
              <TH>Indicateur</TH>
              <TH>{data.annee ?? "N"}</TH>
              <TH>{data.precedente ?? "N-1"}</TH>
              <TH className="text-right">Évolution</TH>
            </TR>
          </THead>
          <TBody>
            {lignes.map(({ key, titre }) => {
              const l = data[key];
              const evo = l.evolution_pct;
              return (
                <TR key={key}>
                  <TD className="font-medium">{titre}</TD>
                  <TD>{fmt(l.annee_actuelle, l.unite)}</TD>
                  <TD className="text-muted-foreground">
                    {l.annee_precedente != null ? fmt(l.annee_precedente, l.unite) : "—"}
                  </TD>
                  <TD className="text-right">
                    {evo == null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Badge variant={evo >= 0 ? "success" : "destructive"}>
                        {evo > 0 ? "+" : ""}
                        {evo}%
                      </Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

function SeriesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-series"],
    queryFn: () => api.get<{ series: SerieStats[] }>("/secondaire/stats/series"),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!data.series.length) {
    return <p className="text-sm text-muted-foreground">Aucune série (lycée) cette année.</p>;
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Série</TH>
          <TH>Effectif</TH>
          <TH>Recouvrement</TH>
          <TH className="text-right">Réussite</TH>
        </TR>
      </THead>
      <TBody>
        {data.series.map((s) => (
          <TR key={s.serie_id}>
            <TD className="font-medium">
              {s.label}
              <span className="text-xs text-muted-foreground ml-1">({s.classes.join(", ")})</span>
            </TD>
            <TD>{s.effectif}</TD>
            <TD>
              {fmtMontant(s.encaisse)} / {fmtMontant(s.total_du)}{" "}
              <span className="text-xs text-muted-foreground">({s.recouvrement}%)</span>
            </TD>
            <TD className="text-right">
              {s.reussite != null ? (
                <Badge variant={s.reussite >= 60 ? "success" : "warning"}>{s.reussite}%</Badge>
              ) : (
                "—"
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function CroissanceSection() {
  const [downloading, setDownloading] = useState(false);

  const telechargerRapport = async () => {
    setDownloading(true);
    try {
      const blob = await api.download("/secondaire/rapport-mensuel");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="jool-anim-fade-up jool-anim-delay-1">
        <CardContent className="p-5">
          <ObjectifsCard />
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40 jool-anim-fade-up jool-anim-delay-2">
        <CardContent className="p-5">
          <AlertesCard />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="jool-anim-fade-up jool-anim-delay-3">
          <CardContent className="p-5">
            <HistoriqueCard />
          </CardContent>
        </Card>
        <Card className="jool-anim-fade-up jool-anim-delay-4">
          <CardHeader>
            <CardTitle>Réussite par série (lycée)</CardTitle>
          </CardHeader>
          <CardContent>
            <SeriesCard />
          </CardContent>
        </Card>
      </div>

      <Card className="jool-anim-fade-up jool-anim-delay-5">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Rapport mensuel du dirigeant</p>
            <p className="text-xs text-muted-foreground">
              Bilan complet (KPI, objectifs, classes, alertes) au format PDF.
            </p>
          </div>
          <Button
            variant="brutal-noir"
            disabled={downloading}
            onClick={telechargerRapport}
          >
            <Download className="w-4 h-4" />
            Télécharger le PDF
          </Button>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3.5 h-3.5" />
        Objectifs, alertes et historique sont limités à l&apos;année scolaire active de votre
        établissement.
      </p>
    </div>
  );
}
