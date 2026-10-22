// ─── Types partagés du dashboard dirigeant (P1 pilotage / P2 croissance) ───

export interface SuiviObjectif {
  type: string;
  label: string;
  cible: number | null;
  valeur: number;
  ecart: number | null;
  atteint: boolean;
  sans_objectif: boolean;
}

export interface SuiviTargets {
  annee: string | null;
  indicateurs: Record<string, number | null>;
  suivi: SuiviObjectif[];
}

export interface TargetOut {
  id: number;
  type: string;
  type_label: string;
  valeur_cible: number;
  notes: string;
}

export interface RegleAlerte {
  id: number;
  type: string;
  type_label: string;
  seuil: number;
  comparateur: string;
  canal: string;
  actif: boolean;
  notes: string;
  dernier_declenchement: string | null;
}

export interface ScanResult {
  declenchees: string[];
}

export interface LigneHistorique {
  label: string;
  unite: string;
  annee_actuelle: number | null;
  annee_precedente: number | null;
  evolution_pct: number | null;
}

export interface Historique {
  annee: string | null;
  precedente: string | null;
  effectif: LigneHistorique;
  recouvrement: LigneHistorique;
  encaisse: LigneHistorique;
  reussite: LigneHistorique;
  moyenne: LigneHistorique;
  abandons: LigneHistorique;
}

export interface SerieStats {
  serie_id: number;
  code: string;
  label: string;
  classes: string[];
  effectif: number;
  total_du: number;
  encaisse: number;
  recouvrement: number;
  bulletins_emis: number;
  reussite: number | null;
}

// ─── Pilotage (P1) ───

export interface AbandonNiveau {
  niveau: string;
  actifs: number;
  sorties: number;
  taux: number;
}

export interface AbandonMotif {
  motif: string;
  label: string;
  nb: number;
}

export interface StatsAbandons {
  effectif: number;
  sorties: {
    total: number;
    abandon: number;
    transfere: number;
    exclu: number;
    autre: number;
  };
  taux_abandon: number;
  par_niveau: AbandonNiveau[];
  par_motif: AbandonMotif[];
}

export interface ExamenSerie {
  serie: string;
  presentes: number;
  admis: number;
  taux: number;
}

export interface ResultatExamen {
  examen: string;
  annee: number;
  session: string;
  presentes: number;
  admis: number;
  taux_reussite: number;
  par_serie: ExamenSerie[];
}

export interface MoisTresorerie {
  mois: string;
  libelle: string;
  encaissements_prevus: number;
  prevision_ponderee: number;
  realise: number;
  cumul_attendu: number;
}

export interface PrevTresorerie {
  taux_recouvrement: number;
  horizon: number;
  mois: MoisTresorerie[];
}

export interface SituationFinanciere {
  effectif: number;
  revenu_annuel: number;
  taux_recouvrement: number;
  tresorerie_previsionnelle: number;
  charges: number;
  cout_par_eleve: number;
  marge: number;
}

export interface SimulationResult {
  scenario: string;
  label: string;
  parametres: Record<string, number>;
  simulation_indicative: boolean;
  avant: SituationFinanciere;
  apres: SituationFinanciere;
  delta: {
    effectif: number;
    revenu_annuel: number;
    marge: number;
    tresorerie_previsionnelle: number;
  };
  details: Record<string, number | string | null>;
}

export interface BudgetLine {
  id: number;
  categorie: string;
  poste: string;
  montant: number;
  periode: string;
  notes: string;
}

export interface StatsBudget {
  recettes_prevues: number;
  charges_prevues: number;
  realise_recettes: number;
  realise_charges: number;
  taux_execution_budget: number;
  cout_par_eleve: number;
  couts_par_categorie: Record<string, number>;
  par_poste: { poste: string; prevu: number; realise: number }[];
}

// ─── Constantes ───

export const SCENARIOS: { value: string; label: string; params: { name: string; label: string; placeholder?: string }[] }[] = [
  {
    value: "classe_nouvelle",
    label: "Ouverture d'une classe supplémentaire",
    params: [
      { name: "nb_eleves", label: "Nouveaux élèves", placeholder: "30" },
      { name: "frais_eleve", label: "Frais par élève (FCFA)", placeholder: "0 = frais moyen actuel" },
      { name: "salaire_enseignant", label: "Salaire enseignant (FCFA)", placeholder: "0" },
      { name: "nb_enseignants", label: "Nb d'enseignants", placeholder: "1" },
    ],
  },
  {
    value: "hausse_frais",
    label: "Hausse des frais de scolarité",
    params: [{ name: "pct", label: "Augmentation (%)", placeholder: "10" }],
  },
  {
    value: "crise",
    label: "Crise / baisse des effectifs",
    params: [{ name: "pct", label: "Baisse des effectifs (%)", placeholder: "10" }],
  },
  {
    value: "rentree",
    label: "Prévision de rentrée N+1",
    params: [
      { name: "nb_passants", label: "Élèves reconduits", placeholder: "effectif actuel" },
      { name: "nb_nouveaux", label: "Nouveaux entrants", placeholder: "30" },
    ],
  },
  {
    value: "recouvrement",
    label: "Amélioration du recouvrement",
    params: [{ name: "pts", label: "Points gagnés (%)", placeholder: "10" }],
  },
];

export const TARGET_TYPES: { value: string; label: string; unite: string }[] = [
  { value: "recouvrement", label: "Taux de recouvrement", unite: "%" },
  { value: "effectif", label: "Effectif", unite: "élèves" },
  { value: "reussite", label: "Taux de réussite", unite: "%" },
];

export const ALERT_TYPES: { value: string; label: string }[] = [
  { value: "recouvrement", label: "Recouvrement (%)" },
  { value: "effectif", label: "Effectif (élèves)" },
  { value: "reussite", label: "Réussite (%)" },
  { value: "abandons", label: "Sorties (abandons validés)" },
  { value: "encaisse", label: "Encaissements (FCFA)" },
];

export const fmtMontant = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
