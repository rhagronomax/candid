import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Netlify.env.get("SUPABASE_URL"),
  Netlify.env.get("SUPABASE_SERVICE_KEY")
);

function getUserId(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    return null;
  }
}

export default async (req) => {
  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const withUserId = url.searchParams.get("with");

    if (withUserId) {
      // Get conversation with specific user
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", userId)
        .eq("sender_id", withUserId)
        .eq("read", false);

      return new Response(JSON.stringify(data), { status: 200 });
    }

    // Get all conversations (latest message per conversation)
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, tagline),
        receiver:profiles!messages_receiver_id_fkey(id, name, tagline)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

    // Deduplicate to one message per conversation
    const seen = new Set();
    const conversations = (data || []).filter((msg) => {
      const key = [msg.sender_id, msg.receiver_id].sort().join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify(conversations), { status: 200 });
  }

  if (req.method === "POST") {
    const { receiver_id, content } = await req.json();

    if (!receiver_id || !content?.trim()) {
      return new Response(JSON.stringify({ error: "receiver_id and content required" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: userId, receiver_id, content: content.trim() })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/messages" };
