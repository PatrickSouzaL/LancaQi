"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Encerra a sessão do usuário (admin ou analista) e volta ao login.
 *
 * `signOut()` limpa os cookies da sessão — em Server Actions há resposta para
 * mutar, então o `setAll` do `createClient` grava sem lançar (ao contrário de
 * um Server Component). O `redirect` precisa ficar FORA de try/catch porque
 * sinaliza via throw de `NEXT_REDIRECT`.
 */
export async function sair(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    // Mesmo se a revogação remota falhar, seguimos para o login: os cookies
    // locais são removidos e a sessão deixa de ser válida no próximo getUser().
    console.error("sair: falha ao encerrar a sessão.", error.message);
  }

  redirect("/login");
}
