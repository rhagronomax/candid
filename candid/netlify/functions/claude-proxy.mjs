export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { system, message, maxTokens = 400 } = await req.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Netlify.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return new Response(JSON.stringify({ text }), { status: 200 });
};

export const config = { path: "/api/claude" };
