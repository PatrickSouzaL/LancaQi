import { PageHeadingSkeleton, TableCardSkeleton } from "@/components/Skeletons";

export default function AprovacoesLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableCardSkeleton linhas={6} colunas={8} />
    </>
  );
}
