export default async (req) => {
  const SURL = Netlify.env.get("SUPABASE_URL");
  const KEY = Netlify.env.get("SUPABASE_SERVICE_KEY");
  const h = {
    "Content-Type": "application/json",
    "apikey": KEY,
    "Authorization": `Bearer ${KEY}`,
    "Prefer": "return=representation"
  };

  function getUserId(req) {
    try {
      const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
      return JSON.parse(atob(token.split(".")[1])).sub;
    } catch { return null; }
  }

  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  // GET /api/messages?match_id=xxx  — load thread
  if (req.method === "GET") {
    const url = new URL(req.url);
    const matchId = url.searchParams.get("match_id");
    if (!matchId) {
      // Return all threads (latest message per conversation)
      const res = await fetch(
        `${SURL}/rest/v1/messages?or=(sender_id.eq.${userId},recipient_id.eq.${userId})&order=created_at.desc&select=*`,
        { headers: h }
      );
      const msgs = await res.json();
      // Group by conversation partner
      const threads = {};
      for (const msg of (msgs || [])) {
        const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (!threads[partnerId]) threads[partnerId] = msg;
      }
      return new Response(JSON.stringify(Object.values(threads)), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }

    // Load full thread between user and match
    const res = await fetch(
      `${SURL}/rest/v1/messages?or=(and(sender_id.eq.${userId},recipient_id.eq.${matchId}),and(sender_id.eq.${matchId},recipient_id.eq.${userId}))&order=created_at.asc&select=*`,
      { headers: h }
    );

    // Mark messages as read
    await fetch(
      `${SURL}/rest/v1/messages?recipient_id=eq.${userId}&sender_id=eq.${matchId}&read=eq.false`,
      { method: "PATCH", headers: h, body: JSON.stringify({ read: true }) }
    );

    return new Response(await res.text(), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  // POST /api/messages — send a message
  if (req.method === "POST") {
    const { recipient_id, body, match_id } = await req.json();
    if (!recipient_id || !body) {
      return new Response(JSON.stringify({ error: "recipient_id and body required" }), { status: 400 });
    }

    const res = await fetch(`${SURL}/rest/v1/messages`, {
      method: "POST", headers: h,
      body: JSON.stringify({
        sender_id: userId,
        recipient_id,
        body: body.trim(),
        match_id: match_id || null,
        read: false
      })
    });
    const data = await res.json();

    // Update resonance: if this is user's first message sent, flag it
    await fetch(
      `${SURL}/rest/v1/profiles?id=eq.${userId}`,
      { method: "PATCH", headers: h, body: JSON.stringify({ has_messaged: true }) }
    );

    return new Response(JSON.stringify(data[0] || data), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  // GET unread count: GET /api/messages?unread=true
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/messages" };
