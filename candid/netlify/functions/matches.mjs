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

async function generateMatchReason(userProfile, candidateProfile) {
  const prompt = `You are Candid's matching engine. Given two profiles, write a single short sentence (max 20 words) explaining why they are a match. Be specific, human, and insightful — not generic.

Person A:
- Name: ${userProfile.name}
- Tagline: ${userProfile.tagline}
- Achievement: ${userProfile.achievement}
- Open to: ${userProfile.open_to}
- Vibes: ${(userProfile.vibe_tags || []).join(", ")}

Person B:
- Name: ${candidateProfile.name}
- Tagline: ${candidateProfile.tagline}
- Achievement: ${candidateProfile.achievement}
- Open to: ${candidateProfile.open_to}
- Vibes: ${(candidateProfile.vibe_tags || []).join(", ")}

Also classify this match as one of: chemistry, connection, or vibe.
- chemistry = deep intellectual or professional alignment
- connection = complementary goals or shared context
- vibe = personality and energy match

Respond ONLY as JSON: {"reason": "...", "type": "chemistry|connection|vibe"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Netlify.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '{"reason":"Shared direction and complementary perspectives.","type":"connection"}';
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { reason: "Shared direction and complementary perspectives.", type: "connection" };
  }
}

export default async (req) => {
  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  if (req.method === "GET") {
    // Return existing matches with profile data
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        matched_profile:profiles!matches_matched_user_id_fkey(
          id, name, tagline, achievement, open_to, vibe_tags, anonymous_mode
        )
      `)
      .eq("user_id", userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  }

  if (req.method === "POST") {
    // Generate new matches for this user
    const { data: myProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !myProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
    }

    // Get candidates (not already matched, not self)
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("matched_user_id")
      .eq("user_id", userId);

    const alreadyMatched = (existingMatches || []).map((m) => m.matched_user_id);
    alreadyMatched.push(userId);

    const { data: candidates, error: candidatesError } = await supabase
      .from("profiles")
      .select("*")
      .not("id", "in", `(${alreadyMatched.join(",")})`)
      .limit(10);

    if (candidatesError || !candidates?.length) {
      return new Response(JSON.stringify({ matches: [], message: "No new candidates" }), { status: 200 });
    }

    const newMatches = [];
    for (const candidate of candidates.slice(0, 5)) {
      const { reason, type } = await generateMatchReason(myProfile, candidate);
      const { data: match } = await supabase
        .from("matches")
        .insert({
          user_id: userId,
          matched_user_id: candidate.id,
          match_type: type,
          match_reason: reason,
        })
        .select()
        .single();

      if (match) newMatches.push({ ...match, matched_profile: candidate });
    }

    return new Response(JSON.stringify(newMatches), { status: 200 });
  }

  if (req.method === "DELETE") {
    // Dismiss a match
    const { matchId } = await req.json();
    await supabase.from("matches").update({ status: "dismissed" }).eq("id", matchId).eq("user_id", userId);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/matches" };
