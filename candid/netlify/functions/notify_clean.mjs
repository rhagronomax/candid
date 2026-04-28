// Email notifications via Resend (resend.com — free tier: 3000 emails/month)
// Set RESEND_API_KEY in Netlify env vars to enable
// If key not set, notifications are silently skipped

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const RESEND_KEY = Netlify.env.get("RESEND_API_KEY");
  const SURL = Netlify.env.get("SUPABASE_URL");
  const KEY = Netlify.env.get("SUPABASE_SERVICE_KEY");
  const h = { "Content-Type": "application/json", "apikey": KEY, "Authorization": `Bearer ${KEY}` };

  function getUserId(req) {
    try {
      const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
      return JSON.parse(atob(token.split(".")[1])).sub;
    } catch { return null; }
  }

  const userId = getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { type, recipientId, senderName, matchReason } = await req.json();
  // type: "new_match" | "new_message"

  if (!RESEND_KEY) {
    // Notifications not configured — skip silently
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  // Get recipient email from auth.users via service key
  const userRes = await fetch(`${SURL}/auth/v1/admin/users/${recipientId}`, {
    headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
  });
  const userData = await userRes.json();
  const email = userData?.email;
  if (!email || email.endsWith('@candid.test')) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const subjects = {
    new_match: `✦ You have a new find on Candid`,
    new_message: `💬 ${senderName} sent you a message on Candid`
  };

  const bodies = {
    new_match: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#f0f0f0;border-radius:16px;">
        <div style="font-size:1.5rem;font-weight:300;margin-bottom:0.5rem;color:#f0f0f0;">candid<span style="color:#00FFB2;">.</span></div>
        <h2 style="font-size:1.1rem;font-weight:400;color:#f0f0f0;margin:1.5rem 0 0.5rem;">You have a new find.</h2>
        <p style="color:#888;font-size:0.9rem;line-height:1.6;">${matchReason || 'Someone on Candid matches your profile.'}</p>
        <a href="https://b-candid.netlify.app" style="display:inline-block;margin-top:1.5rem;background:#00FFB2;color:#000;text-decoration:none;border-radius:100px;padding:0.75rem 1.5rem;font-weight:700;font-size:0.9rem;">See your finds →</a>
        <p style="color:#555;font-size:0.75rem;margin-top:2rem;">You're receiving this because you have a Candid account. <a href="https://b-candid.netlify.app" style="color:#555;">Manage preferences</a></p>
      </div>
    `,
    new_message: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#f0f0f0;border-radius:16px;">
        <div style="font-size:1.5rem;font-weight:300;margin-bottom:0.5rem;color:#f0f0f0;">candid<span style="color:#00FFB2;">.</span></div>
        <h2 style="font-size:1.1rem;font-weight:400;color:#f0f0f0;margin:1.5rem 0 0.5rem;">${senderName} reached out.</h2>
        <p style="color:#888;font-size:0.9rem;line-height:1.6;">They sent you a message on Candid. Keep it real.</p>
        <a href="https://b-candid.netlify.app" style="display:inline-block;margin-top:1.5rem;background:#00FFB2;color:#000;text-decoration:none;border-radius:100px;padding:0.75rem 1.5rem;font-weight:700;font-size:0.9rem;">Reply →</a>
        <p style="color:#555;font-size:0.75rem;margin-top:2rem;">You're receiving this because you have a Candid account. <a href="https://b-candid.netlify.app" style="color:#555;">Manage preferences</a></p>
      </div>
    `
  };

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: "Candid <notifications@b-candid.netlify.app>",
      to: [email],
      subject: subjects[type] || "You have a notification on Candid",
      html: bodies[type] || bodies.new_match
    })
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const config = { path: "/api/notify" };
