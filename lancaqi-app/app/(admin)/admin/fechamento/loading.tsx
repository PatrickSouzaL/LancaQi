import { PageHeadingSkeleton, TableCardSkeleton } from "@/components/Skeletons";

export default function FechamentoLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableCardSkeleton linhas={4} colunas={4} />
      <TableCardSkeleton linhas={6} colunas={6} />
    </>
  );
}
