"use client";

import { ErrorState } from "@/components/ErrorState";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="p-4 md:p-8">
      <ErrorState
        error={error}
        tentar={unstable_retry}
        descricao="Não foi possível carregar esta área administrativa. Tente novamente."
      />
    </div>
  );
}
