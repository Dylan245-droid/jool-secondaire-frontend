"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, Circle, PartyPopper } from "lucide-react";

interface Step {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

interface PremiersPasData {
  total: number;
  done: number;
  complete: boolean;
  steps: Step[];
}

export function PremiersPasWidget() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["premiers-pas"],
    queryFn: () => api.get<PremiersPasData>("/secondaire/stats/premiers-pas"),
    staleTime: 60_000,
  });

  if (!data || data.complete) return null;

  const progress = Math.round((data.done / data.total) * 100);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <PartyPopper className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
          Préparation de la rentrée
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {data.done}/{data.total} étapes
        </span>
        <span className="hidden sm:block flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[200px]">
          <span
            className="block h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-primary/20 px-2 py-2 space-y-1">
          {data.steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-primary/10",
                step.done && "opacity-70"
              )}
            >
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "font-medium block",
                    step.done ? "text-muted-foreground line-through" : "text-gray-900"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground block">{step.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
