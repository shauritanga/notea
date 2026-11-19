export const instant = false;

import { publishAction } from "@/app/actions";
import { Area, Choice, Field, Note, Shell, Submit, Title } from "@/components/ui";
import { categories, regions } from "@/lib/options";
import { readError, requireViewer } from "@/lib/viewer";

export default async function ComposePage({ searchParams }: PageProps<"/">) {
  const { user, lang } = await requireViewer();
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>Chapisha</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={publishAction}>
        <Choice label="Kind" name="kind" options={["text", "image", "video"]} />
        <Choice label="Category" name="category" options={categories} />
        <Choice label="Region" name="region" options={regions} />
        <Area label="Story" name="body" />
        <Field label="Image or video address" name="mediaUrl" />
        <Field label="Video id" name="videoId" />
        <label className="text-sm">
          File
          <input className="mt-2 block w-full" name="file" type="file" accept="image/*,video/*" />
        </label>
        <Submit>Chapisha</Submit>
      </form>
    </Shell>
  );
}
