"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DateRangePicker } from "@/components/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodoDashboard } from "@/lib/periodo";

const OPCOES: { valor: PeriodoDashboard; label: string }[] = [
  { valor: "atual", label: "Quinzena atual" },
  { valor: "anterior", label: "Quinzena anterior" },
  { valor: "mes-anterior", label: "Mês anterior" },
  { valor: "custom", label: "Seleção de período" },
];

/**
 * Seletor de período do Dashboard (canto superior esquerdo). Escreve o estado
 * na URL (`?period=` ou `?from=&to=`) para que o Server Component reagregue no
 * servidor — nenhuma soma acontece no cliente. Espelha o padrão de URL-params
 * do `AuditoriaClient` (router.replace + useTransition, sem scroll jump).
 *
 * A validação/normalização é responsabilidade do servidor
 * (`resolverPeriodoDashboard`, com Zod); aqui só refletimos a intenção do
 * usuário. As datas custom são ISO `YYYY-MM-DD` (reidratadas de `from`/`to`).
 */
export function DashboardPeriodFilter({
  chave,
  from,
  to,
}: {
  chave: PeriodoDashboard;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendente, startTransition] = useTransition();

  /** Aplica mudanças na query string preservando os demais params. */
  function aplicar(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onPresetChange(valor: string) {
    if (valor === "custom") {
      // Entra no modo custom; mantém datas já escolhidas (se houver).
      aplicar({ period: "custom", from, to });
      return;
    }
    // Presets limpam as datas custom. `atual` volta à URL limpa (padrão).
    aplicar({ period: valor === "atual" ? null : valor, from: null, to: null });
  }

  function onRangeChange({ de, ate }: { de: string | null; ate: string | null }) {
    aplicar({ period: "custom", from: de, to: ate });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-busy={pendente}>
      <Select value={chave} onValueChange={onPresetChange}>
        <SelectTrigger className="!h-10 w-full sm:w-52" aria-label="Período">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {OPCOES.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {chave === "custom" && (
        <DateRangePicker
          de={from}
          ate={to}
          onChange={onRangeChange}
          className="h-10 w-full sm:w-72"
          placeholder="Escolha as datas"
        />
      )}
    </div>
  );
}
