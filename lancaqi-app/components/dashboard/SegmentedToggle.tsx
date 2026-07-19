"use client";

import { cn } from "@/lib/utils";

/**
 * Controle segmentado (2+ opções mutuamente exclusivas) para os recortes de
 * período do dashboard do analista. Fica no canto superior direito dos cards
 * (slot `CardAction`). Puro/controlado: o pai guarda o estado selecionado.
 */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (valor: T) => void;
  options: { value: T; label: string }[];
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
    >
      {options.map((opt) => {
        const ativo = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[min(var(--radius-md),10px)] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              ativo
                ? "bg-secondary text-secondary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
