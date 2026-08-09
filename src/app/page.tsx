"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface PricingDetail {
  price: number;
  original: number;
  savings: number;
}

interface PlanPricing {
  mensuel: PricingDetail;
  trimestriel: PricingDetail;
  semestriel: PricingDetail;
  annuel: PricingDetail;
  vie?: PricingDetail;
}

interface SaaSPlan {
  id: number;
  name: string;
  description: string;
  is_recommended: boolean;
  is_free: boolean;
  max_students: number | null;
  max_staff: number | null;
  overage_per_student_monthly: number;
  features: string[];
  pricing: PlanPricing;
}

const DEFAULT_PLANS: SaaSPlan[] = [
  {
    id: 1,
    name: "Découverte",
    description: "Gratuit pour toujours. Tout le secondaire, jusqu'à 150 élèves.",
    is_recommended: false,
    is_free: true,
    max_students: 150,
    max_staff: 15,
    overage_per_student_monthly: 0,
    features: [
      "Scolarité & inscriptions", "Notes & bulletins T1/T2/T3",
      "Examens officiels (Brevet & Bac)", "Orientation 3ème/Tle",
      "Vie scolaire", "Portails Parents & élèves", "Finances & paie",
      "Assistance WhatsApp — réponse sous 72 h",
    ],
    pricing: {
      mensuel: { price: 0, original: 0, savings: 0 },
      trimestriel: { price: 0, original: 0, savings: 0 },
      semestriel: { price: 0, original: 0, savings: 0 },
      annuel: { price: 0, original: 0, savings: 0 },
    },
  },
  {
    id: 2,
    name: "Essentiel",
    description: "Collège ou lycée jusqu'à 400 élèves — prêt pour la croissance.",
    is_recommended: false,
    is_free: false,
    max_students: 400,
    max_staff: 25,
    overage_per_student_monthly: 150,
    features: [
      "Scolarité & inscriptions", "Notes & bulletins T1/T2/T3",
      "Examens officiels (Brevet & Bac)", "Orientation 3ème/Tle",
      "Vie scolaire", "Portails Parents & élèves", "Finances & paie",
      "Assistance WhatsApp & téléphone — réponse sous 48 h",
    ],
    pricing: {
      mensuel: { price: 35000, original: 35000, savings: 0 },
      trimestriel: { price: 105000, original: 105000, savings: 0 },
      semestriel: { price: 199500, original: 210000, savings: 10500 },
      annuel: { price: 350000, original: 420000, savings: 70000 },
    },
  },
  {
    id: 3,
    name: "Standard",
    description: "Jusqu'à 800 élèves — le plan le plus choisi par les directeurs.",
    is_recommended: true,
    is_free: false,
    max_students: 800,
    max_staff: 50,
    overage_per_student_monthly: 150,
    features: [
      "Scolarité & inscriptions", "Notes & bulletins T1/T2/T3",
      "Examens officiels (Brevet & Bac)", "Orientation 3ème/Tle",
      "Vie scolaire", "Portails Parents & élèves", "Finances & paie",
      "Assistance prioritaire WhatsApp & téléphone — réponse sous 24 h",
    ],
    pricing: {
      mensuel: { price: 70000, original: 70000, savings: 0 },
      trimestriel: { price: 210000, original: 210000, savings: 0 },
      semestriel: { price: 399000, original: 420000, savings: 21000 },
      annuel: { price: 700000, original: 840000, savings: 140000 },
    },
  },
  {
    id: 4,
    name: "Groupe",
    description: "801+ élèves ou multi-sites : groupes scolaires et réseaux.",
    is_recommended: false,
    is_free: false,
    max_students: null,
    max_staff: null,
    overage_per_student_monthly: 0,
    features: [
      "Scolarité & inscriptions", "Notes & bulletins T1/T2/T3",
      "Examens officiels (Brevet & Bac)", "Orientation 3ème/Tle",
      "Vie scolaire", "Portails Parents & élèves", "Finances & paie",
      "Interlocuteur dédié + formation sur site — réponse sous 24 h",
    ],
    pricing: {
      mensuel: { price: 150000, original: 150000, savings: 0 },
      trimestriel: { price: 450000, original: 450000, savings: 0 },
      semestriel: { price: 855000, original: 900000, savings: 45000 },
      annuel: { price: 1500000, original: 1800000, savings: 300000 },
    },
  },
];

const fmt = (n: number) => n.toLocaleString("fr-FR");

const MARQUEE_TEXT =
  "Bulletins T1/T2/T3 ✦ Brevet ✦ Bac ✦ Vie scolaire ✦ Paiements ✦ Portails parents & élèves ✦ Orientation 3ème & Tle ✦ Conseils de classe ✦ ";

const BILLING_PERIODS: { key: "mensuel" | "trimestriel" | "semestriel" | "annuel"; label: string; hint: string }[] = [
  { key: "mensuel", label: "Mensuel", hint: "" },
  { key: "trimestriel", label: "Trimestriel", hint: "" },
  { key: "semestriel", label: "Semestriel", hint: "-5%" },
  { key: "annuel", label: "Annuel", hint: "2 mois offerts" },
];

const PAINS = [
  ["Des inscriptions à la main, des dossiers éparpillés", "Inscriptions et dossiers numérisés, répartition par classe en 1 clic"],
  ["Des semaines de saisie pour les bulletins", "Bulletins T1/T2/T3 générés et prêts le soir du conseil de classe"],
  ["Des parents qui contestent les paiements", "Chaque parent voit le solde exact de son enfant, en temps réel"],
  ["Le taux de réussite au Brevet/Bac suivi à l'aveugle", "Résultats et rangs suivis en direct, classe par classe"],
] as const;

const FEATURES = [
  {
    code: "01",
    title: "Scolarité & inscriptions",
    desc: "Fini les dossiers papier : inscriptions, réinscriptions et répartition par classe, de la 6ème à la Terminale, en quelques clics.",
  },
  {
    code: "02",
    title: "Notes & bulletins",
    desc: "Vos bulletins T1/T2/T3 avec mentions, générés en PDF et prêts à signer — sans nuits blanches de saisie.",
  },
  {
    code: "03",
    title: "Examens officiels",
    desc: "Brevet et Bac : jury, PV de conseil, orientation 3ème/Tle. Votre taux de réussite, suivi en direct.",
  },
  {
    code: "04",
    title: "Vie scolaire",
    desc: "Chaque absence notifiée au parent le jour même. Fini les mots d'excuse perdus et les conseils de discipline à contretemps.",
  },
  {
    code: "05",
    title: "Portails parents & élèves",
    desc: "Bulletins vérifiables par QR code, cahier de textes, absences et paiements : vos parents voient tout, vous n'entendez plus les réclamations.",
  },
  {
    code: "06",
    title: "Finances & paie",
    desc: "Frais de scolarité, encaissements, échéances et reçus. La caisse sous contrôle, et les retards de paiement visibles avant qu'ils ne durent.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Avec Jool, mes bulletins sont prêts le soir du conseil de classe au lieu de trois semaines après. J'ai récupéré un mois de travail par an.",
    role: "Proviseur — Collège & Lycée, Libreville",
  },
  {
    quote:
      "Mes parents paient plus vite : ils voient le solde de leur enfant à tout moment. Les réclamations sur les reçus ont disparu.",
    role: "Directrice — Collège, Port-Gentil",
  },
  {
    quote:
      "L'équipe a importé toutes nos données et formé le secrétariat en deux jours. La rentrée s'est passée sans une seule liste refaite à la main.",
    role: "Économe — Groupe scolaire, Franceville",
  },
];

const FAQ = [
  {
    q: "Puis-je essayer avant de m'engager ?",
    a: "Oui. Pour les plans Essentiel, Standard et Groupe : 14 jours d'essai gratuit, sans carte bancaire, avec vos vraies données importées et un accompagnement téléphonique. Si vous n'êtes pas convaincu, on supprime tout — vous ne perdez rien. Et si votre établissement compte moins de 150 élèves, pas besoin d'essai : le plan Découverte est gratuit pour toujours.",
  },
  {
    q: "Le plan Découverte est-il vraiment gratuit ?",
    a: "Oui, gratuit pour toujours, sans carte bancaire : jusqu'à 150 élèves et 15 personnels, avec l'ensemble des modules du secondaire — inscriptions, bulletins T1/T2/T3, Brevet & Bac, vie scolaire, portails parents, finances. Quand vous dépassez 150 élèves, vous passez au plan Essentiel, et tout est conservé.",
  },
  {
    q: "Et si mes enseignants refusent de s'en servir ?",
    a: "La formation est incluse : le secrétariat est opérationnel en 1 à 2 heures, les enseignants peuvent importer leurs notes Excel en un clic. Le portail est volontairement simple — moins de clics qu'un logiciel de notes classique.",
  },
  {
    q: "Et si j'ai un problème, à qui je m'adresse ?",
    a: "À une vraie personne, pas à un robot : chaque établissement a un numéro WhatsApp et un téléphone, dès le plan gratuit. L'installation et l'import de vos données se font avec vous, et la formation est incluse. Temps de réponse : 72 h sur Découverte, 48 h sur Essentiel, 24 h sur Standard et Groupe — et pendant les examens, vous passez avant tout le monde. Vous n'êtes jamais seul.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Oui. Vos données restent les vôtres, sont sauvegardées quotidiennement et restent accessibles et exportables à tout moment, même si vous arrêtez l'abonnement.",
  },
  {
    q: "Quel plan choisir pour mon établissement ?",
    a: "Moins de 150 élèves : Découverte, gratuit pour toujours. Jusqu'à 400 élèves : Essentiel. Jusqu'à 800 élèves : Standard, le choix des directeurs. Au-delà, ou pour un groupe multi-sites : Groupe. Tous les plans couvrent le collège et le lycée — séries, Brevet et Bac compris.",
  },
  {
    q: "Que se passe-t-il si je dépasse mon effectif en pleine année ?",
    a: "Rien ne se bloque du jour au lendemain : vous disposez d'une tolérance jusqu'à la fin du trimestre en cours pour inscrire, puis les nouvelles inscriptions sont suspendues tant que vous n'êtes pas passé au plan supérieur. Vos données, notes et bulletins restent accessibles, et rien de saisi ne disparaît.",
  },
  {
    q: "Changer de plan est-il compliqué ?",
    a: "Non. Quand vous approchez de la limite d'élèves de votre plan (80 %), nous vous le signalons et il suffit de nous écrire pour passer au plan supérieur : vos élèves, notes et bulletins sont conservés, sans ressaisie. Vous pouvez aussi monter ou descendre de plan en cours d'année.",
  },
];

function daysUntilRentree(): number {
  const now = new Date();
  const rentree = new Date(now.getFullYear(), 8, 15);
  if (rentree.getTime() < now.getTime()) return 0;
  return Math.max(0, Math.ceil((rentree.getTime() - now.getTime()) / 86400000));
}

export default function LandingPage() {
  const [plans, setPlans] = useState<SaaSPlan[]>(DEFAULT_PLANS);
  const [period, setPeriod] = useState<"mensuel" | "trimestriel" | "semestriel" | "annuel">("mensuel");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [daysLeft] = useState(daysUntilRentree);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/saas/plans`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPlans(data);
      })
      .catch((err) => console.error("Plans indisponibles, fallback statique :", err));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header
        className={`sticky top-0 z-50 bg-background/90 backdrop-blur border-b-4 border-black transition-all duration-200 ${scrolled ? "shadow-lg" : ""}`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 bg-primary rounded-lg border-[3px] border-black grid place-items-center text-white font-bold">J</span>
            <span className="text-lg font-extrabold uppercase tracking-tight">Jool Secondaire</span>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
            <a href="#fonctionnalites" className="hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-primary transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden sm:inline text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              Connexion
            </Link>
            <a href="#tarifs" className="jool-btn">Essai gratuit</a>
          </div>
        </div>
      </header>

      {/* ─── Bandeau urgence rentrée ─── */}
      {daysLeft > 0 && (
        <div className="bg-noir text-white">
          <p className="max-w-6xl mx-auto px-6 py-1.5 text-center text-xs md:text-sm font-semibold">
            Rentrée 2026-2027 dans {daysLeft} jour{daysLeft > 1 ? "s" : ""} — installation et import des données offerts avant le 15 septembre.
          </p>
        </div>
      )}

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24 text-center">
        <span className="jool-badge jool-badge-turquoise jool-anim-fade-up">
          <span className="w-2 h-2 rounded-full bg-noir inline-block animate-pulse" />
          ERP Collèges &amp; Lycées · Gabon
        </span>
        <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight jool-anim-fade-up jool-anim-delay-1">
          La rentrée sous contrôle.
          <br />
          <span className="text-primary">Le Brevet &amp; le Bac en tête.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground jool-anim-fade-up jool-anim-delay-2">
          Inscriptions, bulletins, examens, paiements — de la 6ème au Bac. Essayez 14 jours, gratuitement.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4 jool-anim-fade-up jool-anim-delay-3">
          <a href="#tarifs" className="jool-btn text-base px-8 py-4">Démarrer l&apos;essai gratuit</a>
          <a href="#pourquoi" className="jool-btn jool-btn-secondary text-base px-8 py-4">Voir ce que ça change</a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground jool-anim-fade-up jool-anim-delay-3">
          Sans carte bancaire · Import de vos données offert
        </p>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left jool-anim-fade-up jool-anim-delay-4">
          {[
            ["Aligné officiel", "Calendrier & textes gabonais"],
            ["Bulletins", "T1 / T2 / T3 en PDF"],
            ["Brevet & Bac", "PV, jury, orientation"],
            ["Portails", "Parents & élèves"],
          ].map(([k, v]) => (
            <div key={k} className="jool-brutal-card p-5 hover:-translate-y-1 transition-transform duration-200">
              <p className="text-sm font-bold uppercase tracking-tight">{k}</p>
              <p className="text-xs text-muted-foreground mt-1">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bandeau défilant ─── */}
      <div className="bg-noir text-white border-y-4 border-black overflow-hidden py-3 select-none">
        <div className="jool-marquee-track text-sm font-bold uppercase tracking-widest">
          <span className="px-2">
            {MARQUEE_TEXT}
          </span>
          <span className="px-2" aria-hidden="true">
            {MARQUEE_TEXT}
          </span>
        </div>
      </div>

      {/* ─── Pourquoi (douleur → solution) ─── */}
      <section id="pourquoi" className="bg-muted py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="jool-badge jool-badge-rose">{"// Pourquoi Jool"}</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
              Votre année scolaire, avant / après.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PAINS.map(([avant, apres], i) => (
              <div key={i} className="jool-brutal-card p-5">
                <p className="text-sm text-muted-foreground line-through decoration-rose decoration-2">
                  {avant}
                </p>
                <p className="mt-2 font-semibold text-turquoise">→ {apres}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Fonctionnalités ─── */}
      <section id="fonctionnalites" className="bg-noir text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="jool-badge jool-badge-turquoise">{"// Fonctionnalités"}</span>
              <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
                Pensé pour le secondaire.
              </h2>
            </div>
            <p className="hidden md:block max-w-sm text-sm text-white/60">
              Chaque module suit le calendrier scolaire gabonais, du conseil de classe au conseil de discipline.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.code}
                className="border-4 border-white/20 p-6 hover:border-turquoise hover:bg-white/5 transition-colors"
              >
                <span className="jool-mono text-turquoise font-bold">{f.code}</span>
                <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Témoignages ─── */}
      <section id="temoignages" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="jool-badge jool-badge-violet">{"// Ils nous font confiance"}</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
              Ce que les directeurs en disent.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="jool-brutal-card p-6 flex flex-col">
                <p className="text-3xl leading-none text-primary font-bold">«</p>
                <p className="mt-2 text-sm flex-1">{t.quote}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-tight text-muted-foreground">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tarifs ─── */}
      <section id="tarifs" className="bg-muted py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="jool-badge jool-badge-rose">{"// Tarification"}</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
              Moins cher qu&apos;une demi-secrétaire.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
              Tous les plans couvrent le collège et le lycée — séries, Brevet et Bac compris.
              Jusqu&apos;à 150 élèves, c&apos;est gratuit pour toujours.
            </p>
          </div>

          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {BILLING_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`jool-btn text-sm ${period === p.key ? "" : "jool-btn-secondary"}`}
              >
                {p.label}
                {p.hint && (
                  <span className={`ml-2 text-xs font-bold ${period === p.key ? "text-white" : "text-noir"}`}>
                    {p.hint}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const pricing = plan.pricing[period];
              if (!pricing) return null;
              const perStudent =
                !plan.is_free && period === "mensuel" && plan.max_students
                  ? Math.round(plan.pricing.mensuel.price / plan.max_students)
                  : null;
              return (
                <div
                  key={plan.id}
                  className={`jool-brutal-card p-5 flex flex-col hover:-translate-y-1 transition-transform duration-200 ${plan.is_recommended ? "border-[3px] border-rose" : ""}`}
                >
                  {plan.is_recommended && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 jool-badge jool-badge-rose whitespace-nowrap text-center">
                      Le plus choisi
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="jool-badge">{plan.name}</span>
                    {plan.is_free && <span className="jool-badge jool-badge-turquoise">Gratuit</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                  <div className="mt-4 pt-3 border-t-2 border-black/10 jool-mono text-sm space-y-1">
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Élèves</span>
                      <span className="font-bold">{plan.max_students ? `Jusqu'à ${plan.max_students}` : "Illimité"}</span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Personnel</span>
                      <span className="font-bold">{plan.max_staff ? `Jusqu'à ${plan.max_staff}` : "Illimité"}</span>
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs jool-mono uppercase tracking-wide mb-1">
                      {period === "mensuel" ? "Par mois" : period === "trimestriel" ? "Pour 3 mois" : period === "semestriel" ? "Pour 6 mois" : "Pour 12 mois"}
                    </p>
                    <div className="flex items-baseline gap-2">
                      {plan.is_free ? (
                        <p className="text-3xl font-extrabold tracking-tight">Gratuit</p>
                      ) : (
                        <>
                          <p className="text-3xl font-extrabold tracking-tight">{fmt(pricing.price)}</p>
                          <p className="text-sm font-normal text-muted-foreground">FCFA</p>
                        </>
                      )}
                    </div>
                    {!plan.is_free && pricing.savings > 0 && (
                      <p className="text-sm font-semibold text-turquoise mt-1">
                        {fmt(pricing.savings)} FCFA d&apos;économie
                      </p>
                    )}
                    {plan.is_free && (
                      <p className="text-sm font-semibold text-turquoise mt-1">Sans carte, sans engagement</p>
                    )}
                    {!plan.is_free && perStudent ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ {fmt(perStudent)} FCFA / élève / mois
                      </p>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-1.5 text-sm flex-1">
                    {plan.features.map((feature, fidx) => {
                      const isSupport = fidx === plan.features.length - 1;
                      return (
                        <li
                          key={fidx}
                          className={`flex items-start gap-2 ${isSupport ? "pt-2 mt-1 border-t-2 border-black/10 font-semibold" : ""}`}
                        >
                          <span className={`${isSupport ? "text-primary" : "text-turquoise"} font-bold`}>✓</span> {feature}
                        </li>
                      );
                    })}
                  </ul>

                  <a
                    href={`https://wa.me/24166659851?text=${encodeURIComponent(
                      plan.is_free
                        ? `Bonjour Jool Secondaire ! Je souhaite créer mon établissement avec le plan ${plan.name} (gratuit). Comment procéder ?`
                        : `Bonjour Jool Secondaire ! Je suis intéressé par le plan ${plan.name}. Comment démarrer l'essai gratuit de 14 jours ?`
                    )}`}
                    target="_blank"
                    rel="noopener"
                    className={`jool-btn mt-5 w-full ${plan.is_recommended ? "jool-btn-rose" : ""}`}
                  >
                    {plan.is_free ? "Créer mon établissement" : "Essai gratuit 14 jours"}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="mt-10 jool-brutal-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-semibold text-center md:text-left">
              14 jours d&apos;essai gratuit, sans carte bancaire. <br className="hidden md:block" />
              <span className="text-sm font-normal text-muted-foreground">
                Vos données importées et votre équipe formée pendant l&apos;essai. Assistance WhatsApp pour tous les plans,
                dès le plan gratuit — vous n&apos;êtes jamais seul.
              </span>
            </p>
            <a href="#contact" className="jool-btn shrink-0">Demander une démo</a>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="jool-badge jool-badge-turquoise">{"// FAQ"}</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Vos questions, nos réponses.</h2>
            <p className="mt-3 text-muted-foreground">
              Et si la vôtre n&apos;y est pas : <a href="https://wa.me/24166659851" target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-primary">écrivez-nous sur WhatsApp</a> (+241 66 65 98 51), réponse sous 24h.
            </p>
          </div>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div key={i} className="jool-brutal-card">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left font-semibold"
                >
                  {item.q}
                  <span className="jool-mono text-lg">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact / CTA final ─── */}
      <section id="contact" className="bg-noir text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {daysLeft > 0
              ? `La rentrée est dans ${daysLeft} jours. Elle n'attendra pas.`
              : "Chaque semaine de saisie manuelle vous coûte cher."}
          </h2>
          <p className="mt-4 text-white/70">
            Installation et import des données offerts · Formation de votre équipe incluse · Essai gratuit 14 jours.
            Un seul entretien de 30 minutes suffit pour décider.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="https://wa.me/24166659851" target="_blank" rel="noopener" className="jool-btn text-base px-8 py-4">Réserver mon créneau de démo</a>
            <Link href="/login" className="jool-btn jool-btn-secondary text-base px-8 py-4">Accéder à la plateforme</Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t-4 border-black bg-noir text-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-primary rounded-md border-2 border-white grid place-items-center text-white font-bold text-xs">J</span>
            <span className="font-bold tracking-tight">Jool Secondaire</span>
          </div>
          <p className="text-xs text-white/50 text-center">
            Essai gratuit 14 jours · Import des données offert
          </p>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Jool · ERP Collèges & Lycées — Gabon
          </p>
        </div>
      </footer>
    </div>
  );
}
