import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Blocos de skeleton reaproveitáveis para os `loading.tsx` (UI_UX_Guidelines
 * §3.2). Mantêm o layout estável durante o streaming — sem saltos de conteúdo.
 */

export function PageHeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Linha de KPIs do Dashboard (4 cards). */
export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/** Card genérico contendo uma tabela com `linhas` linhas e `colunas` colunas. */
export function TableCardSkeleton({
  linhas = 6,
  colunas = 5,
  comBusca = false,
}: {
  linhas?: number;
  colunas?: number;
  comBusca?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-3">
        <Skeleton className="h-5 w-40" />
        {comBusca && <Skeleton className="h-9 w-full max-w-sm" />}
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {Array.from({ length: colunas }).map((_, c) => (
              <Skeleton
                key={c}
                className={c === 0 ? "h-6 flex-[2]" : "h-6 flex-1"}
              />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Bloco de gráfico (altura fixa para não saltar). */
export function ChartCardSkeleton({ altura = "h-72" }: { altura?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${altura}`} />
      </CardContent>
    </Card>
  );
}

/** Card de formulário (rótulos + campos). */
export function FormCardSkeleton({ campos = 4 }: { campos?: number }) {
  return (
    <Card className="max-w-2xl shadow-sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-40" />
      </CardContent>
    </Card>
  );
}
