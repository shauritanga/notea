export const instant = false;

import Link from "next/link";
import { loginAction } from "@/app/actions";
import { PasswordField } from "@/components/password-field";
import { AuthFoot, Field, Frame, Note, Quiet, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const { lang } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "login")}</Title>
      <Quiet>{t(lang, "loginBody")}</Quiet>
      <Note>{error}</Note>
      <form className="grid gap-4" action={loginAction}>
        <Field label={t(lang, "identifier")} name="identifier" required />
        <PasswordField
          label={t(lang, "password")}
          name="password"
          required
          showLabel={t(lang, "showPassword")}
          hideLabel={t(lang, "hidePassword")}
        />
        <Submit>{t(lang, "login")}</Submit>
      </form>
      <AuthFoot>
        <p>
          {t(lang, "noAccount")}{" "}
          <Link className="app-link-strong" href="/register">
            {t(lang, "register")}
          </Link>
        </p>
        <Link className="app-link-quiet" href="/reset">
          {t(lang, "forgotPassword")}
        </Link>
        <Link className="app-link-quiet" href="/recover">
          {t(lang, "needHelp")} {t(lang, "recoverClosed")}
        </Link>
      </AuthFoot>
    </Frame>
  );
}
