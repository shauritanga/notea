export const instant = false;

import { notFound } from "next/navigation";
import { businessRoleAction, enquiryAction, followAction, verificationAction } from "@/app/actions";
import { Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title, Trust } from "@/components/ui";
import { getBusiness, listEnquiries, listProducts } from "@/domain/businesses";
import { AppError } from "@/domain/errors";
import { t } from "@/i18n/messages";
import { readError, requireViewer } from "@/lib/viewer";

export default async function BusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const { id } = await params;
  const business = await getBusiness(db, id, user.id).catch(() => null);
  if (!business) notFound();
  const products = await listProducts(db, id);
  let enquiries: Awaited<ReturnType<typeof listEnquiries>> = [];
  try {
    enquiries = await listEnquiries(db, user.id, id);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>{business.name}</Title>
      <Trust verified={business.verified} lang={lang} />
      <Quiet>{business.category} · {business.location}</Quiet>
      <p className="leading-7">{business.description}</p>
      {business.website ? <a className="text-sm text-accent-ink" href={business.website}>{business.website}</a> : null}
      {business.whatsapp ? <a className="text-sm text-accent-ink" href={business.whatsapp}>WhatsApp</a> : null}
      <form action={followAction}>
        <input type="hidden" name="targetType" value="business" />
        <input type="hidden" name="targetId" value={business.id} />
        <input type="hidden" name="back" value={`/businesses/${id}`} />
        <button className="text-sm font-semibold text-accent-ink" type="submit">{t(lang, "follow")}</button>
      </form>
      <Note>{error}</Note>
      <Stack>
        {products.map((product) => (
          <Card key={product.id}>
            <strong>{product.name}</strong>
            <Quiet>{product.description}</Quiet>
            <Quiet>{product.priceLabel}</Quiet>
          </Card>
        ))}
      </Stack>
      <form className="grid gap-3" action={enquiryAction}>
        <input type="hidden" name="businessId" value={id} />
        <Field label="Enquiry" name="message" required />
        <Submit>Send</Submit>
      </form>
      {enquiries.length > 0 || business.contactPhone ? (
        <Stack>
          {business.contactPhone ? <Quiet>Private phone: {business.contactPhone}</Quiet> : null}
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id}><p>{enquiry.message}</p><Quiet>{enquiry.status}</Quiet></Card>
          ))}
          <form className="grid gap-3" action={businessRoleAction}>
            <input type="hidden" name="businessId" value={id} />
            <Field label="Manager user id" name="userId" required />
            <Choice label="Role" name="role" options={["administrator", "marketing_manager", "content_manager"]} />
            <Submit>Invite</Submit>
          </form>
          <form className="grid gap-3" action={verificationAction}>
            <input type="hidden" name="subjectType" value="business" />
            <input type="hidden" name="subjectId" value={id} />
            <input type="hidden" name="back" value={`/businesses/${id}`} />
            <Field label="Document address" name="documentUrl" />
            <input name="file" type="file" />
            <Submit>Request verification</Submit>
          </form>
          <a className="text-sm font-semibold" href="/campaigns">Paid promotion</a>
        </Stack>
      ) : null}
    </Shell>
  );
}
