import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeadingSkeleton } from "@/components/Skeletons";

export default function AnalistaDashboardLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      {/* Hero metric */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-28" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Skeleton className="h-11 w-full sm:w-56" />
    </>
  );
}
