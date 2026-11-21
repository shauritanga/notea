export const instant = false;

import Link from "next/link";
import { registerAction } from "@/app/actions";
import { IdentifierField } from "@/components/identifier-field";
import { PasswordField } from "@/components/password-field";
import { AuthFoot, Check, Field, Frame, Note, Quiet, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function RegisterPage({ searchParams }: PageProps<"/">) {
  const { lang } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame back="/welcome">
      <Title>{t(lang, "register")}</Title>
      <Quiet>{t(lang, "registerBody")}</Quiet>
      <Note>{error}</Note>
      <form className="grid gap-4" action={registerAction}>
        <Field label={t(lang, "name")} name="name" required />
        <IdentifierField
          label={t(lang, "identifier")}
          emailLabel={t(lang, "email")}
          phoneLabel={t(lang, "phone")}
          emailPlaceholder={t(lang, "emailPlaceholder")}
          phonePlaceholder={t(lang, "phonePlaceholder")}
        />
        <PasswordField
          label={t(lang, "password")}
          name="password"
          required
          placeholder={lang === "en" ? "At least 8 characters" : "Angalau herufi 8"}
          showLabel={t(lang, "showPassword")}
          hideLabel={t(lang, "hidePassword")}
        />
        <Check label={t(lang, "terms")} name="terms" />
        <Submit>{t(lang, "continue")}</Submit>
      </form>
      <AuthFoot>
        <p>
          {t(lang, "haveAccount")}{" "}
          <Link className="app-link-strong" href="/login">
            {t(lang, "login")}
          </Link>
        </p>
      </AuthFoot>
    </Frame>
  );
}
