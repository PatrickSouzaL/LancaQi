import { MapPinned } from "lucide-react";

import { AnalistaNav } from "@/components/analista/AnalistaNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAnalistaAtual } from "@/lib/data/analista";
import { iniciais } from "@/lib/format";

/**
 * Layout do Analista (Server Component): topbar minimalista focada no usuário
 * final, conforme Visao_Analista.md (simplicidade, zero atrito). A
 * interatividade (rota ativa) fica isolada em AnalistaNav ("use client").
 */
export default async function AnalistaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analista = await getAnalistaAtual();

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPinned className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">LançaQi</span>
          </div>

          <AnalistaNav />

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">
                {analista.nome}
              </p>
              <p className="text-xs text-muted-foreground">Analista</p>
            </div>
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-sm text-primary">
                {iniciais(analista.nome)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
