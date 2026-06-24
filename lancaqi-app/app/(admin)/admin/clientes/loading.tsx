import { PageHeadingSkeleton, TableCardSkeleton } from "@/components/Skeletons";

export default function ClientesLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableCardSkeleton linhas={6} colunas={5} />
    </>
  );
}
