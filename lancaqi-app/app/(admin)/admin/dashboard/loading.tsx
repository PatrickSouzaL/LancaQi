import {
  ChartCardSkeleton,
  PageHeadingSkeleton,
  SummaryCardsSkeleton,
  TableCardSkeleton,
} from "@/components/Skeletons";

export default function DashboardLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <SummaryCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <TableCardSkeleton linhas={5} colunas={5} />
    </>
  );
}
