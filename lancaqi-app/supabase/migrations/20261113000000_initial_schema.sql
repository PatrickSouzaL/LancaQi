


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    new.id, 
    new.email, 
    -- Tenta pegar o nome vindo do provedor OAuth (Microsoft)
    new.raw_user_meta_data->>'full_name' 
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT is_admin FROM public.usuarios WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "endereco" "text",
    "cnpj" "text",
    "telefone" "text",
    "criado_em" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracoes_taxas" (
    "id" integer NOT NULL,
    "valor_fixo_escritorio" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "taxa_km_moto" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "taxa_km_carro" numeric(10,2) DEFAULT 0.00 NOT NULL
);


ALTER TABLE "public"."configuracoes_taxas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuracoes_taxas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."configuracoes_taxas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuracoes_taxas_id_seq" OWNED BY "public"."configuracoes_taxas"."id";



CREATE TABLE IF NOT EXISTS "public"."despesas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "data" "date" NOT NULL,
    "origem" "text",
    "destino" "text",
    "tipo" "text" NOT NULL,
    "quantidade_km" numeric(10,2),
    "valor_calculado" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'PENDENTE'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "cliente_id" "uuid",
    "descricao" "text",
    "valor_declarado" numeric(10,2),
    "aprovador_id" "uuid",
    "decidido_em" timestamp with time zone,
    "motivo_negacao" "text",
    CONSTRAINT "despesas_motivo_negacao_coerente" CHECK (((("status" = 'NEGADO'::"text") AND ("motivo_negacao" IS NOT NULL) AND ("length"("btrim"("motivo_negacao")) > 0)) OR (("status" <> 'NEGADO'::"text") AND ("motivo_negacao" IS NULL)))),
    CONSTRAINT "despesas_status_check" CHECK (("status" = ANY (ARRAY['PENDENTE'::"text", 'APROVADO'::"text", 'NEGADO'::"text", 'PAGO'::"text"]))),
    CONSTRAINT "despesas_tipo_check" CHECK (("tipo" = ANY (ARRAY['ESCRITORIO'::"text", 'MOTO'::"text", 'CARRO'::"text", 'PEDAGIO'::"text", 'ESTACIONAMENTO'::"text", 'ALIMENTACAO_EXTERNA'::"text", 'ALMOCO_CLIENTE'::"text", 'LICENCA_SOFTWARE'::"text", 'EQUIPAMENTO'::"text", 'HOSPEDAGEM'::"text", 'PASSAGEM'::"text", 'OUTROS'::"text"]))),
    CONSTRAINT "despesas_valor_declarado_nao_negativo" CHECK ((("valor_declarado" IS NULL) OR ("valor_declarado" >= (0)::numeric)))
);


ALTER TABLE "public"."despesas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."despesas_aprovacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "despesa_id" "uuid" NOT NULL,
    "aprovador_id" "uuid",
    "acao" "text" NOT NULL,
    "motivo" "text",
    "criado_em" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "despesas_aprovacoes_acao_check" CHECK (("acao" = ANY (ARRAY['APROVADA'::"text", 'NEGADA'::"text", 'REVERTIDA'::"text"])))
);


ALTER TABLE "public"."despesas_aprovacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "nome" "text",
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."configuracoes_taxas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuracoes_taxas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracoes_taxas"
    ADD CONSTRAINT "configuracoes_taxas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."despesas_aprovacoes"
    ADD CONSTRAINT "despesas_aprovacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."despesas"
    ADD CONSTRAINT "despesas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_despesas_aprovacoes_despesa_id" ON "public"."despesas_aprovacoes" USING "btree" ("despesa_id");



CREATE INDEX "idx_despesas_cliente_id" ON "public"."despesas" USING "btree" ("cliente_id");



CREATE INDEX "idx_despesas_pendentes_aprovacao" ON "public"."despesas" USING "btree" ("criado_em") WHERE ("status" = 'PENDENTE'::"text");



CREATE INDEX "idx_despesas_status" ON "public"."despesas" USING "btree" ("status");



ALTER TABLE ONLY "public"."despesas_aprovacoes"
    ADD CONSTRAINT "despesas_aprovacoes_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."despesas_aprovacoes"
    ADD CONSTRAINT "despesas_aprovacoes_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "public"."despesas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."despesas"
    ADD CONSTRAINT "despesas_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."despesas"
    ADD CONSTRAINT "despesas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."despesas"
    ADD CONSTRAINT "despesas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Atualizacao de despesas" ON "public"."despesas" FOR UPDATE USING (((("auth"."uid"() = "usuario_id") AND ("status" = 'PENDENTE'::"text")) OR "public"."is_admin"())) WITH CHECK (((("auth"."uid"() = "usuario_id") AND ("status" = 'PENDENTE'::"text")) OR "public"."is_admin"()));



CREATE POLICY "Atualizacao de taxas restrita a admin" ON "public"."configuracoes_taxas" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Escrita de clientes restrita a admin" ON "public"."clientes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."is_admin" = true)))));



CREATE POLICY "Exclusao de despesas" ON "public"."despesas" FOR DELETE USING (((("auth"."uid"() = "usuario_id") AND ("status" = 'PENDENTE'::"text")) OR "public"."is_admin"()));



CREATE POLICY "Insercao de aprovacoes restrita a admin" ON "public"."despesas_aprovacoes" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Insercao de despesas" ON "public"."despesas" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Leitura de aprovacoes" ON "public"."despesas_aprovacoes" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."despesas" "d"
  WHERE (("d"."id" = "despesas_aprovacoes"."despesa_id") AND ("d"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "Leitura de clientes para autenticados" ON "public"."clientes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Leitura de despesas" ON "public"."despesas" FOR SELECT USING ((("auth"."uid"() = "usuario_id") OR "public"."is_admin"()));



CREATE POLICY "Leitura de taxas" ON "public"."configuracoes_taxas" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Leitura de usuarios" ON "public"."usuarios" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuracoes_taxas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."despesas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."despesas_aprovacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."configuracoes_taxas" TO "anon";
GRANT ALL ON TABLE "public"."configuracoes_taxas" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracoes_taxas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuracoes_taxas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuracoes_taxas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuracoes_taxas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."despesas" TO "anon";
GRANT ALL ON TABLE "public"."despesas" TO "authenticated";
GRANT ALL ON TABLE "public"."despesas" TO "service_role";



GRANT ALL ON TABLE "public"."despesas_aprovacoes" TO "anon";
GRANT ALL ON TABLE "public"."despesas_aprovacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."despesas_aprovacoes" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































