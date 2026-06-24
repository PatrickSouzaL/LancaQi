"use client";

import { ErrorState } from "@/components/ErrorState";

export default function AnalistaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <ErrorState
        error={error}
        tentar={unstable_retry}
        descricao="Não foi possível carregar seus dados. Tente novamente."
      />
    </div>
  );
}
