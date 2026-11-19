export const instant = false;

import { redirect } from "next/navigation";
import { Frame, Ghost } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer } from "@/lib/viewer";

export default async function WelcomePage() {
  const { user, lang } = await getViewer();
  if (user?.onboardedAt) redirect("/");
  if (user) redirect(user.status === "pending_verification" ? "/verify" : "/onboarding");
  return (
    <Frame>
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
