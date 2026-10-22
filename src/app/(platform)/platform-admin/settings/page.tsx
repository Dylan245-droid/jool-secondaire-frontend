"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface PlatformSettings {
  platform_name: string;
  platform_email: string;
  default_currency: string;
  vat_rate: number;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => api.get<PlatformSettings>("/platform/settings"),
  });

  const [form, setForm] = useState({ platform_name: "", platform_email: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (settings) {
      setForm({
        platform_name: settings.platform_name ?? "",
        platform_email: settings.platform_email ?? "",
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; message: string }>("/platform/settings", form),
    onSuccess: () => {
      setSuccess("Paramètres enregistrés.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement"),
  });

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Paramètres plateforme</h2>
        <p className="text-sm text-muted-foreground">
          Nom et email de contact utilisés sur la plateforme
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-rose bg-rose/10 rounded px-3 py-2 border-2 border-rose">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-green-700 bg-green-100 rounded px-3 py-2 border-2 border-green-300">
                  {success}
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la plateforme</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.platform_name}
                  onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email de contact</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  type="email"
                  value={form.platform_email}
                  onChange={(e) => setForm({ ...form, platform_email: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                <span>Devise : <strong>{settings?.default_currency}</strong></span>
                <span>TVA : <strong>{(settings?.vat_rate ?? 0) * 100}%</strong></span>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
