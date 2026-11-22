const RESEND_API = "https://api.resend.com/emails";
const BEEM_API = "https://apisms.beem.africa/v1/send";

function toBeemMsisdn(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^255/, "");
  return `255${digits}`;
}

function escapeHtml(value: string) {
  const chars: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => chars[char] ?? char);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "";
}

function verificationLetter(code: string, lang: "sw" | "en", name: string, purpose: "verify" | "reset" = "verify") {
  const person = firstName(name);
  const hello = lang === "en" ? `Hello${person ? ` ${person}` : ""},` : `Hujambo${person ? ` ${person}` : ""},`;
  const lead =
    purpose === "reset"
      ? lang === "en"
        ? "Your password reset code is:"
        : "Namba yako ya kubadili nenosiri ni:"
      : lang === "en"
        ? "Your verification code is:"
        : "Namba yako ya uthibitisho ni:";
  const expiry = lang === "en" ? "This code expires in 10 minutes." : "Namba hii itaisha baada ya dakika 10.";
  const warning =
    purpose === "reset"
      ? lang === "en"
        ? "If you did not ask to reset your password, you can ignore this email."
        : "Kama hukuomba kubadili nenosiri, puuza barua hii."
      : lang === "en"
        ? "If you did not attempt to sign in, please change your password immediately."
        : "Kama hukujaribu kuingia, tafadhali badilisha nenosiri lako mara moja.";
  const site = "https://notea.zanua.co.tz";
  const text = [hello, "", lead, "", code, "", expiry, "", warning, "", "---", "NOTEA", site, "", "Copyright © Notea"].join("\n");
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:560px;line-height:1.5;">
<p style="margin:0 0 16px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 8px;">${escapeHtml(lead)}</p>
<p style="margin:16px 0 20px;font-size:32px;letter-spacing:6px;font-weight:700;">${escapeHtml(code)}</p>
<p style="margin:0 0 16px;">${escapeHtml(expiry)}</p>
<p style="margin:0 0 24px;">${escapeHtml(warning)}</p>
<hr style="border:none;border-top:1px solid #ddd;margin:0 0 16px;">
<p style="margin:0 0 8px;font-weight:700;letter-spacing:0.08em;">NOTEA</p>
<p style="margin:0 0 16px;"><a href="${site}" style="color:#1a1a1a;">${lang === "en" ? "visit our website" : "tembelea tovuti"}</a> &nbsp;|&nbsp; <a href="${site}/login" style="color:#1a1a1a;">${lang === "en" ? "log in" : "ingia"}</a></p>
<p style="margin:0;color:#666;font-size:12px;">Copyright © Notea</p>
</div>`;
  return { text, html };
}

async function sendVerificationEmail(to: string, code: string, lang: "sw" | "en", name: string, purpose: "verify" | "reset" = "verify") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[notea] RESEND_API_KEY/EMAIL_FROM not set; skipping email send to", to);
    return;
  }
  const subject =
    purpose === "reset"
      ? lang === "en"
        ? "Reset your Notea password"
        : "Badili nenosiri lako la Notea"
      : lang === "en"
        ? "Your Notea verification code"
        : "Namba yako ya uthibitisho ya Notea";
  const letter = verificationLetter(code, lang, name, purpose);
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: letter.text, html: letter.html }),
  });
  if (!res.ok) {
    console.error("[notea] Resend send failed", res.status, await res.text().catch(() => ""));
  }
}

async function sendVerificationSms(to: string, code: string, lang: "sw" | "en", purpose: "verify" | "reset" = "verify") {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const senderId = process.env.SMS_SENDER_ID ?? process.env.BEEM_SOURCE_ADDR ?? "INFO";
  if (!apiKey || !secretKey) {
    console.warn("[notea] BEEM_API_KEY/BEEM_SECRET_KEY not set; skipping SMS send to", to);
    return;
  }
  const message =
    purpose === "reset"
      ? lang === "en"
        ? `Your Notea password reset code is ${code}.`
        : `Namba ya kubadili nenosiri la Notea ni ${code}.`
      : lang === "en"
        ? `Your Notea verification code is ${code}.`
        : `Namba yako ya uthibitisho ya Notea ni ${code}.`;
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const res = await fetch(BEEM_API, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source_addr: senderId,
      encoding: 0,
      schedule_time: "",
      message,
      recipients: [{ recipient_id: 1, dest_addr: toBeemMsisdn(to) }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.successful) {
    console.error("[notea] Beem send failed", res.status, data);
  }
}

export async function sendVerificationCode(
  channel: "email" | "phone",
  to: string,
  code: string,
  lang: "sw" | "en" = "sw",
  name = "",
  purpose: "verify" | "reset" = "verify",
) {
  try {
    if (channel === "email") await sendVerificationEmail(to, code, lang, name, purpose);
    else await sendVerificationSms(to, code, lang, purpose);
  } catch (error) {
    console.error("[notea] sendVerificationCode failed", channel, error);
  }
}
