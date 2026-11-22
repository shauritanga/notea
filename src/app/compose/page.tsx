export const instant = false;

import { ComposeForm } from "@/components/compose-form";
import { Note, Shell, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { categories, regions } from "@/lib/options";
import { readError, requireViewer } from "@/lib/viewer";

export default async function ComposePage({ searchParams }: PageProps<"/">) {
  const { user, lang } = await requireViewer();
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>{t(lang, "post")}</Title>
      <Note>{error}</Note>
      <ComposeForm
        kinds={{ image: t(lang, "kindPhoto"), video: t(lang, "kindVideo"), text: t(lang, "kindText") }}
        photoLabel={t(lang, "choosePhoto")}
        videoLabel={t(lang, "chooseVideo")}
        coverLabel={t(lang, "chooseCover")}
        storyLabel={t(lang, "write")}
        categoryLabel={t(lang, "category")}
        regionLabel={t(lang, "regions")}
        publishLabel={t(lang, "publish")}
        uploadingLabel={t(lang, "uploading")}
        categories={categories}
        regions={regions}
      />
    </Shell>
  );
}
