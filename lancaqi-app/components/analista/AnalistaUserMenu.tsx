"use client";

import { LogOut } from "lucide-react";

import { sair } from "@/app/actions/auth-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iniciais } from "@/lib/format";

/**
 * Identidade do analista na topbar com menu de conta (Sair).
 *
 * `"use client"` por causa do DropdownMenu (Radix). O logout reusa a mesma
 * Server Action do admin (`sair`) — `<form action>` para progressive
 * enhancement, com `DropdownMenuItem asChild` preservando estilo/foco.
 */
export function AnalistaUserMenu({
  nome,
  email,
}: {
  nome: string;
  email: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{nome}</p>
            <p className="text-xs text-muted-foreground">Analista</p>
          </div>
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-sm text-primary">
              {iniciais(nome)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{nome}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={sair}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
