export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { action, email, password } = await req.json();
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Netlify.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_KEY");

  if (action === "signup") {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const data = await res.json();
    if (data.error || data.msg) return new Response(JSON.stringify({ error: data.error || data.msg }), { status: 400 });
    return new Response(JSON.stringify({ user: data }), { status: 200 });
  }

  if (action === "signin") {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error || data.error_description) return new Response(JSON.stringify({ error: data.error_description || data.error }), { status: 401 });
    return new Response(JSON.stringify({ session: { access_token: data.access_token, refresh_token: data.refresh_token }, user: data.user }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
};

export const config = { path: "/api/auth" };
