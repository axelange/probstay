-- Editable, versioned document templates.
--
-- One template per document type; its content is a list of blocks
-- (bilingual text + data slots) stored on IMMUTABLE versions. Editing
-- creates a new version and moves currentVersion forward; generation only
-- ever reads the current version — older ones exist for traceability.
--
-- Editing is MANAGE_DOCUMENT_TEMPLATES: SUPER_ADMIN and ADMIN hold it by
-- role, Moderators are refused by default but grantable per-user via the
-- user_permissions override (handled by has_permission's ordering).

-- Moderators no longer mirror Admins for this permission.
CREATE OR REPLACE FUNCTION internal.has_permission(perm "Permission")
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  user_role "Role";
  override boolean;
begin
  select role into user_role from users where id = auth.uid();

  if user_role is null then
    return false;
  end if;

  select granted into override
  from user_permissions
  where "userId" = auth.uid() and permission = perm;

  if override is not null then
    return override;
  end if;

  if user_role = 'SUPER_ADMIN' then
    return true;
  end if;

  -- Registers are immutable by law, so even an Admin is refused here.
  if user_role = 'ADMIN' then
    return perm != 'MANAGE_REGISTERS';
  end if;

  -- A Moderator mirrors an Admin except that managing people and editing
  -- the document templates are not theirs by default. An Admin may still
  -- grant either per-Moderator, which lands in user_permissions and is
  -- caught by the override above.
  if user_role = 'MODERATOR' then
    return perm not in ('MANAGE_REGISTERS', 'MANAGE_USERS', 'MANAGE_DOCUMENT_TEMPLATES');
  end if;

  return false;
end;
$function$;

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('RENTAL_CONFIRMATION', 'SEASONAL_RENTAL_CONTRACT');

-- CreateTable
CREATE TABLE "document_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "DocumentTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_templates_type_key" ON "document_templates"("type");

CREATE TABLE "document_template_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "document_template_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_template_versions_templateId_version_key"
  ON "document_template_versions"("templateId", "version");

ALTER TABLE "document_template_versions"
  ADD CONSTRAINT "document_template_versions_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "document_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_template_versions"
  ADD CONSTRAINT "document_template_versions_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS backstop: any signed-in user may read (the app renders documents
-- from them), writing is the dedicated permission. Prisma bypasses this;
-- it is the defence in depth for PostgREST.
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_template_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_templates_select_signed_in" ON "document_templates"
  FOR SELECT USING (internal.current_user_role() IS NOT NULL);
CREATE POLICY "document_templates_all_manage" ON "document_templates"
  FOR ALL
  USING (internal.has_permission('MANAGE_DOCUMENT_TEMPLATES'::"Permission"))
  WITH CHECK (internal.has_permission('MANAGE_DOCUMENT_TEMPLATES'::"Permission"));

CREATE POLICY "document_template_versions_select_signed_in" ON "document_template_versions"
  FOR SELECT USING (internal.current_user_role() IS NOT NULL);
CREATE POLICY "document_template_versions_all_manage" ON "document_template_versions"
  FOR ALL
  USING (internal.has_permission('MANAGE_DOCUMENT_TEMPLATES'::"Permission"))
  WITH CHECK (internal.has_permission('MANAGE_DOCUMENT_TEMPLATES'::"Permission"));

-- Seed: the two house documents, version 1. The Confirmation's texts are
-- transcribed from the agency's real template; the Contract carries the
-- current articles. FR is legally authoritative, EN is the courtesy line.
WITH t AS (
  INSERT INTO "document_templates" ("type", "name", "updatedAt")
  VALUES ('RENTAL_CONFIRMATION', 'Confirmation de location', CURRENT_TIMESTAMP)
  RETURNING id
)
INSERT INTO "document_template_versions" ("templateId", "version", "blocks")
SELECT id, 1, $seed$[
  {"kind":"paragraph","fr":"En application du Mandat de location saisonnière signé entre le Propriétaire et BSTAY, nous avons le plaisir de confirmer la location saisonnière décrite ci-dessous.","en":"Pursuant to the Seasonal Rental Mandate signed between the Owner and the Agent, we are pleased to confirm the seasonal rental described below."},
  {"kind":"title","fr":"Parties & bien","en":"Parties & property"},
  {"kind":"slot_parties"},
  {"kind":"title","fr":"Durée et occupation","en":"Rental period and occupancy"},
  {"kind":"slot_stay"},
  {"kind":"title","fr":"Prestations","en":"Services"},
  {"kind":"slot_services"},
  {"kind":"title","fr":"Récapitulatif financier","en":"Financial summary"},
  {"kind":"slot_financial"},
  {"kind":"title","fr":"Conditions de paiement","en":"Payment terms"},
  {"kind":"slot_payment"},
  {"kind":"paragraph","fr":"Le reversement au Propriétaire est subordonné à l'encaissement préalable des fonds correspondants auprès du Locataire.","en":"Payment to the Owner is subject to prior receipt of the corresponding funds from the Tenant."},
  {"kind":"title","fr":"Conditions d'annulation","en":"Cancellation policy"},
  {"kind":"paragraph","fr":"La réservation devient ferme et définitive dès signature de la présente Confirmation de location et paiement intégral du prix de la location par le Locataire.","en":"The booking shall become firm and binding upon signature of this Rental Confirmation and full payment of the rental price by the Tenant."},
  {"kind":"paragraph","fr":"En cas d'annulation par le Locataire, pour quelque cause que ce soit, aucun remboursement ne pourra être effectué et la totalité du loyer restera due au Propriétaire.","en":"In the event of cancellation by the Tenant, for any reason whatsoever, no refund shall be made and the full rental amount shall remain payable to the Owner."},
  {"kind":"paragraph","fr":"En cas d'annulation par le Propriétaire, les sommes effectivement perçues seront restituées au Locataire.","en":"In the event of cancellation by the Owner, all sums received shall be refunded to the Tenant."},
  {"kind":"paragraph","fr":"Les cas de force majeure, tels que définis par la réglementation en vigueur, ne donnent lieu à aucune indemnisation de part et d'autre.","en":"Force majeure events, as defined by applicable law, shall not give rise to any compensation by either Party."},
  {"kind":"title","fr":"Cadre contractuel","en":"Contractual framework"},
  {"kind":"paragraph","fr":"La présente Confirmation de location constitue un engagement liant les Parties. Elle s'inscrit dans le cadre contractuel global régissant la location et doit être lue conjointement avec les conditions de location applicables.","en":"This Rental Confirmation constitutes a binding agreement between the Parties. It forms part of the overall contractual framework governing the rental and shall be read in conjunction with the applicable rental terms."},
  {"kind":"title","fr":"Signature électronique","en":"Electronic signature"},
  {"kind":"paragraph","fr":"Les Parties conviennent que le présent document pourra être signé par voie électronique, laquelle aura la même valeur juridique qu'une signature manuscrite. La date de signature correspond à la date de validation électronique. Chaque Partie reconnaît avoir reçu un exemplaire du présent document.","en":"The Parties agree that this document may be signed electronically and that such electronic signature shall have the same legal value as a handwritten signature. The date of signature shall correspond to the date of electronic validation. Each Party acknowledges having received a copy of this document."},
  {"kind":"slot_signatures"}
]$seed$::jsonb
FROM t;

WITH t AS (
  INSERT INTO "document_templates" ("type", "name", "updatedAt")
  VALUES ('SEASONAL_RENTAL_CONTRACT', 'Contrat de location saisonnière', CURRENT_TIMESTAMP)
  RETURNING id
)
INSERT INTO "document_template_versions" ("templateId", "version", "blocks")
SELECT id, 1, $seed$[
  {"kind":"title","fr":"Entre les soussignés","en":"Between the undersigned"},
  {"kind":"slot_parties"},
  {"kind":"title","fr":"Objet et désignation du bien","en":"Purpose and description of the property"},
  {"kind":"paragraph","fr":"Le Bailleur donne en location saisonnière au Preneur, qui accepte, le bien désigné aux présentes. La location est consentie à usage exclusif d'habitation de loisirs, à l'exclusion de toute activité professionnelle ou commerciale.","en":"The Lessor lets to the Lessee, who accepts, the property described herein, on a seasonal basis. The rental is granted exclusively for leisure residential use, to the exclusion of any professional or commercial activity."},
  {"kind":"title","fr":"Durée de la location","en":"Rental period"},
  {"kind":"slot_stay"},
  {"kind":"paragraph","fr":"La location est consentie pour la période indiquée ci-dessus, sans que le Preneur puisse se prévaloir d'un quelconque droit au maintien dans les lieux à l'expiration de ce terme.","en":"The rental is granted for the period stated above, and the Lessee may not claim any right to remain in the premises upon its expiry."},
  {"kind":"title","fr":"Loyer, services et taxe de séjour","en":"Rent, services and tourist tax"},
  {"kind":"slot_financial"},
  {"kind":"title","fr":"Conditions de paiement","en":"Payment terms"},
  {"kind":"slot_payment"},
  {"kind":"title","fr":"Dépôt de garantie","en":"Security deposit"},
  {"kind":"paragraph","fr":"À la remise des clés, le Preneur verse le dépôt de garantie indiqué aux présentes, destiné à couvrir les dégradations éventuelles. Il lui est restitué dans un délai maximal de trente jours suivant la fin du séjour, déduction faite le cas échéant des sommes dues. Le dépôt de garantie ne constitue en aucun cas un revenu locatif.","en":"Upon handover of the keys, the Lessee pays the security deposit stated herein, intended to cover any damage. It is returned within thirty days of the end of the stay, less any sums due. The security deposit never constitutes rental income."},
  {"kind":"title","fr":"État des lieux et jouissance paisible","en":"Inventory and peaceful enjoyment"},
  {"kind":"paragraph","fr":"Un état des lieux contradictoire est établi à l'entrée et à la sortie. Le Preneur jouit paisiblement du bien en bon père de famille et en préserve la destination, le mobilier et les équipements.","en":"A joint inventory is drawn up on arrival and departure. The Lessee enjoys the property peacefully and with due care, preserving its purpose, furniture and equipment."},
  {"kind":"title","fr":"Signature électronique","en":"Electronic signature"},
  {"kind":"paragraph","fr":"Les Parties conviennent que le présent contrat pourra être signé par voie électronique, laquelle aura la même valeur juridique qu'une signature manuscrite.","en":"The Parties agree that this contract may be signed electronically, such signature having the same legal value as a handwritten one."},
  {"kind":"slot_signatures"}
]$seed$::jsonb
FROM t;
