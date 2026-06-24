import { FormCardSkeleton, PageHeadingSkeleton } from "@/components/Skeletons";

export default function LancamentoLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <FormCardSkeleton campos={5} />
    </>
  );
}
