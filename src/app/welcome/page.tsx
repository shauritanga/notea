export const instant = false;

import { redirect } from "next/navigation";
import { Frame, Ghost, Quiet, Stack, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer } from "@/lib/viewer";

export default async function WelcomePage() {
  const { user, lang } = await getViewer();
  if (user?.onboardedAt) redirect("/");
  return (
    <Frame>
      <Stack>
        <Title>{t(lang, "welcomeTitle")}</Title>
        <Quiet>{t(lang, "welcomeBody")}</Quiet>
      </Stack>
      <Stack>
        <Ghost href="/register">{t(lang, "register")}</Ghost>
        <Ghost href="/login">{t(lang, "login")}</Ghost>
        <Ghost href="/clubs/new">{t(lang, "club")}</Ghost>
        <Ghost href="/businesses/new">{t(lang, "business")}</Ghost>
      </Stack>
    </Frame>
  );
}
