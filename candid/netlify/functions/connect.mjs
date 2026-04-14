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

  if (req.method === "POST") {
    const { receiver_id, action, connection_id } = await req.json();
    if (action === "request") {
      const res = await fetch(`${URL}/rest/v1/connections`, { method: "POST", headers: h, body: JSON.stringify({ requester_id: userId, receiver_id }) });
      return new Response(await res.text(), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (action === "accept" || action === "decline") {
      const res = await fetch(`${URL}/rest/v1/connections?id=eq.${connection_id}&receiver_id=eq.${userId}`, { method: "PATCH", headers: h, body: JSON.stringify({ status: action === "accept" ? "accepted" : "declined" }) });
      return new Response(await res.text(), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/connect" };
