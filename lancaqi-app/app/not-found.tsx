import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Página 404 customizada (UI_UX_Guidelines). Renderizada dentro do root layout.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Compass className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Erro 404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
      </div>
      <Button asChild className="h-11">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
