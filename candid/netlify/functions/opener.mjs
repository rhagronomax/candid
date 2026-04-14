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
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { myProfile, theirProfile, matchReason } = await req.json();

  const prompt = `You are Candid's AI — you help people start real conversations, not pitch decks.

Write a short, genuine opening message from ${myProfile.name} to ${theirProfile.name}.

About the sender:
- ${myProfile.tagline}
- Achievement: ${myProfile.achievement}
- Open to: ${myProfile.open_to}

About the recipient:
- ${theirProfile.tagline}
- Why they were matched: ${matchReason}

Rules:
- Max 3 sentences
- No flattery, no pitch
- Sound like a real person, not a robot
- Reference something specific from the match reason
- End with a genuine question or observation, not a call to action

Return ONLY the message text, nothing else.`;

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
  const opener = data.content?.[0]?.text?.trim() || "Hey — noticed we're both working at the intersection of AI and trust. Would love to hear more about what you're building.";

  return new Response(JSON.stringify({ opener }), { status: 200 });
};

export const config = { path: "/api/opener" };
