/**
 * Cabeçalho de página padronizado (Server Component).
 * Reforça a hierarquia tipográfica: título forte + texto de apoio em
 * `text-muted-foreground`, conforme UI_UX_Guidelines.md §1.3.
 */
export function PageHeading({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}
