export const instant = false;

import { logoutAction, verifyAction } from "@/app/actions";
import { AuthFoot, Field, Frame, Note, Quiet, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function VerifyPage({ searchParams }: PageProps<"/">) {
  const { lang, devCode } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "verifyTitle")}</Title>
      <Quiet>{t(lang, "verifyBody")}</Quiet>
      {devCode ? <Note>{`${t(lang, "devCode")}: ${devCode}`}</Note> : null}
      <Note>{error}</Note>
      <form className="grid gap-4" action={verifyAction}>
        <Field label={t(lang, "code")} name="code" required />
        <Submit>{t(lang, "continue")}</Submit>
      </form>
      <AuthFoot>
        <form action={logoutAction}>
          <button className="app-link-quiet" type="submit">
            {t(lang, "stuckSignedIn")} {t(lang, "logout")}
          </button>
        </form>
      </AuthFoot>
    </Frame>
  );
}
