import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso SERVER-SIDE com service_role key.
 * Ignora RLS e tem acesso total ao banco.
 * NÃO usar no frontend!
 * 
 * Configurações:
 * - Headers globais com Accept-Charset UTF-8
 * - Sem auto-refresh de token (server-side)
 * - Sem persistência de sessão
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      "Accept-Charset": "utf-8",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});
