export default async (req) => {
  const SURL = Netlify.env.get("SUPABASE_URL");
  const KEY = Netlify.env.get("SUPABASE_SERVICE_KEY");
  const ANTHROPIC = Netlify.env.get("ANTHROPIC_API_KEY");
  const h = { "Content-Type": "application/json", "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Prefer": "return=representation" };

  function getUserId(req) {
    try {
      const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
      return JSON.parse(atob(token.split(".")[1])).sub;
    } catch { return null; }
  }

  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  if (req.method === "GET") {
    const res = await fetch(`${SURL}/rest/v1/matches?user_id=eq.${userId}&status=neq.dismissed&select=*,matched_profile:profiles!matches_matched_user_id_fkey(id,name,tagline,achievement,open_to,vibe_tags,anonymous_mode,current_focus,photo_url)&order=created_at.desc`, { headers: h });
    return new Response(await res.text(), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const profileRes = await fetch(`${SURL}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers: h });
    const profiles = await profileRes.json();
    const myProfile = profiles[0];
    if (!myProfile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });

    const existingRes = await fetch(`${SURL}/rest/v1/matches?user_id=eq.${userId}&select=matched_user_id`, { headers: h });
    const existing = await existingRes.json();
    const excludeIds = [userId, ...(existing || []).map(m => m.matched_user_id)];

    const candidatesRes = await fetch(`${SURL}/rest/v1/profiles?id=not.in.(${excludeIds.join(",")})&select=*&limit=5`, { headers: h });
    const candidates = await candidatesRes.json();
    if (!candidates?.length) return new Response(JSON.stringify([]), { status: 200 });

    const newMatches = [];
    for (const candidate of candidates) {
      let reason = "Shared direction and complementary perspectives.", type = "connection";
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 150,
            messages: [{ role: "user", content: `Match reason (max 20 words) + type (chemistry/connection/vibe) for:\nA: ${myProfile.name}, ${myProfile.tagline}\nB: ${candidate.name}, ${candidate.tagline}\nJSON only: {"reason":"...","type":"..."}` }]
          })
        });
        const aiData = await aiRes.json();
        const parsed = JSON.parse(aiData.content[0].text.replace(/```json|```/g,"").trim());
        reason = parsed.reason; type = parsed.type;
      } catch {}
      const matchRes = await fetch(`${SURL}/rest/v1/matches`, {
        method: "POST", headers: h,
        body: JSON.stringify({ user_id: userId, matched_user_id: candidate.id, match_type: type, match_reason: reason })
      });
      const match = await matchRes.json();
      if (match[0]) newMatches.push({ ...match[0], matched_profile: candidate });
    }
    return new Response(JSON.stringify(newMatches), { status: 200 });
  }

  if (req.method === "DELETE") {
    const { matchId } = await req.json();
    await fetch(`${SURL}/rest/v1/matches?id=eq.${matchId}&user_id=eq.${userId}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status: "dismissed" })
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/matches" };
