"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
}

interface CreateResult {
  id: number;
  email: string;
  password: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreateResult | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => api.get<AdminUser[]>("/platform/users"),
  });

  const createUser = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; message: string; data: CreateResult }>("/platform/users", form),
    onSuccess: (res) => {
      setCreated(res.data);
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
      setError("");
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur lors de la création"),
  });

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Super admins</h2>
        <p className="text-sm text-muted-foreground">
          Comptes administrateurs de la plateforme
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-5">Chargement…</p>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3">Compte</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Dernière connexion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium">
                            {`${u.first_name} ${u.last_name}`.trim() || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{u.phone || "—"}</td>
                        <td className="px-5 py-3">
                          <Badge variant={u.is_active ? "success" : "destructive"}>
                            {u.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {fmtDate(u.last_login)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-5">Aucun super administrateur.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Créer un super admin</h3>
              {error && (
                <p className="text-sm text-rose bg-rose/10 rounded px-3 py-2 border-2 border-rose mb-4">
                  {error}
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone (optionnel)</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!form.first_name || !form.email || createUser.isPending}
                  onClick={() => createUser.mutate()}
                >
                  {createUser.isPending ? "Création…" : "Créer le compte"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {created && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Compte créé</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Mot de passe généré — communiquez-le au nouvel admin :
                </p>
                <p className="text-sm font-mono bg-muted rounded-lg px-3 py-2 break-all">
                  {created.email} · {created.password}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
