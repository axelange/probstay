import type { Bilingual } from "@/features/documents/concierge-packages";

/**
 * The seasonal rental management mandate, section by section.
 *
 * Held as data and not as JSX, for the reason the other agreements' clauses
 * are: this text is revised by lawyers, who should be able to find a clause
 * without reading a component.
 *
 * ---- French leads ----
 *
 * The mandate is a Hoguet-law instrument entered in the register of mandates;
 * the French is the text, and the English follows each passage in italic, as
 * the agency's own draft sets it. A `p` block is therefore one passage: its
 * French paragraphs, then the same paragraphs in English.
 *
 * ---- Emphasis ----
 *
 * `**…**` marks what the draft sets in bold. It is not decoration: article 78
 * of the decree of 20 July 1972 requires the penalty clause and the terms of
 * termination to appear "en caractères très apparents", so the weight is part
 * of the clause. The French prints it; the English is already italic, and the
 * family has no bold italic, so its markers are dropped.
 *
 * ---- Slots ----
 *
 * Where the draft has a form — the owner's identity, the property, the boxes
 * of section 4 — the block is a `slot` and the template draws it from the
 * mandate's own data. `{{tokens}}` are the few values that sit inside a
 * sentence.
 */

export type MandateSlot =
  | "owner"
  | "property"
  | "description"
  | "equipment"
  | "legalInfo"
  | "deposit"
  | "utilities"
  | "services"
  | "specific"
  | "annexList";

/**
 * Printed only in that case. Absent means always.
 *
 * Article 9.4.2 has the owner attest that the pool carries a safety cover. An
 * owner whose property has no pool must not sign that.
 */
export type MandateCondition = "pool";

export type MandateBlock =
  /** A numbered sub-section: "4.1 Tarifs de location" / "Rental pricing". */
  | { kind: "sub"; fr: string; en: string }
  /** A small caps heading inside a section: "Équipements" / "Equipment". */
  | { kind: "minor"; fr: string; en: string; onlyWhen?: MandateCondition }
  | {
      kind: "p";
      fr: string[];
      en: string[];
      /** Set apart in a ruled box and in bold — the penalty clause. */
      box?: boolean;
      onlyWhen?: MandateCondition;
    }
  | { kind: "slot"; slot: MandateSlot };

export type MandateArticle = {
  n: number;
  title: Bilingual;
  blocks: MandateBlock[];
};

/** The statutes the mandate is made under, printed above section 1. */
export const MANDATE_PREAMBLE =
  "Loi n° 70-9 du 2 janvier 1970, décret n° 72-678 du 20 juillet 1972 et articles 1984 et suivants du Code civil";

export const MANDATE_TITLE: Bilingual = {
  fr: "Mandat de gestion locative – Location saisonnière",
  en: "Seasonal Rental Management Mandate",
};

export const MANDATE_REGISTER_NOTE: Bilingual = {
  fr: "inscrit au registre des mandats",
  en: "entered in the register of mandates",
};

/**
 * What a property described by hand can be. A closed list, not a typed line:
 * the mandate prints the type in two languages, and only a known type has a
 * known translation.
 */
export const MANDATE_PROPERTY_KINDS = [
  { key: "APARTMENT", fr: "Appartement", en: "Apartment" },
  { key: "VILLA", fr: "Villa", en: "Villa" },
  { key: "CHALET", fr: "Chalet", en: "Chalet" },
] as const;

/**
 * In what capacity the owner holds the property — the ways French law lets a
 * person hold one and let it. Closed for the same reason as the type.
 */
export const MANDATE_OWNERSHIP = [
  { key: "FULL", fr: "Plein propriétaire", en: "Full owner" },
  { key: "USUFRUCT", fr: "Usufruitier", en: "Usufructuary" },
  {
    key: "UNDIVIDED",
    fr: "Propriétaire indivis",
    en: "Joint owner (undivided ownership)",
  },
  { key: "BARE", fr: "Nu-propriétaire", en: "Bare owner" },
] as const;

/** 4.4's answers on pets: the one line there with a third box. */
export const MANDATE_PETS = [
  { key: "YES", fr: "Oui", en: "Yes" },
  { key: "NO", fr: "Non", en: "No" },
  { key: "ON_REQUEST", fr: "Sur demande", en: "On request" },
] as const;

/**
 * What the registration number's line says while there is no number yet: the
 * declaration that obtains one is Appendix 4.
 */
export const MANDATE_NO_REGISTRATION = {
  fr: "Enregistrement en cours, CERFA fourni en annexe",
  en: "Registration in progress, CERFA form provided in appendix",
} as const;

/** What section 4's boxes offer, in the order the draft lists them. */
export const MANDATE_UTILITIES = [
  { key: "electricity", fr: "Électricité", en: "Electricity" },
  { key: "water", fr: "Eau", en: "Water" },
  { key: "gas", fr: "Gaz", en: "Gas" },
  { key: "internet", fr: "Internet", en: "Internet" },
] as const;

export const MANDATE_SERVICES = [
  {
    key: "stayCleaning",
    fr: "Ménage pendant le séjour",
    en: "Cleaning during stay",
  },
  {
    key: "endCleaning",
    fr: "Ménage de fin de séjour",
    en: "End-of-stay cleaning",
  },
  { key: "linen", fr: "Linge de maison", en: "Linen" },
  {
    key: "garden",
    fr: "Entretien des espaces verts",
    en: "Garden maintenance",
  },
  { key: "pool", fr: "Entretien piscine", en: "Pool maintenance" },
] as const;

export const MANDATE_ANNEXES: Bilingual[] = [
  { fr: "Annexe 1 – Grille Tarifaire", en: "Appendix 1 – Pricing Schedule" },
  {
    fr: "Annexe 2 – Barème d’honoraires du Mandataire en vigueur",
    en: "Appendix 2 – Agent’s fee schedule in force",
  },
  {
    fr: "Annexe 3 – Formulaire de rétractation",
    en: "Appendix 3 – Withdrawal form",
  },
  {
    fr: "Annexe 4 – Formulaire CERFA n° 14004*04",
    en: "Appendix 4 – CERFA form no. 14004*04",
  },
];

export const MANDATE_ARTICLES: MandateArticle[] = [
  {
    n: 1,
    title: { fr: "Le Propriétaire", en: "The Owner" },
    blocks: [
      { kind: "slot", slot: "owner" },
      {
        kind: "p",
        fr: [
          "**Information – démarchage téléphonique.** Conformément à l’article L. 223-1 du Code de la consommation, il est interdit à tout professionnel de démarcher par téléphone, à des fins commerciales, un consommateur qui n’a pas préalablement consenti à être démarché par ce moyen. Le numéro de téléphone recueilli ci-dessus est utilisé pour les seuls besoins de l’exécution du présent mandat.",
        ],
        en: [
          "**Notice – telephone canvassing.** Pursuant to Article L. 223-1 of the French Consumer Code, professionals are prohibited from canvassing by telephone, for commercial purposes, any consumer who has not given prior consent to being canvassed by this means. The telephone number collected above is used solely for the performance of this mandate.",
        ],
      },
      {
        kind: "p",
        fr: ["ci-après dénommé « le Propriétaire »,"],
        en: ["hereinafter referred to as the “Owner”,"],
      },
    ],
  },
  {
    n: 2,
    title: { fr: "Le Mandataire", en: "The Agent" },
    blocks: [
      {
        kind: "p",
        fr: [
          "SAS BSTAY, dont le siège social est situé au 9 Rond-Point Duboys d’Angers – 06400 Cannes, France, immatriculée sous le numéro 920 635 356 au RCS de Cannes, représentée par {{agentRep}}, en sa qualité de {{agentCapacity}}, dûment habilitée à l’effet des présentes.",
          "Titulaire de la carte professionnelle numéro CPI 8304 2026 000 000 007, délivrée par la CCI Nice Côte d’Azur, portant les mentions **« Transaction sur immeubles et fonds de commerce »** et **« Gestion immobilière »**.",
          "Garantie financière délivrée par la CEGC, dont le siège social est situé au 59, avenue Pierre Mendès France – 75013 Paris, sous le numéro 31961GES261, et d’une assurance responsabilité civile professionnelle souscrite auprès de Generali sous le numéro de police AL591311/31961.",
        ],
        en: [
          "SAS BSTAY, whose registered office is located at 9 Rond-Point Duboys d’Angers – 06400 Cannes, France, registered with the Cannes Trade and Companies Register under number 920 635 356, represented by {{agentRep}}, in her capacity as {{agentCapacity}}, duly authorized for the purposes hereof.",
          "Holder of professional licence number CPI 8304 2026 000 000 007, issued by the Nice Côte d’Azur Chamber of Commerce and Industry, bearing the mentions **“Transaction sur immeubles et fonds de commerce”** (real-estate and business transactions) and **“Gestion immobilière”** (property management).",
          "Financial guarantee provided by CEGC, whose registered office is located at 59 Avenue Pierre Mendès France – 75013 Paris, under number 31961GES261, and professional liability insurance subscribed with Generali under policy number AL591311/31961.",
        ],
      },
      {
        kind: "p",
        fr: ["ci-après dénommé « le Mandataire »."],
        en: ["hereinafter referred to as the “Agent”,"],
      },
    ],
  },
  {
    n: 3,
    title: { fr: "Description du bien", en: "Property description" },
    blocks: [
      { kind: "slot", slot: "property" },
      { kind: "minor", fr: "Description", en: "Description" },
      { kind: "slot", slot: "description" },
      { kind: "minor", fr: "Équipements", en: "Equipment" },
      {
        kind: "p",
        fr: ["Le bien comprend les équipements suivants :"],
        en: ["The property includes the following equipment:"],
      },
      { kind: "slot", slot: "equipment" },
      {
        kind: "p",
        fr: [
          "Le propriétaire s’engage à fournir l’ensemble des équipements énumérés ci-dessus en parfait état de fonctionnement pendant toute la durée de la location. En cas de dysfonctionnement de l’un d’eux pendant le séjour, il devra faire le nécessaire pour procéder à sa réparation ou à son remplacement dans les meilleurs délais afin d’assurer le confort des occupants.",
        ],
        en: [
          "The owner undertakes to provide all the equipment listed above in perfect working order throughout the rental period. In the event of a malfunction of any item during the stay, the owner shall take the necessary steps to repair or replace it as soon as possible in order to ensure the comfort of the occupants.",
        ],
      },
      { kind: "minor", fr: "Informations légales", en: "Legal information" },
      { kind: "slot", slot: "legalInfo" },
    ],
  },
  {
    n: 4,
    title: { fr: "Conditions de location", en: "Rental conditions" },
    blocks: [
      { kind: "sub", fr: "4.1 Tarifs de location", en: "Rental pricing" },
      {
        kind: "p",
        fr: [
          "Les tarifs de location applicables au bien sont définis dans la grille tarifaire annexée au présent mandat (la « Grille Tarifaire »), qui en fait partie intégrante.",
          "Le Propriétaire reconnaît que les tarifs sont déterminés en accord avec le Mandataire et peuvent être ajustés à tout moment en fonction des conditions de marché, du taux d’occupation et de la stratégie commerciale.",
          "Le prix applicable à chaque réservation est celui confirmé dans la confirmation de réservation validée par le Propriétaire.",
        ],
        en: [
          "The rental prices applicable to the property are set out in the pricing schedule attached to this mandate (the “Pricing Schedule”), which forms an integral part hereof.",
          "The Owner acknowledges that rental prices are determined in agreement with the Agent and may be adjusted at any time to reflect market conditions, occupancy levels and commercial strategy.",
          "The price applicable to each booking shall be the one confirmed in the booking confirmation validated by the Owner.",
        ],
      },
      { kind: "slot", slot: "deposit" },
      {
        kind: "sub",
        fr: "4.2 Charges et prestations",
        en: "Charges and services",
      },
      { kind: "slot", slot: "utilities" },
      {
        kind: "sub",
        fr: "4.3 Prestations de location",
        en: "Services included in the rental",
      },
      { kind: "slot", slot: "services" },
      {
        kind: "sub",
        fr: "4.4 Conditions particulières",
        en: "Specific conditions",
      },
      { kind: "slot", slot: "specific" },
      {
        kind: "p",
        fr: [
          "**États des lieux d’entrée et de sortie.** Pour les villas, les états des lieux d’entrée et de sortie sont réalisés par un commissaire de justice (huissier de justice) (article 5.2).",
        ],
        en: [
          "**Check-in and check-out inspections.** For villas, the check-in and check-out inspections are carried out by a judicial officer (bailiff) (Article 5.2).",
        ],
      },
    ],
  },
  {
    n: 5,
    title: { fr: "Missions du Mandataire", en: "Agent’s mission" },
    blocks: [
      {
        kind: "sub",
        fr: "5.1 Nature du mandat",
        en: "Nature of the mandate",
      },
      {
        kind: "p",
        fr: [
          "Le présent mandat est un **mandat de gestion locative** portant sur la location saisonnière du bien, régi par la loi n° 70-9 du 2 janvier 1970 et par les articles 64 et suivants du décret n° 72-678 du 20 juillet 1972. Il est consenti au Mandataire au titre de sa carte professionnelle portant les mentions « Gestion immobilière » et « Transaction sur immeubles et fonds de commerce ».",
          "Outre la recherche de locataires et la mise en location du bien, le Propriétaire confie au Mandataire, qui l’accepte, le pouvoir de le représenter pour la gestion des locations : conclusion des contrats de location, encaissement des loyers, des acomptes et des dépôts de garantie, restitution des dépôts de garantie, collecte et reversement de la taxe de séjour, états des lieux, interventions d’urgence et coordination des prestations attachées à chaque séjour. Les prestations purement matérielles de conciergerie (ménage, linge, services aux locataires) sont l’accessoire de cette mission de gestion.",
        ],
        en: [
          "This mandate is a **rental management mandate** (mandat de gestion locative) relating to the seasonal rental of the property, governed by Law no. 70-9 of 2 January 1970 and by Articles 64 et seq. of Decree no. 72-678 of 20 July 1972. It is granted to the Agent under its professional licence bearing the mentions “Gestion immobilière” and “Transaction sur immeubles et fonds de commerce”.",
          "In addition to finding tenants and letting the property, the Owner entrusts the Agent, which accepts, with the power to represent the Owner in the management of the rentals: conclusion of rental agreements, collection of rents, down payments and security deposits, refund of security deposits, collection and remittance of the tourist tax, check-in and check-out inspections, emergency interventions and coordination of the services attached to each stay. Purely material concierge services (cleaning, linen, guest services) are ancillary to this management mission.",
        ],
      },
      { kind: "sub", fr: "5.2 Missions", en: "Missions" },
      {
        kind: "p",
        fr: [
          "Le Mandataire s’attache à fournir au Propriétaire une prestation complète. À ce titre, il se charge des missions suivantes :",
          "– Mise en location du bien et diffusion sur les supports de communication adaptés.",
          "– Établissement des contrats de location aux dates et tarifs convenus avec le Propriétaire.",
          "– Fourniture de toutes les informations nécessaires à la préparation de la location, notamment l’assurance du locataire, l’identité et l’adresse du locataire, le nombre d’occupants et les dates d’arrivée et de départ.",
          "– Encaissement des loyers, acomptes et dépôts de garantie pour le compte du Propriétaire, restitution des dépôts de garantie aux locataires, collecte et reversement de la taxe de séjour.",
          "– Accueil personnalisé des locataires.",
          "– État des lieux d’entrée, établi et signé au nom et pour le compte du Propriétaire.",
          "– État des lieux de sortie, établi et signé au nom et pour le compte du Propriétaire.",
          "– Pour les villas, les états des lieux d’entrée et de sortie sont systématiquement réalisés par un commissaire de justice (huissier de justice) : l’état des lieux d’entrée est à la charge du Propriétaire, l’état des lieux de sortie est à la charge du locataire.",
          "– Services de conciergerie (chef de cuisine, gouvernante, achats, réservations…), donnant lieu à facturation et à des honoraires complémentaires à la charge du locataire.",
          "– Conseil et accompagnement pour la préparation du bien et sa mise en location.",
          "– Organisation du ménage en cours de séjour (2 à 4 heures pour un appartement, 4 à 6 heures pour une maison, minimum par semaine) ; cette prestation est facultative et n’est effectuée qu’à la demande du locataire.",
          "– Organisation du ménage de sortie après le départ des locataires, sous réserve que cette prestation soit incluse dans les prestations de location (article 4.3).",
          "– Organisation de l’installation et de l’entretien du linge (linge de maison, draps, linge de toilette) via des prestataires, sous réserve que cette prestation soit incluse dans les prestations de location (article 4.3).",
          "– Intervention en cas d’urgence et coordination avec les prestataires compétents.",
        ],
        en: [
          "The Agent is committed to providing the Owner with a comprehensive service. The Agent shall therefore be responsible for the following:",
          "– Marketing of the property and its promotion through appropriate communication channels.",
          "– Drafting of rental agreements according to the dates and prices agreed with the Owner.",
          "– Providing all necessary information for the preparation of the rental, including tenant insurance, identity and address of the tenant, number of occupants, and dates of arrival and departure.",
          "– Collection of rents, down payments and security deposits on behalf of the Owner, refund of security deposits to tenants, collection and remittance of the tourist tax.",
          "– Personalized welcome of tenants.",
          "– Check-in inspection, drawn up and signed in the name and on behalf of the Owner.",
          "– Check-out inspection, drawn up and signed in the name and on behalf of the Owner.",
          "– For villas, the check-in and check-out inspections are systematically carried out by a judicial officer (bailiff): the check-in inspection is borne by the Owner and the check-out inspection is borne by the tenant.",
          "– Concierge services (private chef, housekeeping, shopping, reservations, etc.), subject to additional fees payable by the tenant.",
          "– Advice and assistance for preparing the property for rental.",
          "– Organization of cleaning during the stay (2 to 4 hours for an apartment, 4 to 6 hours for a house, minimum per week); this service is optional and is carried out only at the tenant’s request.",
          "– Organization of end-of-stay cleaning, provided that this service is included in the rental services (Article 4.3).",
          "– Organization of linen installation and maintenance (household linen, bed sheets, towels) through service providers, provided that this service is included in the rental services (Article 4.3).",
          "– Intervention in case of emergency and coordination with appropriate service providers.",
        ],
      },
      {
        kind: "sub",
        fr: "5.3 Prestataires tiers",
        en: "Third-party service providers",
      },
      {
        kind: "p",
        fr: [
          "Le Mandataire est autorisé à sélectionner et coordonner des prestataires tiers pour l’exécution de tout ou partie des prestations décrites ci-dessus. Il apporte tout le soin requis au choix de ces prestataires, dont il assure la coordination et le suivi. Conformément à l’article 1994 du Code civil, le Mandataire répond à l’égard du Propriétaire de toute faute commise dans la sélection, la coordination ou la surveillance de ces prestataires.",
          "Le service de réception de la clientèle est assuré exclusivement par le Mandataire.",
        ],
        en: [
          "The Agent is authorized to appoint and coordinate third-party service providers for the performance of all or part of the services described above. The Agent shall exercise all due care in the selection of such service providers and shall coordinate and monitor their work. In accordance with Article 1994 of the French Civil Code, the Agent is liable to the Owner for any fault committed in the selection, coordination or supervision of such service providers.",
          "The reception of tenants shall be carried out exclusively by the Agent.",
        ],
      },
    ],
  },
  {
    n: 6,
    title: { fr: "Rémunération du Mandataire", en: "Agent’s fees" },
    blocks: [
      {
        kind: "p",
        fr: [
          "En rémunération de sa mission, le Mandataire perçoit des honoraires de gestion égaux à **25 % HT (TVA en sus au taux en vigueur)** du montant des loyers encaissés, conformément à son barème d’honoraires en vigueur, annexé au présent mandat (Annexe 2). Ce taux est fixé pour toute la durée du mandat.",
          "Ces honoraires sont directement déduits des sommes encaissées pour le compte du Propriétaire et sont exigibles après encaissement effectif des loyers.",
        ],
        en: [
          "In consideration for its services, the Agent shall receive management fees equal to **25 % (excluding VAT, VAT payable in addition at the rate in force)** of the amount of the rents collected, in accordance with the Agent’s fee schedule in force, attached to this mandate (Appendix 2). This rate is fixed for the entire term of the mandate.",
          "These fees shall be deducted directly from the amounts collected on behalf of the Owner and become payable upon effective receipt of the rental funds.",
        ],
      },
    ],
  },
  {
    n: 7,
    title: { fr: "Visites du bien", en: "Viewings of the property" },
    blocks: [
      {
        kind: "p",
        fr: [
          "Le Propriétaire autorise le Mandataire à organiser et effectuer toutes visites jugées nécessaires à la mise en location du bien.",
          "Le Mandataire s’engage à informer le Propriétaire préalablement à toute visite, sauf accord contraire entre les Parties. Le Propriétaire s’engage à permettre l’accès au bien.",
        ],
        en: [
          "The Owner authorizes the Agent to organize and carry out any viewings deemed necessary for the marketing and rental of the property.",
          "The Agent undertakes to inform the Owner in advance of any visit, unless otherwise agreed between the Parties. The Owner undertakes to ensure access to the property.",
        ],
      },
    ],
  },
  {
    n: 8,
    title: {
      fr: "Méthode de règlement et annulation",
      en: "Payment method and cancellation",
    },
    blocks: [
      { kind: "sub", fr: "8.1 Modalités de règlement", en: "Payment terms" },
      {
        kind: "p",
        fr: [
          "Le Mandataire est autorisé à encaisser les loyers pour le compte du Propriétaire. Conformément à l’article 68 du décret du 20 juillet 1972, le locataire verse à la réservation un acompte égal à 25 % du montant du loyer, ce versement ne pouvant intervenir plus de douze mois avant la remise des clés. Le solde du loyer est exigible un mois avant le début de la location et doit être réglé au plus tard à cette date.",
          "Un dépôt de garantie est exigé avant le début du séjour, conformément à la Section 4 – Conditions de location. Il doit être versé avant l’arrivée ; il est encaissé par le Mandataire pour le compte du Propriétaire, conservé sur le compte séquestre du Mandataire, puis restitué par le Mandataire au locataire après le séjour, sous réserve de toute déduction pour dommages ou frais impayés.",
          "Le Mandataire déduit sa commission ainsi que les éventuelles dépenses engagées avant reversement des loyers nets au Propriétaire. Le reversement des loyers intervient dans un délai raisonnable après leur encaissement.",
        ],
        en: [
          "The Agent is authorized to collect the rent on behalf of the Owner. In accordance with Article 68 of the Decree of 20 July 1972, the tenant shall pay, upon booking, a down payment equal to 25 % of the amount of the rent; this payment may not be made more than twelve months before the handing over of the keys. The balance of the rent falls due one month before the start of the rental and must be paid no later than that date.",
          "A security deposit is required prior to the start of the stay, as specified in Section 4 – Rental Conditions. It must be paid prior to arrival; it is collected by the Agent on behalf of the Owner, held on the Agent’s escrow account and refunded by the Agent to the tenant after the stay, subject to any deductions for damages or outstanding charges.",
          "The Agent shall deduct its commission and any expenses incurred before transferring the net rental income to the Owner. The transfer of rental income shall occur within a reasonable timeframe following receipt.",
        ],
      },
      {
        kind: "sub",
        fr: "8.2 Taxe de séjour et TVA",
        en: "Tourist tax and VAT",
      },
      {
        kind: "p",
        fr: [
          "La taxe de séjour, lorsqu’elle est applicable, est due par le locataire et n’est pas incluse dans le prix de la location. Le Mandataire est autorisé à collecter et reverser la taxe de séjour pour le compte du Propriétaire, conformément à la réglementation en vigueur. Le montant applicable est celui en vigueur dans la commune concernée.",
          "Lorsque les loyers sont soumis à la TVA (notamment en cas de qualification para-hôtelière, article 9.5), le Propriétaire en informe le Mandataire par écrit avant toute mise en location ; le Mandataire fait alors apparaître la TVA sur les contrats de location et les décomptes, le Propriétaire demeurant seul redevable de sa déclaration et de son paiement.",
        ],
        en: [
          "The tourist tax, where applicable, is payable by the tenant and is not included in the rental price. The Agent is authorized to collect and remit the tourist tax on behalf of the Owner, in accordance with applicable regulations. The applicable rate is the one in force in the relevant municipality.",
          "Where the rents are subject to VAT (in particular where the activity qualifies as a para-hotel service, Article 9.5), the Owner shall inform the Agent in writing before any letting; the Agent shall then show the VAT on the rental agreements and statements, the Owner remaining solely liable for declaring and paying it.",
        ],
      },
      {
        kind: "sub",
        fr: "8.3 Conditions d’annulation",
        en: "Cancellation policy",
      },
      {
        kind: "p",
        fr: [
          "Les conditions d’annulation applicables aux locataires sont définies dans le contrat de location établi pour chaque réservation. Le Mandataire s’assure que ces conditions sont clairement portées à la connaissance du locataire avant toute confirmation.",
        ],
        en: [
          "Cancellation conditions applicable to tenants shall be specified in the rental agreement concluded for each booking. The Agent shall ensure that such conditions are clearly communicated to the Tenant prior to confirmation.",
        ],
      },
      {
        kind: "p",
        fr: [
          "Les sommes versées par le locataire à la réservation constituent un **acompte** et non des arrhes : l’article 1590 du Code civil et l’article L. 214-1 du Code de la consommation ne leur sont pas applicables, et toute réservation confirmée engage définitivement le Propriétaire.",
          "En cas d’annulation d’une réservation confirmée du fait du Propriétaire, celui-ci s’engage à restituer au locataire l’intégralité des sommes versées et à lui régler, **à titre de clause pénale au sens de l’article 1231-5 du Code civil**, une indemnité forfaitaire fixée comme suit :",
          "– annulation plus de 120 jours avant la date d’entrée dans les lieux : aucune indemnité ;",
          "– annulation entre 120 et 60 jours (inclus) avant la date d’entrée dans les lieux : indemnité égale à 50 % du montant de l’acompte ;",
          "– annulation moins de 60 jours avant la date d’entrée dans les lieux : indemnité égale à 100 % du montant de l’acompte.",
        ],
        en: [
          "The sums paid by the tenant upon booking constitute a **down payment (acompte)** and not a deposit with a right of withdrawal (arrhes): Article 1590 of the French Civil Code and Article L. 214-1 of the French Consumer Code do not apply to them, and a confirmed booking is a firm commitment of the Owner.",
          "If a confirmed booking is cancelled by the Owner, the Owner undertakes to refund to the tenant all sums paid and to pay the tenant, **as a penalty clause within the meaning of Article 1231-5 of the French Civil Code**, a lump-sum indemnity determined as follows:",
          "– cancellation more than 120 days before the date of occupation: no indemnity;",
          "– cancellation between 120 and 60 days (inclusive) before the date of occupation: indemnity equal to 50 % of the amount of the down payment;",
          "– cancellation less than 60 days before the date of occupation: indemnity equal to 100 % of the amount of the down payment.",
        ],
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire est exonéré du paiement d’une indemnité en cas de force majeure, sous réserve d’une demande de résiliation amiable du contrat et de l’apport de preuves quant à sa situation de force majeure.",
        ],
        en: [
          "The Landlord shall be exempt from the payment of compensation in cases of force majeure, provided that an amicable termination of the contract is requested and sufficient evidence of the force majeure situation is supplied.",
        ],
      },
      {
        kind: "p",
        fr: [
          "Lors du second paiement, un montant de séquestre égal à 10 % du loyer total sera conservé par le Mandataire pour faire face à toute éventuelle dépense survenant lors de la location qui ne soit pas de la responsabilité du locataire, et sera versé en partie ou en totalité à la fin du séjour.",
        ],
        en: [
          "During the second payment, an escrow amount equal to 10% of the total rent shall be retained by the Agent to cover any potential expenses arising during the rental period that are not the responsibility of the Tenant, and shall be released in part or in full at the end of the stay.",
        ],
      },
      { kind: "sub", fr: "8.4 Force majeure", en: "Force majeure" },
      {
        kind: "p",
        fr: [
          "Aucune des Parties ne pourra être tenue responsable de l’inexécution de ses obligations lorsque celle-ci résulte d’un cas de force majeure tel que défini par l’article 1218 du Code civil. Dans une telle hypothèse, les Parties s’efforceront de rechercher une solution amiable, notamment par le report, le réaménagement ou l’annulation du séjour lorsque cela est approprié.",
        ],
        en: [
          "Neither Party shall be held liable for the non-performance of its obligations where such non-performance results from an event of force majeure as defined under Article 1218 of the French Civil Code. In such circumstances, the Parties shall use their best efforts to seek an amicable solution, including postponement, rescheduling or cancellation of the stay where appropriate.",
        ],
      },
      {
        kind: "sub",
        fr: "8.5 Responsabilité et assurance",
        en: "Liability and insurance",
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire peut exiger du locataire la souscription d’une assurance adaptée, notamment une assurance villégiature le cas échéant.",
          "Le Mandataire agit en qualité d’intermédiaire et ne répond pas des dommages causés par le locataire, sauf faute du Mandataire dans l’exécution de sa mission.",
        ],
        en: [
          "The Owner may require the tenant to provide appropriate insurance coverage, including holiday rental insurance where applicable.",
          "The Agent acts as an intermediary and is not liable for damage caused by the tenant, except in the event of a fault of the Agent in the performance of its mission.",
        ],
      },
    ],
  },
  {
    n: 9,
    title: {
      fr: "Conditions générales du mandat",
      en: "General conditions of the mandate",
    },
    blocks: [
      { kind: "sub", fr: "9.1 Durée – Résiliation", en: "Term – Termination" },
      {
        kind: "p",
        fr: [
          "Le présent mandat est conclu pour une **durée déterminée de trois (3) ans** à compter de sa signature. À l’arrivée de ce terme, il prend fin de plein droit, **sans tacite reconduction** ; sa poursuite suppose la signature d’un nouveau mandat.",
          "Conformément à l’article 78 du décret du 20 juillet 1972, **passé un délai de trois (3) mois à compter de sa signature, le présent mandat peut être dénoncé à tout moment par chacune des Parties**, à charge pour celle qui entend y mettre fin d’en aviser l’autre quinze (15) jours au moins à l’avance par lettre recommandée avec demande d’avis de réception.",
          "La résiliation n’affecte pas les réservations confirmées avant sa prise d’effet : le Mandataire continue de les gérer jusqu’à leur terme et ses honoraires restent dus à ce titre.",
          "Lorsque le Propriétaire a la qualité de consommateur, il bénéficie d’un droit de rétractation conformément aux dispositions du Code de la consommation. Un formulaire de rétractation est annexé au présent mandat.",
        ],
        en: [
          "This mandate is granted for a **fixed term of three (3) years** from the date of signature. On expiry of that term it shall end automatically, **without tacit renewal**; its continuation shall require the signature of a new mandate.",
          "In accordance with Article 78 of the Decree of 20 July 1972, **after a period of three (3) months from its signature, this mandate may be terminated at any time by either Party**, provided that the Party wishing to terminate gives the other at least fifteen (15) days’ notice by registered letter with acknowledgement of receipt.",
          "Termination shall not affect bookings confirmed before it takes effect: the Agent shall continue to manage them until their completion and its fees shall remain due in respect of them.",
          "Where applicable, the Owner benefits from a statutory right of withdrawal in accordance with applicable consumer protection laws. A withdrawal form is attached to this mandate.",
        ],
      },
      {
        kind: "sub",
        fr: "9.2 Obligations du Mandataire – Reddition des comptes – Responsabilité",
        en: "Obligations of the Agent – Accounts – Liability",
      },
      {
        kind: "p",
        fr: [
          "Le Mandataire exécute sa mission avec diligence, professionnalisme et dans le meilleur intérêt du Propriétaire. Il agit dans les limites des pouvoirs qui lui sont conférés par le présent mandat et accomplit toutes les démarches nécessaires à sa bonne exécution. Le Mandataire tient une comptabilité appropriée des opérations financières réalisées pour le compte du Propriétaire.",
          "**Reddition des comptes.** Conformément à l’article 66 du décret du 20 juillet 1972 et à l’article 1993 du Code civil, le Mandataire rend compte de sa gestion au Propriétaire spontanément, sans que celui-ci ait à en faire la demande : (i) à l’occasion de chaque reversement, par un décompte détaillé des sommes encaissées, des honoraires prélevés et des dépenses engagées, accompagné des justificatifs ; (ii) et au moins une fois par an, au plus tard le 31 janvier, par un compte rendu de gestion récapitulant l’ensemble des opérations de l’année civile écoulée. Le Propriétaire peut en outre obtenir à tout moment, sur simple demande, tout justificatif relatif à la gestion du bien.",
          "Le Mandataire assure une gestion transparente des fonds dans le cadre du présent mandat.",
          "**Responsabilité.** Le Mandataire répond de ses fautes dans l’exécution de sa mission, conformément aux articles 1991 et 1992 du Code civil. Il ne répond pas des dommages qui trouvent leur cause exclusive dans le fait du locataire, du Propriétaire ou d’un tiers, ou dans un cas de force majeure ; s’agissant des prestataires qu’il sélectionne, il demeure responsable de toute faute de sélection, de coordination ou de surveillance (article 5.3). Le Mandataire ne répond pas des dommages indirects ou immatériels.",
          "Ces limitations ne s’appliquent ni en cas de faute lourde ou dolosive du Mandataire (article 1231-3 du Code civil), ni lorsqu’elles auraient pour effet de priver de sa substance une obligation essentielle du Mandataire (article 1170 du Code civil). Elles s’entendent sans préjudice des dispositions d’ordre public protégeant le Propriétaire consommateur ou non-professionnel.",
          "Le Mandataire agit au nom et pour le compte du Propriétaire et n’est pas personnellement partie au contrat de location.",
        ],
        en: [
          "The Agent shall perform its mission with due care, professionalism and in the best interests of the Owner. The Agent acts within the limits of the powers granted by this mandate and may carry out all necessary actions for its proper execution. The Agent shall keep appropriate records of all financial transactions carried out on behalf of the Owner.",
          "**Rendering of accounts.** In accordance with Article 66 of the Decree of 20 July 1972 and Article 1993 of the French Civil Code, the Agent shall account for its management to the Owner spontaneously, without the Owner having to request it: (i) upon each transfer of funds, by a detailed statement of the sums collected, the fees deducted and the expenses incurred, together with supporting documents; and (ii) at least once a year, no later than 31 January, by a management report summarising all transactions of the past calendar year. The Owner may in addition obtain, at any time and upon simple request, any supporting document relating to the management of the property.",
          "The Agent shall ensure transparent management of funds within the scope of this mandate.",
          "**Liability.** The Agent is liable for its faults in the performance of its mission, in accordance with Articles 1991 and 1992 of the French Civil Code. It is not liable for damage caused exclusively by the tenant, the Owner or a third party, or by an event of force majeure; as regards the service providers it selects, the Agent remains liable for any fault in their selection, coordination or supervision (Article 5.3). The Agent is not liable for indirect or consequential damages.",
          "These limitations do not apply in the event of gross negligence or wilful misconduct of the Agent (Article 1231-3 of the French Civil Code), nor where they would deprive an essential obligation of the Agent of its substance (Article 1170 of the French Civil Code). They are without prejudice to the mandatory provisions protecting an Owner who is a consumer or a non-professional.",
          "The Agent acts in the name and on behalf of the Owner and is not personally a party to the rental agreement.",
        ],
      },
      {
        kind: "sub",
        fr: "9.3 Pouvoirs conférés au Mandataire",
        en: "Powers conferred on the Agent",
      },
      {
        kind: "p",
        fr: [
          "Afin que le Mandataire puisse accomplir sa mission, le Propriétaire lui donne les pouvoirs suivants :",
          "– Proposer, présenter, visiter et faire visiter les biens à toute personne qu’il jugera utile.",
          "– Faire toute la publicité qu’il jugera utile (commerciale, petites annonces, etc.), ces frais restant à la charge exclusive du Mandataire. Il l’autorise notamment à diffuser des photos concernant les biens sur des sites internet.",
          "– Communiquer le dossier de l’opération à tout confrère qu’il jugera susceptible de concourir à la location.",
          "– Signer tout bail et convention de location sur les biens, après avoir recueilli l’accord du Propriétaire sur le projet de bail ou de convention de location, le Propriétaire s’engageant à répondre au Mandataire dans les 8 jours de la transmission du projet qui lui sera faite à l’adresse e-mail du Mandataire. À défaut de réponse du Propriétaire dans les 8 jours ainsi visés, il sera considéré comme acceptant le bail ou la convention de location et autorisant le Mandataire à la régulariser et signer avec le locataire, la présente disposition ayant pour objet, dans l’intérêt commun des Parties, de ne pas dissuader le locataire pressenti par de trop longs délais de régularisation du bail ou de la convention de location.",
          "– Établir et signer, au nom et pour le compte du Propriétaire, les états des lieux d’entrée et de sortie ainsi que les inventaires.",
          "– Encaisser les loyers, acomptes, charges et dépôts de garantie et en donner quittance, restituer les dépôts de garantie aux locataires, collecter et reverser la taxe de séjour.",
          "– Faire exécuter, en cas d’urgence, les interventions et réparations conservatoires nécessaires, à charge d’en informer le Propriétaire sans délai.",
        ],
        en: [
          "In order for the Agent to be able to accomplish its assignment, the owner grants the following powers:",
          "– To view the premises, to propose and present the premises to any person as it sees fit and to accompany such persons on visits to the premises.",
          "– To undertake such advertising as it may deem appropriate (commercial, classifieds, etc.), the cost of such advertising being for the exclusive account of the Agent. In particular, the Agent is authorised to disseminate photographs of the premises on websites.",
          "– To pass the operating dossier to any fellow agent that it deems likely to help rent the premises.",
          "– To sign any lease or rental agreement in respect of the premises, after receiving the Landlord’s agreement to the draft lease or rental agreement, in which respect the Landlord undertakes to reply to the Agent within eight days of the draft being sent to him or her to the email address of the Agent. In the absence of a response from the Landlord within the aforementioned eight days, the Landlord shall be deemed to have accepted the lease or rental agreement and to have authorised the Agent to formalise and sign it with the tenant, the purpose of this provision being, in the Parties’ common interest, to avoid the prospective tenant being put off by overly long delays in formalising the lease or rental agreement.",
          "– To draw up and sign, in the name and on behalf of the Owner, the check-in and check-out inspection reports and the inventories.",
          "– To collect rents, down payments, charges and security deposits and give receipt for them, to refund security deposits to tenants, and to collect and remit the tourist tax.",
          "– In an emergency, to have the necessary protective interventions and repairs carried out, informing the Owner without delay.",
        ],
      },
      {
        kind: "sub",
        fr: "9.4 Obligations du Propriétaire",
        en: "Obligations of the Owner",
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire s’engage à fournir des informations exactes, complètes et à jour concernant le bien. Il garantit que le bien est conforme à l’ensemble des dispositions légales et réglementaires applicables, notamment en matière de sécurité, de salubrité et d’occupation. Le Propriétaire déclare être pleinement informé de la réglementation applicable à la location de courte durée et s’engage à respecter l’ensemble des obligations en vigueur, incluant, le cas échéant, les déclarations préalables, les procédures d’enregistrement, les autorisations de changement d’usage ainsi que le respect des réglementations locales et du règlement de copropriété.",
          "Le Propriétaire s’engage à délivrer le bien, ainsi que ses dépendances et annexes, en bon état locatif. Les équipements et appareils électroménagers devront être conformes aux normes en vigueur et en bon état de fonctionnement. Le Propriétaire s’engage à maintenir le bien en bon état pendant toute la durée du mandat et à effectuer toutes les réparations nécessaires (autres que locatives), notamment l’entretien du jardin et de la piscine, à ses frais (y compris la consommation d’eau le cas échéant).",
          "Le Propriétaire s’engage à remettre au Mandataire un descriptif et un inventaire complets des biens et objets mis à la disposition du locataire et s’interdit de modifier cet inventaire sans en informer préalablement le Mandataire. Il fournira l’ensemble des diagnostics techniques obligatoires à première demande.",
          "Le Propriétaire demeure libre d’accepter ou de refuser tout projet de bail ou de convention de location qui lui est soumis par le Mandataire dans les conditions de l’article 9.3, sous réserve de l’article 9.10 (non-discrimination).",
          "Le Propriétaire demeure seul responsable de la conformité administrative, juridique et fiscale de l’activité de location, y compris du régime fiscal applicable et de l’ensemble des obligations qui en découlent, ainsi que des conséquences d’un éventuel manquement. Il garantit le Mandataire contre toute conséquence, sanction ou recours résultant d’un manquement à ces obligations, dans la mesure où ce manquement n’est pas imputable à une faute propre du Mandataire.",
        ],
        en: [
          "The Owner undertakes to provide accurate, complete and up-to-date information regarding the property. The Owner guarantees that the property complies with all applicable legal and regulatory requirements, including but not limited to safety, health, and occupancy standards. The Owner declares being fully informed of the regulations applicable to short-term rentals and undertakes to comply with all applicable obligations, including, where required, prior declarations, registration procedures, change-of-use authorizations, and compliance with local regulations and condominium rules.",
          "The Owner undertakes to deliver the property, including its annexes and dependencies, in good rental condition. All equipment and household appliances must comply with applicable standards and be in proper working order. The Owner undertakes to maintain the property in good condition throughout the duration of the mandate and to carry out all necessary repairs (other than those attributable to the tenant), including the maintenance of the garden and swimming pool, at the Owner’s expense (including water consumption where applicable).",
          "The Owner undertakes to provide the Agent with a full description and inventory of the property and the items made available to the tenant and agrees not to modify such inventory without prior notice to the Agent. The Owner shall provide all required technical diagnostics upon first request.",
          "The Owner remains free to accept or refuse any draft lease or rental agreement submitted by the Agent under the conditions of Article 9.3, subject to Article 9.10 (non-discrimination).",
          "The Owner remains solely responsible for the administrative, legal and tax compliance of the rental activity, including the applicable tax regime and all related obligations, as well as for any consequences arising from non-compliance. The Owner shall hold the Agent harmless from any consequence, penalty or claim resulting from a breach of these obligations, insofar as such breach is not attributable to a fault of the Agent itself.",
        ],
      },
      {
        kind: "p",
        box: true,
        fr: [
          "CLAUSE PÉNALE (article 78 du décret n° 72-678 du 20 juillet 1972 – article 1231-5 du Code civil)",
          "LE PROPRIÉTAIRE S’INTERDIT, PENDANT LA DURÉE DU MANDAT ET PENDANT UNE PÉRIODE DE DOUZE (12) MOIS SUIVANT SON EXPIRATION, DE LOUER LE BIEN, DIRECTEMENT OU PAR L’INTERMÉDIAIRE D’UN TIERS, SANS LE CONCOURS DU MANDATAIRE, À UN LOCATAIRE QUI LUI AURAIT ÉTÉ PRÉSENTÉ PAR LE MANDATAIRE. EN CAS DE NON-RESPECT DE CETTE OBLIGATION, LE PROPRIÉTAIRE VERSERA AU MANDATAIRE, À TITRE DE CLAUSE PÉNALE, UNE INDEMNITÉ FORFAITAIRE ÉGALE AU MONTANT DES HONORAIRES QUE LE MANDATAIRE AURAIT PERÇUS POUR LA LOCATION CONCERNÉE EN APPLICATION DE L’ARTICLE 6, SANS POUVOIR EXCÉDER CE MONTANT.",
          "Le Propriétaire reconnaît qu’un exemplaire du présent mandat, comportant cette clause, lui a été remis. Passé un délai de trois mois à compter de sa signature, le mandat peut être dénoncé à tout moment par chacune des Parties moyennant un préavis de quinze jours par lettre recommandée avec demande d’avis de réception (article 9.1).",
        ],
        en: [
          "PENALTY CLAUSE (Article 78 of Decree no. 72-678 of 20 July 1972 – Article 1231-5 of the French Civil Code)",
          "THE OWNER SHALL NOT, DURING THE TERM OF THE MANDATE AND FOR A PERIOD OF TWELVE (12) MONTHS FOLLOWING ITS EXPIRY, RENT THE PROPERTY, DIRECTLY OR THROUGH A THIRD PARTY, WITHOUT THE INVOLVEMENT OF THE AGENT, TO ANY TENANT INTRODUCED TO THE OWNER BY THE AGENT. IN THE EVENT OF A BREACH OF THIS OBLIGATION, THE OWNER SHALL PAY THE AGENT, AS A PENALTY CLAUSE, A LUMP-SUM INDEMNITY EQUAL TO THE FEES THE AGENT WOULD HAVE RECEIVED FOR THE RENTAL CONCERNED UNDER ARTICLE 6, WITHOUT EXCEEDING THAT AMOUNT.",
          "The Owner acknowledges having received a copy of this mandate containing this clause. After a period of three months from its signature, the mandate may be terminated at any time by either Party with fifteen days’ notice by registered letter with acknowledgement of receipt (Article 9.1).",
        ],
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire s’engage, pendant la durée du mandat et pendant les douze (12) mois suivant son expiration, à informer le Mandataire de tout projet de vente du bien objet du mandat. Cet engagement de simple information ne confère au Mandataire aucune exclusivité ni aucun droit à rémunération au titre de la vente : toute mission de vente devra faire l’objet d’un mandat écrit distinct, conforme à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972.",
        ],
        en: [
          "The Owner undertakes, during the term of the mandate and for twelve (12) months following its expiry, to inform the Agent of any plan to sell the property. This undertaking is one of information only and confers on the Agent no exclusivity and no right to remuneration in respect of the sale: any sale assignment shall require a separate written mandate complying with Law no. 70-9 of 2 January 1970 and Decree no. 72-678 of 20 July 1972.",
        ],
      },
      {
        kind: "minor",
        fr: "9.4.1 Déclaration et enregistrement obligatoires du meublé de tourisme",
        en: "Landlord’s obligatory declaration and registration",
      },
      {
        kind: "p",
        fr: [
          "**Principe.** Les meublés de tourisme sont des hébergements individuels (villas, appartements ou studios) destinés à la location de clients de passage, qui les occupent à la journée, à la semaine ou au mois.",
          "Le propriétaire qui loue un meublé de tourisme doit effectuer une déclaration préalable en mairie et, le cas échéant dans les communes concernées, obtenir une autorisation de changement d’usage.",
          "Le propriétaire peut également demander le classement du meublé, mais cela n’est pas obligatoire.",
        ],
        en: [
          "**Principle.** Furnished tourist accommodation refers to individual units (such as villas, apartments, or studios) intended for rental to transient guests who occupy them on a daily, weekly, or monthly basis.",
          "The owner renting out furnished tourist accommodation must submit a prior declaration to the town hall and, where applicable, obtain authorization for a change of use in the municipalities concerned.",
          "The owner may also request that the property be officially classified, but this is not mandatory.",
        ],
      },
      {
        kind: "p",
        fr: [
          "**Démarches du propriétaire.** La déclaration d’un meublé de tourisme est obligatoire, que celui-ci soit classé ou non.",
          "La déclaration s’effectue à la mairie de la commune où est situé le meublé, au moyen du formulaire CERFA n° 14004*04 (joint au présent mandat).",
          "La loi du 19 novembre 2024 généralise l’enregistrement des meublés de tourisme au moyen d’un téléservice national, qui délivre un numéro d’enregistrement devant figurer sur toute annonce. Le Propriétaire s’engage à accomplir cet enregistrement dès l’ouverture du téléservice, y compris s’il dispose déjà d’un numéro, et à communiquer ce numéro au Mandataire. Il autorise le Mandataire à transmettre aux autorités compétentes, notamment par l’intermédiaire de l’« API meublés », les données relatives au bien et à son activité de location que la réglementation impose aux intermédiaires de transmettre.",
          "Tout changement concernant les informations fournies (propriétaire, meublé de tourisme, périodes de location) doit faire l’objet d’une nouvelle déclaration en mairie.",
          "Pour les communes concernées, une autorisation de changement d’usage doit être obtenue.",
          "À toutes fins utiles, le Propriétaire qui ne déclare pas ou n’enregistre pas son meublé s’expose aux sanctions prévues par l’article L. 324-1-1 du Code du tourisme. Le Propriétaire remet au Mandataire une déclaration sur l’honneur attestant de la réalisation des démarches ci-dessus et lui communique le numéro d’enregistrement délivré. Le Propriétaire garantit le Mandataire contre tout recours de tiers et l’indemnise du préjudice subi du fait d’un manquement à ces obligations, dans la mesure où ce manquement n’est pas imputable à une faute propre du Mandataire.",
        ],
        en: [
          "**Owner’s procedures.** The declaration of furnished tourist accommodation is mandatory, whether or not the property is classified.",
          "The declaration must be made at the town hall of the municipality where the property is located, using form CERFA No. 14004*04 (attached to this mandate).",
          "The Law of 19 November 2024 generalises the registration of furnished tourist accommodation through a national online service, which issues a registration number that must appear on every advertisement. The Owner undertakes to complete this registration as soon as the online service is open, even if the Owner already holds a number, and to communicate the registration number to the Agent. The Owner authorises the Agent to transmit to the competent authorities, in particular through the “API meublés”, the data relating to the property and its rental activity that the regulations require intermediaries to transmit.",
          "Any change relating to the information provided (owner, property details, rental periods) must be the subject of a new declaration to the town hall.",
          "For the municipalities concerned, a change-of-use authorization must be obtained.",
          "By way of reminder, a Landlord who fails to declare or register furnished tourist accommodation is liable to the penalties provided for by Article L. 324-1-1 of the French Tourism Code. The Landlord must give the Agent a sworn statement attesting to the completion of the procedures referred to above and inform the Agent of the registration number issued. The Landlord shall hold the Agent harmless from any third-party claim and shall compensate the Agent for any loss suffered as a result of a breach of these obligations, insofar as such breach is not attributable to a fault of the Agent itself.",
        ],
      },
      {
        kind: "minor",
        fr: "9.4.2 Dispositions légales et réglementaires concernant la piscine",
        en: "Legal and regulatory provisions concerning the swimming pool",
        onlyWhen: "pool",
      },
      {
        kind: "p",
        onlyWhen: "pool",
        fr: [
          "Le Propriétaire reconnaît avoir été informé par le Mandataire de la promulgation de la loi du 3 janvier 2003 et de son décret d’application du 31 décembre 2003 relatifs à la sécurité des piscines, ayant modifié le Code de la Construction et de l’Habitation. Depuis le 1er mai 2004, les dispositions légales et réglementaires imposent que les piscines existantes dans les propriétés données en location saisonnière soient équipées d’un dispositif de sécurité.",
          "Le Propriétaire atteste que la piscine de sa propriété est équipée des dispositifs normalisés suivants :",
          "– Couverture (Norme NF P90/308)",
        ],
        en: [
          "The Landlord acknowledges having been informed by the Agent of the enactment of the law of 3 January 2003 and its implementing decree of 31 December 2003 relating to swimming pool safety, which amended the Construction and Housing Code. Since 1 May 2004, legal and regulatory provisions have required that existing swimming pools in properties rented out on a seasonal basis be equipped with a safety device.",
          "The Landlord declares that the swimming pool on his/her property is equipped with the following standard safety system:",
          "– Cover (Standard NF P90/308)",
        ],
      },
      {
        kind: "p",
        onlyWhen: "pool",
        fr: [
          "Le Propriétaire reconnaît avoir été informé par le Mandataire de la nécessité de s’assurer de la conformité du dispositif installé avec la norme de référence et garantit le Mandataire contre toute conséquence d’un défaut de conformité, dans la mesure où celui-ci n’est pas imputable à une faute propre du Mandataire. Le Propriétaire s’engage en outre à remettre au Mandataire, afin qu’il puisse la transmettre au locataire, la note technique émanant de l’installateur du dispositif de sécurité contenant :",
          "– les caractéristiques, les conditions de fonctionnement et d’entretien du dispositif de sécurité installé dans la propriété ;",
          "– une information sur les risques de noyade, sur les mesures générales de prévention à prendre et sur les recommandations liées à l’utilisation du dispositif de sécurité.",
        ],
        en: [
          "The Landlord acknowledges having been informed by the Agent of the need to ensure that the safety system installed complies with the relevant standard, and shall hold the Agent harmless from any consequence of a lack of compliance, insofar as it is not attributable to a fault of the Agent itself. The Landlord further undertakes to provide the Agent, so that it may pass it on to the tenant, with the technical note issued by the installer of the safety device, containing:",
          "– the characteristics, operating conditions, and maintenance instructions of the installed safety system;",
          "– information on drowning risks, general preventive measures to be taken, and recommendations relating to the use of the safety system.",
        ],
      },
      { kind: "sub", fr: "9.5 Para-hôtellerie", en: "Para-hotel services" },
      {
        kind: "p",
        fr: [
          "Le Propriétaire reconnaît que la fourniture de certaines prestations dans le cadre de la location du bien peut entraîner la qualification de l’activité en para-hôtellerie au sens de la réglementation fiscale applicable, impliquant des obligations fiscales et comptables spécifiques, notamment en matière de TVA.",
          "Cette qualification peut notamment être retenue lorsqu’une combinaison de plusieurs des prestations suivantes, notamment lorsque au moins trois d’entre elles sont fournies de manière régulière aux locataires :",
          "– Accueil personnalisé des locataires,",
          "– Fourniture et renouvellement du linge de maison,",
          "– Ménage en cours de séjour,",
          "– Fourniture de prestations complémentaires assimilables à celles proposées par les établissements hôteliers (petit-déjeuner, services de conciergerie ou prestations similaires).",
          "Le Propriétaire reconnaît expressément avoir été pleinement informé de ces critères et de leurs conséquences potentielles.",
          "Le Mandataire agit exclusivement en qualité d’intermédiaire. Le Propriétaire demeure seul responsable du choix et de la détermination de son régime fiscal, ainsi que du respect des obligations qui en découlent, et garantit le Mandataire contre toute conséquence, sanction ou recours résultant de la qualification fiscale de l’activité de location, dès lors que ceux-ci ne sont pas imputables à une faute propre du Mandataire.",
        ],
        en: [
          "The Owner acknowledges that the provision of certain services in connection with the rental of the property may qualify the activity as a para-hotel service under applicable tax regulations, potentially subjecting it to specific tax and accounting obligations, including but not limited to VAT.",
          "In particular, such qualification may arise where a combination of several of the following services, in particular where at least three are provided on a regular basis to tenants:",
          "– Personalized reception of guests,",
          "– Supply and regular renewal of household linen,",
          "– Cleaning services during the stay,",
          "– Provision of additional services comparable to those offered by hotels (such as breakfast, concierge services, or other similar services).",
          "The Owner expressly acknowledges being fully informed of these criteria and their potential consequences.",
          "The Agent acts solely as an intermediary. The Owner remains solely responsible for the choice and determination of its tax regime and for compliance with the resulting obligations, and shall hold the Agent harmless from any consequence, penalty or claim resulting from the tax qualification of the rental activity, provided that these are not attributable to a fault of the Agent itself.",
        ],
      },
      { kind: "sub", fr: "9.6 Sécurité du bien", en: "Property safety" },
      {
        kind: "p",
        fr: [
          "Le Propriétaire s’engage à assurer la conformité du bien et de l’ensemble de ses équipements aux normes de sécurité en vigueur.",
          "Il veille notamment à ce que les installations telles que les piscines, les équipements électriques, les systèmes de chauffage et tout autre équipement soient correctement entretenus et conformes à la réglementation applicable.",
          "Le Propriétaire demeure responsable de la sécurité du bien ainsi que de tout dommage ou incident résultant d’un manquement aux obligations de sécurité, et garantit le Mandataire contre les conséquences d’un tel manquement, dans la mesure où celui-ci n’est pas imputable à une faute propre du Mandataire.",
        ],
        en: [
          "The Owner undertakes to ensure that the property and all its equipment comply with applicable safety standards.",
          "In particular, the Owner shall ensure that any facilities such as swimming pools, electrical installations, heating systems and other equipment are properly maintained and comply with current regulations.",
          "The Owner remains responsible for the safety of the property and for any damage or incident resulting from a failure to comply with applicable safety obligations, and shall hold the Agent harmless from the consequences of any such failure, insofar as it is not attributable to a fault of the Agent itself.",
        ],
      },
      {
        kind: "sub",
        fr: "9.7 Diagnostics techniques et obligatoires",
        en: "Technical and legal diagnostics",
      },
      {
        kind: "minor",
        fr: "État des risques et pollutions (ERP)",
        en: "Statement of risks and pollution (“ERP”)",
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire est informé que si les lieux loués sont situés dans une zone couverte par un plan de prévention des risques technologiques ou par un plan de prévention des risques naturels prévisibles, prescrit ou approuvé, ou dans une zone de sismicité définie par décret en Conseil d’État, en application des articles L.125-5 et R.125-23 à R.125-27 du Code de l’environnement, un État des Risques et Pollutions (« ERP ») doit être annexé à tout bail. Par ailleurs, le Propriétaire est tenu d’informer par écrit le Mandataire, qui transmettra cette information au locataire si nécessaire, de tout sinistre ayant donné lieu au versement d’une indemnité en application des articles L.125-2 ou L.128-2 du Code des assurances, survenu pendant la période où il a été propriétaire du bien ou dont il a été informé en application des dispositions précitées. Ainsi, conformément aux dispositions légales et réglementaires en vigueur depuis le 1er juin 2006, le Propriétaire doit fournir lors de la signature du mandat un ERP datant de moins de six mois et informer le Mandataire si le bien a fait ou non l’objet d’un sinistre lié à des risques naturels ou technologiques ayant donné lieu à indemnisation. Le renouvellement de l’attestation auprès des autorités compétentes est à la charge du Propriétaire dès qu’elle n’est plus valide au moment de la signature d’un bail. Le Propriétaire déclare que le bien ci-dessus est assuré en multirisques habitation avec extension de garantie loueur en meublé, incluant une clause de renonciation à recours de l’assureur contre le locataire, de sorte que le Mandataire ne puisse être recherché en responsabilité à ce sujet.",
        ],
        en: [
          "The Landlord is informed that if the rented premises are located in an area covered by a technological risk prevention plan or a foreseeable natural risk prevention plan, whether prescribed or approved, or in a seismic zone defined by decree of the Council of State, pursuant to Articles L.125-5 and R.125-23 to R.125-27 of the Environmental Code, a Statement of Risks and Pollution (“ERP”) must be attached to any lease agreement. Furthermore, the Landlord is required to inform the Agent in writing, who will pass this information on to the tenant where necessary, of any accident that has resulted in compensation under Articles L.125-2 or L.128-2 of the Insurance Code, occurring during the period in which the Landlord owned the property or of which the Landlord has been informed under the aforementioned provisions. Accordingly, in compliance with legal and regulatory provisions in force since 1 June 2006, the Landlord must provide, at the time of signing the mandate, an ERP document dated less than six months and must inform the Agent whether or not the property has been subject to any disaster related to natural or technological risks giving rise to insurance compensation. The request for renewal of the certificate from the competent authorities shall be at the Landlord’s expense once it is no longer valid at the time of signing a rental agreement. The Landlord declares that the above-mentioned property is insured under a comprehensive home insurance policy with extended coverage for furnished rental, including a waiver of recourse clause by the insurer, such that the Agent cannot be held liable in this respect.",
        ],
      },
      {
        kind: "minor",
        fr: "Diagnostic amiante ou fiche récapitulative du dossier technique amiante",
        en: "Asbestos diagnosis or summary sheet of the technical asbestos file",
      },
      {
        kind: "p",
        fr: [
          "Le Mandataire informe le Propriétaire que le diagnostic amiante ou la fiche récapitulative du dossier technique amiante, mis à jour conformément au décret n°2011-629 du 3 juin 2011, doit être annexé au contrat de location si les locaux ont été construits sur la base d’un permis de construire délivré avant le 1er juillet 1997.",
        ],
        en: [
          "The Agent informs the Landlord that the asbestos diagnosis or the summary sheet of the technical asbestos file, updated in accordance with Decree No. 2011-629 of 3 June 2011, must be attached to the rental agreement if the premises were built under a building permit issued before 1 July 1997.",
        ],
      },
      {
        kind: "minor",
        fr: "Constat de risque d’exposition au plomb (CREP)",
        en: "Report on risk of exposure to lead (“CREP”)",
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire reconnaît avoir été informé par le Mandataire de la promulgation de la loi du 29 juillet 1998, modifiée par la loi n°2004-806, relative au risque d’exposition au plomb. Les nouvelles dispositions légales et réglementaires imposent qu’à compter du 1er août 2008, le Propriétaire fournisse lors de la signature du présent mandat un constat de risque d’exposition au plomb (« CREP »). Le Mandataire informe le Propriétaire que le CREP sera annexé au contrat de location. Il appartient au Propriétaire d’obtenir le certificat auprès des autorités compétentes s’il n’est plus valide au moment de la signature du bail.",
        ],
        en: [
          "The Landlord acknowledges having been informed by the Agent of the enactment of the law of 29 July 1998, as amended by Law No. 2004-806, relating to the risk of exposure to lead. The new legal and regulatory provisions require that, as of 1 August 2008, the Landlord must provide, at the time of signing this mandate, a report on the risk of exposure to lead (“CREP”). The Agent informs the Landlord that the CREP will be attached to the rental agreement. It is the Landlord’s responsibility to obtain the certificate from the competent authorities if it is no longer valid at the time of signing the rental agreement.",
        ],
      },
      {
        kind: "minor",
        fr: "État de l’installation intérieure d’électricité et de gaz – Zone bruit",
        en: "State of electrical and gas installations – Noise zone",
      },
      {
        kind: "p",
        fr: [
          "Le Propriétaire reconnaît avoir été informé par le Mandataire qu’il doit fournir au locataire un état des installations intérieures d’électricité et de gaz, qui sera annexé au contrat de location. Il appartient au Propriétaire d’obtenir l’attestation auprès des autorités compétentes si elle n’est plus valide au moment de la signature du bail. Si le bien est situé à proximité d’un aérodrome, conformément à l’article L.147-5 du Code de l’urbanisme, le Propriétaire doit informer le locataire que le bien est classé dans un plan d’exposition au bruit, en zone bruit.",
        ],
        en: [
          "The Landlord acknowledges having been informed by the Agent that he or she must provide the tenant with a statement of the interior electrical and gas installations, which will be attached to the rental agreement. It is the Landlord’s responsibility to obtain the certificate from the competent authorities if it is no longer valid at the time of signing the rental agreement. If the property is located near an airport, in accordance with Article L.147-5 of the Urban Planning Code, the Landlord must inform the tenant that the property is classified in a noise exposure plan in a noise zone.",
        ],
      },
      { kind: "sub", fr: "9.8 Assurance", en: "Insurance" },
      {
        kind: "p",
        fr: [
          "Le Propriétaire s’engage à maintenir une assurance adaptée pour le bien, notamment une assurance responsabilité civile.",
        ],
        en: [
          "The Owner undertakes to maintain appropriate insurance coverage for the property, including civil liability insurance.",
        ],
      },
      {
        kind: "sub",
        fr: "9.9 Garantie financière et RCP",
        en: "Financial guarantee and professional insurance",
      },
      {
        kind: "p",
        fr: [
          "Le Mandataire bénéficie d’une garantie financière délivrée par la CEGC et d’une assurance responsabilité civile professionnelle souscrite auprès de Generali. Le Mandataire est autorisé à recevoir, détenir et gérer des fonds pour le compte du Propriétaire dans le cadre du présent mandat. Les sommes encaissées sont traitées conformément à la réglementation en vigueur.",
        ],
        en: [
          "The Agent benefits from a financial guarantee provided by CEGC and professional liability insurance provided by Generali. The Agent is authorized to receive, hold and manage funds on behalf of the Owner within the scope of this mandate. All sums collected are handled in accordance with applicable regulations.",
        ],
      },
      { kind: "sub", fr: "9.10 Non-discrimination", en: "Non-discrimination" },
      {
        kind: "p",
        fr: [
          "Le rappel suivant est fait : constitue une discrimination toute distinction opérée entre les personnes en raison de leur origine, sexe, situation de famille, grossesse, apparence physique, particulière vulnérabilité résultant de leur situation économique, apparente ou connue de l’auteur de la distinction, patronyme, lieu de résidence, état de santé, perte d’autonomie, handicap, caractéristiques génétiques, mœurs, orientation sexuelle, identité de genre, âge, opinions politiques, activités syndicales, capacité à s’exprimer dans une langue autre que le français, appartenance ou non-appartenance, vraie ou supposée, à une ethnie, une nation, une race ou une religion déterminée. Le Mandataire informe le Propriétaire que toute discrimination commise à l’égard d’une personne est punie de trois ans d’emprisonnement et de 45 000 € d’amende (article 225-2 du Code pénal). En conséquence, les parties s’engagent expressément à ne refuser aucun candidat à la location des présents biens pour un motif discriminatoire au sens de l’article 225-1 du Code pénal. Par ailleurs, le Propriétaire s’interdit expressément de donner au Mandataire des directives ou consignes, verbales ou écrites, ayant pour objet de refuser une location pour des motifs discriminatoires au sens de l’article 225-1 du Code pénal.",
        ],
        en: [
          "By way of reminder, discrimination refers to any distinction made between persons on the basis of their origin, sex, family situation, pregnancy, physical appearance, particular vulnerability resulting from their economic situation, whether apparent or known to the author of such distinction, surname, place of residence, state of health, loss of autonomy, disability, genetic characteristics, habits, sexual orientation, gender identity, age, political opinions, trade union activities, ability to express oneself in a language other than French, or actual or supposed membership or non-membership of an ethnic group, nation, race or religion. The Agent informs the Landlord that any discrimination committed against a person is punishable by three years’ imprisonment and a fine of €45,000 (Article 225-2 of the French Penal Code). Consequently, the parties expressly undertake not to refuse any rental applicant for these premises on the basis of discriminatory grounds within the meaning of Article 225-1 of the French Penal Code. Furthermore, the Landlord expressly undertakes not to give the Agent any verbal or written instructions or directives intended to refuse a rental for discriminatory reasons within the meaning of Article 225-1 of the French Penal Code.",
        ],
      },
      { kind: "sub", fr: "9.11 Données personnelles", en: "Personal data" },
      {
        kind: "p",
        fr: [
          "**Responsable du traitement.** SAS BSTAY, 9 Rond-Point Duboys d’Angers, 06400 Cannes, France – contact@b-stay.com.",
          "**Finalités et bases légales.** Les données personnelles collectées dans le cadre du présent mandat sont traitées pour : (i) la conclusion et l’exécution du mandat, la gestion des réservations, des locations, des encaissements et des prestations associées (exécution du contrat) ; (ii) le respect des obligations légales du Mandataire : tenue du registre des mandats, comptabilité, lutte contre le blanchiment de capitaux et le financement du terrorisme, déclarations relatives aux meublés de tourisme et à la taxe de séjour (obligation légale) ; (iii) la gestion des réclamations et des contentieux (intérêt légitime) ; (iv) l’envoi de la newsletter et d’offres portant sur des services analogues du Mandataire, sauf opposition du Propriétaire (intérêt légitime – article 9.12). Les données demandées sont nécessaires à la conclusion du mandat ; à défaut, celui-ci ne peut être conclu.",
          "**Destinataires.** Les personnels habilités du Mandataire ; ses prestataires et sous-traitants lorsque cela est nécessaire à l’exécution du mandat (ménage, maintenance, accueil, hébergement informatique, signature électronique, comptabilité) ; les locataires, pour les seules données nécessaires à la location ; le garant financier et l’assureur ; les administrations et autorités légalement habilitées (commune, administration fiscale).",
          "**Transferts hors de l’Union européenne.** Le Mandataire privilégie des prestataires établis dans l’Union européenne. Lorsqu’il recourt à un prestataire établi hors de l’Union européenne (par exemple pour la signature électronique, la messagerie ou la diffusion des annonces), les données ne sont transférées que vers un pays bénéficiant d’une décision d’adéquation de la Commission européenne ou, à défaut, sur la base des clauses contractuelles types de la Commission européenne ; le Propriétaire peut obtenir une copie de ces garanties sur simple demande à contact@b-stay.com.",
          "**Durées de conservation.** Les données sont conservées pendant la durée du mandat, puis pendant cinq (5) ans à compter de sa fin à des fins probatoires ; le mandat, le registre des mandats et les pièces comptables sont conservés dix (10) ans ; les données utilisées pour la newsletter sont conservées jusqu’à l’opposition du Propriétaire et au plus tard trois (3) ans après la fin du mandat.",
          "**Droits.** Conformément au règlement (UE) 2016/679 (RGPD) et à la loi « Informatique et Libertés » du 6 janvier 1978, le Propriétaire dispose d’un droit d’accès, de rectification et d’effacement de ses données, d’un droit à la limitation du traitement, d’un droit d’opposition, d’un droit à la portabilité, du droit de retirer son consentement à tout moment et du droit de définir des directives relatives au sort de ses données après son décès. Ces droits s’exercent par courrier électronique à contact@b-stay.com ou par courrier postal à l’adresse du Mandataire. Le Propriétaire peut également introduire une réclamation auprès de la CNIL (3 place de Fontenoy – TSA 80715 – 75334 Paris Cedex 07 – www.cnil.fr).",
        ],
        en: [
          "**Data controller.** SAS BSTAY, 9 Rond-Point Duboys d’Angers, 06400 Cannes, France – contact@b-stay.com.",
          "**Purposes and legal bases.** The personal data collected under this mandate are processed for: (i) the conclusion and performance of the mandate and the management of bookings, rentals, payments and associated services (performance of the contract); (ii) compliance with the Agent’s legal obligations: register of mandates, accounting, anti-money-laundering and counter-terrorist-financing duties, declarations relating to furnished tourist accommodation and the tourist tax (legal obligation); (iii) the handling of complaints and disputes (legitimate interest); (iv) the sending of the newsletter and of offers relating to similar services of the Agent, unless the Owner objects (legitimate interest – Article 9.12). The data requested are necessary for the conclusion of the mandate; without them, it cannot be concluded.",
          "**Recipients.** The authorised staff of the Agent; its service providers and processors where necessary for the performance of the mandate (cleaning, maintenance, reception, IT hosting, electronic signature, accounting); tenants, for the sole data necessary for the rental; the financial guarantor and the insurer; and the legally authorised administrations and authorities (municipality, tax authorities).",
          "**Transfers outside the European Union.** The Agent gives priority to service providers established in the European Union. Where it uses a provider established outside the European Union (for example for electronic signature, e-mail or the distribution of listings), the data are transferred only to a country covered by an adequacy decision of the European Commission or, failing that, on the basis of the European Commission’s standard contractual clauses; the Owner may obtain a copy of these safeguards upon simple request to contact@b-stay.com.",
          "**Retention periods.** The data are kept for the term of the mandate, then for five (5) years after its end for evidentiary purposes; the mandate, the register of mandates and accounting documents are kept for ten (10) years; data used for the newsletter are kept until the Owner objects and no later than three (3) years after the end of the mandate.",
          "**Rights.** In accordance with Regulation (EU) 2016/679 (GDPR) and the French Data Protection Act of 6 January 1978, the Owner has the right to access, rectify and erase their data, to restrict or object to the processing, to data portability, to withdraw consent at any time and to define instructions on the fate of their data after death. These rights may be exercised by writing to contact@b-stay.com or to the postal address of the Agent. The Owner may also lodge a complaint with the CNIL (3 place de Fontenoy – TSA 80715 – 75334 Paris Cedex 07 – www.cnil.fr).",
        ],
      },
      { kind: "sub", fr: "9.12 Newsletter", en: "Newsletter" },
      {
        kind: "p",
        fr: [
          "Le Mandataire utilise l’adresse électronique communiquée par le Propriétaire dans le cadre du présent mandat pour lui adresser sa newsletter, ses actualités et ses offres portant sur ses propres services, analogues à ceux objets du présent mandat (location et gestion saisonnières, conciergerie). Conformément à l’article L. 34-5 du Code des postes et des communications électroniques, le Propriétaire peut s’y opposer, sans frais et sans avoir à se justifier : (i) dès la signature, en cochant la case prévue à la Section 10 ; (ii) à tout moment par la suite, au moyen du lien de désinscription figurant dans chaque envoi ou sur simple demande à contact@b-stay.com. Ce traitement repose sur l’intérêt légitime du Mandataire (article 6.1.f du RGPD) et est sans incidence sur la conclusion ou l’exécution du mandat. L’adresse électronique n’est pas transmise à des tiers à des fins de prospection ; l’envoi d’offres de partenaires supposerait l’accord exprès et préalable du Propriétaire.",
        ],
        en: [
          "The Agent uses the e-mail address provided by the Owner under this mandate to send the Owner its newsletter, news and offers relating to its own services, similar to those covered by this mandate (seasonal rental and management, concierge services). In accordance with Article L. 34-5 of the French Post and Electronic Communications Code, the Owner may object to this, free of charge and without giving any reason: (i) upon signature, by ticking the box provided in Section 10; (ii) at any time thereafter, by using the unsubscribe link contained in every e-mail or by simple request to contact@b-stay.com. This processing is based on the Agent’s legitimate interest (Article 6(1)(f) GDPR) and has no effect on the conclusion or performance of the mandate. The e-mail address is not passed on to third parties for marketing purposes; the sending of partners’ offers would require the Owner’s prior express consent.",
        ],
      },
      { kind: "sub", fr: "9.13 Médiation", en: "Mediation" },
      {
        kind: "p",
        fr: [
          "Lorsque le Propriétaire a la qualité de consommateur, et après une réclamation écrite préalable adressée au Mandataire restée sans solution, il peut recourir gratuitement au médiateur de la consommation dont relève le Mandataire (articles L. 612-1 et suivants du Code de la consommation) : **MEDIMMOCONSO** – 1 Allée du Parc de Mesemena – Bât. A – CS 25222 – 44505 La Baule Cedex – https://medimmoconso.fr. Le médiateur peut être saisi en ligne, au moyen du formulaire de réclamation disponible sur son site internet (rubrique « Adresser une réclamation »), ou par courrier à l’adresse ci-dessus. La saisine doit intervenir dans un délai maximal d’un an à compter de la réclamation écrite adressée au Mandataire.",
        ],
        en: [
          "Where the Owner is a consumer, and after a prior written complaint to the Agent has remained unresolved, the Owner may have recourse, free of charge, to the consumer mediator to which the Agent is affiliated (Articles L. 612-1 et seq. of the French Consumer Code): **MEDIMMOCONSO** – 1 Allée du Parc de Mesemena – Bât. A – CS 25222 – 44505 La Baule Cedex – https://medimmoconso.fr. The mediator may be contacted online, using the complaint form available on its website (section “Adresser une réclamation”), or by post at the above address. The request must be made within a maximum of one year from the written complaint sent to the Agent.",
        ],
      },
      {
        kind: "sub",
        fr: "9.14 Élection de domicile",
        en: "Domicile and notifications",
      },
      {
        kind: "p",
        fr: [
          "Les parties élisent domicile à leurs adresses respectives indiquées ci-dessus.",
          "Le présent mandat est conclu par voie électronique et a la même valeur juridique qu’une signature manuscrite. Chaque Partie reconnaît avoir reçu un exemplaire du présent mandat.",
        ],
        en: [
          "The parties elect domicile at their respective addresses indicated above.",
          "This mandate is executed electronically and has the same legal value as a handwritten signature. Each Party acknowledges having received a copy of this mandate.",
        ],
      },
      { kind: "sub", fr: "9.15 Annexes", en: "Appendices" },
      { kind: "slot", slot: "annexList" },
    ],
  },
];

/** Section 10's box: ticked by the owner to refuse the newsletter. */
export const MANDATE_NEWSLETTER: Bilingual = {
  fr: "Je ne souhaite pas recevoir par courrier électronique la newsletter, les actualités et les offres de BSTAY (voir article 9.12). À défaut de cocher cette case, je les recevrai à l’adresse électronique indiquée à la Section 1 et pourrai me désinscrire à tout moment au moyen du lien figurant dans chaque e-mail ou en écrivant à contact@b-stay.com.",
  en: "I do not wish to receive BSTAY’s newsletter, news and offers by e-mail (see Article 9.12). If this box is not ticked, I will receive them at the e-mail address given in Section 1 and may unsubscribe at any time using the link in each e-mail or by writing to contact@b-stay.com.",
};

/** Appendix 3: the withdrawal form a consumer owner may send back. */
export const MANDATE_WITHDRAWAL = {
  title: {
    fr: "Annexe 3 – Formulaire de rétractation",
    en: "Appendix 3 – Withdrawal form",
  },
  intro: {
    fr: [
      "Si vous souhaitez exercer votre droit de rétractation, veuillez compléter et retourner le présent formulaire. Ce formulaire doit être envoyé dans un délai de quatorze (14) jours à compter de la signature du mandat. Il peut être transmis par tout moyen permettant d’en accuser réception (courrier recommandé ou email).",
    ],
    en: [
      "If you wish to exercise your right of withdrawal, please complete and return this form. This form must be sent within fourteen (14) days from the date of signature of the mandate. It may be sent by any means allowing proof of receipt (email or registered mail).",
    ],
  },
  recipient: { fr: "À adresser à", en: "To be sent to" },
  address: ["BSTAY", "9 Rond-Point Duboys d’Angers", "06400 Cannes", "France"],
  statement: {
    fr: [
      "Je notifie par la présente ma rétractation du mandat portant sur le bien suivant :",
    ],
    en: [
      "I hereby notify my withdrawal from the mandate concluded in respect of the following property:",
    ],
  },
} as const;

/**
 * Appendix 1, which the agency attaches as a document of its own. Its page
 * announces it, so the appendices are in their place and in order.
 */
export const MANDATE_PRICING: { title: Bilingual; note: Bilingual } = {
  title: {
    fr: "Annexe 1 – Grille Tarifaire",
    en: "Appendix 1 – Pricing Schedule",
  },
  note: {
    fr: "Grille Tarifaire jointe en annexe du document.",
    en: "Pricing Schedule attached as an appendix to the document.",
  },
};

/**
 * Appendix 2: the agency's fee schedule, as it posts it.
 *
 * In French alone, in a bilingual mandate too: it is the schedule the agency
 * is required to display, reproduced, not a clause of the mandate.
 */
export const MANDATE_FEES = {
  title: {
    fr: "Annexe 2 – Barème d’honoraires du Mandataire",
    en: "Appendix 2 – Agent’s fee schedule",
  },
  heading: "Barème des honoraires",
  applicable: "Applicable à compter du 01/04/2026",
  tables: [
    {
      title: "Transaction immobilière",
      columns: ["Type de mandat / Bien", "Honoraires HT"],
      rows: [
        ["Villa / Appartement", "5 %"],
        ["Commerce", "10 %"],
        ["Garage", "8,33 % (minimum 5 000 € TTC)"],
      ],
    },
    {
      title: "Location saisonnière",
      columns: ["Prestation", "Honoraires HT"],
      rows: [
        [
          "Commercialisation et gestion locative saisonnière",
          "25 % des loyers encaissés",
        ],
      ],
    },
    {
      title: "Conciergerie privée",
      columns: ["Prestation", "Honoraires"],
      rows: [["Prestations de conciergerie", "Sur devis personnalisé"]],
    },
  ],
  legalTitle: "Mentions légales",
  legal: [
    "Les honoraires de transaction sont à la charge du vendeur, sauf stipulation contraire prévue au mandat.",
    "Les honoraires de location saisonnière sont exprimés hors taxes et sont soumis à la TVA au taux en vigueur. Les prestations de conciergerie font l’objet d’un devis préalable accepté par le client.",
    "Conformément à la loi n° 70-9 du 2 janvier 1970 dite « Loi Hoguet » et à son décret d’application n° 72-678 du 20 juillet 1972.",
  ],
} as const;

/**
 * Appendix 4: the declaration form itself, page by page, as images served
 * from /public. Attached only while the property has no registration number —
 * the form is how it gets one.
 */
export const MANDATE_CERFA_PAGES = [
  "/img/cerfa/cerfa-14004-04-1.png",
  "/img/cerfa/cerfa-14004-04-2.png",
  "/img/cerfa/cerfa-14004-04-3.png",
] as const;

export const MANDATE_CERFA: { title: Bilingual } = {
  title: {
    fr: "Annexe 4 – CERFA n° 14004*04",
    en: "Appendix 4 – CERFA no. 14004*04",
  },
};
