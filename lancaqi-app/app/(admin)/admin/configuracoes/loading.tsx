import { FormCardSkeleton, PageHeadingSkeleton } from "@/components/Skeletons";

export default function ConfiguracoesLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <FormCardSkeleton campos={3} />
    </>
  );
}
