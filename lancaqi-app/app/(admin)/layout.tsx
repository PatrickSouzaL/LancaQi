import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getUsuarioAtual } from "@/lib/data/usuario";

/**
 * Layout da área administrativa (Server Component).
 *
 * Monta a casca estável (Sidebar + Header) e isola a área de conteúdo. A
 * interatividade (colapsar sidebar, rota ativa, dropdown) vive nos componentes
 * folha marcados com "use client" — o layout em si não precisa do diretivo.
 *
 * No alvo, este é o ponto de guarda do servidor: validar sessão e `is_admin()`
 * antes de renderizar (redirect caso contrário).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  return (
    <SidebarProvider>
      <AppSidebar usuario={usuario} />
      <SidebarInset>
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-6 bg-background p-4 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
