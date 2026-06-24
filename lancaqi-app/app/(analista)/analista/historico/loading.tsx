import { PageHeadingSkeleton, TableCardSkeleton } from "@/components/Skeletons";

export default function HistoricoLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableCardSkeleton linhas={6} colunas={5} />
    </>
  );
}
