function getUserId(req) {
  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    return JSON.parse(atob(token.split(".")[1])).sub;
  } catch { return null; }
}

export default async (req) => {
  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const URL = Netlify.env.get("SUPABASE_URL");
  const KEY = Netlify.env.get("SUPABASE_SERVICE_KEY");
  const h = { "Content-Type": "application/json", "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Prefer": "return=representation" };

  if (req.method === "GET") {
    const res = await fetch(`${URL}/rest/v1/messages?or=(sender_id.eq.${userId},receiver_id.eq.${userId})&select=*,sender:profiles!messages_sender_id_fkey(id,name,tagline),receiver:profiles!messages_receiver_id_fkey(id,name,tagline)&order=created_at.desc`, { headers: h });
    const data = await res.json();
    const seen = new Set();
    const convos = (data || []).filter(msg => {
      const key = [msg.sender_id, msg.receiver_id].sort().join("-");
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    return new Response(JSON.stringify(convos), { status: 200 });
  }

  if (req.method === "POST") {
    const { receiver_id, content } = await req.json();
    const res = await fetch(`${URL}/rest/v1/messages`, { method: "POST", headers: h, body: JSON.stringify({ sender_id: userId, receiver_id, content }) });
    return new Response(await res.text(), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/messages" };
