export const instant = false;

import Link from "next/link";
import { registerAction } from "@/app/actions";
import { Field, Frame, Note, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function RegisterPage({ searchParams }: PageProps<"/">) {
  const { lang } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "register")}</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={registerAction}>
        <Field label={t(lang, "name")} name="name" required />
        <Field label={t(lang, "identifier")} name="identifier" required placeholder={lang === "en" ? "name@email.com or 07…" : "jina@barua.com au 07…"} />
        <Field label={t(lang, "password")} name="password" type="password" required />
        <label className="flex items-center gap-3 text-sm">
          <input name="terms" type="checkbox" required />
          {t(lang, "terms")}
        </label>
        <Submit>{t(lang, "continue")}</Submit>
      </form>
      <Link className="text-sm font-semibold text-pitch" href="/login">
        {t(lang, "login")}
      </Link>
    </Frame>
  );
}
