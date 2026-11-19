export const instant = false;

import { finishRecoveryAction, recoverAction } from "@/app/actions";
import { Field, Frame, Note, Quiet, Stack, Submit, Title } from "@/components/ui";
import { getViewer, readError } from "@/lib/viewer";

export default async function RecoverPage({ searchParams }: PageProps<"/">) {
  const { devCode } = await getViewer();
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>Recover</Title>
      <Quiet>Use the phone or email on a deactivated account.</Quiet>
      <Note>{error}</Note>
      {devCode ? <Note>{`Code: ${devCode}`}</Note> : null}
      <Stack>
        <form className="grid gap-4" action={recoverAction}>
          <Field label="Email or phone" name="identifier" required />
          <Submit>Send code</Submit>
        </form>
        <form className="grid gap-4" action={finishRecoveryAction}>
          <Field label="Code" name="code" required />
          <Submit>Open my account</Submit>
        </form>
      </Stack>
    </Frame>
  );
}
