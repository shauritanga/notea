export const instant = false;

import { organizationAction } from "@/app/actions";
import { Area, Choice, Field, Note, Shell, Submit, Title } from "@/components/ui";
import { regions } from "@/lib/options";
import { readError, requireViewer } from "@/lib/viewer";

export default async function NewClubPage({ searchParams }: PageProps<"/">) {
  const { lang } = await requireViewer();
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Sajili klabu</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={organizationAction}>
        <Field label="Name" name="name" required />
        <Choice label="Category" name="category" options={["club", "academy", "team", "association"]} />
        <Area label="Description" name="description" required />
        <Field label="Country" name="country" defaultValue="Tanzania" />
        <Choice label="Region" name="region" options={regions} />
        <Field label="Contact phone" name="contactPhone" />
        <Field label="Contact email" name="contactEmail" />
        <Field label="Logo address" name="logoUrl" />
        <Field label="Cover address" name="coverUrl" />
        <label className="text-sm">Logo file<input className="mt-2 block" name="logo" type="file" accept="image/*" /></label>
        <label className="text-sm">Cover file<input className="mt-2 block" name="cover" type="file" accept="image/*" /></label>
        <Field label="Representative" name="representativeName" />
        <Field label="Representative phone" name="representativePhone" />
        <Choice label="Level" name="level" options={["school", "grassroots", "amateur", "semi_professional", "professional"]} />
        <Choice label="Section" name="section" options={["open", "women"]} />
        <Submit>Create</Submit>
      </form>
    </Shell>
  );
}
