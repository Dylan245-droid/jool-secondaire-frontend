"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface Invoice {
  id: number;
  code: string;
  status: string;
  total_amount: number;
  date_issued: string;
  due_date: string | null;
  structure_name: string;
  structure_short_name: string | null;
  plan_name: string;
  payment_method: string | null;
  payment_date: string | null;
  payment_reference: string | null;
}

interface JournalEntry {
  code: string;
  label: string;
  date: string;
  invoice_code: string | null;
  lines: Array<{ account_code: string; account_name: string; debit: number; credit: number; label: string }>;
}

interface LedgerAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface TrialBalance {
  accounts: Array<{ account_code: string; account_name: string; debit: number; credit: number }>;
  total_debit: number;
  total_credit: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  CHEQUE: "Chèque",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} FCFA`;

type Tab = "factures" | "journal" | "grand-livre" | "balance";

export default function ComptabilitePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("factures");

  const { data: invoices } = useQuery({
    queryKey: ["platform-invoices"],
    queryFn: () => api.get<Invoice[]>("/platform/invoices"),
  });
  const { data: journal } = useQuery({
    queryKey: ["platform-journal"],
    queryFn: () => api.get<JournalEntry[]>("/platform/accounting/journal"),
    enabled: tab === "journal",
  });
  const { data: ledger } = useQuery({
    queryKey: ["platform-ledger"],
    queryFn: () => api.get<LedgerAccount[]>("/platform/accounting/general-ledger"),
    enabled: tab === "grand-livre",
  });
  const { data: balance } = useQuery({
    queryKey: ["platform-balance"],
    queryFn: () => api.get<TrialBalance>("/platform/accounting/trial-balance"),
    enabled: tab === "balance",
  });

  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [payError, setPayError] = useState("");

  const markPaid = useMutation({
    mutationFn: (inv: Invoice) =>
      api.post(`/platform/invoices/${inv.id}/mark-paid`, {
        payment_method: method,
        reference,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      setPaying(null);
      setReference("");
    },
    onError: (e) => setPayError(e instanceof ApiError ? e.message : "Erreur"),
  });

  const download = (invoiceId: number, kind: "invoice" | "receipt") => {
    window.open(`${API_BASE}/platform/invoices/${invoiceId}/${kind === "invoice" ? "download" : "receipt"}`, "_blank");
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "factures", label: "Factures" },
    { key: "journal", label: "Journal" },
    { key: "grand-livre", label: "Grand livre" },
    { key: "balance", label: "Balance" },
  ];

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Comptabilité</h2>
        <p className="text-sm text-muted-foreground">
          Factures, encaissements et écritures SYSCOHADA de la plateforme
        </p>
      </header>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "factures" && (
        <Card>
          <CardContent className="p-0">
            {invoices && invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3">Facture</th>
                      <th className="px-5 py-3">Établissement</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Montant</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Paiement</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium">{inv.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(inv.date_issued).toLocaleDateString("fr-FR")}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {inv.structure_short_name ?? inv.structure_name}
                        </td>
                        <td className="px-5 py-3">{inv.plan_name}</td>
                        <td className="px-5 py-3 font-medium">{fmt(inv.total_amount)}</td>
                        <td className="px-5 py-3">
                          <Badge variant={inv.status === "PAID" ? "success" : "warning"}>
                            {inv.status === "PAID" ? "Payée" : "Impayée"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {inv.payment_method ? (
                            <>
                              {PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}
                              {inv.payment_reference ? ` · ${inv.payment_reference}` : ""}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => download(inv.id, "invoice")}>
                              Facture
                            </Button>
                            {inv.status === "PAID" && (
                              <Button variant="outline" size="sm" onClick={() => download(inv.id, "receipt")}>
                                Reçu
                              </Button>
                            )}
                            {inv.status !== "PAID" && (
                              <Button size="sm" onClick={() => { setPaying(inv); setPayError(""); }}>
                                Encaisser
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-5">Aucune facture.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "journal" && (
        <Card>
          <CardHeader>
            <CardTitle>Journal des écritures</CardTitle>
          </CardHeader>
          <CardContent>
            {journal && journal.length > 0 ? (
              <div className="space-y-4">
                {journal.map((e) => (
                  <div key={e.code} className="border border-card-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{e.label}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{e.code}</Badge>
                        {e.invoice_code && <Badge variant="secondary">{e.invoice_code}</Badge>}
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-1">Compte</th>
                          <th className="text-left py-1">Libellé</th>
                          <th className="text-right py-1">Débit</th>
                          <th className="text-right py-1">Crédit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.lines.map((l, i) => (
                          <tr key={i} className="border-t border-card-border/50">
                            <td className="py-1">{l.account_code} — {l.account_name}</td>
                            <td className="py-1 text-muted-foreground">{l.label}</td>
                            <td className="py-1 text-right">{l.debit ? fmt(l.debit) : "—"}</td>
                            <td className="py-1 text-right">{l.credit ? fmt(l.credit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune écriture.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "grand-livre" && (
        <Card>
          <CardHeader>
            <CardTitle>Grand livre (SYSCOHADA)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledger && ledger.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Compte</th>
                    <th className="px-5 py-3">Intitulé</th>
                    <th className="px-5 py-3 text-right">Débit</th>
                    <th className="px-5 py-3 text-right">Crédit</th>
                    <th className="px-5 py-3 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {ledger.map((a) => (
                    <tr key={a.account_code} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{a.account_code}</td>
                      <td className="px-5 py-3">{a.account_name}</td>
                      <td className="px-5 py-3 text-right">{a.total_debit ? fmt(a.total_debit) : "—"}</td>
                      <td className="px-5 py-3 text-right">{a.total_credit ? fmt(a.total_credit) : "—"}</td>
                      <td className="px-5 py-3 text-right font-medium">{fmt(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground p-5">Aucun compte.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "balance" && (
        <Card>
          <CardHeader>
            <CardTitle>Balance générale</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {balance ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3">Compte</th>
                      <th className="px-5 py-3">Intitulé</th>
                      <th className="px-5 py-3 text-right">Débit</th>
                      <th className="px-5 py-3 text-right">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {balance.accounts.map((a) => (
                      <tr key={a.account_code}>
                        <td className="px-5 py-3 font-medium">{a.account_code}</td>
                        <td className="px-5 py-3">{a.account_name}</td>
                        <td className="px-5 py-3 text-right">{a.debit ? fmt(a.debit) : "—"}</td>
                        <td className="px-5 py-3 text-right">{a.credit ? fmt(a.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-card-border font-bold">
                      <td className="px-5 py-3" colSpan={2}>Totaux</td>
                      <td className="px-5 py-3 text-right">{fmt(balance.total_debit)}</td>
                      <td className="px-5 py-3 text-right">{fmt(balance.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
                {balance.total_debit !== balance.total_credit && (
                  <p className="text-sm text-rose font-medium bg-rose/10 px-5 py-2">
                    ⚠ Balance non équilibrée : {fmt(balance.total_debit)} ≠ {fmt(balance.total_credit)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground p-5">Aucune donnée.</p>
            )}
          </CardContent>
        </Card>
      )}

      {paying && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPaying(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Encaisser la facture</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {paying.code} — {paying.structure_name} · {fmt(paying.total_amount)}
            </p>
            {payError && (
              <p className="text-sm text-rose bg-rose/10 rounded px-3 py-2 border-2 border-rose mt-3">
                {payError}
              </p>
            )}
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mode de paiement</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="CASH">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
                <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setPaying(null)}>Annuler</Button>
              <Button onClick={() => markPaid.mutate(paying)} disabled={markPaid.isPending}>
                {markPaid.isPending ? "Encaissement…" : "Confirmer l'encaissement"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
