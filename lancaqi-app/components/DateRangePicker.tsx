"use client";

import { useState } from "react";
import { CalendarRange, X } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";

/** Converte `YYYY-MM-DD` em `Date` local (evita o shift de fuso do `new Date(iso)`). */
function paraData(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, ISO, new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function rotularData(d: Date): string {
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Seletor de período (intervalo de datas) com calendário — substitui os dois
 * inputs nativos de data. Componente controlado: `de`/`ate` são ISO
 * (`YYYY-MM-DD`) ou null; `onChange` devolve o intervalo já normalizado em ISO.
 * Cada clique reflete imediatamente (o primeiro define só o início).
 */
export function DateRangePicker({
  de,
  ate,
  onChange,
  className,
  placeholder = "Período",
}: {
  de: string | null;
  ate: string | null;
  onChange: (range: { de: string | null; ate: string | null }) => void;
  className?: string;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);

  const inicio = paraData(de);
  const fim = paraData(ate);
  const range: DateRange | undefined =
    inicio || fim ? { from: inicio, to: fim } : undefined;

  function selecionar(next: DateRange | undefined) {
    onChange({
      de: next?.from ? format(next.from, ISO) : null,
      ate: next?.to ? format(next.to, ISO) : null,
    });
    // Intervalo completo → fecha; primeiro clique (só início) mantém aberto.
    if (next?.from && next?.to) setAberto(false);
  }

  const rotulo =
    inicio && fim
      ? `${rotularData(inicio)} – ${rotularData(fim)}`
      : inicio
        ? `A partir de ${rotularData(inicio)}`
        : placeholder;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "justify-start px-3 font-normal",
            !inicio && "text-muted-foreground",
            className,
          )}
          aria-label="Filtrar por período"
        >
          <CalendarRange className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{rotulo}</span>
          {inicio && (
            // Limpar só o período. `span` (não `button`) para não aninhar botões.
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar período"
              onClick={(e) => {
                e.stopPropagation();
                selecionar(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  selecionar(undefined);
                }
              }}
              className="ml-auto rounded-sm opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-4" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={selecionar}
          defaultMonth={inicio}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
