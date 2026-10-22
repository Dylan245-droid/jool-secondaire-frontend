"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, Save, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { ROLE_LABELS } from "@/lib/roles";

interface AccountInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  type?: string | null;
  sexe?: string | null;
  birth_day?: string | null;
  birth_place?: string | null;
  phone_number_1?: string | null;
  phone_number_2?: string | null;
  image?: string | null;
  nationality?: string | null;
}

interface MeResponse {
  success: boolean;
  data: {
    account: AccountInfo;
    memberships: Array<{ role: string; structure: { id: number; name: string }; is_active: boolean }>;
  };
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const btnPrimary =
  "rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2";

const initiales = (nom?: string, prenom?: string, email?: string) => {
  if (nom && prenom) return `${nom[0]}${prenom[0]}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
};

export default function ProfilPage() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<AccountInfo> | null>(null);
  const [pwd, setPwd] = useState({ old_password: "", new_password: "", confirmation: "" });

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/auth/me"),
  });

  const sauver = useMutation({
    mutationFn: () =>
      api.patch<MeResponse>("/auth/me", {
        first_name: form?.first_name,
        last_name: form?.last_name,
        phone_number_1: form?.phone_number_1,
        phone_number_2: form?.phone_number_2,
        sexe: form?.sexe,
        birth_day: form?.birth_day,
        birth_place: form?.birth_place,
        nationality: form?.nationality,
      }),
    onSuccess: () => {
      setMsg("Profil mis à jour.");
      setError("");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour");
      setMsg("");
    },
  });

  const changerMdp = useMutation({
    mutationFn: () =>
      api.post("/auth/change-password", {
        old_password: pwd.old_password,
        new_password: pwd.new_password,
      }),
    onSuccess: () => {
      setMsg("Mot de passe modifié.");
      setError("");
      setPwd({ old_password: "", new_password: "", confirmation: "" });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Erreur lors du changement de mot de passe");
      setMsg("");
    },
  });

  const compte = me?.data?.account;
  const membership = me?.data?.memberships.find((m) => m.is_active) ?? me?.data?.memberships[0];
  const current = form ?? compte ?? {};

  if (isLoading || !compte) {
    return (
      <div className="flex h-screen overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </main>
      </div>
    );
  }

  const set = (champ: keyof AccountInfo, valeur: string) =>
    setForm({ ...(form ?? compte), [champ]: valeur || null });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-background">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserRound className="w-6 h-6 text-primary-dark" /> Mon profil
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vos informations personnelles et votre mot de passe — visibles par tous les utilisateurs.
          </p>
        </header>

        {msg && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="bg-card rounded-lg border border-card-border shadow-card p-5 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold shrink-0">
              {initiales(compte.last_name, compte.first_name, compte.email)}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {compte.first_name} {compte.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{compte.email}</p>
              <p className="text-xs text-muted-foreground">
                {membership ? ROLE_LABELS[membership.role] ?? membership.role : ""}
                {membership?.structure?.name ? ` · ${membership.structure.name}` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                value={current.first_name ?? ""}
                onChange={(e) => set("first_name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={current.last_name ?? ""}
                onChange={(e) => set("last_name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone 1
              </label>
              <input
                value={current.phone_number_1 ?? ""}
                onChange={(e) => set("phone_number_1", e.target.value)}
                placeholder="06 00 00 00 01"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone 2
              </label>
              <input
                value={current.phone_number_2 ?? ""}
                onChange={(e) => set("phone_number_2", e.target.value)}
                placeholder="Optionnel"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
              <select
                value={current.sexe ?? ""}
                onChange={(e) => set("sexe", e.target.value)}
                className={inputCls}
              >
                <option value="">— Non précisé —</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={current.birth_day ?? ""}
                onChange={(e) => set("birth_day", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de naissance
              </label>
              <input
                value={current.birth_place ?? ""}
                onChange={(e) => set("birth_place", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationalité
              </label>
              <input
                value={current.nationality ?? ""}
                onChange={(e) => set("nationality", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => sauver.mutate()}
              disabled={sauver.isPending || !form}
              className={btnPrimary}
            >
              <Save className="w-4 h-4" />
              {sauver.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
            {form && (
              <button
                onClick={() => setForm(null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-card-border shadow-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-primary" /> Changer le mot de passe
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={pwd.old_password}
                onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmation
              </label>
              <input
                type="password"
                value={pwd.confirmation}
                onChange={(e) => setPwd({ ...pwd, confirmation: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (pwd.new_password !== pwd.confirmation) {
                setError("Les deux mots de passe ne correspondent pas.");
                return;
              }
              changerMdp.mutate();
            }}
            disabled={
              changerMdp.isPending ||
              !pwd.old_password ||
              !pwd.new_password ||
              pwd.new_password.length < 8
            }
            className={`${btnPrimary} mt-4`}
          >
            <KeyRound className="w-4 h-4" />
            {changerMdp.isPending ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </div>
      </main>
    </div>
  );
}
