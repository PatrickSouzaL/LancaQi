import { MapPinned } from "lucide-react";

import { LoginButton } from "@/components/auth/LoginButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Tela de login. Recebe `redirectTo` (origem da tentativa de acesso, setado
 * pelo proxy) e o repassa ao botão como `next`.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      {/* Fundo temático na cor da marca (#5BBAE8) */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #5BBAE8 0%, #3a9fd6 45%, #1f6aa8 100%)",
        }}
      />
      {/* Brilhos suaves que dão profundidade e movimento ao fundo */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute top-1/3 -right-28 size-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-[28rem] rounded-full bg-[#5BBAE8]/50 blur-3xl" />
      </div>

      <Card className="w-full max-w-sm border-0 shadow-2xl shadow-sky-950/30 ring-1 ring-white/40 backdrop-blur-sm">
        <CardHeader className="items-center space-y-3 py-2 text-center">
          <div className="flex size-14 items-center justify-center justify-self-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <MapPinned className="size-7" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              LançaQi
            </CardTitle>
            <CardDescription>
              Faça login para gerenciar seus deslocamentos.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginButton next={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
