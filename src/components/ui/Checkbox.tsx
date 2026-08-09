import React, { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        className={cn(
          "h-4 w-4 rounded border-border accent-primary cursor-pointer",
          className
        )}
        {...props}
      />
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}
