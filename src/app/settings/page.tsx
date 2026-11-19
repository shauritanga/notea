export const instant = false;

import { deactivateAction, deletionAction, passwordAction, settingsAction } from "@/app/actions";
import { Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { interests, regions } from "@/lib/options";
import { readError, requireViewer } from "@/lib/viewer";

export default async function SettingsPage({ searchParams }: PageProps<"/">) {
  const { user, lang } = await requireViewer();
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Mipangilio</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={settingsAction}>
        <label className="text-sm font-medium">
          Language
          <select className="mt-2 h-12 w-full rounded-2xl border border-line px-4" name="language" defaultValue={user.language}>
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Alerts</legend>
          {(["account", "social", "video", "recruitment", "business", "organization"] as const).map((key) => (
            <label key={key} className="flex gap-3 text-sm">
              <input type="checkbox" name={key} defaultChecked={user.notificationPrefs[key]} />
              {key}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Interests</legend>
          {interests.map((interest) => (
            <label key={interest} className="flex gap-3 text-sm">
              <input type="checkbox" name="interest" value={interest} defaultChecked={user.interests.includes(interest)} />
              {interest}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Regions</legend>
          {regions.map((region) => (
            <label key={region} className="flex gap-3 text-sm">
              <input type="checkbox" name="region" value={region} defaultChecked={user.regions.includes(region)} />
              {region}
            </label>
          ))}
        </fieldset>
        <label className="flex gap-3 text-sm"><input type="checkbox" name="showContact" defaultChecked={user.privacy.showContact} /> Show my contact by default</label>
        <label className="flex gap-3 text-sm"><input type="checkbox" name="showPreciseLocation" defaultChecked={user.privacy.showPreciseLocation} /> Show precise location</label>
        <label className="flex gap-3 text-sm"><input type="checkbox" name="allowRecruitmentContact" defaultChecked={user.privacy.allowRecruitmentContact} /> Allow recruitment contact</label>
        <Submit>Save</Submit>
      </form>
      <form className="grid gap-3" action={passwordAction}>
        <Field label="Current password" name="current" type="password" required />
        <Field label="New password" name="next" type="password" required />
        <Submit>Change password</Submit>
      </form>
      <Stack>
        <Quiet>Deactivation closes the account until you recover it. Deletion is a request. Notea keeps the record until an administrator completes it.</Quiet>
        <form action={deactivateAction}><button className="text-sm" type="submit">Deactivate</button></form>
        <form action={deletionAction}><button className="text-sm text-clay" type="submit">Request deletion</button></form>
      </Stack>
    </Shell>
  );
}
