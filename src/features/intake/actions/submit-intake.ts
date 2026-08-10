"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { intakeSubmissionSchema } from "@/features/intake/schemas/intake-schema";
import { missingIntakeFields } from "@/features/intake/schemas/required-fields";

export type SubmitIntakeResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * A client's own submission. The only action in the app with no session.
 *
 * The token is the whole authorisation, so it is re-resolved here rather than
 * trusted from the page that rendered the form: a form is just HTML, and this
 * endpoint is reachable without it. Nothing in the payload says which contact
 * to write — that comes from the link the token resolves to, so a client
 * cannot aim their answers at someone else's record.
 *
 * Two writes, in one transaction and in this order:
 *   1. the submission, exactly as declared — the evidence;
 *   2. the contact, updated from it — the convenience.
 * If the second ever changes shape, the first still says what was stated.
 */
export async function submitIntake(input: unknown): Promise<SubmitIntakeResult> {
  const parsed = intakeSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Formulaire incomplet.",
    };
  }
  const data = parsed.data;

  const link = await prisma.clientIntakeLink.findUnique({
    where: { token: data.token },
    select: {
      id: true,
      contactId: true,
      rentalId: true,
      scope: true,
      expiresAt: true,
      revokedAt: true,
      contact: { select: { kind: true } },
    },
  });

  // Expired, revoked and unknown answer alike: a client is told to ask for a
  // new link, and someone probing tokens learns nothing about which exist.
  if (
    !link ||
    link.revokedAt !== null ||
    link.expiresAt.getTime() <= Date.now()
  ) {
    return {
      status: "error",
      message: "Ce lien n'est plus valable. Merci de demander un nouveau lien.",
    };
  }

  const isCompany = link.contact.kind === "COMPANY";
  const ind = data.individual;
  const co = data.company;

  // Checked here and not only in the browser: the form marks the required
  // fields, but this endpoint is reachable without it. What is required comes
  // from the link's own scope, never from the payload — a client cannot
  // declare their submission to be the lighter kind.
  const missing = missingIntakeFields(
    { individual: ind, company: co, occupants: data.occupants },
    { scope: link.scope, isCompany }
  );
  if (missing.length > 0) {
    return {
      status: "error",
      message: `Merci de compléter : ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? `, et ${missing.length - 3} autre(s)` : ""}.`,
    };
  }
  const userAgent = (await headers()).get("user-agent");

  await prisma.$transaction(async (tx) => {
    await tx.clientIntakeSubmission.create({
      data: {
        linkId: link.id,
        contactId: link.contactId,
        rentalId: link.rentalId,
        // Kept whole, including the fields that do not apply to this contact's
        // kind: what the client was shown and sent is the declaration.
        payload: {
          individual: ind,
          company: co,
          occupants: data.occupants,
          stayPurpose: data.stayPurpose ?? null,
          stayPurposeOther: data.stayPurposeOther ?? null,
        },
        confirmedAt: new Date(),
        userAgent,
      },
    });

    // An OCCUPANTS link asks nothing about the contracting party, so its
    // submission carries an empty individual/company block. Writing it back
    // would blank the record the tenant already confirmed.
    if (link.scope === "FULL") {
      // `?? undefined` throughout: a field the client left blank is not an
      // instruction to erase what the agency already holds.
      await tx.contact.update({
      where: { id: link.contactId },
      data: isCompany
        ? {
            lastName: co.companyName ?? undefined,
            phone: co.companyPhone ?? undefined,
            email: co.companyEmail ?? undefined,
            company: {
              upsert: {
                create: {
                  legalForm: co.legalForm,
                  registrationNumber: co.registrationNumber,
                  mainActivity: co.mainActivity,
                  registeredOffice: co.registeredOffice,
                  officePostalCode: co.officePostalCode,
                  officeCity: co.officeCity,
                  officeCountry: co.officeCountry,
                  repLastName: co.repLastName,
                  repFirstName: co.repFirstName,
                  repCapacity: co.repCapacity,
                  repOccupation: co.repOccupation,
                  repNationality: co.repNationality,
                  repPhone: co.repPhone,
                  repEmail: co.repEmail,
                  repIdDocType: co.repIdDocType,
                  repIdDocNumber: co.repIdDocNumber,
                },
                update: {
                  legalForm: co.legalForm ?? undefined,
                  registrationNumber: co.registrationNumber ?? undefined,
                  mainActivity: co.mainActivity ?? undefined,
                  registeredOffice: co.registeredOffice ?? undefined,
                  officePostalCode: co.officePostalCode ?? undefined,
                  officeCity: co.officeCity ?? undefined,
                  officeCountry: co.officeCountry ?? undefined,
                  repLastName: co.repLastName ?? undefined,
                  repFirstName: co.repFirstName ?? undefined,
                  repCapacity: co.repCapacity ?? undefined,
                  repOccupation: co.repOccupation ?? undefined,
                  repNationality: co.repNationality ?? undefined,
                  repPhone: co.repPhone ?? undefined,
                  repEmail: co.repEmail ?? undefined,
                  repIdDocType: co.repIdDocType ?? undefined,
                  repIdDocNumber: co.repIdDocNumber ?? undefined,
                },
              },
            },
          }
        : {
            lastName: ind.lastName ?? undefined,
            firstName: ind.firstName ?? undefined,
            occupation: ind.occupation ?? undefined,
            nationality: ind.nationality ?? undefined,
            maritalStatus: ind.maritalStatus ?? undefined,
            birthDate: ind.birthDate ? new Date(ind.birthDate) : undefined,
            birthPlace: ind.birthPlace ?? undefined,
            address: ind.address ?? undefined,
            postalCode: ind.postalCode ?? undefined,
            city: ind.city ?? undefined,
            country: ind.country ?? undefined,
            phone: ind.phone ?? undefined,
            email: ind.email ?? undefined,
            idDocType: ind.idDocType ?? undefined,
            idDocNumber: ind.idDocNumber ?? undefined,
          },
      });
    }

    // The copy of whoever was identified: the tenant when an individual, the
    // legal representative when a company. Both hang off the same contact —
    // that contact is the party the agency deals with, and a representative is
    // identified through it rather than as a record of their own.
    const copy = isCompany
      ? { path: co.repIdDocPath, type: co.repIdDocType, number: co.repIdDocNumber }
      : { path: ind.idDocPath, type: ind.idDocType, number: ind.idDocNumber };
    if (link.scope === "FULL" && copy.path && copy.type) {
      await tx.identityDocument.create({
        data: {
          rentalId: link.rentalId,
          contactId: link.contactId,
          type: copy.type,
          number: copy.number ?? null,
          storagePath: copy.path,
        },
      });
    }

    if (link.rentalId) {
      if (link.scope === "FULL") {
        await tx.rental.update({
          where: { id: link.rentalId },
          data: {
            stayPurpose: data.stayPurpose ?? undefined,
            stayPurposeOther: data.stayPurposeOther ?? undefined,
          },
        });
      }

      // The occupant list is replaced wholesale: the client is stating who is
      // coming, and a name they removed is a correction, not an addition.
      const named = data.occupants.filter(
        (o) => o.firstName.trim() !== "" || o.lastName.trim() !== ""
      );
      await tx.rentalOccupant.deleteMany({ where: { rentalId: link.rentalId } });

      // One at a time rather than createMany: each occupant's id is needed
      // straight away to attach the copy they uploaded.
      for (const o of named) {
        const occupant = await tx.rentalOccupant.create({
          data: {
            rentalId: link.rentalId,
            firstName: o.firstName,
            lastName: o.lastName,
            idDocType: o.idDocType ?? null,
            idDocNumber: o.idDocNumber ?? null,
          },
          select: { id: true },
        });
        if (o.idDocPath && o.idDocType) {
          await tx.identityDocument.create({
            data: {
              rentalId: link.rentalId,
              occupantId: occupant.id,
              type: o.idDocType,
              number: o.idDocNumber ?? null,
              storagePath: o.idDocPath,
            },
          });
        }
      }
    }

    await tx.clientIntakeLink.update({
      where: { id: link.id },
      data: { submittedAt: new Date() },
    });
  });

  if (link.rentalId) revalidatePath(`/rentals/${link.rentalId}`);
  revalidatePath(`/contacts/${link.contactId}`);
  return { status: "success" };
}
