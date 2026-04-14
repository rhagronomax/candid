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
    const res = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers: h });
    const data = await res.json();
    return new Response(JSON.stringify(data[0] || null), { status: 200 });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.json();
    const profile = {
      id: userId, name: body.name, tagline: body.tagline,
      achievement: body.achievement, open_to: body.open_to,
      match_mode: body.match_mode || "both", vibe_tags: body.vibe_tags || [],
      anonymous_mode: body.anonymous_mode ?? true,
      candid_link: body.name ? "candid.so/" + body.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"") : null
    };
    const res = await fetch(`${URL}/rest/v1/profiles`, {
      method: "POST",
      headers: { ...h, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    return new Response(JSON.stringify(Array.isArray(data) ? data[0] : data), { status: 200 });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/profile" };
