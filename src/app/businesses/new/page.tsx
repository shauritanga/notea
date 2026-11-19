export const instant = false;

import { businessAction } from "@/app/actions";
import { Area, Choice, Field, Note, Shell, Submit, Title } from "@/components/ui";
import { regions } from "@/lib/options";
import { readError, requireViewer } from "@/lib/viewer";

export default async function NewBusinessPage({ searchParams }: PageProps<"/">) {
  const { lang } = await requireViewer();
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Sajili biashara</Title>
      <Note>{error}</Note>
      <form className="grid gap-4" action={businessAction}>
        <Field label="Name" name="name" required />
        <Choice label="Category" name="category" options={["kit", "health", "media", "food", "training", "transport", "other"]} />
        <Area label="Description" name="description" required />
        <Field label="Location" name="location" required />
        <Choice label="Region" name="region" options={regions} />
        <Field label="Phone" name="contactPhone" />
        <Field label="Email" name="contactEmail" />
        <Field label="Website" name="website" />
        <Field label="WhatsApp" name="whatsapp" />
        <Field label="Instagram" name="instagram" />
        <Field label="Facebook" name="facebook" />
        <Field label="Logo address" name="logoUrl" />
        <Field label="Cover address" name="coverUrl" />
        <label className="text-sm">Logo<input className="mt-2 block" name="logo" type="file" accept="image/*" /></label>
        <label className="text-sm">Cover<input className="mt-2 block" name="cover" type="file" accept="image/*" /></label>
        <Field label="Product" name="productName" />
        <Field label="Product details" name="productDescription" />
        <Field label="Price" name="priceLabel" />
        <Submit>Publish profile</Submit>
      </form>
    </Shell>
  );
}
