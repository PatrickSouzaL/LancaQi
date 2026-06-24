"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Logotipo Microsoft (4 quadrados) — SVG inline, sem dependências. */
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

/**
 * Botão de login OAuth com Microsoft Entra ID (provider `azure` no Supabase).
 * `next` é o destino pós-login, repassado ao callback.
 */
export function LoginButton({ next }: { next?: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();

    const params = new URLSearchParams();
    if (next) params.set("next", next);
    // URL canônica (NEXT_PUBLIC_SITE_URL) tem prioridade sobre o domínio atual
    // — assim o `redirectTo` bate com a allowlist do Supabase mesmo em previews.
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const redirectTo = `${base.replace(/\/+$/, "")}/auth/callback${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo,
      },
    });

    if (error) {
      console.error("Falha ao iniciar login OAuth (azure):", error.message);
      setErro("Não foi possível iniciar o login. Tente novamente.");
      setCarregando(false);
    }
    // Em caso de sucesso o browser é redirecionado para a Microsoft.
  }

  return (
    <div className="space-y-3">
      <Button onClick={entrar} disabled={carregando} className="h-11 w-full">
        {carregando ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Redirecionando...
          </>
        ) : (
          <>
            <MicrosoftIcon />
            Entrar com Microsoft
          </>
        )}
      </Button>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
