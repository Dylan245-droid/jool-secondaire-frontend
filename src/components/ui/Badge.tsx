import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-light text-primary-dark",
        violet: "bg-primary text-white",
        secondary: "bg-muted text-muted-foreground",
        success: "bg-emerald-100 text-emerald-800",
        turquoise: "bg-turquoise/15 text-teal-800",
        warning: "bg-amber-100 text-amber-800",
        destructive: "bg-rose/10 text-rose",
        outline: "border border-border text-muted-foreground",
        brutal: "jool-badge",
        "brutal-violet": "jool-badge jool-badge-violet",
        "brutal-rose": "jool-badge jool-badge-rose",
        "brutal-turquoise": "jool-badge jool-badge-turquoise",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
