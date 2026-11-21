const RESEND_API = "https://api.resend.com/emails";
const BEEM_API = "https://apisms.beem.africa/v1/send";

function toBeemMsisdn(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^255/, "");
  return `255${digits}`;
}

async function sendVerificationEmail(to: string, code: string, lang: "sw" | "en") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[notea] RESEND_API_KEY/EMAIL_FROM not set; skipping email send to", to);
    return;
  }
  const subject = lang === "en" ? "Your Notea verification code" : "Namba yako ya uthibitisho ya Notea";
  const text =
    lang === "en"
      ? `Your verification code is ${code}. It expires in 10 minutes.`
      : `Namba yako ya uthibitisho ni ${code}. Itaisha baada ya dakika 10.`;
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    console.error("[notea] Resend send failed", res.status, await res.text().catch(() => ""));
  }
}

async function sendVerificationSms(to: string, code: string, lang: "sw" | "en") {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const senderId = process.env.SMS_SENDER_ID ?? process.env.BEEM_SOURCE_ADDR ?? "INFO";
  if (!apiKey || !secretKey) {
    console.warn("[notea] BEEM_API_KEY/BEEM_SECRET_KEY not set; skipping SMS send to", to);
    return;
  }
  const message = lang === "en" ? `Your Notea verification code is ${code}.` : `Namba yako ya uthibitisho ya Notea ni ${code}.`;
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

export async function sendVerificationCode(channel: "email" | "phone", to: string, code: string, lang: "sw" | "en" = "sw") {
  try {
    if (channel === "email") await sendVerificationEmail(to, code, lang);
    else await sendVerificationSms(to, code, lang);
  } catch (error) {
    console.error("[notea] sendVerificationCode failed", channel, error);
  }
}
