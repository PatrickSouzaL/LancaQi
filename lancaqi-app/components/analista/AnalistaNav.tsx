"use client";

// Client por `usePathname` (estado de rota ativa).
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ANALISTA } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

export function AnalistaNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Navegação principal">
      {NAV_ANALISTA.map((item) => {
        const ativo =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              // Alvo de toque ≥ 44px (h-11) + foco visível (UI_UX_Guidelines §3.1).
              "inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ativo
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icone className="size-4" />
            <span className="hidden sm:inline">{item.titulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
