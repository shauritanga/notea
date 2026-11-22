export const instant = false;

import Link from "next/link";
import { resetFinishAction, resetRequestAction } from "@/app/actions";
import { PasswordField } from "@/components/password-field";
import { AuthFoot, Field, Frame, Note, Quiet, Stack, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function ResetPage({ searchParams }: PageProps<"/">) {
  const { lang, devCode } = await getViewer();
  const params = await searchParams;
  const error = await readError(searchParams);
  const sent = "sent" in params && params.sent === "1";
  return (
    <Frame back="/login">
      <Title>{t(lang, "resetTitle")}</Title>
      <Quiet>{t(lang, "resetBody")}</Quiet>
      {devCode ? <Note>{`${t(lang, "devCode")}: ${devCode}`}</Note> : null}
      {sent ? <Note>{t(lang, "resetSent")}</Note> : null}
      <Note>{error}</Note>
      <Stack>
        <form className="grid gap-4" action={resetRequestAction}>
          <p className="app-foot-step">
            <span>1</span>
            {t(lang, "resetStep1")}
          </p>
          <Field label={t(lang, "identifier")} name="identifier" required />
          <Submit>{t(lang, "sendCode")}</Submit>
        </form>
        <form className="grid gap-4" action={resetFinishAction}>
          <p className="app-foot-step">
            <span>2</span>
            {t(lang, "resetStep2")}
          </p>
          <Field label={t(lang, "code")} name="code" required />
          <PasswordField
            label={t(lang, "newPassword")}
            name="password"
            required
            showLabel={t(lang, "showPassword")}
            hideLabel={t(lang, "hidePassword")}
          />
          <PasswordField
            label={t(lang, "confirmPassword")}
            name="confirm"
            required
            showLabel={t(lang, "showPassword")}
            hideLabel={t(lang, "hidePassword")}
          />
          <Submit>{t(lang, "savePassword")}</Submit>
        </form>
      </Stack>
      <AuthFoot>
        <Link className="app-link-quiet" href="/login">
          {t(lang, "backToLogin")}
        </Link>
      </AuthFoot>
    </Frame>
  );
}
