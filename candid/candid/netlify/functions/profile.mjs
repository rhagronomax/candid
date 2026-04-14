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
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.json();
    const profile = {
      id: userId,
      name: body.name,
      tagline: body.tagline,
      achievement: body.achievement,
      open_to: body.open_to,
      match_mode: body.match_mode || "both",
      vibe_tags: body.vibe_tags || [],
      anonymous_mode: body.anonymous_mode ?? true,
      candid_link: body.name
        ? "candid.so/" + body.name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")
        : null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/profile" };
