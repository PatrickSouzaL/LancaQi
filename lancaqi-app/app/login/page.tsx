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
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MapPinned className="size-6" />
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
