/**
 * The three concierge packages, and what each one covers.
 *
 * Modelled as one catalogue with an inclusion mark per tier, which is how the
 * agency's own comparison sheet is laid out. The alternative — three separate
 * lists — would state the shared lines three times, and the day a service moves
 * from one tier to another it would have to be found in each of them.
 *
 * The contract prints the lines a tier includes, so this file is the schedule
 * of services: it decides what BSTAY is bound to. It is not marketing copy.
 *
 * ---- Where this comes from ----
 *
 * The English is the agency's, taken from the comparison sheet and the services
 * booklet. The French is ours — neither source exists in French — and should be
 * read by someone whose contract it is before it goes to a client.
 */

export const CONCIERGE_TIERS = [
  "ESSENTIAL",
  "SERENITY",
  "PRIVATE_LIFESTYLE",
] as const;

export type ConciergeTier = (typeof CONCIERGE_TIERS)[number];

/**
 * How a line applies to a tier.
 *
 * `ON_DEMAND` and `ESSENTIAL_LEVEL` are the agency's own qualifiers, carried
 * over rather than flattened to yes or no: on a contract the difference
 * between "included" and "included, on request" is the whole argument.
 */
export type Inclusion = "FULL" | "ON_DEMAND" | "ESSENTIAL_LEVEL" | "NONE";

export type Bilingual = { en: string; fr: string };

export type ServiceLine = {
  label: Bilingual;
  by: Record<ConciergeTier, Inclusion>;
};

export type ServiceGroup = {
  title: Bilingual;
  lines: ServiceLine[];
};

const F = "FULL" as const;
const N = "NONE" as const;
const D = "ON_DEMAND" as const;
const E = "ESSENTIAL_LEVEL" as const;

/** Shorthand for the three columns, in tier order. */
const by = (
  essential: Inclusion,
  serenity: Inclusion,
  privateLifestyle: Inclusion
): Record<ConciergeTier, Inclusion> => ({
  ESSENTIAL: essential,
  SERENITY: serenity,
  PRIVATE_LIFESTYLE: privateLifestyle,
});

export const SERVICE_CATALOGUE: ServiceGroup[] = [
  {
    title: { en: "Property care", fr: "Veille sur le bien" },
    lines: [
      {
        label: {
          en: "Regular property check on request",
          fr: "Visite régulière du bien sur demande",
        },
        by: by(D, F, F),
      },
      {
        label: {
          en: "General inspection of the residence",
          fr: "Inspection générale de la résidence",
        },
        by: by(F, F, F),
      },
      {
        label: {
          en: "Identification and reporting of any issues",
          fr: "Identification et signalement des anomalies",
        },
        by: by(F, F, F),
      },
      {
        label: { en: "Report following each visit", fr: "Rapport après chaque visite" },
        by: by(F, F, F),
      },
      {
        label: { en: "Monthly reports", fr: "Rapports mensuels" },
        by: by(N, F, F),
      },
    ],
  },
  {
    title: { en: "Management and maintenance", fr: "Gestion et entretien" },
    lines: [
      {
        label: {
          en: "Coordination of interventions",
          fr: "Coordination des interventions",
        },
        by: by(E, F, F),
      },
      {
        label: { en: "Follow-ups", fr: "Suivi des demandes jusqu'à résolution" },
        by: by(E, F, F),
      },
      {
        label: { en: "Appointment scheduling", fr: "Prise et suivi des rendez-vous" },
        by: by(E, F, F),
      },
      {
        label: {
          en: "Property access for service providers",
          fr: "Accès au bien pour les prestataires",
        },
        by: by(F, F, F),
      },
      {
        label: { en: "Key and access management", fr: "Gestion des clés et des accès" },
        by: by(F, F, F),
      },
      {
        label: {
          en: "Ongoing management of service providers",
          fr: "Gestion continue des prestataires",
        },
        by: by(N, F, F),
      },
      {
        label: {
          en: "Utilities and subscriptions (internet, energy, security, air conditioning, pool)",
          fr: "Abonnements et fluides (internet, énergie, sécurité, climatisation, piscine)",
        },
        by: by(N, F, F),
      },
    ],
  },
  {
    title: { en: "Expense management", fr: "Gestion des dépenses" },
    lines: [
      {
        label: {
          en: "Dedicated provision for property-related expenses",
          fr: "Provision dédiée aux dépenses du bien",
        },
        by: by(N, F, F),
      },
      {
        label: {
          en: "Payment of authorised invoices and service providers",
          fr: "Règlement des factures autorisées et des prestataires",
        },
        by: by(N, F, F),
      },
      {
        label: { en: "Tracking of expenses incurred", fr: "Suivi des dépenses engagées" },
        by: by(N, F, F),
      },
      {
        label: { en: "Monitoring of available funds", fr: "Suivi du solde disponible" },
        by: by(N, F, F),
      },
      {
        label: { en: "Transaction statement", fr: "Relevé des opérations" },
        by: by(N, F, F),
      },
    ],
  },
  {
    title: { en: "Preparing for your stay", fr: "Préparation des séjours" },
    lines: [
      {
        label: {
          en: "Property check before each arrival",
          fr: "Contrôle du bien avant chaque arrivée",
        },
        by: by(F, F, F),
      },
      {
        label: {
          en: "Set-up and preparation of the property",
          fr: "Mise en place et préparation du bien",
        },
        by: by(F, F, F),
      },
      {
        label: {
          en: "Verification of essential equipment",
          fr: "Vérification des équipements essentiels",
        },
        by: by(N, F, F),
      },
      {
        label: {
          en: "General preparation and reactivation of the residence",
          fr: "Préparation générale et remise en service de la résidence",
        },
        by: by(N, F, F),
      },
      {
        label: {
          en: "Coordination of any interventions required before your arrival",
          fr: "Coordination des interventions nécessaires avant l'arrivée",
        },
        by: by(N, F, F),
      },
      {
        label: { en: "Groceries upon arrival", fr: "Courses d'arrivée" },
        by: by(N, F, F),
      },
    ],
  },
  {
    title: { en: "Reservations and experiences", fr: "Réservations et expériences" },
    lines: [
      {
        label: { en: "Restaurants and beach clubs", fr: "Restaurants et plages privées" },
        by: by(N, F, F),
      },
      {
        label: { en: "Private drivers and transfers", fr: "Chauffeurs privés et transferts" },
        by: by(N, F, F),
      },
      {
        label: { en: "Yachts and water activities", fr: "Yachts et activités nautiques" },
        by: by(N, N, F),
      },
      {
        label: {
          en: "Helicopter and private aviation",
          fr: "Hélicoptère et aviation privée",
        },
        by: by(N, N, F),
      },
      {
        label: {
          en: "Wellness and personal services",
          fr: "Bien-être et services à la personne",
        },
        by: by(N, N, F),
      },
      {
        label: {
          en: "Private instructors scheduling (yoga, fitness and similar)",
          fr: "Organisation de professeurs particuliers (yoga, sport et assimilés)",
        },
        by: by(N, N, F),
      },
    ],
  },
  {
    title: { en: "Dedicated service", fr: "Service dédié" },
    lines: [
      {
        label: { en: "Dedicated point of contact", fr: "Interlocuteur dédié" },
        by: by(N, F, F),
      },
      {
        label: { en: "Direct WhatsApp communication", fr: "Ligne WhatsApp directe" },
        by: by(N, F, F),
      },
      {
        label: { en: "Extended availability", fr: "Disponibilité étendue" },
        by: by(N, F, F),
      },
      {
        label: {
          en: "Personalised request management",
          fr: "Traitement personnalisé des demandes",
        },
        by: by(N, F, F),
      },
    ],
  },
  {
    title: { en: "Home and lifestyle", fr: "Maison et vie quotidienne" },
    lines: [
      {
        label: {
          en: "Personal household assistance",
          fr: "Assistance personnelle au domicile",
        },
        by: by(N, N, F),
      },
      {
        label: { en: "Groceries and provisions", fr: "Courses et approvisionnement" },
        by: by(N, N, F),
      },
      {
        label: { en: "Flowers and special requests", fr: "Fleurs et demandes particulières" },
        by: by(N, N, F),
      },
      {
        label: { en: "Household staff coordination", fr: "Coordination du personnel de maison" },
        by: by(N, N, F),
      },
      {
        label: {
          en: "Private chefs, housekeepers and nannies",
          fr: "Chefs privés, gouvernantes et nurses",
        },
        by: by(N, N, F),
      },
      {
        label: {
          en: "Organisation of everyday services",
          fr: "Organisation des services du quotidien",
        },
        by: by(N, N, F),
      },
    ],
  },
];

export const TIERS: Record<
  ConciergeTier,
  { name: Bilingual; price: Bilingual; promise: Bilingual }
> = {
  ESSENTIAL: {
    name: { en: "Essential", fr: "Essentiel" },
    price: { en: "€450 excl. VAT / month", fr: "450 € HT / mois" },
    promise: {
      en: "Enjoy your residence. We take care of it.",
      fr: "Profitez de votre résidence. Nous nous en occupons.",
    },
  },
  SERENITY: {
    name: { en: "Serenity", fr: "Sérénité" },
    price: { en: "from €750 excl. VAT / month", fr: "à partir de 750 € HT / mois" },
    promise: { en: "Peace of mind. Simply.", fr: "La tranquillité, simplement." },
  },
  PRIVATE_LIFESTYLE: {
    name: { en: "Private Lifestyle", fr: "Private Lifestyle" },
    price: { en: "from €1,790 excl. VAT / month", fr: "à partir de 1 790 € HT / mois" },
    promise: {
      en: "We assist you in your everyday life.",
      fr: "Nous vous accompagnons au quotidien.",
    },
  },
};

/**
 * The lines a tier covers, grouped, with empty groups dropped.
 *
 * `NONE` lines are left out entirely rather than printed struck through: this
 * is a contract, not a sales comparison, and listing what the client is not
 * buying invites an argument about why. The qualifier on the ones that are
 * included is carried through, since "on request" is a limit on the promise.
 */
export function servicesFor(
  tier: ConciergeTier
): { title: Bilingual; lines: { label: Bilingual; inclusion: Inclusion }[] }[] {
  return SERVICE_CATALOGUE.map((group) => ({
    title: group.title,
    lines: group.lines
      .filter((l) => l.by[tier] !== "NONE")
      .map((l) => ({ label: l.label, inclusion: l.by[tier] })),
  })).filter((g) => g.lines.length > 0);
}
