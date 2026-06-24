"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Fallback de error boundary reaproveitado pelos `error.tsx` de cada segmento.
 *
 * Boundaries DEVEM ser Client Components (React Error Boundary). `tentar` recebe
 * a função de recuperação do segmento — em Next 16.2 o `error.tsx` expõe
 * `unstable_retry` (re-fetch + re-render) e o `reset` clássico; passamos a que
 * o segmento escolher.
 */
export function ErrorState({
  error,
  tentar,
  titulo = "Algo deu errado",
  descricao = "Não foi possível carregar esta seção. Tente novamente.",
}: {
  error: Error & { digest?: string };
  tentar: () => void;
  titulo?: string;
  descricao?: string;
}) {
  useEffect(() => {
    // Observabilidade: no alvo, enviar para um serviço de monitoramento.
    console.error("ErrorBoundary:", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>
        {error.digest && (
          <p className="pt-1 font-mono text-xs text-muted-foreground/70">
            ref: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={tentar} className="h-11">
        <RotateCw className="size-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
