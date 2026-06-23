"use client";

// Client apenas por `usePathname` (estado de rota ativa). Sem outro estado.
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_ADMIN } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {NAV_ADMIN.map((item) => {
        const ativo =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icone = item.icone;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={ativo}
              tooltip={item.titulo}
              // Ativo: fundo indigo suave + texto/ícone na cor primária.
              // Inativo: texto em muted. `!` para vencer o estilo padrão (sidebar-accent).
              className={cn(
                "data-active:bg-primary/10! data-active:font-medium data-active:text-primary!",
                !ativo && "text-muted-foreground",
              )}
            >
              <Link href={item.href}>
                <Icone />
                <span>{item.titulo}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
