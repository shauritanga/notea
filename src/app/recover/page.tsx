export const instant = false;

import Link from "next/link";
import { finishRecoveryAction, recoverAction } from "@/app/actions";
import { AuthFoot, Field, Frame, Note, Quiet, Stack, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function RecoverPage({ searchParams }: PageProps<"/">) {
  const { lang, devCode } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame back="/login">
      <Title>{t(lang, "recoverTitle")}</Title>
      <Quiet>{t(lang, "recoverBody")}</Quiet>
      {devCode ? <Note>{`${t(lang, "devCode")}: ${devCode}`}</Note> : null}
      <Note>{error}</Note>
      <Stack>
        <form className="grid gap-4" action={recoverAction}>
          <p className="app-foot-step">
            <span>1</span>
            {t(lang, "recoverStep1")}
          </p>
          <Field label={t(lang, "identifier")} name="identifier" required />
          <Submit>{t(lang, "sendCode")}</Submit>
        </form>
        <form className="grid gap-4" action={finishRecoveryAction}>
          <p className="app-foot-step">
            <span>2</span>
            {t(lang, "recoverStep2")}
          </p>
          <Field label={t(lang, "code")} name="code" required />
          <Submit>{t(lang, "openAccount")}</Submit>
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
