export const instant = false;

import { redirect } from "next/navigation";
import { onboardAction } from "@/app/actions";
import { Frame, Note, Submit, Title } from "@/components/ui";
import { t, type CopyKey } from "@/i18n/messages";
import { getViewer, readError } from "@/lib/viewer";

const roles: Array<["fan" | "player" | "coach" | "scout", CopyKey]> = [
  ["fan", "roleFan"],
  ["player", "rolePlayer"],
  ["coach", "roleCoach"],
  ["scout", "roleScout"],
];

export default async function OnboardingPage({ searchParams }: PageProps<"/">) {
  const { user, lang } = await getViewer();
  if (!user) redirect("/welcome");
  if (user.status === "pending_verification") redirect("/verify");
  if (user.onboardedAt) redirect("/");
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>{t(lang, "profileAsk")}</Title>
      <Note>{error}</Note>
      <form className="grid gap-3" action={onboardAction}>
        {roles.map(([value, label]) => (
          <label key={value} className="app-choice">
            <input type="checkbox" name="profile" value={value} defaultChecked={value === "fan"} />
            <span>{t(lang, label)}</span>
          </label>
        ))}
        <Submit>{t(lang, "continue")}</Submit>
      </form>
    </Frame>
  );
}
