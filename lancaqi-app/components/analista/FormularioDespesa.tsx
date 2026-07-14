"use client";

import { useMemo, useState, useTransition } from "react";
import { Calendar as CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  subYears,
  subDays,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  criarDespesa,
  editarDespesa,
  editarDespesaAdmin,
} from "@/app/actions/despesas-actions";
import {
  ClienteCombobox,
  type OpcaoCliente,
} from "@/components/ClienteCombobox";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calcularPrevia } from "@/lib/calculo";
import {
  categoriaDe,
  exigeCliente,
  exigeDescricao,
  OPCOES_CATEGORIA,
  OPCOES_POR_CATEGORIA,
  permiteCliente,
  usaClienteAvulso,
  usaKm,
  usaTrajetoCliente,
  usaTrajetoTexto,
  usaValorDeclarado,
} from "@/lib/despesas-tipos";
import { formatarBRL } from "@/lib/format";
import type {
  CategoriaDespesa,
  ConfiguracoesTaxas,
  Despesa,
  TipoDespesa,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Erros = Partial<
  Record<"data" | "tipo" | "cliente" | "km" | "valor" | "descricao", string>
>;

// Origem/destino em texto vêm mapeados como "—" quando nulos (ver mappers).
const semTraco = (v: string | undefined) => (v && v !== "—" ? v : "");

/**
 * Formulário de lançamento — agora cobre DESLOCAMENTOS e DESPESAS gerais.
 *
 * Fluxo encadeado de selects:
 *   1) Categoria (Deslocamento | Despesa) — controle visual.
 *   2) Tipo — opções conforme a categoria.
 *   3) Campos finais (KM, Origem/Destino, Cliente, Descrição, Valor) aparecem
 *      conforme o tipo (regras centralizadas em `lib/despesas-tipos.ts`).
 *
 * O valor financeiro NUNCA é confiado do cliente: o back-end recalcula por taxa
 * (deslocamentos) ou copia o valor declarado (despesas). A prévia aqui é só UX.
 *
 * Reutilizável para EDIÇÃO (`despesa` preenchida) e para edição administrativa
 * (`comoAdmin`).
 */
export function FormularioDespesa({
  taxas,
  clientes,
  despesa,
  onSucesso,
  comoAdmin = false,
}: {
  taxas: ConfiguracoesTaxas;
  clientes: OpcaoCliente[];
  despesa?: Despesa;
  onSucesso?: () => void;
  /** Edição administrativa (auditoria): usa a action que não filtra por dono. */
  comoAdmin?: boolean;
}) {
  const editando = despesa !== undefined;

  // Na edição de MOTO/CARRO, a origem foi salva como TEXTO (nome do cliente);
  // recupera o id correspondente para pré-selecionar o combobox.
  const origemInicial =
    despesa && usaTrajetoCliente(despesa.tipo)
      ? (clientes.find((c) => c.nome === despesa.origem)?.id ?? null)
      : null;

  const [data, setData] = useState(despesa?.data ?? "");
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDespesa | "">(
    despesa ? categoriaDe(despesa.tipo) : "",
  );
  const [tipo, setTipo] = useState<TipoDespesa | "">(despesa?.tipo ?? "");
  const [origemId, setOrigemId] = useState<string | null>(origemInicial);
  const [clienteId, setClienteId] = useState<string | null>(
    despesa?.cliente_id ?? null,
  );
  // Origem/destino em texto livre (pedágio/estacionamento/passagem).
  const [origemTexto, setOrigemTexto] = useState(
    despesa && usaTrajetoTexto(despesa.tipo) ? semTraco(despesa.origem) : "",
  );
  const [destinoTexto, setDestinoTexto] = useState(
    despesa && usaTrajetoTexto(despesa.tipo) ? semTraco(despesa.destino) : "",
  );
  const [km, setKm] = useState(
    despesa && despesa.quantidade_km > 0 ? String(despesa.quantidade_km) : "",
  );
  const [valorDeclarado, setValorDeclarado] = useState(
    despesa?.valor_declarado != null ? String(despesa.valor_declarado) : "",
  );
  const [descricao, setDescricao] = useState(despesa?.descricao ?? "");

  const [erros, setErros] = useState<Erros>({});
  const [enviando, startTransition] = useTransition();

  // Janela de datas permitida. Na CRIAÇÃO, limita a no máximo 3 dias no passado;
  // na EDIÇÃO, mantém 1 ano para não travar despesas antigas já registradas.
  const hoje = startOfDay(new Date());
  const limiteInferior = startOfDay(
    editando ? subYears(new Date(), 1) : subDays(new Date(), 3),
  );

  // Visibilidade dos campos finais conforme o tipo escolhido.
  const temTipo = tipo !== "";
  const mostrarKm = temTipo && usaKm(tipo);
  const mostrarTrajetoCliente = temTipo && usaTrajetoCliente(tipo);
  const mostrarTrajetoTexto = temTipo && usaTrajetoTexto(tipo);
  const mostrarClienteAvulso = temTipo && usaClienteAvulso(tipo);
  const clienteObrigatorio = temTipo && exigeCliente(tipo);
  const mostrarValor = temTipo && usaValorDeclarado(tipo);
  // Descrição é persistida (coluna `descricao`) e vale para TODOS os tipos —
  // inclusive deslocamentos. O antigo campo "Observação" não era gravado.
  const mostrarDescricao = temTipo;
  // Nos tipos de DESPESA a descrição é OBRIGATÓRIA (detalhar o gasto).
  const descricaoObrigatoria = temTipo && exigeDescricao(tipo);

  const opcoesTipo = categoria ? OPCOES_POR_CATEGORIA[categoria] : [];

  const previa = useMemo(() => {
    if (tipo === "") return null;
    const kmNum = Number(km) || 0;
    const valorNum = Number(valorDeclarado) || 0;
    return calcularPrevia(tipo, kmNum, taxas, valorNum);
  }, [tipo, km, valorDeclarado, taxas]);

  function validar(): Erros {
    const e: Erros = {};
    if (!data) {
      e.data = "Informe a data.";
    } else {
      try {
        const target = startOfDay(parseISO(data));
        if (isAfter(target, hoje)) {
          e.data = "A data não pode ser no futuro.";
        } else if (isBefore(target, limiteInferior)) {
          e.data = editando
            ? "A data não pode ter mais de 1 ano para trás."
            : "A data não pode ter mais de 3 dias no passado.";
        }
      } catch {
        e.data = "Data inválida.";
      }
    }
    if (tipo === "") {
      e.tipo = "Selecione o tipo.";
      return e;
    }
    if (mostrarKm) {
      const kmNum = Number(km);
      if (km.trim() === "" || Number.isNaN(kmNum) || kmNum <= 0)
        e.km = "Informe uma quilometragem maior que zero.";
    }
    if (clienteObrigatorio && !clienteId) {
      e.cliente = "Selecione o cliente.";
    }
    if (mostrarValor) {
      const valorNum = Number(valorDeclarado);
      if (
        valorDeclarado.trim() === "" ||
        Number.isNaN(valorNum) ||
        valorNum <= 0
      )
        e.valor = "Informe um valor maior que zero.";
    }
    if (descricaoObrigatoria && descricao.trim() === "") {
      e.descricao = "Descreva a despesa.";
    }
    return e;
  }

  function limpar() {
    setData("");
    setCategoria("");
    setTipo("");
    setOrigemId(null);
    setClienteId(null);
    setOrigemTexto("");
    setDestinoTexto("");
    setKm("");
    setValorDeclarado("");
    setDescricao("");
  }

  // Trocar de categoria zera o tipo (o 2º select recarrega) e os campos finais.
  function onCategoriaChange(v: string) {
    setCategoria(v as CategoriaDespesa);
    setTipo("");
    setOrigemId(null);
    setClienteId(null);
    setOrigemTexto("");
    setDestinoTexto("");
    setKm("");
    setValorDeclarado("");
    setErros({});
  }

  // Mapeia os campos retornados pela Server Action (Zod) para os do formulário.
  const CAMPO_SERVIDOR: Record<string, keyof Erros> = {
    data: "data",
    tipo: "tipo",
    cliente_id: "cliente",
    quantidade_km: "km",
    valor_declarado: "valor",
    descricao: "descricao",
  };

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return; // previne duplo clique

    const novosErros = validar();
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    if (tipo === "") return; // narrowing (já coberto por validar)

    // Monta o FormData enviado à action. O `valor_calculado` NÃO é enviado —
    // o servidor recalcula (taxa) ou copia o valor declarado.
    const fd = new FormData();
    if (editando) fd.set("id", despesa.id);
    fd.set("data", data);
    fd.set("tipo", tipo);

    if (mostrarKm) fd.set("quantidade_km", km);
    if (mostrarTrajetoCliente) {
      if (origemId) fd.set("origem_cliente_id", origemId);
      if (clienteId) fd.set("cliente_id", clienteId);
    }
    if (mostrarTrajetoTexto) {
      if (origemTexto.trim()) fd.set("origem", origemTexto.trim());
      if (destinoTexto.trim()) fd.set("destino", destinoTexto.trim());
    }
    if (mostrarClienteAvulso && clienteId) fd.set("cliente_id", clienteId);
    if (mostrarValor) fd.set("valor_declarado", valorDeclarado);
    // Sempre enviamos `descricao` (mesmo vazia) para permitir limpar o texto na
    // edição — o servidor grava null quando vier em branco.
    if (mostrarDescricao) fd.set("descricao", descricao.trim());

    startTransition(async () => {
      const resultado = editando
        ? await (comoAdmin ? editarDespesaAdmin : editarDespesa)(fd)
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

  const clientePermitido = temTipo && permiteCliente(tipo);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="data">Data</Label>
        <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
          <PopoverTrigger asChild>
            <Button
              id="data"
              variant="outline"
              type="button"
              className={cn(
                "h-11 w-full justify-start text-left font-normal border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                !data && "text-muted-foreground",
                erros.data && "border-destructive focus-visible:ring-destructive/20"
              )}
              aria-invalid={Boolean(erros.data)}
            >
              <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
              {data ? (
                format(parseISO(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              ) : (
                <span>Selecione a data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data ? parseISO(data) : undefined}
              onSelect={(date) => {
                if (date) {
                  setData(format(date, "yyyy-MM-dd"));
                  setPopoverAberto(false);
                }
              }}
              disabled={(date) => {
                const target = startOfDay(date);
                return isAfter(target, hoje) || isBefore(target, limiteInferior);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {erros.data && <p className="text-sm text-destructive">{erros.data}</p>}
      </div>

      {/* 1º select: Categoria (apenas controle visual do fluxo). */}
      <div className="grid gap-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Select value={categoria} onValueChange={onCategoriaChange}>
          <SelectTrigger id="categoria" className="!h-11">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_CATEGORIA.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2º select: Tipo — só aparece após escolher a categoria. */}
      {categoria !== "" && (
        <div className="grid gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setTipo(v as TipoDespesa)}
          >
            <SelectTrigger
              id="tipo"
              className="!h-11"
              aria-invalid={Boolean(erros.tipo)}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {opcoesTipo.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {erros.tipo && <p className="text-sm text-destructive">{erros.tipo}</p>}
        </div>
      )}

      {/* Trajeto por CLIENTE (Moto/Carro): origem e destino são clientes. */}
      {mostrarTrajetoCliente && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="origem">Origem</Label>
            <ClienteCombobox
              id="origem"
              clientes={clientes}
              value={origemId}
              onChange={setOrigemId}
              placeholder="Selecione a origem"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente">Cliente (destino)</Label>
            <ClienteCombobox
              id="cliente"
              clientes={clientes}
              value={clienteId}
              onChange={setClienteId}
              placeholder="Selecione o cliente"
            />
          </div>
        </div>
      )}

      {/* Trajeto por TEXTO (pedágio/estacionamento/passagem). */}
      {mostrarTrajetoTexto && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="origem-texto">Origem (opcional)</Label>
            <Input
              id="origem-texto"
              value={origemTexto}
              onChange={(e) => setOrigemTexto(e.target.value)}
              placeholder="Ex.: São Paulo"
              className="h-11"
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="destino-texto">Destino (opcional)</Label>
            <Input
              id="destino-texto"
              value={destinoTexto}
              onChange={(e) => setDestinoTexto(e.target.value)}
              placeholder="Ex.: Campinas"
              className="h-11"
              maxLength={200}
            />
          </div>
        </div>
      )}

      {/* Quilometragem (Moto/Carro). */}
      {mostrarKm && (
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
            aria-invalid={Boolean(erros.km)}
          />
          {erros.km && <p className="text-sm text-destructive">{erros.km}</p>}
        </div>
      )}

      {/* Cliente avulso (tipos de despesa que aceitam cliente). */}
      {mostrarClienteAvulso && (
        <div className="grid gap-2">
          <Label htmlFor="cliente-avulso">
            Cliente{clienteObrigatorio ? "" : " (opcional)"}
          </Label>
          <ClienteCombobox
            id="cliente-avulso"
            clientes={clientes}
            value={clienteId}
            onChange={setClienteId}
            placeholder="Selecione o cliente"
            invalid={Boolean(erros.cliente)}
          />
          {erros.cliente && (
            <p className="text-sm text-destructive">{erros.cliente}</p>
          )}
        </div>
      )}

      {/* Valor declarado (tipos de despesa). */}
      {mostrarValor && (
        <div className="grid gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={valorDeclarado}
            onChange={(e) => setValorDeclarado(e.target.value)}
            placeholder="0,00"
            className="h-11 tabular-nums"
            aria-invalid={Boolean(erros.valor)}
          />
          {erros.valor && (
            <p className="text-sm text-destructive">{erros.valor}</p>
          )}
        </div>
      )}

      {/* Descrição (persistida, todos os tipos): detalha hotel, item, motivo,
          ou observações do deslocamento. */}
      {mostrarDescricao && (
        <div className="grid gap-2">
          <Label htmlFor="descricao">
            Descrição{descricaoObrigatoria ? "" : " (opcional)"}
          </Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes adicionais (hotel, item comprado, motivo do almoço…)."
            rows={3}
            maxLength={1000}
            aria-invalid={Boolean(erros.descricao)}
          />
          {erros.descricao && (
            <p className="text-sm text-destructive">{erros.descricao}</p>
          )}
        </div>
      )}

      {/* Prévia do reembolso em destaque, recalculada em tempo real. */}
      {previa !== null && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-accent px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
            <Sparkles className="size-4" />
            {clientePermitido || mostrarValor || mostrarKm
              ? "Prévia do reembolso"
              : "Valor do reembolso"}
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
