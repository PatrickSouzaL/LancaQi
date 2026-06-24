"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { criarDespesa, editarDespesa } from "@/app/actions/despesas-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calcularPrevia, exigeKm } from "@/lib/calculo";
import { formatarBRL } from "@/lib/format";
import type { ConfiguracoesTaxas, Despesa, TipoDespesa } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "—" do mapper (origem/destino nulos) não é um valor editável real. */
function valorInicial(v?: string): string {
  return v && v !== "—" ? v : "";
}

interface OpcaoTipo {
  valor: TipoDespesa;
  label: string;
}

const OPCOES_TIPO: OpcaoTipo[] = [
  { valor: "ESCRITORIO", label: "Escritório (presencial)" },
  { valor: "MOTO", label: "Cliente — Moto" },
  { valor: "CARRO", label: "Cliente — Carro" },
];

type Erros = Partial<Record<"data" | "tipo" | "origem" | "destino" | "km", string>>;

/**
 * Formulário de novo lançamento (Visao_Analista §3.2 + UI_UX_Guidelines §2.2).
 *
 * - Campo KM aparece/some com transição suave conforme o tipo (Escritório
 *   oculta; Cliente exige).
 * - Prévia do valor recalculada em tempo real (apenas simulação visual; o
 *   back-end refaz o cálculo — o valor do cliente nunca é confiado).
 * - Submit com spinner e botão desabilitado (previne duplo clique).
 *
 * Reutilizável para EDIÇÃO: passando `despesa`, o formulário inicia preenchido
 * e o submit chama `editarDespesa` (em vez de `criarDespesa`); `onSucesso`
 * permite ao container (ex.: um Sheet) fechar após salvar.
 */
export function FormularioDespesa({
  taxas,
  despesa,
  onSucesso,
}: {
  taxas: ConfiguracoesTaxas;
  despesa?: Despesa;
  onSucesso?: () => void;
}) {
  const editando = despesa !== undefined;

  const [data, setData] = useState(despesa?.data ?? "");
  const [tipo, setTipo] = useState<TipoDespesa | "">(despesa?.tipo ?? "");
  const [origem, setOrigem] = useState(valorInicial(despesa?.origem));
  const [destino, setDestino] = useState(valorInicial(despesa?.destino));
  const [km, setKm] = useState(
    despesa && despesa.quantidade_km > 0 ? String(despesa.quantidade_km) : "",
  );
  const [observacao, setObservacao] = useState(despesa?.observacao ?? "");

  const [erros, setErros] = useState<Erros>({});
  const [enviando, startTransition] = useTransition();

  // Deslocamento até o cliente (Moto/Carro): exige origem, destino e KM.
  // Escritório tem valor fixo automático — esses campos não se aplicam.
  const mostrarCliente = tipo !== "" && exigeKm(tipo);

  const previa = useMemo(() => {
    if (tipo === "") return null;
    const kmNum = Number(km) || 0;
    return calcularPrevia(tipo, kmNum, taxas);
  }, [tipo, km, taxas]);

  function validar(): Erros {
    const e: Erros = {};
    if (!data) e.data = "Informe a data.";
    if (tipo === "") e.tipo = "Selecione o tipo.";
    // Origem/destino/KM só são exigidos em deslocamentos até o cliente.
    if (mostrarCliente) {
      if (!origem.trim()) e.origem = "Informe a origem.";
      if (!destino.trim()) e.destino = "Informe o destino.";
      const kmNum = Number(km);
      if (km.trim() === "" || Number.isNaN(kmNum) || kmNum <= 0)
        e.km = "Informe uma quilometragem maior que zero.";
    }
    return e;
  }

  function limpar() {
    setData("");
    setTipo("");
    setOrigem("");
    setDestino("");
    setKm("");
    setObservacao("");
  }

  // Mapeia os campos retornados pela Server Action (Zod) para os do formulário.
  const CAMPO_SERVIDOR: Record<string, keyof Erros> = {
    data: "data",
    tipo: "tipo",
    origem: "origem",
    destino: "destino",
    quantidade_km: "km",
  };

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return; // previne duplo clique

    const novosErros = validar();
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    // Monta o FormData enviado à action. O `valor_calculado` NÃO é enviado —
    // o servidor recalcula a partir das taxas oficiais.
    const fd = new FormData();
    if (editando) fd.set("id", despesa.id);
    fd.set("data", data);
    fd.set("tipo", tipo);
    if (mostrarCliente) {
      fd.set("origem", origem);
      fd.set("destino", destino);
      fd.set("quantidade_km", km);
    }
    if (observacao.trim()) fd.set("observacao", observacao.trim());

    startTransition(async () => {
      const resultado = editando
        ? await editarDespesa(fd)
        : await criarDespesa(fd);
      if (resultado.ok) {
        if (editando) {
          toast.success("Despesa atualizada.");
          onSucesso?.();
        } else {
          toast.success("Lançamento registrado com sucesso.");
          limpar();
        }
        return;
      }
      toast.error(resultado.error);
      if (resultado.fieldErrors) {
        const mapeados: Erros = {};
        for (const [campo, msg] of Object.entries(resultado.fieldErrors)) {
          const destinoCampo = CAMPO_SERVIDOR[campo];
          if (destinoCampo) mapeados[destinoCampo] = msg;
        }
        setErros((prev) => ({ ...prev, ...mapeados }));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="data">Data do deslocamento</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-11"
          aria-invalid={Boolean(erros.data)}
        />
        {erros.data && <p className="text-sm text-destructive">{erros.data}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tipo">Tipo de deslocamento</Label>
        <Select
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoDespesa)}
        >
          <SelectTrigger id="tipo" className="h-11" aria-invalid={Boolean(erros.tipo)}>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_TIPO.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {erros.tipo && <p className="text-sm text-destructive">{erros.tipo}</p>}
      </div>

      {/*
        Trajeto (origem/destino) + KM. Só se aplicam a deslocamentos até o
        cliente — para Escritório o valor é automático, então o bloco inteiro
        some com transição suave de altura/opacidade (sem salto).
      */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          mostrarCliente
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!mostrarCliente}
      >
        <div className="overflow-hidden">
          <div className="space-y-6 pt-px">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="origem">Origem</Label>
                <Input
                  id="origem"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  placeholder="Ex.: Home Office"
                  className="h-11"
                  tabIndex={mostrarCliente ? undefined : -1}
                  aria-invalid={Boolean(erros.origem)}
                />
                {erros.origem && (
                  <p className="text-sm text-destructive">{erros.origem}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destino">Destino</Label>
                <Input
                  id="destino"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ex.: Cliente — Pinheiros"
                  className="h-11"
                  tabIndex={mostrarCliente ? undefined : -1}
                  aria-invalid={Boolean(erros.destino)}
                />
                {erros.destino && (
                  <p className="text-sm text-destructive">{erros.destino}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="km">Quilometragem (KM)</Label>
              <Input
                id="km"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="0,0"
                className="h-11 tabular-nums"
                tabIndex={mostrarCliente ? undefined : -1}
                aria-invalid={Boolean(erros.km)}
              />
              {erros.km && (
                <p className="text-sm text-destructive">{erros.km}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea
          id="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Detalhes adicionais do deslocamento."
          rows={3}
        />
      </div>

      {/* Prévia do reembolso em destaque, recalculada em tempo real. */}
      {previa !== null && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-accent px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
            <Sparkles className="size-4" />
            Prévia do reembolso
          </div>
          <span
            aria-live="polite"
            className="text-2xl font-extrabold tracking-tight tabular-nums text-primary"
          >
            {formatarBRL(previa)}
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Valor estimado. O cálculo final é refeito pelo sistema no
        processamento — sem necessidade de anexar comprovantes.
      </p>

      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {editando ? "Salvando..." : "Registrando..."}
          </>
        ) : editando ? (
          "Salvar Alterações"
        ) : (
          "Registrar Lançamento"
        )}
      </Button>
    </form>
  );
}
