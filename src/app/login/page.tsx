export const instant = false;

import Link from "next/link";
import { loginAction } from "@/app/actions";
import { Field, Frame, Note, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const { lang } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "login")}</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={loginAction}>
        <Field label={t(lang, "identifier")} name="identifier" required />
        <Field label={t(lang, "password")} name="password" type="password" required />
        <Submit>{t(lang, "login")}</Submit>
      </form>
      <Link className="text-sm font-semibold text-pitch" href="/register">
        {t(lang, "register")}
      </Link>
      <Link className="text-sm text-muted" href="/recover">
        {lang === "en" ? "Recover a closed account" : "Rejesha akaunti iliyofungwa"}
      </Link>
    </Frame>
  );
}
