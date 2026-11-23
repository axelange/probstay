import { z } from "zod";

/**
 * A template's editable content: the legal prose, and nothing else.
 *
 * What an editor may change is the wording of the clauses. What they may not
 * change is the document's composition — which section follows which, where
 * the parties, stay, financial and signature tables sit, and where the pages
 * break. That lives in the template components, which match the agency's
 * Figma master to the point; a document whose layout could be rearranged from
 * a form would stop matching it on the first edit.
 *
 * So a template is a map of clause key → bilingual paragraphs. The renderer
 * looks each key up where it already had prose hardcoded. French is legally
 * authoritative, English is the courtesy line beside it.
 *
 * `{{variables}}` inside a paragraph are filled from the rental at generation
 * time (see `interpolate`). The contract needs them — its articles name the
 * property, the dates and the deposit inline — and without them those
 * articles could not be edited at all without losing their data.
 */

/** Bilingual prose for one clause. One string per paragraph. */
export type Clause = { fr: string[]; en: string[] };

/** Every clause of a template, keyed. */
export type TemplateClauses = Record<string, Clause>;

const clauseSchema = z.object({
  fr: z.array(z.string().max(8000)).max(50),
  en: z.array(z.string().max(8000)).max(50),
});

export const templateClausesSchema = z.record(z.string().max(64), clauseSchema);

/**
 * The clauses each document type owns, in the order the editor shows them,
 * with the French label naming where each one appears in the document.
 *
 * This is the contract between the editor and the renderer: a key here is a
 * place in the template that reads it. Adding a clause means adding it here,
 * to the defaults below, and to the component that renders it.
 */
export const CLAUSE_FIELDS = {
  RENTAL_CONFIRMATION: [
    { key: "intro", label: "Introduction" },
    { key: "cancellation", label: "Conditions d'annulation" },
    { key: "framework", label: "Cadre contractuel" },
    { key: "esign", label: "Signature électronique" },
  ],
  SEASONAL_RENTAL_CONTRACT: [
    { key: "preamble", label: "Préambule — droit applicable" },
    { key: "agent", label: "1.1 Le Mandataire" },
    { key: "tenant", label: "1.2 Le Locataire — désignation" },
    { key: "presentation", label: "3 — Présentation du bien" },
    { key: "duration", label: "4.1 Durée (note sous la période)" },
    { key: "rent", label: "4.2 Loyer (note sous le montant)" },
    { key: "chargesExcluded", label: "4.3 Charges non incluses (une ligne par charge)" },
    { key: "chargesNote", label: "4.3 Charges — note" },
    { key: "securityDeposit", label: "4.4 Dépôt de garantie" },
    { key: "paymentTerms", label: "4.5 Modalités de paiement" },
    { key: "bankDetails", label: "4.5 Informations bancaires — introduction" },
    { key: "securityNotice", label: "4.5 Avis de sécurité important" },
    { key: "bankFees", label: "4.5 Frais bancaires" },
    { key: "financialSummary", label: "4.6 Récapitulatif financier" },
    { key: "generalUse", label: "5.1 Usage du bien" },
    { key: "occupancy", label: "5.2 Occupation" },
    { key: "condition", label: "5.3 État du bien" },
    { key: "keysAccess", label: "5.4 Clés et accès" },
    { key: "liability", label: "5.5 Responsabilité" },
    { key: "additionalServices", label: "5.6 Prestations complémentaires" },
    { key: "nonCircumvention", label: "5.7 Non-contournement et acquisition" },
    { key: "cancellationIntro", label: "6 Conditions d'annulation — introduction" },
    { key: "cancellationTenant", label: "6.1 Annulation par le locataire" },
    { key: "cancellationOwner", label: "6.2 Annulation par le propriétaire" },
    { key: "forceMajeure", label: "7 Force majeure" },
    { key: "dataProtection", label: "8.1 Données personnelles" },
    { key: "nonDiscrimination", label: "8.2 Non-discrimination" },
    { key: "validity", label: "8.3 Validité partielle" },
    { key: "governingLaw", label: "9 Droit applicable et juridiction" },
    { key: "signatures", label: "10 Signatures" },
    { key: "use", label: "2.3 Destination des lieux" },
    { key: "equipment", label: "2.4 Standing de l'équipement" },
    { key: "photographs", label: "2.5 Photographies" },
    { key: "article1", label: "Article 1 — Objet et désignation du bien" },
    { key: "article2", label: "Article 2 — Durée de la location" },
    { key: "article3", label: "Article 3 — Capacité d'accueil" },
    { key: "article4", label: "Article 4 — Loyer (note sous le tableau)" },
    { key: "article5", label: "Article 5 — Dépôt de garantie" },
    { key: "article6", label: "Article 6 — État des lieux" },
  ],
} as const;

export type DocumentTemplateTypeKey = keyof typeof CLAUSE_FIELDS;

/**
 * The variables a clause may reference, per document type — shown in the
 * editor so an author knows what is available, and used to validate that a
 * clause does not name something that will never resolve.
 */
export const CLAUSE_VARIABLES: Record<DocumentTemplateTypeKey, string[]> = {
  RENTAL_CONFIRMATION: [],
  SEASONAL_RENTAL_CONTRACT: [
    "property.name",
    "property.kind",
    "property.address",
    "property.city",
    "property.surface",
    "property.rooms",
    "property.sleeps",
    "stay.checkIn",
    "stay.checkOut",
    "stay.nights",
    "stay.guests",
    "money.securityDeposit",
    "money.surcharge",
  ],
};

/**
 * The prose the documents shipped with — the fallback whenever a template has
 * no clause for a key.
 *
 * It matters that this exists rather than the renderer trusting the database:
 * a template saved before a clause was introduced simply has no entry for it,
 * and a document that silently lost a legal clause because a column was empty
 * would be far worse than one that fell back to the agreed wording.
 */
export const DEFAULT_CLAUSES: Record<
  DocumentTemplateTypeKey,
  TemplateClauses
> = {
  RENTAL_CONFIRMATION: {
    intro: {
      en: [
        "Pursuant to the Seasonal Rental Mandate signed between the Owner and the Agent, we are pleased to confirm the seasonal rental described below.",
      ],
      fr: [
        "En application du Mandat de location saisonnière signé entre le Propriétaire et BSTAY, nous avons le plaisir de confirmer la location saisonnière décrite ci-dessous.",
      ],
    },
    cancellation: {
      en: [
        "The booking shall become firm and binding upon signature of this Rental Confirmation and payment of the sums due by the Tenant.",
        "In the event of cancellation by the Tenant, for any reason whatsoever, no refund shall be made and the full rental amount shall remain payable to the Owner.",
        "In the event of cancellation by the Owner, all sums received shall be refunded to the Tenant.",
        "Force majeure events, as defined by applicable law, shall not give rise to any compensation by either Party.",
      ],
      fr: [
        "La réservation devient ferme et définitive dès signature de la présente Confirmation de location et paiement des sommes dues par le Locataire.",
        "En cas d'annulation par le Locataire, pour quelque cause que ce soit, aucun remboursement ne pourra être effectué et la totalité du loyer restera due au Propriétaire.",
        "En cas d'annulation par le Propriétaire, les sommes effectivement perçues seront restituées au Locataire.",
        "Les cas de force majeure, tels que définis par la réglementation en vigueur, ne donnent lieu à aucune indemnisation de part et d'autre.",
      ],
    },
    framework: {
      en: [
        "This Rental Confirmation constitutes a binding agreement between the Parties.",
        "It forms part of the overall contractual framework governing the rental and shall be read in conjunction with the applicable rental terms.",
      ],
      fr: [
        "La présente Confirmation de location constitue un accord ferme entre les Parties.",
        "Elle s'inscrit dans le cadre contractuel global régissant la location et doit être lue conjointement avec les conditions de location applicables.",
      ],
    },
    esign: {
      en: [
        "The Parties agree that this document may be signed electronically and that such electronic signature shall have the same legal value as a handwritten signature.",
        "The date of signature shall correspond to the date of electronic validation.",
        "Each Party acknowledges having received a copy of this document.",
      ],
      fr: [
        "Les Parties conviennent que le présent document pourra être signé par voie électronique, laquelle aura la même valeur juridique qu'une signature manuscrite.",
        "La date de signature correspond à la date de validation électronique.",
        "Chaque Partie reconnaît avoir reçu un exemplaire du présent document.",
      ],
    },
  },
  // The contract is French-only on the page; `en` is kept empty rather than
  // removed so both documents share one shape.
  SEASONAL_RENTAL_CONTRACT: {
    preamble: {
      en: [
        "This agreement is governed by the provisions of French Law No. 70-9 of 2 January 1970, Decree No. 72-678 of 20 July 1972, and Articles 1984 et seq. of the French Civil Code.",
      ],
      fr: [
        "Le présent contrat est régi par les dispositions de la loi n° 70-9 du 2 janvier 1970, du décret n° 72-678 du 20 juillet 1972, ainsi que par les articles 1984 et suivants du Code civil.",
      ],
    },
    agent: {
      en: [
        "BSTAY, a French simplified joint-stock company (SAS), registered with the Trade and Companies Register (RCS) of Cannes under number 920 635 356, with its registered office at 9 Rond-Point Duboys d'Angers, 06400 Cannes, France, operating as a real estate agency and a private concierge and property management company specialized in high-end property services, holding a financial guarantee with CEGC under number 31961GES261 and professional liability insurance with Generali under policy number AL591311/31961, holder of professional real estate licence no. CPI 8304 2026 000 000 007 issued by the Nice Côte d'Azur Chamber of Commerce and Industry, acting in its capacity as agent of the Owner,",
        "hereinafter referred to as the “Agent”,",
      ],
      fr: [
        "BSTAY, société par actions simplifiée de droit français (SAS), immatriculée au Registre du Commerce et des Sociétés de Cannes sous le numéro 920 635 356, dont le siège social est situé au 9 Rond-Point Duboys d'Angers, 06400 Cannes, France, exerçant une activité d'agence immobilière et de conciergerie privée et de gestion immobilière haut de gamme, bénéficiant d'une garantie financière auprès de la CEGC sous le numéro 31961GES261 et d'une assurance responsabilité civile professionnelle souscrite auprès de Generali sous le numéro AL591311/31961, titulaire de la carte professionnelle n° CPI 8304 2026 000 000 007 délivrée par la Chambre de Commerce et d'Industrie Nice Côte d'Azur, agissant en qualité de mandataire du Propriétaire,",
        "ci-après dénommée « le Mandataire »,",
      ],
    },
    tenant: {
      en: [
        "hereinafter referred to as the “Tenant”,",
      ],
      fr: [
        "ci-après dénommé « le Locataire »,",
      ],
    },
    presentation: {
      en: [
        "The Tenant acknowledges that the property has been presented to them by the Agent prior to entering into this agreement.",
        "The Tenant confirms that they have received sufficient information regarding the property, its characteristics and its condition.",
        "The Tenant acknowledges that the chosen mode of presentation is sufficient and accepts the property in its condition as described in this agreement.",
        "Where the property has not been visited in person, the Tenant acknowledges that the remote presentation (description, photographs and other marketing materials) forms the basis of their consent and that the absence of a physical visit shall not, in itself, constitute grounds for a claim. This clause shall not exclude any remedy available to the Tenant in the event of a substantial non-conformity between the property delivered and its description.",
        "The Tenant confirms having had the opportunity to request any additional information prior to signing.",
      ],
      fr: [
        "Le Locataire reconnaît que le bien lui a été présenté par le Mandataire préalablement à la conclusion du présent contrat.",
        "Le Locataire reconnaît avoir reçu les informations nécessaires relatives au bien, à ses caractéristiques et à son état.",
        "Le Locataire reconnaît que le mode de présentation choisi est suffisant et accepte le bien dans son état tel que décrit au présent contrat.",
        "Lorsque le bien n'a pas été visité physiquement, le Locataire reconnaît que la présentation à distance (descriptif, photographies et autres supports de commercialisation) constitue le fondement de son consentement et que l'absence de visite physique ne saurait, à elle seule, constituer un motif de contestation. La présente clause n'exclut aucun recours du Locataire en cas de non-conformité substantielle entre le bien délivré et sa description.",
        "Le Locataire reconnaît avoir eu la possibilité de solliciter toute information complémentaire préalablement à la signature.",
      ],
    },
    duration: {
      en: [
        "This agreement is a seasonal rental within the meaning of Article 1-1 of Law No. 70-9 of 2 January 1970: it is entered into for a maximum, non-renewable period of ninety (90) consecutive days.",
      ],
      fr: [
        "Le présent contrat est une location saisonnière au sens de l'article 1-1 de la loi n° 70-9 du 2 janvier 1970 : il est conclu pour une durée maximale et non renouvelable de quatre-vingt-dix (90) jours consécutifs.",
      ],
    },
    rent: {
      en: [
        "This price corresponds to the rental of the property for the agreed period, as defined in this agreement.",
      ],
      fr: [
        "Ce prix correspond à la location du bien pour la période convenue, telle que définie au présent contrat.",
      ],
    },
    // What every rent excludes. The bailiff's check-out inspection is not
    // listed: it is excluded only from a rental that has one, and the builder
    // adds it there, with its price, from the booking's billed services.
    chargesExcluded: {
      en: [
        "Consumption exceeding normal use",
        "Additional services",
        "Tourist tax",
      ],
      fr: [
        "Consommation excédant une utilisation normale",
        "Prestations complémentaires",
        "Taxe de séjour",
      ],
    },
    chargesNote: {
      en: [
        "Any item not expressly included above may be subject to additional charges.",
      ],
      fr: [
        "Tout élément non expressément inclus ci-dessus pourra faire l'objet d'une facturation complémentaire.",
      ],
    },
    securityDeposit: {
      en: [
        "The security deposit is intended to cover any damage, loss, deterioration, consumption or any sums remaining due in connection with the rental.",
        "The security deposit may be held by the Agent or the Owner for the duration of the rental and until the final assessment of the property after departure.",
        "The security deposit shall be returned within one (1) month following the Tenant's departure if no deductions are required.",
        "In the event of deductions, the security deposit shall be returned within a period not exceeding two (2) months following the Tenant's departure.",
        "Where necessary, this period may be extended strictly for the time required to obtain supporting documents, provided that the Tenant is duly informed.",
        "Any deductions shall be duly justified.",
        "Partial reimbursement may be made pending final assessment.",
        "If the security deposit is insufficient to cover the sums due, the Tenant undertakes to pay the balance upon request.",
      ],
      fr: [
        "Le dépôt de garantie est destiné à couvrir les éventuels dommages, pertes, dégradations, consommations ou sommes restant dues au titre de la location.",
        "Le dépôt de garantie pourra être conservé par le Mandataire ou le Propriétaire pendant la durée de la location et jusqu'à l'évaluation complète du bien après le départ.",
        "Le dépôt de garantie sera restitué dans un délai d'un (1) mois suivant le départ du Locataire en l'absence de retenue.",
        "En cas de retenues, le dépôt de garantie sera restitué dans un délai n'excédant pas deux (2) mois suivant le départ du Locataire.",
        "Lorsque cela est nécessaire, ce délai pourra être prolongé strictement le temps requis pour obtenir les justificatifs correspondants, sous réserve d'en informer le Locataire.",
        "Toute retenue devra être dûment justifiée.",
        "Un remboursement partiel pourra être effectué dans l'attente de l'évaluation définitive.",
        "Si le dépôt de garantie s'avère insuffisant, le Locataire s'engage à régler le complément à première demande.",
      ],
    },
    paymentTerms: {
      en: [
        "Payments shall be made by bank transfer or any other method accepted by the Agent.",
        "Payment by credit card may be accepted for rental payments up to an amount of €10,000.",
        "The security deposit must be paid by bank transfer only.",
        "Bank transfer may be subject to banking fees, which shall be borne by the Tenant.",
        "Payments must be made in the name of the Tenant, from a bank account clearly identifying the payer.",
        "Any refund shall be made to the bank account used for the initial payment, unless otherwise justified.",
      ],
      fr: [
        "Les paiements seront effectués par virement bancaire ou tout autre moyen de paiement accepté par le Mandataire.",
        "Le paiement par carte bancaire pourra être accepté pour les loyers jusqu'à un montant de 10 000 €.",
        "Le dépôt de garantie devra être versé exclusivement par virement bancaire.",
        "Les virements bancaires peuvent donner lieu à des frais bancaires, qui restent à la charge du Locataire.",
        "Les paiements devront être effectués au nom du Locataire et provenir d'un compte bancaire permettant d'identifier clairement le payeur.",
        "Tout remboursement sera effectué sur le compte bancaire ayant servi au paiement initial, sauf justification dûment apportée.",
      ],
    },
    bankDetails: {
      en: [
        "In the event of payment by bank transfer, the payment shall be made to the following bank details:",
      ],
      fr: [
        "En cas de règlement par virement bancaire, celui-ci devra être effectué aux coordonnées suivantes :",
      ],
    },
    securityNotice: {
      en: [
        "BSTAY does not communicate modifications of payment instructions via email. In the event of any request suggesting a change, please contact our office directly before proceeding with payment.",
      ],
      fr: [
        "BSTAY ne communique aucune modification d'instructions de paiement par e-mail. Toute demande relative à un changement de coordonnées bancaires doit être vérifiée directement auprès de notre bureau avant d'effectuer un paiement.",
      ],
    },
    bankFees: {
      en: [
        "The Tenant is expressly informed that certain fund transfers, in particular international transfers or transfers outside the SEPA area, may be subject to bank charges applied by the financial institutions involved (issuing bank, intermediary banks or beneficiary's bank), which are beyond the Agent's control.",
        "Such fees, the amount of which cannot be determined in advance and may vary depending on the country, currency and the terms applied by each banking institution, shall remain payable by the Tenant.",
        "The security deposit shall be refunded in euros by SEPA transfer whenever possible. Failing this, an alternative transfer method may be used.",
      ],
      fr: [
        "Le Locataire est expressément informé que certains transferts de fonds, notamment internationaux ou hors zone SEPA, peuvent donner lieu à l'application de frais bancaires par les établissements financiers intervenants (banque émettrice, intermédiaires ou banque du bénéficiaire), indépendamment de la volonté du Mandataire.",
        "Ces frais, dont le montant ne peut être déterminé à l'avance et dépend notamment du pays, de la devise et des conditions propres à chaque établissement bancaire, resteront à la charge du Locataire.",
        "Le remboursement du dépôt de garantie est effectué en euros par virement SEPA lorsque cela est possible. À défaut, un autre mode de transfert pourra être utilisé.",
      ],
    },
    financialSummary: {
      en: [
        "All payments shall be made in accordance with the terms set out in this agreement.",
        "Additional costs, if any, shall be duly justified and correspond to services or expenses expressly agreed or provided for in this agreement.",
      ],
      fr: [
        "Les paiements seront effectués conformément aux modalités prévues au présent contrat.",
        "Les frais complémentaires, le cas échéant, devront être dûment justifiés et correspondre à des prestations ou dépenses expressément prévues au présent contrat ou acceptées par le Locataire.",
      ],
    },
    generalUse: {
      en: [
        "The property is rented exclusively for residential use on a temporary basis.",
        "The Tenant undertakes to use the property in a peaceful manner and in accordance with its intended purpose.",
        "The Tenant shall comply with all applicable regulations, including, where applicable, co-ownership rules.",
        "The Tenant shall respect the peaceful enjoyment of the neighbourhood.",
        "Events, receptions or gatherings exceeding the maximum occupancy of the property are strictly prohibited without the prior written consent of the Owner.",
        "Any commercial use of the property, including but not limited to filming, photography or professional activities, is strictly prohibited without prior written authorisation.",
      ],
      fr: [
        "Le bien est loué exclusivement à usage d'habitation à titre temporaire.",
        "Le Locataire s'engage à user paisiblement des lieux et conformément à leur destination.",
        "Le Locataire s'engage à respecter l'ensemble des règles applicables, notamment, le cas échéant, le règlement de copropriété.",
        "Le Locataire s'engage à respecter la tranquillité du voisinage.",
        "Les événements, réceptions ou rassemblements dépassant la capacité maximale d'occupation du bien sont strictement interdits sans l'accord écrit préalable du Propriétaire.",
        "Toute utilisation commerciale du bien, notamment pour des tournages, prises de vues ou activités professionnelles, est strictement interdite sans autorisation écrite préalable.",
      ],
    },
    occupancy: {
      en: [
        "The number of occupants shall not exceed the maximum capacity specified in this agreement.",
        "The property is rented solely for the use of the persons declared at the time of booking.",
        "The Tenant undertakes to inform the Agent of any change in occupancy.",
        "Any subletting, assignment or making available of the property to third parties, whether free of charge or for consideration, is strictly prohibited.",
      ],
      fr: [
        "Le nombre d'occupants ne pourra excéder la capacité maximale indiquée au présent contrat.",
        "Le bien est loué exclusivement pour l'usage des personnes déclarées lors de la réservation.",
        "Le Locataire s'engage à informer le Mandataire de toute modification de l'occupation.",
        "Toute sous-location, cession ou mise à disposition du bien à des tiers, à titre gratuit ou onéreux, est strictement interdite.",
      ],
    },
    condition: {
      en: [
        "An inventory and condition report shall be carried out upon arrival of the Tenant.",
        "Such inventory and condition report may, where deemed appropriate, be established by a bailiff.",
        "Where a bailiff is appointed, the costs shall be borne by the Owner for the check-in inspection and by the Tenant for the check-out inspection.",
        "Failing this, the Tenant shall be deemed to have received the property in good condition and must return it in the same condition, subject to normal wear and tear.",
        "The Tenant undertakes to take care of the property and to immediately inform the Agent of any damage or incident.",
      ],
      fr: [
        "Un inventaire et un état des lieux sont réalisés à l'arrivée du Locataire.",
        "Cet état des lieux pourra, lorsque cela est jugé nécessaire, être établi par un commissaire de justice.",
        "Dans ce cas, les frais sont à la charge du Propriétaire pour l'état des lieux d'entrée et à la charge du Locataire pour l'état des lieux de sortie.",
        "À défaut, le Locataire est réputé avoir reçu les lieux en bon état et devra les restituer dans le même état, sous réserve de l'usure normale.",
        "Le Locataire s'engage à prendre soin du bien et à informer sans délai le Mandataire de tout dommage ou incident.",
      ],
    },
    keysAccess: {
      en: [
        "The Tenant shall be provided with the keys and access devices necessary to access and use the property upon arrival.",
        "All keys and access devices must be returned upon departure.",
        "In the event of loss, non-return or damage to any key or access device, the Tenant shall bear the full cost of replacement, including, where applicable, locksmith services and any necessary security measures.",
      ],
      fr: [
        "Le Locataire se verra remettre les clés et dispositifs d'accès nécessaires à l'accès et à l'usage du bien lors de son arrivée.",
        "L'ensemble des clés et dispositifs d'accès devra être restitué au moment du départ.",
        "En cas de perte, de non-restitution ou de détérioration d'une clé ou d'un dispositif d'accès, le Locataire supportera l'intégralité des frais de remplacement, incluant, le cas échéant, les frais de serrurerie et toute mesure de sécurisation nécessaire.",
      ],
    },
    liability: {
      en: [
        "The Tenant shall be responsible for any damage caused to the property, its equipment or its contents during the rental period.",
        "The Tenant undertakes to maintain the property in good condition throughout the stay.",
        "The Tenant is responsible for any damage caused by occupants or guests.",
        "The Tenant must be insured, for the entire duration of the stay, against rental risks, in particular fire, water damage and civil liability for damage caused to the rented property and to neighbours. The Tenant shall provide proof of such insurance to the Owner or the Agent, upon request, by supplying an insurance certificate. Failing such proof before check-in, the Owner or the Agent may refuse to hand over the keys. If the Tenant does not have such insurance, the Agent may put the Tenant in touch with one of its partners; this introduction is provided free of charge and the Agent receives no remuneration for it.",
        "The Tenant shall remain responsible for the safekeeping of the property during the stay.",
        "The Agent shall not be held liable for any loss, theft or damage to the Tenant's personal belongings.",
      ],
      fr: [
        "Le Locataire est responsable de tout dommage causé au bien, à ses équipements ou à son mobilier pendant la durée de la location.",
        "Le Locataire s'engage à maintenir le bien en bon état durant le séjour.",
        "Le Locataire est responsable des dommages causés par les occupants ou les personnes qu'il introduit dans les lieux.",
        "Le Locataire est tenu d'être assuré, pendant toute la durée du séjour, contre les risques locatifs, notamment l'incendie, le dégât des eaux et sa responsabilité civile pour les dommages causés au bien loué et aux voisins. Le Locataire justifie de cette assurance auprès du Propriétaire ou du Mandataire, sur demande, par la remise d'une attestation d'assurance. À défaut de justification avant l'entrée dans les lieux, le Propriétaire ou le Mandataire pourra refuser la remise des clés. Si le Locataire ne dispose pas d'une telle assurance, le Mandataire pourra le mettre en relation avec l'un de ses partenaires ; cette mise en relation est effectuée à titre gratuit, sans but lucratif ni rémunération pour le Mandataire.",
        "Le Locataire demeure gardien du bien pendant la durée du séjour.",
        "Le Mandataire ne pourra être tenu responsable en cas de perte, de vol ou de détérioration des effets personnels du Locataire.",
      ],
    },
    additionalServices: {
      en: [
        "Additional services may be offered to the Tenant in connection with the rental, including, where applicable, cleaning during the stay, linen services or concierge services.",
        "Such services are optional, independent from the rental, and may be subject to separate pricing.",
        "They are provided by third-party providers or by the Owner, and are performed in the name and on behalf of the Owner.",
        "The Agent acts solely as an intermediary in the organisation of such services and shall not be considered as the provider of said services.",
      ],
      fr: [
        "Des prestations complémentaires peuvent être proposées au Locataire dans le cadre de la location, notamment, le cas échéant, des services de ménage en cours de séjour, de fourniture de linge ou de conciergerie.",
        "Ces prestations sont optionnelles, indépendantes de la location, et peuvent faire l'objet d'une facturation distincte.",
        "Elles sont réalisées par des prestataires tiers ou par le Propriétaire, au nom et pour le compte de ce dernier.",
        "Le Mandataire agit exclusivement en qualité d'intermédiaire dans l'organisation de ces prestations et ne saurait être considéré comme leur prestataire.",
      ],
    },
    nonCircumvention: {
      en: [
        "The Tenant undertakes not to enter into any direct agreement with the Owner concerning the rental, renewal, extension or purchase of the property without the prior involvement of the Agent.",
        "In the event that the Tenant or any person introduced by the Tenant concludes, directly or indirectly, a transaction relating to the property, including its purchase, without the Agent's involvement, the Agent shall be entitled to claim compensation corresponding to the commission that would have been due in connection with such transaction.",
      ],
      fr: [
        "Dans le cas où le Locataire, ou toute personne qu'il aurait introduite, viendrait à conclure directement ou indirectement toute opération relative au bien, notamment sa location, son renouvellement, sa prolongation ou son acquisition, sans l'intervention du Mandataire, celui-ci pourra prétendre à une indemnité correspondant au montant des honoraires qui auraient été dus conformément au barème d'honoraires du Mandataire en vigueur au jour de l'opération.",
      ],
    },
    cancellationIntro: {
      en: [
        "The sums paid in advance by the Tenant constitute a deposit on the price (acompte) and not earnest money (arrhes): by express derogation from Article L. 214-1 of the French Consumer Code and Article 1590 of the French Civil Code, neither Party has a right of withdrawal, and the consequences of a cancellation are governed exclusively by this Article 6.",
      ],
      fr: [
        "Les sommes versées d'avance par le Locataire constituent un acompte et non des arrhes : par dérogation expresse à l'article L. 214-1 du Code de la consommation et à l'article 1590 du Code civil, aucune des Parties ne dispose d'une faculté de dédit, et les conséquences d'une annulation sont exclusivement régies par le présent article 6.",
      ],
    },
    cancellationTenant: {
      en: [
        "In the event of cancellation by the Tenant, the following conditions shall apply:",
        "More than one hundred and twenty (120) days before the arrival date: full refund of the deposit paid.",
        "Less than one hundred and twenty (120) days but more than sixty (60) days before the arrival date: the Tenant shall owe compensation equal to 50% of the amount of the deposit, which shall be set off against the deposit paid; the remainder shall be refunded to the Tenant.",
        "Less than sixty (60) days but more than thirty (30) days before the arrival date: the deposit paid shall be retained; any sum paid in excess shall be refunded to the Tenant.",
        "Less than thirty (30) days before the arrival date: all sums paid (deposit and balance) shall be retained, excluding the security deposit, which shall be returned to the Tenant.",
        "Any cancellation must be notified in writing.",
        "The date of receipt of the cancellation shall be the effective date for the application of the above conditions.",
      ],
      fr: [
        "En cas d'annulation par le Locataire, les conditions suivantes s'appliquent :",
        "Plus de cent vingt (120) jours avant la date d'arrivée : remboursement intégral de l'acompte versé.",
        "Moins de cent vingt (120) jours mais plus de soixante (60) jours avant la date d'arrivée : le Locataire est redevable d'une indemnité égale à 50 % du montant de l'acompte, imputée sur l'acompte versé ; le surplus lui est remboursé.",
        "Moins de soixante (60) jours mais plus de trente (30) jours avant la date d'arrivée : l'acompte versé reste acquis ; toute somme versée au-delà est remboursée au Locataire.",
        "Moins de trente (30) jours avant la date d'arrivée : la totalité des sommes versées (acompte et solde) reste acquise, à l'exclusion du dépôt de garantie, qui est restitué au Locataire.",
        "Toute annulation devra être notifiée par écrit.",
        "La date de réception de la notification fera foi pour l'application des présentes conditions.",
      ],
    },
    cancellationOwner: {
      en: [
        "If the Landlord cancels the reservation more than 120 days before the date of occupation, the Landlord undertakes to reimburse the Tenant for the total amount of the down payment and is not liable for any compensation.",
        "If the Landlord cancels the reservation fewer than 120 but more than 60 days before the date of occupation, the Landlord undertakes to reimburse the Tenant for the total amount of the down payment increased by a compensation equal to 50% of the amount of the deposit.",
        "If the Landlord cancels the reservation less than 60 days before the date of occupation, the Landlord undertakes to reimburse the Tenant for the total amount of the down payment increased by a compensation equal to 100% of the amount of the deposit.",
      ],
      fr: [
        "Si le Propriétaire annule sa réservation plus de 120 jours avant la date d'entrée dans les lieux, le Propriétaire s'engage à rembourser au Locataire la totalité de l'acompte et n'est redevable d'aucune indemnité.",
        "Si le Propriétaire annule sa réservation moins de 120 jours avant la date d'entrée dans les lieux, mais plus de 60 jours avant la date d'entrée dans les lieux, le Propriétaire s'engage à rembourser la totalité de l'acompte majorée d'une indemnité égale à 50 % du montant de l'acompte au Locataire.",
        "Si le Propriétaire annule sa réservation moins de 60 jours avant la date d'entrée dans les lieux, le Propriétaire s'engage à rembourser la totalité de l'acompte majorée d'une indemnité égale à 100 % du montant de l'acompte au Locataire.",
      ],
    },
    forceMajeure: {
      en: [
        "Neither Party shall be held liable for the non-performance of its obligations where such non-performance results from an event of force majeure beyond its control.",
        "In such circumstances, the Parties shall use reasonable efforts to seek an amicable solution, which may include postponement or modification of the stay, where possible.",
      ],
      fr: [
        "Aucune des Parties ne pourra être tenue responsable de l'inexécution de ses obligations lorsque celle-ci résulte d'un cas de force majeure échappant à son contrôle.",
        "Dans une telle hypothèse, les Parties s'efforceront de rechercher une solution amiable, pouvant inclure un report ou un aménagement du séjour lorsque cela est possible.",
      ],
    },
    dataProtection: {
      en: [
        "Personal data collected in the context of this agreement is processed for the purposes of managing the rental and associated services.",
        "Such data may be shared with service providers where necessary for the performance of the agreement.",
        "In accordance with applicable data protection regulations, the data subject has the right to access, rectify and request the deletion of their personal data.",
      ],
      fr: [
        "Les données personnelles collectées dans le cadre du présent contrat sont traitées aux fins de gestion de la location et des prestations associées.",
        "Elles peuvent être transmises aux prestataires lorsque cela est nécessaire à l'exécution du contrat.",
        "Conformément à la réglementation applicable en matière de protection des données, toute personne concernée dispose d'un droit d'accès, de rectification et de suppression de ses données personnelles.",
      ],
    },
    nonDiscrimination: {
      en: [
        "The Parties undertake to comply with all applicable non-discrimination laws and regulations.",
        "No person shall be denied access to the rental on discriminatory grounds.",
      ],
      fr: [
        "Les Parties s'engagent à respecter les dispositions légales en matière de non-discrimination.",
        "Aucune personne ne pourra se voir refuser l'accès à la location pour des motifs discriminatoires.",
      ],
    },
    validity: {
      en: [
        "If any provision of this agreement is held to be invalid or unenforceable, such provision shall be deemed severable and shall not affect the validity or enforceability of the remaining provisions.",
      ],
      fr: [
        "Si l'une des stipulations du présent contrat est déclarée nulle ou inapplicable, elle sera réputée divisible et n'affectera pas la validité ou l'applicabilité des autres stipulations.",
      ],
    },
    governingLaw: {
      en: [
        "This agreement shall be governed by and construed in accordance with French law.",
        "In the event of a dispute, the Parties shall seek an amicable solution prior to any legal action.",
        "Failing such amicable resolution, any dispute shall be submitted to the competent courts in accordance with applicable law.",
        "The Tenant may have recourse to a consumer mediator in accordance with applicable regulations. The consumer mediator is: MEDIMMOCONSO – Adresse postale : 1 Allée du Parc de Mesemena – Bât A – CS 25222 – 44505 LA BAULE CEDEX – Adresse e-mail : contact@medimmoconso.fr – Site internet : medimmoconso.fr (rubrique « Adresser une réclamation »).",
      ],
      fr: [
        "Le présent contrat est régi par le droit français.",
        "En cas de litige, les Parties s'engagent à rechercher une solution amiable avant toute action judiciaire.",
        "À défaut d'accord amiable, le litige sera porté devant les juridictions compétentes conformément aux règles de droit commun.",
        "Le Locataire peut recourir à un médiateur de la consommation conformément à la réglementation en vigueur. Le médiateur de la consommation est : MEDIMMOCONSO – Adresse postale : 1 Allée du Parc de Mesemena – Bât A – CS 25222 – 44505 LA BAULE CEDEX – Adresse e-mail : contact@medimmoconso.fr – Site internet : medimmoconso.fr (rubrique « Adresser une réclamation »).",
      ],
    },
    signatures: {
      en: [
        "This Agreement is executed electronically and has the same legal value as a handwritten signature.",
        "Each Party acknowledges having read and accepted the terms of this agreement and agrees to be bound by them.",
        "The date of signature shall correspond to the date of electronic validation.",
        "Each Party acknowledges having received a copy of this Agreement.",
      ],
      fr: [
        "Le présent contrat est conclu par voie électronique et a la même valeur juridique qu'une signature manuscrite.",
        "Chaque Partie reconnaît avoir pris connaissance du présent contrat, en accepter les termes et s'y engager pleinement.",
        "La date de signature correspond à la date de validation électronique.",
        "Chaque Partie reconnaît avoir reçu un exemplaire du présent contrat.",
      ],
    },
    use: {
      en: ["The property is rented exclusively for short-term furnished rental purposes."],
      fr: ["Le bien est loué exclusivement à usage de location meublée de courte durée."],
    },
    equipment: {
      en: ["The property is equipped and furnished to a standard consistent with its category."],
      fr: ["Le bien est équipé et meublé conformément à son standing."],
    },
    photographs: {
      en: [
        "The photographs provided on the cover page are for illustrative purposes only and are non-contractual. They shall not engage the Agent's liability. Variations may exist, without affecting the overall standard and quality of the property.",
      ],
      fr: [
        "Les photographies figurant en page de couverture ont pour objet d'illustrer le bien loué et n'ont pas de valeur contractuelle. Elles ne sauraient engager la responsabilité du Mandataire. Des variations peuvent exister sans altérer le standing et la qualité générale du bien.",
      ],
    },
    article1: {
      en: [],
      fr: [
        "Le Bailleur donne en location saisonnière au Preneur, qui accepte, le bien ci-après désigné : {{property.name}}, {{property.kind}} sis {{property.address}}, {{property.city}} — d'une surface de {{property.surface}}, comprenant {{property.rooms}} et pouvant accueillir {{property.sleeps}}. La location est consentie à usage exclusif d'habitation de loisirs, à l'exclusion de toute activité professionnelle ou commerciale.",
      ],
    },
    article2: {
      en: [],
      fr: [
        "La présente location est consentie pour la période courant du {{stay.checkIn}} au {{stay.checkOut}}, soit {{stay.nights}}, sans que le Preneur puisse se prévaloir d'un quelconque droit au maintien dans les lieux à l'expiration de ce terme.",
      ],
    },
    article3: {
      en: [],
      fr: [
        "Le bien est loué pour un usage n'excédant pas {{stay.guests}}, conformément à sa capacité d'accueil. Toute occupation excédant ce nombre autorise le Bailleur à résilier de plein droit la présente.",
      ],
    },
    article4: {
      en: [],
      fr: [
        "Le loyer s'entend hors dépôt de garantie. Le règlement est exigible selon l'échéancier annexé aux présentes.",
      ],
    },
    article5: {
      en: [],
      fr: [
        "À la remise des clés, le Preneur verse un dépôt de garantie de {{money.securityDeposit}}, destiné à couvrir les dégradations éventuelles. Il lui est restitué dans un délai maximal de trente jours suivant la fin du séjour, déduction faite le cas échéant des sommes dues. Le dépôt de garantie ne constitue en aucun cas un revenu locatif.",
      ],
    },
    article6: {
      en: [],
      fr: [
        "Un état des lieux contradictoire est établi à l'entrée et à la sortie. Le Preneur jouit paisiblement du bien en bon père de famille et en préserve la destination, le mobilier et les équipements.",
      ],
    },
  },
};

/**
 * Fills `{{variables}}` from a flat map of rental values.
 *
 * An unknown variable is left standing as written rather than blanked. A
 * legal document showing "{{property.surface}}" is obviously broken and gets
 * fixed; one that quietly reads "d'une surface de ," looks finished and ships.
 */
export function interpolate(
  text: string,
  values: Record<string, string | undefined>
): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    const value = values[key];
    return value === undefined || value === "" ? whole : value;
  });
}

/**
 * The clause a document should print: the template's wording when it has any,
 * the shipped wording otherwise, with variables filled in both cases.
 */
export function resolveClause(
  type: DocumentTemplateTypeKey,
  key: string,
  clauses: TemplateClauses | null,
  values: Record<string, string | undefined> = {}
): Clause {
  const fallback = DEFAULT_CLAUSES[type][key] ?? { fr: [], en: [] };
  const stored = storedClause(clauses, key);
  const chosen =
    stored && (stored.fr.length > 0 || stored.en.length > 0) ? stored : fallback;
  return {
    fr: chosen.fr.map((p) => interpolate(p, values)),
    en: chosen.en.map((p) => interpolate(p, values)),
  };
}

/**
 * The stored wording for a key, or undefined — and nothing else.
 *
 * A plain `clauses[key]` lookup is unsafe here for two reasons. The column
 * holds whatever was saved, including the earlier block-array format, and an
 * array answers `clauses["keys"]` with `Array.prototype.keys` — a function,
 * truthy, with no paragraphs on it. Any clause named after a prototype member
 * ("keys", "values", "constructor", "toString"…) would do the same on an
 * object. So the value has to be an own property, and shaped like a clause,
 * before it is trusted; anything else falls back to the shipped wording.
 */
function storedClause(
  clauses: TemplateClauses | null,
  key: string
): Clause | undefined {
  if (!clauses || !Object.prototype.hasOwnProperty.call(clauses, key)) {
    return undefined;
  }
  const value: unknown = (clauses as Record<string, unknown>)[key];
  if (typeof value !== "object" || value === null) return undefined;
  const { fr, en } = value as { fr?: unknown; en?: unknown };
  if (!Array.isArray(fr) || !Array.isArray(en)) return undefined;
  return { fr: fr.map(String), en: en.map(String) };
}
