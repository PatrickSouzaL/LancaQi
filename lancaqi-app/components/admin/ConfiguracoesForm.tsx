"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { salvarTaxas } from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConfiguracoesTaxas } from "@/lib/types";

/**
 * Formulário das taxas que governam o recálculo dos reembolsos. Edita a LINHA
 * ÚNICA de `configuracoes_taxas` (sempre UPDATE, nunca INSERT).
 *
 * ESCRITORIO é valor FIXO por dia; MOTO/CARRO são R$/km. A validação aqui é só
 * a primeira camada (UX). No alvo, a Server Action revalida com Zod (number ≥ 0)
 * e `is_admin()` antes de gravar — e todo `valor_calculado` é recalculado no
 * servidor a partir destes parâmetros.
 */
type CampoTaxa = "valor_fixo_escritorio" | "taxa_km_moto" | "taxa_km_carro";

const CAMPOS: { campo: CampoTaxa; label: string; ajuda: string }[] = [
  {
    campo: "valor_fixo_escritorio",
    label: "Valor Fixo Escritório (R$)",
    ajuda: "Pago por dia presencial",
  },
  {
    campo: "taxa_km_moto",
    label: "Taxa KM Moto (R$/km)",
    ajuda: "Multiplicado pela distância",
  },
  {
    campo: "taxa_km_carro",
    label: "Taxa KM Carro (R$/km)",
    ajuda: "Multiplicado pela distância",
  },
];

export function ConfiguracoesForm({
  configuracoes,
}: {
  configuracoes: ConfiguracoesTaxas;
}) {
  const [valores, setValores] = useState<Record<CampoTaxa, string>>({
    valor_fixo_escritorio: String(configuracoes.valor_fixo_escritorio),
    taxa_km_moto: String(configuracoes.taxa_km_moto),
    taxa_km_carro: String(configuracoes.taxa_km_carro),
  });
  const [erros, setErros] = useState<Partial<Record<CampoTaxa, string>>>({});
  const [salvando, startTransition] = useTransition();

  function validar(valor: string): string | undefined {
    const numero = Number(valor);
    if (valor.trim() === "" || Number.isNaN(numero)) return "Informe um número.";
    if (numero < 0) return "O valor não pode ser negativo.";
    return undefined;
  }

  function onChange(campo: CampoTaxa, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: validar(valor) }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando) return;

    const novosErros: Partial<Record<CampoTaxa, string>> = {};
    for (const { campo } of CAMPOS) {
      const erro = validar(valores[campo]);
      if (erro) novosErros[campo] = erro;
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    // O valor final é revalidado no servidor (Zod + is_admin); o cliente só
    // monta o FormData. UPDATE na linha única — nunca INSERT.
    const fd = new FormData();
    fd.set("valor_fixo_escritorio", valores.valor_fixo_escritorio);
    fd.set("taxa_km_moto", valores.taxa_km_moto);
    fd.set("taxa_km_carro", valores.taxa_km_carro);

    startTransition(async () => {
      const resultado = await salvarTaxas(fd);
      if (resultado.ok) {
        toast.success("Taxas atualizadas com sucesso.");
        return;
      }
      toast.error(resultado.error);
      if (resultado.fieldErrors) {
        const mapeados = resultado.fieldErrors as Partial<
          Record<CampoTaxa, string>
        >;
        setErros((prev) => ({ ...prev, ...mapeados }));
      }
    });
  }

  return (
    <Card className="max-w-2xl shadow-sm">
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>Taxas de Reembolso</CardTitle>
          <CardDescription>
            Parâmetros usados no cálculo automático de todas as despesas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {CAMPOS.map(({ campo, label, ajuda }) => (
            <div key={campo} className="grid gap-2">
              <Label htmlFor={campo}>{label}</Label>
              <Input
                id={campo}
                type="number"
                step="0.01"
                min="0"
                value={valores[campo]}
                onChange={(e) => onChange(campo, e.target.value)}
                aria-invalid={Boolean(erros[campo])}
              />
              {erros[campo] ? (
                <p className="text-xs text-destructive">{erros[campo]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{ajuda}</p>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
