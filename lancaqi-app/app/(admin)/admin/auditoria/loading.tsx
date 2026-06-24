import { PageHeadingSkeleton, TableCardSkeleton } from "@/components/Skeletons";

export default function AuditoriaLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableCardSkeleton linhas={8} colunas={7} comBusca />
    </>
  );
}
