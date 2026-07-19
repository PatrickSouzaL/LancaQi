import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeadingSkeleton } from "@/components/Skeletons";

export default function AnalistaDashboardLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      {/* Hero metric — só descrição + valor (sem a linha de contagem). */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-56" />
        </CardHeader>
      </Card>
      {/* Gráfico (2/3) dominante + coluna direita (1/3) com reembolso e
          mini-card, ancorada à altura do gráfico. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-44 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="aspect-video w-full sm:aspect-[21/9] lg:aspect-[2/1]" />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          {/* Já reembolsado (fit-content) */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-52 rounded-lg" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
          {/* Mini-card de lançamentos (cresce até a base do gráfico) */}
          <Card className="flex flex-1 flex-col justify-center shadow-sm">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </CardHeader>
          </Card>
        </div>
      </div>
      <Skeleton className="h-11 w-full sm:w-56" />
    </>
  );
}
