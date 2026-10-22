import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Affiche une date au format jour/mois/année (ex. 09/08/2026).
 * Accepte une date ISO ("2026-08-09"), un timestamp ou un objet Date.
 * Retourne "—" si la valeur est absente ou invalide.
 */
export function fmtDate(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === "") return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR")
}
