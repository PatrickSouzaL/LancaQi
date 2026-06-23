import Link from "next/link";
import { ArrowRight, MapPinned, ShieldCheck, User } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Entrada do protótipo. Como admin e analista vivem em áreas distintas
 * (`/admin/*` e `/analista/*`), `/` oferece a escolha de perfil.
 * No alvo, o destino é resolvido por papel após o login (Supabase Auth).
 */
const AREAS = [
  {
    href: "/admin/dashboard",
    icone: ShieldCheck,
    titulo: "Administrador",
    descricao: "Auditar, fechar quinzenas e configurar taxas.",
  },
  {
    href: "/analista/dashboard",
    icone: User,
    titulo: "Analista",
    descricao: "Registrar deslocamentos e acompanhar reembolsos.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MapPinned className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">LançaQi</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de Deslocamentos — selecione sua área de acesso.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {AREAS.map((area) => {
            const Icone = area.icone;
            return (
              <Link key={area.href} href={area.href} className="group">
                <Card className="h-full shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/50">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icone className="size-5" />
                    </div>
                    <CardTitle className="flex items-center justify-between">
                      {area.titulo}
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardTitle>
                    <CardDescription>{area.descricao}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
