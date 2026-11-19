export const instant = false;

import { registerAction } from "@/app/actions";
import { Field, Frame, Note, Quiet, Stack, Submit, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { readError } from "@/lib/viewer";

export default async function RegisterPage({ searchParams }: PageProps<"/">) {
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t("sw", "register")}</Title>
      <Quiet>Phone or email. Nothing else is required yet.</Quiet>
      <Note>{error}</Note>
      <form className="grid gap-4" action={registerAction}>
        <Field label="Jina / Name" name="name" required />
        <Field label="Barua pepe / Email" name="email" type="email" />
        <Field label="Simu / Phone" name="phone" />
        <Field label="Nenosiri / Password" name="password" type="password" required />
        <label className="flex items-center gap-3 text-sm">
          <input name="terms" type="checkbox" required />
          Nakubali masharti. I accept the terms.
        </label>
        <Stack>
          <label className="text-sm">
            Language
            <select className="mt-2 h-12 w-full rounded-2xl border border-line px-4" name="language" defaultValue="sw">
              <option value="sw">Kiswahili</option>
              <option value="en">English</option>
            </select>
          </label>
          <Submit>Endelea</Submit>
        </Stack>
      </form>
    </Frame>
  );
}
