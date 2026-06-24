/**
 * Itens de navegação da área administrativa, compartilhados entre a Sidebar
 * (links + estado ativo) e o Header (título da seção/breadcrumb).
 *
 * Ícones e rótulos conforme Visao_Administrador.md → seção "Navegação".
 *
 * Visibilidade por papel: estas são telas administrativas. No alvo, a
 * renderização é condicionada a `is_admin()` e protegida no servidor pela RLS
 * — esconder o menu nunca é a barreira de segurança.
 */
import {
  CalendarClock,
  History,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface ItemNavegacao {
  titulo: string;
  href: string;
  icone: LucideIcon;
}

export const NAV_ADMIN: ItemNavegacao[] = [
  { titulo: "Dashboard", href: "/admin/dashboard", icone: LayoutDashboard },
  { titulo: "Novo Lançamento", href: "/admin/lancamento", icone: PlusCircle },
  { titulo: "Auditoria", href: "/admin/auditoria", icone: ShieldCheck },
  {
    titulo: "Fechamento Quinzenal",
    href: "/admin/fechamento",
    icone: CalendarClock,
  },
  {
    titulo: "Configurações de Taxas",
    href: "/admin/configuracoes",
    icone: SlidersHorizontal,
  },
];

/**
 * Navegação do Analista (usuário comum). Sob o prefixo `/analista/*` para
 * conviver com a área admin (que ocupa as rotas-raiz) sem colidir no roteador.
 */
export const NAV_ANALISTA: ItemNavegacao[] = [
  { titulo: "Dashboard", href: "/analista/dashboard", icone: LayoutDashboard },
  { titulo: "Histórico", href: "/analista/historico", icone: History },
];

/**
 * Rota inicial do usuário resolvida pelo papel no banco (`usuarios.is_admin`).
 * Fonte única de verdade do roteamento pós-login — usada na raiz `/` e no
 * callback OAuth. Sem `is_admin` (padrão de novos usuários) → área do analista.
 */
export function rotaInicialPorPapel(isAdmin: boolean): string {
  return isAdmin ? "/admin/dashboard" : "/analista/dashboard";
}

/** Resolve o título da seção atual a partir do pathname (match por prefixo). */
export function tituloDaRota(pathname: string): string {
  const item = [...NAV_ADMIN, ...NAV_ANALISTA].find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return item?.titulo ?? "LançaQi";
}
