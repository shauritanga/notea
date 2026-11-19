export const instant = false;

import { redirect } from "next/navigation";
import { onboardAction } from "@/app/actions";
import { Field, Frame, Note, Quiet, Submit, Title } from "@/components/ui";
import { interests, regions } from "@/lib/options";
import { getViewer, readError } from "@/lib/viewer";

export default async function OnboardingPage({ searchParams }: PageProps<"/">) {
  const { user } = await getViewer();
  if (!user) redirect("/welcome");
  if (user.status === "pending_verification") redirect("/verify");
  if (user.onboardedAt) redirect("/");
  const error = await readError(searchParams);
  return (
    <Frame>
      <Title>Karibu</Title>
      <Quiet>Choose a language, what you follow, and any profiles you want. A fan profile is optional.</Quiet>
      <Note>{error}</Note>
      <form className="grid gap-4" action={onboardAction}>
        <label className="text-sm font-medium">
          Language
          <select className="mt-2 h-12 w-full rounded-2xl border border-line px-4" name="language" defaultValue="sw">
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Interests</legend>
          {interests.map((interest) => (
            <label key={interest} className="flex gap-3 text-sm">
              <input type="checkbox" name="interest" value={interest} />
              {interest}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Regions</legend>
          {regions.map((region) => (
            <label key={region} className="flex gap-3 text-sm">
              <input type="checkbox" name="region" value={region} />
              {region}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Profiles</legend>
          {["fan", "player", "coach", "scout"].map((type) => (
            <label key={type} className="flex gap-3 text-sm">
              <input type="checkbox" name="profile" value={type} />
              {type}
            </label>
          ))}
        </fieldset>
        <Field label="Date of birth" name="dateOfBirth" type="date" />
        <Field label="Guardian name, if under 18" name="guardianName" />
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="guardianConsent" />
          A parent or guardian consents
        </label>
        <Field label="Position" name="position" placeholder="forward" />
        <Field label="Preferred foot" name="preferredFoot" placeholder="left" />
        <Field label="Level" name="level" placeholder="amateur" />
        <Field label="Section" name="section" placeholder="women" />
        <Submit>Endelea</Submit>
      </form>
    </Frame>
  );
}
