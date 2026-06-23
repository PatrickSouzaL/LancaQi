import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/data/auth";

/**
 * Layout da área administrativa (Server Component).
 *
 * Monta a casca estável (Sidebar + Header) e isola a área de conteúdo. A
 * interatividade (colapsar sidebar, rota ativa, dropdown) vive nos componentes
 * folha marcados com "use client" — o layout em si não precisa do diretivo.
 *
 * Guarda de servidor: `requireAdmin()` valida a sessão e o privilégio
 * `is_admin` no banco (camada segura, além do proxy otimista). Não-admins são
 * redirecionados; sem sessão, vão para /login.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireAdmin();

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
