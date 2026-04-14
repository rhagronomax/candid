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
    const { data, error } = await supabase
      .from("connections")
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, name, tagline, anonymous_mode),
        receiver:profiles!connections_receiver_id_fkey(id, name, tagline, anonymous_mode)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  }

  if (req.method === "POST") {
    const { receiver_id, action, connection_id } = await req.json();

    if (action === "request") {
      const { data, error } = await supabase
        .from("connections")
        .insert({ requester_id: userId, receiver_id })
        .select()
        .single();

      // Update match status to connected
      await supabase
        .from("matches")
        .update({ status: "connected" })
        .eq("user_id", userId)
        .eq("matched_user_id", receiver_id);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      return new Response(JSON.stringify(data), { status: 200 });
    }

    if (action === "accept") {
      const { data, error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", connection_id)
        .eq("receiver_id", userId)
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      return new Response(JSON.stringify(data), { status: 200 });
    }

    if (action === "decline") {
      const { data, error } = await supabase
        .from("connections")
        .update({ status: "declined" })
        .eq("id", connection_id)
        .eq("receiver_id", userId)
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      return new Response(JSON.stringify(data), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/connect" };
