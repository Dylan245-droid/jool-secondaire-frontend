"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  BadgeCheck, FileBadge, GraduationCap, Loader2, ShieldX,
} from "lucide-react";

interface Verification {
  valide: boolean;
  annulee?: boolean;
  message?: string;
  numero?: string;
  type?: string;
  type_label?: string;
  date_emission?: string;
  structure?: string;
  annee_scolaire?: string;
  eleve?: string;
  matricule?: string;
  classe?: string;
  niveau?: string;
  contenu?: Record<string, unknown>;
  verifications?: number;
}

function VerifierAttestation() {
  const params = useParams<{ code: string }>();
  const [etat, setEtat] = useState<"en_cours" | "erreur" | "ok">("en_cours");
  const [data, setData] = useState<Verification | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!params?.code) {
      setEtat("erreur");
      setMessage("Code de vérification manquant.");
      return;
    }
    api
      .get<Verification>(`/public/attestations/verifier/${params.code}`)
      .then((d) => {
        setData(d);
        setEtat("ok");
      })
      .catch((err) => {
        setEtat("erreur");
        setMessage(
          err instanceof Error && err.message
            ? err.message
            : "Attestation introuvable ou code invalide."
        );
      });
  }, [params?.code]);

  if (etat === "en_cours") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Vérification en cours…
        </div>
      </main>
    );
  }

  if (etat === "erreur") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldX className="w-10 h-10 mx-auto text-rose" />
            <h1 className="mt-4 text-lg font-bold">Attestation introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Link href="/" className="inline-block mt-6">
              <Button variant="outline">Retour à l&apos;accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const annulee = data?.annulee;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className={annulee ? "" : "border-b border-card-border"}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileBadge className="w-5 h-5" /> Vérification d&apos;attestation
            </CardTitle>
            {annulee ? (
              <Badge variant="destructive">
                <ShieldX className="w-3 h-3" /> Annulée
              </Badge>
            ) : (
              <Badge variant="success">
                <BadgeCheck className="w-3 h-3" /> Authentique
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {annulee ? (
            <p className="text-sm text-muted-foreground">{data?.message}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Établissement</p>
                  <p className="font-semibold">{data?.structure}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Année scolaire</p>
                  <p className="font-semibold">{data?.annee_scolaire}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Document</p>
                  <p className="font-semibold">
                    {data?.numero} — {data?.type_label}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Émis le</p>
                  <p className="font-semibold">
                    {data?.date_emission
                      ? new Date(data.date_emission).toLocaleDateString("fr-FR")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="border border-card-border rounded-lg p-4 bg-white">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  {data?.eleve}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({data?.matricule})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.classe} — {data?.niveau}
                </p>
                {data?.contenu && Object.keys(data.contenu).length > 0 && (
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(data.contenu)
                      .filter(([k]) => !["nom", "prenom", "matricule", "classe", "niveau", "annee_scolaire"].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 py-0.5">
                          <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                          <dd className="font-medium text-right">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Document vérifié {data?.verifications} fois via son code secret
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerificationAttestationPage() {
  return (
    <Suspense>
      <VerifierAttestation />
    </Suspense>
  );
}
