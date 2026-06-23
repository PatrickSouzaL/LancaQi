import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Estado vazio elegante (Server Component): ícone suave do Lucide, texto
 * amigável e CTA primário opcional. UI_UX_Guidelines.md §3.2 / Visao_Analista.
 */
export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acaoLabel,
  acaoHref,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  acaoHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icone className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{titulo}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>
      </div>
      {acaoLabel && acaoHref && (
        <Button asChild className="h-11">
          <Link href={acaoHref}>{acaoLabel}</Link>
        </Button>
      )}
    </div>
  );
}
