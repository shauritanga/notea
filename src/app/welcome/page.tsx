export const instant = false;

import { redirect } from "next/navigation";
import { Frame, Ghost } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer } from "@/lib/viewer";

export default async function WelcomePage() {
  const { user, lang } = await getViewer();
  if (user?.onboardedAt) redirect("/");
  return (
    <Frame splash>
      <div className="app-splash-hero">
        <p className="text-sm font-semibold tracking-wide text-[#d7e7df]">NOTEA</p>
        <h1>{t(lang, "welcomeTitle")}</h1>
        <p className="max-w-[28ch] text-sm leading-6 text-[#d7e7df]">{t(lang, "welcomeBody")}</p>
      </div>
      <div className="app-splash-sheet">
        <Ghost href="/register" solid>{t(lang, "register")}</Ghost>
        <Ghost href="/login">{t(lang, "login")}</Ghost>
        <Ghost href="/clubs/new">{t(lang, "club")}</Ghost>
        <Ghost href="/businesses/new">{t(lang, "business")}</Ghost>
      </div>
    </Frame>
  );
}
