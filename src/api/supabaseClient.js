/**
 * Supabase client for vector memory and cross-device sync.
 * Uses the project's Supabase URL + anon key from settings.
 * Falls back gracefully if not configured.
 */

let supabase = null;

async function getClient() {
  if (supabase) return supabase;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const { getSettings } = await import("../store/settings.js");
    const settings = getSettings();
    const url = settings.model?.supabaseUrl || "";
    const key = settings.model?.supabaseAnonKey || "";
    if (!url || !key) return null;
    supabase = createClient(url, key);
    return supabase;
  } catch {
    return null;
  }
}

/** Check if Supabase is configured */
export async function isSupabaseReady() {
  const client = await getClient();
  return !!client;
}

/**
 * Search memories by embedding similarity (pgvector cosine).
 * Falls back to empty if Supabase not configured.
 */
export async function searchSupabaseMemories(chatSpaceId, queryText, limit = 5) {
  const client = await getClient();
  if (!client) return [];

  try {
    // Use Supabase RPC for vector search
    const { data, error } = await client.rpc("search_memories", {
      p_chat_space_id: chatSpaceId,
      p_query: queryText,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  } catch {
    // If RPC doesn't exist yet, try direct table query with match
    try {
      const { data } = await client
        .from("character_memories")
        .select("id, text, importance, created_at")
        .eq("chat_space_id", chatSpaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  }
}

/**
 * Save memory to Supabase. Triggers server-side embedding generation.
 */
export async function saveSupabaseMemory({ chatSpaceId, text, type = "event", importance = 0.5 }) {
  const client = await getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("character_memories")
      .insert({
        chat_space_id: chatSpaceId,
        text,
        semantic_type: type,
        importance,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get memory count for a chat space.
 */
export async function getSupabaseMemoryCount(chatSpaceId) {
  const client = await getClient();
  if (!client) return 0;

  try {
    const { count, error } = await client
      .from("character_memories")
      .select("*", { count: "exact", head: true })
      .eq("chat_space_id", chatSpaceId);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}
