export const instant = false;

import { videoAction } from "@/app/actions";
import { Field, Note, Shell, Submit, Title } from "@/components/ui";
import { readError, requireViewer } from "@/lib/viewer";
import { listMyProfiles } from "@/domain/accounts";

export default async function NewVideoPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const profiles = await listMyProfiles(db, user.id);
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Video</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={videoAction}>
        <Field label="Title" name="title" required />
        <Field label="Video address" name="sourceUrl" />
        <label className="text-sm">File<input className="mt-2 block w-full" name="file" type="file" accept="video/*" /></label>
        <label className="text-sm font-medium">
          Player profile
          <select className="mt-2 h-12 w-full rounded-2xl border border-line px-4" name="profileId">
            <option value="">None</option>
            {profiles.filter((profile) => profile.type === "player").map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.displayName}</option>
            ))}
          </select>
        </label>
        <Submit>Upload</Submit>
      </form>
    </Shell>
  );
}
