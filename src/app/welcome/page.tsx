export const instant = false;

import { redirect } from "next/navigation";
import { setLanguageAction } from "@/app/actions";
import { Frame, Ghost } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer } from "@/lib/viewer";

export default async function WelcomePage() {
  const { user, lang } = await getViewer();
  if (user?.onboardedAt) redirect("/");
  if (user) redirect(user.status === "pending_verification" ? "/verify" : "/onboarding");
  const nextLang = lang === "en" ? "sw" : "en";
  return (
    <Frame
      bg="/welcome-bg.jpg"
      corner={
        <form action={setLanguageAction}>
          <input type="hidden" name="lang" value={nextLang} />
          <button type="submit" className="app-globe" aria-label={lang === "en" ? "Badilisha kwenda Kiswahili" : "Switch to English"}>
            <GlobeIcon />
          </button>
        </form>
      }
    >
      <div className="app-auth-intro">
        <h1>{t(lang, "welcomeTitle")}</h1>
        <p>{t(lang, "welcomeBody")}</p>
      </div>
      <div className="app-auth-actions">
        <Ghost href="/register" solid>
          {t(lang, "register")}
        </Ghost>
        <Ghost href="/login">{t(lang, "login")}</Ghost>
      </div>
    </Frame>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.4 3.6 5.6 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.6-3.6-9S9.6 5.4 12 3Z" />
    </svg>
  );
}
