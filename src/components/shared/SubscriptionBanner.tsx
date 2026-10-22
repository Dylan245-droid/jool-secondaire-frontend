"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessionUser } from "@/lib/roles";
import { AlertTriangle, Lock } from "lucide-react";

interface SubscriptionStatus {
  read_only: boolean;
  grace_end: string | null;
  message: string;
  plan_name: string | null;
  plan_is_free: boolean;
  status: string | null;
  trial_days_left: number | null;
  trial_end_date: string | null;
  trial_expired: boolean;
}

function whatsappUrl(message: string) {
  return "https://wa.me/24166659851?text=" + encodeURIComponent(message);
}

export function SubscriptionBanner() {
  const user = useSessionUser();
  const structure = user?.structureName ?? "";
  const { data } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: () => api.get<SubscriptionStatus>("/secondaire/subscription-status"),
    refetchInterval: 60_000,
    retry: false,
  });

  if (!data) return null;

  if (data.read_only) {
    const message = `Bonjour Jool Secondaire ! Je souhaite renouveler l'abonnement de mon établissement${structure ? ` (${structure})` : ""}.`;
    return (
      <div className="px-4 py-3 border-b border-rose/30 bg-rose/10 text-rose">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 shrink-0" /> Établissement en lecture seule
        </p>
        <p className="text-[11px] text-rose/90 mt-1 leading-snug">
          Abonnement arrivé à échéance — renouvelez pour modifier, inscrire et
          encaisser.
        </p>
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener"
          className="mt-2 inline-block rounded-md bg-rose px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90"
        >
          Renouveler
        </a>
      </div>
    );
  }

  if (data.grace_end) {
    const message = `Bonjour Jool Secondaire ! Je souhaite renouveler l'abonnement de mon établissement${structure ? ` (${structure})` : ""}.`;
    return (
      <div className="px-4 py-3 border-b border-amber-300 bg-amber-50 text-amber-700">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Période de grâce
        </p>
        <p className="text-[11px] mt-1 leading-snug">
          Abonnement terminé — accès en lecture seule à partir du{" "}
          {new Date(data.grace_end).toLocaleDateString("fr-FR")}. Renouvelez
          pour continuer.
        </p>
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener"
          className="mt-2 inline-block rounded-md bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90"
        >
          Renouveler
        </a>
      </div>
    );
  }

  if (data.trial_days_left != null && !data.plan_is_free) {
    return (
      <TrialBanner
        jours={data.trial_days_left}
        fin={data.trial_end_date}
        plan={data.plan_name}
        structure={structure}
      />
    );
  }

  // Compatibilité : anciens backends qui ne renvoient pas encore trial_days_left
  // mais dont le message contient déjà l'info d'essai.
  if (/essai gratuit/i.test(data.message) && !data.plan_is_free) {
    return (
      <TrialBanner
        jours={null}
        fin={null}
        plan={data.plan_name}
        structure={structure}
        message={data.message}
      />
    );
  }

  return null;
}

function TrialBanner({
  jours,
  fin,
  plan,
  structure,
  message,
}: {
  jours: number | null;
  fin: string | null;
  plan: string | null;
  structure: string;
  message?: string;
}) {
  const planLine = plan ? ` du plan ${plan}` : "";
  const whatsappUrl =
    "https://wa.me/24166659851?text=" +
    encodeURIComponent(
      `Bonjour Jool Secondaire ! Je souhaite finaliser l'abonnement${plan ? ` ${plan}` : ""} de mon établissement${structure ? ` (${structure})` : ""}.`
    );
  return (
    <div className="px-4 py-3 border-b border-violet-200 bg-violet-50 text-violet-800">
      <p className="text-xs font-semibold">
        {jours != null
          ? `Essai gratuit${planLine} — ${jours} jour${jours > 1 ? "s" : ""} restant${jours > 1 ? "s" : ""}`
          : `Essai gratuit${planLine} en cours`}
      </p>
      <p className="text-[11px] mt-1 leading-snug">
        {fin
          ? `Votre essai se termine le ${new Date(fin).toLocaleDateString("fr-FR")}. `
          : message
            ? `${message} `
            : ""}
        Finalisez votre abonnement pour continuer après l&apos;essai — vos
        données sont conservées.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener"
        className="mt-2 inline-block rounded-md bg-violet-700 px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90"
      >
        Finaliser l&apos;abonnement
      </a>
    </div>
  );
}
