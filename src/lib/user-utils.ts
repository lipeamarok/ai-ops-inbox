import { supabaseAdmin } from "./supabase-server";

/**
 * Normaliza um identifier (email/nome) para comparação consistente.
 * Remove espaços extras e converte para minúsculas.
 */
export function normalizeIdentifier(input: string): string {
  return input.trim().toLowerCase();
}

export interface User {
  id: string;
  identifier: string;
  display_name: string | null;
  created_at: string;
}

/**
 * Resolve um identifier para um user_id.
 * Se o usuário não existir, cria automaticamente.
 * Retorna o objeto User completo.
 */
export async function resolveUserId(rawIdentifier: string): Promise<User> {
  const identifier = normalizeIdentifier(rawIdentifier);

  if (!identifier) {
    throw new Error("Identifier cannot be empty");
  }

  // Tentar buscar usuário existente
  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("identifier", identifier)
    .single();

  if (existingUser && !selectError) {
    return existingUser as User;
  }

  // Se não existe, criar novo usuário
  const { data: newUser, error: insertError } = await supabaseAdmin
    .from("users")
    .insert([
      {
        identifier,
        display_name: rawIdentifier.trim(), // Mantém o display original
      },
    ])
    .select("*")
    .single();

  if (insertError || !newUser) {
    // Pode ter ocorrido race condition, tentar buscar novamente
    const { data: retryUser, error: retryError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("identifier", identifier)
      .single();

    if (retryUser && !retryError) {
      return retryUser as User;
    }

    throw new Error(`Failed to resolve user: ${insertError?.message || retryError?.message}`);
  }

  return newUser as User;
}

/**
 * Converte tags de string (banco) para array (frontend).
 * Lida com casos onde tags pode ser null, string vazia, ou já array.
 */
export function parseTagsFromDb(tags: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    if (tags.trim() === "") return [];
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Converte tags de array (frontend/enrichment) para string (banco).
 */
export function tagsToDbString(tags: string[] | string | null): string {
  if (!tags) return "";
  if (typeof tags === "string") return tags;
  if (Array.isArray(tags)) return tags.join(",");
  return "";
}

/**
 * Valida se uma string é um UUID válido.
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
