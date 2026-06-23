import Link from "next/link";
import { ArrowRight, Clock, PlusCircle, Wallet } from "lucide-react";

import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getResumoAnalista } from "@/lib/data/analista";
import { getUsuarioPerfil } from "@/lib/data/auth";
import { formatarBRL } from "@/lib/format";

export default async function AnalistaDashboardPage() {
  const [perfil, resumo] = await Promise.all([
    getUsuarioPerfil(),
    getResumoAnalista(),
  ]);
  const vazio = resumo.quantidade === 0;
  const primeiroNome = perfil.nome.split(/\s+/)[0];

  return (
    <>
      <PageHeading
        titulo={`Olá, ${primeiroNome}`}
        descricao="Resumo dos seus deslocamentos na quinzena atual."
        acao={
          <Button asChild className="h-11">
            <Link href="/analista/lancamento">
              <PlusCircle className="size-4" />
              Novo Lançamento
            </Link>
          </Button>
        }
      />

      {/* Hero Metric — elemento de maior peso visual (UI_UX_Guidelines §2.1). */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-accent to-card shadow-sm">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Wallet className="size-4" />
            Total acumulado na quinzena
          </CardDescription>
          <CardTitle className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
            {formatarBRL(resumo.totalQuinzena)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vazio ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem lançamentos neste ciclo.{" "}
              <Link
                href="/analista/lancamento"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Registrar o primeiro
              </Link>
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground tabular-nums">
              {resumo.quantidade} lançamentos no período.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              A receber (pendente)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatarBRL(resumo.totalPendente)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Wallet className="size-4 text-emerald-600" />
              Já reembolsado (pago)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatarBRL(resumo.totalPago)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Button
        asChild
        variant="outline"
        className="h-11 w-full justify-between sm:w-auto"
      >
        <Link href="/analista/historico">
          Ver histórico completo
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </>
  );
}
