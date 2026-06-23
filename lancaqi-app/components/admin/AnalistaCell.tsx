import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { iniciais } from "@/lib/format";

/** Avatar (iniciais) + nome do analista — reutilizado nas tabelas admin. */
export function AnalistaCell({ nome }: { nome: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-7">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {iniciais(nome)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{nome}</span>
    </div>
  );
}
