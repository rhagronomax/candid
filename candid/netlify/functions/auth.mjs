import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Netlify.env.get("SUPABASE_URL"),
  Netlify.env.get("SUPABASE_SERVICE_KEY")
);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { action, email, password } = await req.json();

  if (action === "signup") {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify({ user: data.user }), { status: 200 });
  }

  if (action === "signin") {
    const anonClient = createClient(
      Netlify.env.get("SUPABASE_URL"),
      Netlify.env.get("SUPABASE_ANON_KEY")
    );
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    return new Response(JSON.stringify({ session: data.session, user: data.user }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
};

export const config = { path: "/api/auth" };
