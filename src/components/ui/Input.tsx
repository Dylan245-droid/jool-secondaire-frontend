import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  brutal?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, brutal = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        brutal && "jool-input h-auto rounded-none shadow-none focus-visible:ring-0",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
