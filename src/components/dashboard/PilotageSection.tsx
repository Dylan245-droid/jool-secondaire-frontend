"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, downloadFile } from "@/lib/api";
import {
  StatsAbandons,
  ResultatExamen,
  PrevTresorerie,
  MoisTresorerie,
  SimulationResult,
  BudgetLine,
  StatsBudget,
  SCENARIOS,
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
  BarChart3,
  Calculator,
  Download,
  FileBarChart,
  UserX,
} from "lucide-react";

// ─── Abandons ───

function AbandonsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-abandons"],
    queryFn: () => api.get<StatsAbandons>("/secondaire/stats/abandons"),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Effectif actif</p>
          <p className="text-2xl font-bold text-primary-dark mt-1">{data.effectif}</p>
        </div>
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Sorties</p>
          <p className="text-2xl font-bold text-rose mt-1">{data.sorties.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.sorties.abandon} abandon(s) · {data.sorties.transfere} transfert(s) ·{" "}
            {data.sorties.exclu} exclusion(s)
          </p>
        </div>
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Taux d&apos;abandon</p>
          <p className="text-2xl font-bold text-primary-dark mt-1">{data.taux_abandon}%</p>
        </div>
      </div>

      {data.par_niveau.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Niveau</TH>
              <TH>Actifs</TH>
              <TH>Sorties</TH>
              <TH className="text-right">Taux de sortie</TH>
            </TR>
          </THead>
          <TBody>
            {data.par_niveau.map((n) => (
              <TR key={n.niveau}>
                <TD className="font-medium">{n.niveau}</TD>
                <TD>{n.actifs}</TD>
                <TD>{n.sorties}</TD>
                <TD className="text-right">
                  <Badge variant={n.taux >= 10 ? "destructive" : "warning"}>{n.taux}%</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

// ─── Résultats examens ───

function ExamensCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-examens"],
    queryFn: () =>
      api.get<{ examens: ResultatExamen[] }>("/secondaire/stats/resultats-examens"),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!data.examens.length) {
    return <p className="text-sm text-muted-foreground">Aucun examen officiel saisi.</p>;
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Examen</TH>
          <TH>Session</TH>
          <TH>Présents</TH>
          <TH>Admis</TH>
          <TH className="text-right">Taux de réussite</TH>
        </TR>
      </THead>
      <TBody>
        {data.examens.map((e, i) => (
          <TR key={i}>
            <TD className="font-medium">
              {e.examen} {e.annee}
            </TD>
            <TD>{e.session}</TD>
            <TD>{e.presentes}</TD>
            <TD>{e.admis}</TD>
            <TD className="text-right">
              <Badge variant={e.taux_reussite >= 60 ? "success" : "warning"}>
                {e.taux_reussite}%
              </Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// ─── Trésorerie prévisionnelle ───

// Sparkline en coordonnées réelles (ResizeObserver) : tracé lisible, points ronds.
function CumulSparkline({ mois }: { mois: MoisTresorerie[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ width: el.clientWidth });
    });
    ro.observe(el);
    setDims({ width: el.clientWidth });
    return () => ro.disconnect();
  }, []);

  const H = 200;
  const padX = 10;
  const padTop = 20;
  const padBottom = 14;
  const maxCumul = Math.max(...mois.map((m) => m.cumul_attendu), 1);

  if (!dims) {
    return <div ref={ref} className="w-full" style={{ height: H }} />;
  }

  const innerW = Math.max(1, dims.width - padX * 2);
  const innerH = H - padTop - padBottom;
  const points = mois.map((m, i) => ({
    x: padX + (i * innerW) / Math.max(1, mois.length - 1),
    y: padTop + innerH - (m.cumul_attendu / maxCumul) * innerH,
  }));
  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  let dashLen = 0;
  for (let i = 1; i < points.length; i++) {
    dashLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  return (
    <div ref={ref} className="w-full" style={{ height: H }}>
      <svg width={dims.width} height={H} className="block overflow-visible">
        <defs>
          <linearGradient id="sparkFillCumul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1={padX}
          y1={H - padBottom}
          x2={dims.width - padX}
          y2={H - padBottom}
          stroke="var(--card-border)"
          strokeWidth={1}
        />
        <polygon
          points={`${padX},${H - padBottom} ${polyline} ${last ? `${last.x},${H - padBottom}` : ""}`}
          fill="url(#sparkFillCumul)"
          className="animate-in fade-in duration-700 delay-300 fill-mode-both"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--violet)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="jool-sparkline"
          style={{ ["--jool-dash" as string]: dashLen }}
        />
        {points.map((p, i) => {
          const m = mois[i];
          return (
            <g key={i} className="animate-in fade-in duration-500 fill-mode-both"
               style={{ animationDelay: `${0.5 + i * 0.06}s` }}>
              <title>{`${m.libelle} : ${fmtMontant(m.cumul_attendu)}`}</title>
              <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="var(--violet-dark)" strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={1.8} fill="var(--violet-dark)" />
            </g>
          );
        })}
        {last && (
          <text
            x={last.x}
            y={last.y - 12}
            textAnchor="end"
            fontSize={12}
            fontWeight={600}
            fill="var(--violet-dark)"
            className="animate-in fade-in duration-500 delay-700 fill-mode-both"
          >
            {fmtMontant(mois[mois.length - 1].cumul_attendu)}
          </text>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-1 px-1">
        <span>{mois[0]?.libelle}</span>
        <span>{mois[mois.length - 1]?.libelle}</span>
      </div>
    </div>
  );
}

function TresorerieCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["prevision-tresorerie"],
    queryFn: () => api.get<PrevTresorerie>("/secondaire/finances/prevision-tresorerie"),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="jool-skeleton h-4 w-72 rounded" />
        <div className="jool-skeleton h-40 w-full rounded-lg" />
      </div>
    );
  }

  const maxPrev = Math.max(...data.mois.map((m) => m.prevision_ponderee), 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Taux de recouvrement constaté :{" "}
        <span className="font-semibold text-gray-900">{data.taux_recouvrement}%</span> — les
        prévisions pondèrent les encaissements attendus par ce taux.
      </p>

      <div className="border border-card-border rounded-lg p-4 bg-white">
        <p className="text-xs font-semibold text-gray-900 mb-1">Cumul attendu d&apos;encaissements (FCFA)</p>
        <CumulSparkline mois={data.mois} />
      </div>

      <div className="space-y-2">
        {data.mois.map((m, i) => (
          <div key={m.mois} className="flex items-center gap-3 text-sm">
            <span className="w-28 truncate text-xs capitalize text-muted-foreground shrink-0">
              {m.libelle}
            </span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-turquoise jool-bar-grow"
                style={{
                  width: `${Math.max(3, (m.prevision_ponderee / maxPrev) * 100)}%`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            </div>
            <span className="w-24 text-right text-xs font-medium shrink-0">
              {fmtMontant(m.cumul_attendu)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Simulations ───

function SimulationsCard() {
  const [scenario, setScenario] = useState("classe_nouvelle");
  const [params, setParams] = useState<Record<string, string>>({});
  const [resultat, setResultat] = useState<SimulationResult | null>(null);
  const [exporting, setExporting] = useState(false);

  const sc = SCENARIOS.find((s) => s.value === scenario);

  const run = useMutation({
    mutationFn: (body: { scenario: string; parametres: Record<string, number> }) =>
      api.post<SimulationResult>("/secondaire/simulations/run", body),
    onSuccess: (r) => setResultat(r),
  });

  const exporter = async () => {
    setExporting(true);
    try {
      await downloadFile(`/secondaire/simulations/export?scenario=${scenario}`, `${scenario}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const parametresNombres = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== "") out[k] = Number(v);
    }
    return out;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-card-border rounded-lg p-4 bg-white h-fit space-y-3">
          <p className="text-sm font-semibold text-gray-900">Scénario</p>
          <div>
            <Label className="text-xs">Simulation</Label>
            <Select value={scenario} onChange={(e) => setScenario(e.target.value)}>
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          {sc?.params.map((p) => (
            <div key={p.name}>
              <Label className="text-xs">{p.label}</Label>
              <Input
                type="number"
                step="any"
                placeholder={p.placeholder}
                value={params[p.name] ?? ""}
                onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
              />
            </div>
          ))}
          <Button
            className="w-full"
            disabled={run.isPending}
            onClick={() =>
              run.mutate({ scenario, parametres: parametresNombres() })
            }
          >
            <Calculator className="w-4 h-4" />
            Lancer la simulation
          </Button>
          <Button variant="outline" className="w-full" disabled={exporting} onClick={exporter}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <div className="lg:col-span-2">
          {resultat ? (
            <div className="space-y-4 jool-anim-fade-up">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{resultat.label}</p>
                <Badge variant="outline">simulation indicative</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(
                  [
                    ["effectif", "Effectif", (s: typeof resultat.avant) => String(s.effectif)],
                    ["revenu_annuel", "Revenu annuel", (s: typeof resultat.avant) => fmtMontant(s.revenu_annuel)],
                    ["taux_recouvrement", "Recouvrement", (s: typeof resultat.avant) => `${s.taux_recouvrement}%`],
                    ["tresorerie_previsionnelle", "Trésorerie prévisionnelle", (s: typeof resultat.avant) => fmtMontant(s.tresorerie_previsionnelle)],
                    ["charges", "Charges", (s: typeof resultat.avant) => fmtMontant(s.charges)],
                    ["marge", "Marge", (s: typeof resultat.avant) => fmtMontant(s.marge)],
                  ] as const
                ).map(([k, label, fmt]) => (
                  <div key={k} className="border border-card-border rounded-lg p-4 bg-white">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-primary-dark mt-1">
                      {fmt(resultat.avant)}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="text-muted-foreground">après : </span>
                      <span className="font-semibold">{fmt(resultat.apres)}</span>
                    </p>
                  </div>
                ))}
              </div>
              {resultat.details && (
                <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                  {Object.entries(resultat.details).map(([k, v]) => (
                    <span key={k} className="mr-3">
                      <span className="font-medium text-gray-900">{k}</span> : {String(v)}
                    </span>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center border border-dashed border-card-border rounded-lg">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                Lancez un scénario pour comparer la situation actuelle à la projection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Budget & coûts ───

function BudgetCard() {
  const qc = useQueryClient();
  const { data: stats, isLoading: sLoading } = useQuery({
    queryKey: ["stats-budget"],
    queryFn: () => api.get<StatsBudget>("/secondaire/stats/budget"),
    staleTime: 60_000,
  });
  const { data: lignes, isLoading: lLoading } = useQuery({
    queryKey: ["budget-lignes"],
    queryFn: () => api.get<BudgetLine[]>("/secondaire/finances/budget"),
    staleTime: 60_000,
  });
  const [form, setForm] = useState({ categorie: "charge", poste: "", montant: "" });

  const creer = useMutation({
    mutationFn: (body: { categorie: string; poste: string; montant: number }) =>
      api.post("/secondaire/finances/budget", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lignes"] });
      qc.invalidateQueries({ queryKey: ["stats-budget"] });
      setForm({ categorie: "charge", poste: "", montant: "" });
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`/secondaire/finances/budget/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lignes"] });
      qc.invalidateQueries({ queryKey: ["stats-budget"] });
    },
  });

  if (sLoading || lLoading || !stats || !lignes) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Charges prévues</p>
          <p className="text-xl font-bold text-primary-dark mt-1">{fmtMontant(stats.charges_prevues)}</p>
        </div>
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Réalisé (coûts)</p>
          <p className="text-xl font-bold text-rose mt-1">{fmtMontant(stats.realise_charges)}</p>
        </div>
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Exécution</p>
          <p className="text-xl font-bold text-primary-dark mt-1">
            {stats.taux_execution_budget}%
          </p>
        </div>
        <div className="border border-card-border rounded-lg p-4 bg-white">
          <p className="text-sm text-muted-foreground">Coût par élève</p>
          <p className="text-xl font-bold text-primary-dark mt-1">{fmtMontant(stats.cout_par_eleve)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {lignes.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Poste</TH>
                  <TH>Catégorie</TH>
                  <TH className="text-right">Montant</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {lignes.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium">
                      {l.poste}
                      {l.notes && <span className="text-xs text-muted-foreground ml-1">({l.notes})</span>}
                    </TD>
                    <TD>
                      <Badge variant={l.categorie === "recette" ? "turquoise" : "warning"}>
                        {l.categorie}
                      </Badge>
                    </TD>
                    <TD className="text-right">{fmtMontant(l.montant)}</TD>
                    <TD className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => supprimer.mutate(l.id)}>
                        Supprimer
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune ligne de budget.</p>
          )}
        </div>

        <div className="border border-card-border rounded-lg p-4 bg-white h-fit space-y-3">
          <p className="text-sm font-semibold text-gray-900">Nouvelle ligne</p>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <Select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            >
              <option value="charge">Charge</option>
              <option value="recette">Recette</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Poste</Label>
            <Input
              placeholder="ex. Salaires enseignants"
              value={form.poste}
              onChange={(e) => setForm({ ...form, poste: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Montant (FCFA)</Label>
            <Input
              type="number"
              step="any"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
            />
          </div>
          <Button
            className="w-full"
            disabled={creer.isPending || !form.poste || !form.montant}
            onClick={() =>
              creer.mutate({
                categorie: form.categorie,
                poste: form.poste,
                montant: Number(form.montant),
              })
            }
          >
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section principale ───

export function PilotageSection() {
  const [exporting, setExporting] = useState(false);

  const exporterPilotage = async () => {
    setExporting(true);
    try {
      await downloadFile("/secondaire/pilotage/export", "pilotage.csv");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="jool-anim-fade-up jool-anim-delay-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose" />
            Sorties & abandons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AbandonsCard />
        </CardContent>
      </Card>

      <Card className="jool-anim-fade-up jool-anim-delay-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-turquoise" />
            Résultats aux examens officiels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExamensCard />
        </CardContent>
      </Card>

      <Card className="jool-anim-fade-up jool-anim-delay-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Trésorerie prévisionnelle (12 mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TresorerieCard />
        </CardContent>
      </Card>

      <Card className="jool-anim-fade-up jool-anim-delay-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            Moteur de simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimulationsCard />
        </CardContent>
      </Card>

      <Card className="jool-anim-fade-up jool-anim-delay-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Budget & coûts</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetCard />
        </CardContent>
      </Card>

      <Card className="jool-anim-fade-up jool-anim-delay-5">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Export complet du pilotage</p>
            <p className="text-xs text-muted-foreground">
              Indicateurs clés, abandons, trésorerie au format CSV.
            </p>
          </div>
          <Button variant="brutal-turquoise" disabled={exporting} onClick={exporterPilotage}>
            <Download className="w-4 h-4" />
            Exporter le CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
