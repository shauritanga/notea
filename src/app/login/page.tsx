export const instant = false;

import Link from "next/link";
import { loginAction } from "@/app/actions";
import { Field, Frame, Note, Stack, Submit, Title } from "@/components/ui";
import { readError } from "@/lib/viewer";

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>Ingia</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={loginAction}>
        <Field label="Email or phone" name="identifier" required />
        <Field label="Password" name="password" type="password" required />
        <Submit>Ingia</Submit>
      </form>
      <Stack>
        <Link className="text-sm text-pitch" href="/register">
          Fungua akaunti
        </Link>
        <Link className="text-sm text-muted" href="/recover">
          Recover a closed account
        </Link>
      </Stack>
    </Frame>
  );
}
