export const instant = false;

import { logoutAction, resendVerificationAction, verifyAction } from "@/app/actions";
import { VerifyTimer } from "@/components/verify-timer";
import { latestVerification } from "@/domain/accounts";
import { AuthFoot, Field, Frame, Note, Quiet, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

export default async function VerifyPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang, devCode } = await getViewer();
  const issued = user ? await latestVerification(db, user.id) : null;
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "verifyTitle")}</Title>
      <Quiet>{t(lang, "verifyBody")}</Quiet>
      {devCode ? (
        <p className="app-code">
          <small>{t(lang, "devCode")}</small>
          <strong>{devCode}</strong>
        </p>
      ) : null}
      <Note>{error}</Note>
      <form className="grid gap-4" action={verifyAction}>
        <Field label={t(lang, "code")} name="code" required defaultValue={devCode} />
        <Submit>{t(lang, "continue")}</Submit>
      </form>
      <VerifyTimer
        serverNow={Date.now()}
        sentAt={issued?.createdAt.getTime() ?? 0}
        expiresAt={issued?.expiresAt.getTime() ?? 0}
        expiresLabel={t(lang, "codeExpires")}
        expiredLabel={t(lang, "codeExpired")}
        resendLabel={t(lang, "resendCode")}
        resendInLabel={t(lang, "resendIn")}
        action={resendVerificationAction}
      />
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
