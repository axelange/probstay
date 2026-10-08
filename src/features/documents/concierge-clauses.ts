import type {
  Bilingual,
  ConciergeTier,
} from "@/features/documents/concierge-packages";

/**
 * The Property Management agreement, article by article.
 *
 * Held as data and not as JSX. Six thousand words of legal drafting buried in
 * tags cannot be read by the person whose contract it is, and this text will
 * be revised by lawyers rather than by developers — they should be able to
 * find a clause without reading a component.
 *
 * The French is the agency's own, carried over verbatim from
 * docs/contrat-property-management-essentiel.md. The English is ours: article
 * 17.1 says the French governs and a translation does not, so the English
 * column is a courtesy to the reader and not a second contract.
 *
 * ---- Placeholders ----
 *
 * The source carries values in square brackets. Those that change from one
 * contract to the next are `{{tokens}}` here, filled by the builder; those
 * that are agency policy rather than negotiation — the handling percentage,
 * the payment terms — are written out, because a field nobody varies is a
 * field somebody eventually leaves blank.
 *
 * ---- What is not here ----
 *
 * The source's closing "Notes pour BSTAY" section says of itself that it is to
 * be removed before sending. It is not carried over at all, rather than
 * carried over and hidden: a checklist for the agency has no business in a
 * file that can be exported.
 */

/** A paragraph, under an optional sub-heading. */
export type ClauseProse = {
  sub?: Bilingual;
  text: Bilingual;
  /**
   * The packages this clause belongs to. Absent means all of them.
   *
   * A contract should not offer what the package does not include. The
   * provision for expenses is the case this exists for: the comparison sheet
   * marks it absent from Essential, so the sentence offering one is dropped
   * there rather than printed and contradicted by article 4.
   */
  onlyFor?: ConciergeTier[];
  /**
   * Printed in capitals, bold and ruled.
   *
   * Only article 17.3 carries this. A jurisdiction clause agreed between
   * businesses binds only if it is "très apparente", and the agency's own note
   * on the source says to keep it in capitals and bold. Formatting is doing
   * legal work here, which is why it is a property of the clause rather than a
   * decision left to the template.
   */
  veryVisible?: boolean;
};

/** A list, under an optional sub-heading and lead-in. */
export type ClauseList = {
  sub?: Bilingual;
  intro?: Bilingual;
  items: Bilingual[];
};

/** Somewhere the template draws its own block — a table, a schedule. */
export type ClauseSlot = {
  slot: "parties" | "property" | "services" | "fees";
};

export type ClauseBlock = ClauseProse | ClauseList | ClauseSlot;

export type Article = {
  n: number;
  title: Bilingual;
  blocks: ClauseBlock[];
  /**
   * The article carries on from the one above rather than opening a new
   * number: 17.3 is set apart because it must be, not because it is a
   * different article.
   */
  continued?: boolean;
};

export const isSlot = (b: ClauseBlock): b is ClauseSlot => "slot" in b;
export const isList = (b: ClauseBlock): b is ClauseList => "items" in b;

const b = (en: string, fr: string): Bilingual => ({ en, fr });

export const ARTICLES: Article[] = [
  {
    n: 1,
    title: b("Parties", "Parties"),
    blocks: [
      { slot: "parties" },
      {
        text: b(
          'BSTAY and the Owner are hereinafter referred to together as "the Parties" and individually as "a Party".',
          "BSTAY et le Propriétaire sont ci-après désignés ensemble « les Parties » et individuellement « la Partie ».",
        ),
      },
    ],
  },
  {
    n: 2,
    title: b("The Property", "Le Bien"),
    blocks: [
      {
        sub: b("2.1 Designation", "Désignation"),
        text: b(
          'This agreement concerns the following property, hereinafter "the Property":',
          "Le présent contrat porte sur le bien immobilier suivant, ci-après « le Bien » :",
        ),
      },
      { slot: "property" },
      {
        sub: b("2.2 Owner's declarations", "Déclarations du Propriétaire"),
        text: b(
          "The Owner declares that they own the Property, or hold the powers required to entrust its management to BSTAY, and warrants that the Property is subject to no measure or proceeding preventing the performance of this agreement. At the first visit BSTAY draws up an initial condition report of the Property, with photographs, and sends it to the Owner by email; that report stands as the condition of the Property when this agreement takes effect, save for written observations from the Owner within fifteen (15) days of receiving it.",
          "Le Propriétaire déclare être propriétaire du Bien, ou disposer des pouvoirs nécessaires pour le confier en gestion à BSTAY, et garantit que le Bien n'est frappé d'aucune mesure ou procédure faisant obstacle à l'exécution du présent contrat. Lors de la première visite, BSTAY établit un rapport d'état initial du Bien, accompagné de photographies, qu'elle transmet au Propriétaire par courriel ; ce rapport fait foi de l'état du Bien à la prise d'effet du contrat, sauf observations écrites du Propriétaire dans les quinze (15) jours de sa réception.",
        ),
      },
    ],
  },
  {
    n: 3,
    title: b("Purpose of the agreement", "Objet du contrat"),
    blocks: [
      {
        text: b(
          "The Owner entrusts to BSTAY, which accepts, the oversight, coordination and private concierge management of the Property, under the {{tier}} package whose scope is set out in article 4.",
          "Le Propriétaire confie à BSTAY, qui accepte, la mission de veille, de coordination et de conciergerie privée du Bien, selon le forfait {{tier}} dont le périmètre est fixé à l'article 4.",
        ),
      },
      {
        text: b(
          "BSTAY acts as agent and coordinator. It organises, schedules and oversees the work of the providers required for the proper upkeep of the Property, without itself carrying out any works. This agreement confers on BSTAY no mandate to let, to sell, or to represent the Owner at a co-ownership meeting, each of which is the subject of a separate mandate where applicable (article 9).",
          "BSTAY agit en qualité de mandataire et de coordinateur. Elle organise, planifie et suit les interventions des prestataires nécessaires à la bonne tenue du Bien, sans réaliser elle-même de travaux. Le présent contrat ne confère à BSTAY aucun mandat de gestion locative, de vente ou de représentation en assemblée de copropriété, lesquels font l'objet, le cas échéant, de mandats distincts (article 9).",
        ),
      },
    ],
  },
  {
    n: 4,
    title: b(
      "Included and excluded services",
      "Prestations incluses et exclues",
    ),
    blocks: [
      {
        sub: b(
          "4.1 Services included in the {{tier}} package",
          "Prestations incluses dans le forfait {{tier}}",
        ),
        text: b(
          "The following services constitute the limitative scope of the {{tier}} package:",
          "Les prestations suivantes constituent le périmètre limitatif du forfait {{tier}} :",
        ),
      },
      { slot: "services" },
      {
        // The bound that makes 4.1 limitative.
        //
        // The figures are the comparison sheet's own — one check a month, six
        // coordinated interventions, five days' notice — and they used to ride
        // as small qualifier lines under three of the services. Those lines
        // were dropped for legibility, and the quota went with them: the
        // article then called itself limitative while setting no limit, and
        // article 7.2's quotation route had nothing to trigger it.
        //
        // In prose and after the list rather than back under each line, so the
        // list stays as it was asked for. No heading: it continues 4.1.
        //
        // Essential only, because the comparison sheet's quotas are the
        // Essential column's. Serenity and Private Lifestyle carry the same
        // services unqualified, and a quota invented for them would be a
        // commercial term nobody at the agency had agreed.
        onlyFor: ["ESSENTIAL"],
        text: b(
          "Within the {{tier}} package, the regular property check is provided once a month and the coordination of interventions up to six per month, on a request made with at least five (5) days' notice. Beyond those limits, any further service is provided on quotation under article 7.2.",
          "Dans le cadre du forfait {{tier}}, la visite régulière du bien est assurée une fois par mois et la coordination des interventions dans la limite de six par mois, sur demande formulée avec un préavis de cinq (5) jours. Au-delà de ces limites, toute prestation supplémentaire est assurée sur devis selon l'article 7.2.",
        ),
      },
      {
        sub: b("4.2 Excluded services", "Prestations exclues"),
        text: b(
          "The following do not fall within the {{tier}} package, and are the subject of a separate request subject to a quotation, prior written agreement and separate invoicing: project management and the oversight of renovation or fitting-out works; the handling of insurance claims beyond the initial declaration and making safe; rental management (finding tenants, inventories, collecting rent); administrative, tax or legal formalities; representing the Owner before the managing agent or at a general meeting; personal concierge services (shopping, driver, bookings, household staff).",
          "Ne relèvent pas du forfait {{tier}}, et font l'objet d'une demande distincte soumise à devis, accord écrit préalable et facturation séparée : la maîtrise d'œuvre et le suivi de travaux de rénovation ou d'aménagement ; la gestion des sinistres au-delà de la déclaration initiale et de la mise en sécurité ; la gestion locative (recherche de locataires, états des lieux, encaissement des loyers) ; les démarches administratives, fiscales ou juridiques ; la représentation du Propriétaire auprès du syndic ou en assemblée générale ; les services de conciergerie personnelle (courses, chauffeur, réservations, personnel de maison).",
        ),
      },
      {
        sub: b("4.3 Third-party providers", "Prestataires tiers"),
        text: b(
          "Recurring upkeep (cleaning, gardening, pool maintenance, minor maintenance) and any technical intervention are carried out by third-party providers and invoiced directly to the Owner, or re-invoiced at cost under article 7.3. BSTAY coordinates those providers but is neither their employer nor their subcontractor.",
          "Les prestations d'entretien récurrent (ménage, jardinage, entretien de piscine, petite maintenance) et toute intervention technique sont réalisées par des prestataires tiers et facturées directement au Propriétaire ou refacturées à prix coûtant selon l'article 7.3. BSTAY coordonne ces prestataires mais n'en est ni l'employeur ni le sous-traitant.",
        ),
      },
    ],
  },
  {
    n: 5,
    title: b(
      "Scope of the mandate and commitment of expenditure",
      "Étendue du mandat et engagement de dépenses",
    ),
    blocks: [
      {
        sub: b("5.1 BSTAY's powers", "Pouvoirs de BSTAY"),
        text: b(
          "The Owner gives BSTAY a mandate, in the Owner's name and on the Owner's behalf, to seek quotations, to order the work required to preserve and maintain the Property, and to oversee it. Contracts and orders placed with providers are made in the name and on behalf of the Owner, who remains solely liable for them.",
          "Le Propriétaire donne mandat à BSTAY, au nom et pour le compte du Propriétaire, de solliciter des devis, de commander les interventions nécessaires à la conservation et à l'entretien courant du Bien, et d'en assurer le suivi. Les contrats et commandes passés auprès des prestataires le sont au nom et pour le compte du Propriétaire, qui en demeure seul débiteur.",
        ),
      },
      {
        sub: b("5.2 Spending limits", "Seuils d'engagement"),
        text: b(
          "BSTAY may commit, without prior agreement, any routine upkeep expenditure not exceeding {{threshold}} excluding VAT per intervention. Above that, any expenditure requires the Owner's prior written agreement (email suffices) on the basis of a quotation. The Owner undertakes to answer any request for agreement within five (5) business days; failing an answer, BSTAY is deemed authorised not to commit the expenditure and cannot be held liable for the consequences of that deferral.",
          "BSTAY peut engager sans accord préalable toute dépense d'entretien courant n'excédant pas {{threshold}} HT par intervention. Au-delà, toute dépense requiert l'accord écrit préalable du Propriétaire (courriel suffisant) sur la base d'un devis. Le Propriétaire s'engage à répondre à toute demande d'accord dans un délai de cinq (5) jours ouvrés ; à défaut de réponse, BSTAY est réputée autorisée à ne pas engager la dépense et ne saurait être tenue responsable des conséquences de ce report.",
        ),
      },
      {
        sub: b("5.3 Emergencies", "Urgences"),
        text: b(
          "In an emergency threatening the safety of persons or the integrity of the Property (leak, break-in, fire, heating failure in freezing weather), BSTAY may take the strictly necessary protective measures without prior agreement, up to {{emergency}} excluding VAT, and shall inform the Owner without delay.",
          "En cas d'urgence menaçant la sécurité des personnes ou l'intégrité du Bien (fuite, effraction, incendie, panne de chauffage en période de gel), BSTAY peut engager sans accord préalable les mesures conservatoires strictement nécessaires, dans la limite de {{emergency}} HT, à charge d'en informer le Propriétaire sans délai.",
        ),
      },
      {
        sub: b("5.4 Reporting", "Compte rendu"),
        text: b(
          "BSTAY keeps the Owner informed of the work carried out and the expenditure committed by a monthly report sent by email.",
          "BSTAY tient le Propriétaire informé des interventions réalisées et des dépenses engagées par un rapport mensuel transmis par courriel.",
        ),
      },
      {
        // The quarterly statement exists only where there are held funds to
        // account for, so it follows the provision of article 7.3 package for
        // package. Left unconditional, an Essential contract would promise a
        // statement of a provision its own article 7.3 never allows — the
        // cross-reference would point at nothing.
        onlyFor: ["SERENITY", "PRIVATE_LIFESTYLE"],
        text: b(
          "Where BSTAY holds funds on the Owner's behalf under the provision for expenses in article 7.3, it additionally sends, each quarter, a statement of the expenditure settled from that provision, of the balance remaining and of the supporting documents held.",
          "Lorsque BSTAY détient des fonds pour le compte du Propriétaire au titre de la provision pour frais prévue à l'article 7.3, elle lui adresse en outre, trimestriellement, un état des dépenses réglées sur cette provision, du solde disponible et des justificatifs conservés.",
        ),
      },
    ],
  },
  {
    n: 6,
    title: b("The Owner's obligations", "Obligations du Propriétaire"),
    blocks: [
      {
        intro: b("The Owner undertakes to:", "Le Propriétaire s'engage à :"),
        items: [
          b(
            "hand over to BSTAY, on signature, a complete set of keys, badges, remote controls and access codes, against receipt, and to inform BSTAY of any change;",
            "remettre à BSTAY, à la signature, un jeu complet de clés, badges, télécommandes et codes d'accès, contre récépissé, et l'informer de tout changement ;",
          ),
          b(
            "give BSTAY any useful information about the Property: plans, equipment manuals and contracts, details of the providers already in place, the co-ownership rules where applicable, and access constraints;",
            "communiquer à BSTAY toute information utile sur le Bien : plans, notices et contrats des équipements, coordonnées des prestataires en place, règlement de copropriété le cas échéant, contraintes d'accès ;",
          ),
          b(
            "keep the Property compliant with the applicable regulations (electrical and gas safety, pool safety, smoke detectors) and inform BSTAY accordingly;",
            "maintenir le Bien en conformité avec la réglementation applicable (sécurité électrique et gaz, sécurité des piscines, détecteurs de fumée) et en informer BSTAY ;",
          ),
          b(
            "take out and maintain, for the whole term of this agreement, comprehensive home insurance covering the Property, its contents and the Owner's civil liability, including periods when it is unoccupied, and to evidence it on first request;",
            "souscrire et maintenir pendant toute la durée du contrat une assurance multirisque habitation couvrant le Bien, son contenu et la responsabilité civile du Propriétaire, incluant les périodes d'inoccupation, et en justifier à première demande ;",
          ),
          b(
            "appoint a single contact empowered to give instructions and agreements on the Owner's behalf;",
            "désigner un interlocuteur unique habilité à donner des instructions et des accords au nom du Propriétaire ;",
          ),
          b(
            "answer BSTAY's requests for agreement within the periods set out in article 5.2;",
            "répondre aux demandes d'accord de BSTAY dans les délais de l'article 5.2 ;",
          ),
          b(
            "pay the fees and expenses on the terms of article 7;",
            "régler les honoraires et les frais dans les conditions de l'article 7 ;",
          ),
          b(
            "not give instructions directly to the providers engaged by BSTAY without informing it, so that the oversight remains coherent.",
            "ne pas donner d'instructions directes aux prestataires mandatés par BSTAY sans l'en informer, afin de préserver la cohérence du suivi.",
          ),
        ],
      },
    ],
  },
  {
    n: 7,
    title: b("Fees, expenses and payment", "Honoraires, frais et paiement"),
    blocks: [
      {
        sub: b("7.1 The package", "Forfait"),
        text: b(
          "In consideration of the services in article 4.1, the Owner pays BSTAY a monthly fee of {{fee}} excluding VAT (VAT at the rate in force, currently 20 %). The fee covers all of the included services, without any accounting for hours, and is due regardless of whether the Property is occupied. This agreement takes effect on {{startDate}}; the first quarter is invoiced pro rata.",
          "En contrepartie des prestations de l'article 4.1, le Propriétaire verse à BSTAY un forfait mensuel de {{fee}} HT (TVA au taux en vigueur, actuellement 20 %). Le forfait couvre l'intégralité des prestations incluses, sans décompte horaire, et est dû quelle que soit l'occupation du Bien. Le présent contrat prend effet le {{startDate}} ; le premier trimestre est facturé au prorata.",
        ),
      },
      { slot: "fees" },
      {
        sub: b("7.2 Services outside the package", "Prestations hors forfait"),
        text: b(
          "The services excluded by article 4.2 are invoiced only against an accepted quotation.",
          "Les prestations exclues de l'article 4.2 sont facturées uniquement sur devis accepté.",
        ),
      },
      {
        sub: b("7.3 Expenses and disbursements", "Frais et débours"),
        text: b(
          "Third-party providers' invoices are made out in the Owner's name and settled directly by the Owner. Where BSTAY advances an expense on the Owner's behalf, it re-invoices it at cost, against evidence, plus a handling charge of 10 %.",
          "Les factures des prestataires tiers sont établies au nom du Propriétaire et réglées directement par lui. Lorsque BSTAY fait l'avance d'une dépense pour le compte du Propriétaire, elle la refacture à prix coûtant, sur justificatif, majorée de frais de gestion de 10 %.",
        ),
      },
      {
        // Serenity and Private Lifestyle only. Essential carries no provision
        // — the comparison sheet marks it absent and article 4 says so — and a
        // contract that offers one there would contradict its own schedule.
        // No heading: it continues 7.3.
        onlyFor: ["SERENITY", "PRIVATE_LIFESTYLE"],
        text: b(
          "The Owner may place with BSTAY a provision for expenses of {{provision}}, replenished quarterly and returned at the end of the agreement once the accounts are settled.",
          "Le Propriétaire peut constituer auprès de BSTAY une provision pour frais de {{provision}}, reconstituée trimestriellement et restituée à la fin du contrat après apurement des comptes.",
        ),
      },
      {
        sub: b("7.4 Invoicing and payment", "Facturation et paiement"),
        text: b(
          "The fee is invoiced quarterly, in advance, on the first day of each calendar quarter, for an amount equal to three (3) monthly instalments — the first invoice being issued on the start date, for the share of the quarter in progress, in accordance with the schedule in article 7.1. Invoices are payable within fifteen (15) days of their date of issue, by bank transfer to the account shown on the invoice. No discount is granted for early payment.",
          "Le forfait est facturé trimestriellement, d'avance, le premier jour de chaque trimestre civil, pour un montant égal à trois (3) mensualités, la première facture étant émise à la date de démarrage pour la fraction du trimestre en cours, conformément à l'échéancier de l'article 7.1. Les factures sont payables à quinze (15) jours à compter de leur date d'émission, par virement bancaire sur le compte indiqué sur la facture. Aucun escompte n'est accordé pour paiement anticipé.",
        ),
      },
      {
        sub: b("7.5 Late payment", "Retard de paiement"),
        text: b(
          "Any sum unpaid when due carries, automatically and without prior formal notice, late payment interest at three times the statutory rate, together with a fixed recovery charge of €40 per invoice, in accordance with articles L441-10 and D441-5 of the Commercial Code, without prejudice to further compensation on evidence. Where payment is more than thirty (30) days late, BSTAY may suspend its services after written notice, and that suspension cannot be held against it.",
          "Toute somme non réglée à l'échéance porte de plein droit, sans mise en demeure préalable, des pénalités de retard au taux de trois fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € par facture, conformément aux articles L441-10 et D441-5 du Code de commerce, sans préjudice d'une indemnisation complémentaire sur justificatif. En cas de retard supérieur à trente (30) jours, BSTAY peut suspendre ses prestations après notification écrite, sans que cette suspension puisse lui être reprochée.",
        ),
      },
      {
        sub: b("7.6 Review", "Révision"),
        text: b(
          "The fee is reviewed on each anniversary of the agreement according to the movement of the SYNTEC index published by the Fédération Syntec, by the formula P1 = P0 × (S1 / S0), where P0 is the fee in force, S0 the last index published at the date of signature (or of the previous review) and S1 the last index published at the date of review. Should the index cease to exist, the Parties substitute the official replacement index or, failing that, the closest equivalent. BSTAY notifies the new amount to the Owner at least three (3) months before the annual date.",
          "Le forfait est révisé à chaque date anniversaire du contrat selon la variation de l'indice SYNTEC publié par la Fédération Syntec, selon la formule : P1 = P0 × (S1 / S0), où P0 est le forfait en vigueur, S0 le dernier indice publié à la date de signature (ou de la précédente révision) et S1 le dernier indice publié à la date de révision. En cas de disparition de l'indice, les Parties lui substituent l'indice de remplacement officiel ou, à défaut, l'indice le plus proche. BSTAY notifie le nouveau montant au Propriétaire au moins trois (3) mois avant l'échéance annuelle.",
        ),
      },
    ],
  },
  {
    n: 8,
    title: b(
      "Term, renewal, termination",
      "Durée, renouvellement, résiliation",
    ),
    blocks: [
      {
        sub: b("8.1 Term", "Durée"),
        text: b(
          "This agreement is entered into for a term of twelve (12) months from its signature. It is thereafter renewed by tacit agreement for successive periods of twelve (12) months, save for termination on the conditions below.",
          "Le présent contrat est conclu pour une durée de douze (12) mois à compter de sa signature. Il se renouvelle ensuite par tacite reconduction pour des périodes successives de douze (12) mois, sauf résiliation dans les conditions ci-dessous.",
        ),
      },
      {
        sub: b("8.2 Notice", "Préavis"),
        text: b(
          "Either Party may terminate the agreement by written notice (registered letter with acknowledgement of receipt, or email with read receipt), subject to two (2) months' notice running from receipt of that notice.",
          "Chaque Partie peut résilier le contrat par notification écrite (lettre recommandée avec accusé de réception ou courriel avec accusé de lecture), moyennant un préavis de deux (2) mois courant à compter de la réception de la notification.",
        ),
      },
      {
        sub: b(
          "8.3 Conditions of termination by the Owner",
          "Conditions de la résiliation par le Propriétaire",
        ),
        text: b(
          "Termination at the Owner's initiative may be notified at any time provided that, on the date of notification, no third-party provider engaged by BSTAY on the Owner's behalf is committed to an ongoing assignment (works, renovation, insurance claim, fitting out and the like) and that the invoices issued have been settled. Recurring routine upkeep (cleaning, gardening, pool maintenance, minor maintenance and the like) does not constitute an ongoing assignment for the purposes of this article, and ends at the close of the notice period. BSTAY provides the Owner, on request, with the status of ongoing assignments.",
          "La résiliation à l'initiative du Propriétaire peut être notifiée à tout moment dès lors qu'à la date de la notification, aucun prestataire tiers mandaté par BSTAY pour le compte du Propriétaire n'est engagé sur une mission en cours (travaux, rénovation, sinistre, aménagement, etc.) et que les factures émises ont été réglées. Ne sont pas considérées comme des missions en cours au sens du présent article les prestations récurrentes d'entretien courant (ménage, jardinage, entretien de piscine, petite maintenance, etc.), lesquelles prennent fin au terme du préavis. BSTAY communique au Propriétaire, sur simple demande, l'état des missions en cours.",
        ),
      },
      {
        sub: b(
          "8.4 Assignments continuing beyond the notice period",
          "Missions se poursuivant au-delà du préavis",
        ),
        text: b(
          "Should an assignment entrusted to BSTAY before the end of the agreement continue beyond the expiry of the notice period, the Owner shall choose, no later than fifteen (15) days before that date, between: (a) BSTAY continuing to oversee the assignment through to completion, against payment of the monthly fee pro rata temporis for the remaining period; or (b) signing a discharge recording the state of progress of the assignment at that date, by which BSTAY is released from any obligation to oversee it and from any liability for its continuation. Failing a choice expressed within that period, option (a) applies.",
          "Si une mission confiée à BSTAY avant le terme du contrat devait se poursuivre au-delà de l'expiration du préavis, le Propriétaire choisit, au plus tard quinze (15) jours avant ce terme, entre : (a) le maintien du suivi par BSTAY jusqu'à l'achèvement de la mission, moyennant le paiement du forfait mensuel au prorata temporis de la durée restante ; ou (b) la signature d'une décharge constatant l'état d'avancement de la mission à la date du terme, par laquelle BSTAY est libérée de toute obligation de suivi et de toute responsabilité relative à la poursuite de ladite mission. À défaut de choix exprimé dans ce délai, l'option (a) s'applique.",
        ),
      },
      {
        sub: b("8.5 Termination for breach", "Résiliation pour manquement"),
        text: b(
          "Where one Party is in serious breach of its obligations — in particular failure to pay a quarterly invoice more than thirty (30) days after it fell due, repeated refusal of access to the Property, or any conduct making the continuation of the assignment impossible — the other Party may terminate the agreement automatically, fifteen (15) days after a formal notice by registered letter with acknowledgement of receipt has gone unheeded, without prejudice to any damages. Fees remain due until the effective date of termination.",
          "En cas de manquement grave de l'une des Parties à ses obligations, notamment le défaut de paiement d'une facture trimestrielle plus de trente (30) jours après son échéance, le refus répété d'accès au Bien ou tout comportement rendant la poursuite de la mission impossible, l'autre Partie peut résilier le contrat de plein droit, quinze (15) jours après une mise en demeure par lettre recommandée avec accusé de réception restée sans effet, sans préjudice de tous dommages et intérêts. Les honoraires restent dus jusqu'à la date effective de résiliation.",
        ),
      },
      {
        // Two wordings of one clause, because the provision is not available on
        // every package. The mention cannot be made conditional on its own —
        // it sits inside the sentence — so the sentence is written twice and
        // the pair covers all three tiers between them. Any new tier must be
        // added to one of the two lists, or article 8.6 goes missing.
        onlyFor: ["SERENITY", "PRIVATE_LIFESTYLE"],
        sub: b("8.6 End of the agreement", "Fin du contrat"),
        text: b(
          "At the close of the notice period, BSTAY hands back to the Owner the keys, documents and access codes against receipt, and draws up a final statement of account including the return of any provision for expenses. An outgoing inventory is drawn up by both Parties together.",
          "Au terme du préavis, BSTAY remet au Propriétaire les clés, documents et codes d'accès contre récépissé, et établit un décompte final incluant la restitution de l'éventuelle provision pour frais. Un état des lieux de sortie est dressé contradictoirement.",
        ),
      },
      {
        onlyFor: ["ESSENTIAL"],
        sub: b("8.6 End of the agreement", "Fin du contrat"),
        text: b(
          "At the close of the notice period, BSTAY hands back to the Owner the keys, documents and access codes against receipt, and draws up a final statement of account. An outgoing inventory is drawn up by both Parties together.",
          "Au terme du préavis, BSTAY remet au Propriétaire les clés, documents et codes d'accès contre récépissé, et établit un décompte final. Un état des lieux de sortie est dressé contradictoirement.",
        ),
      },
    ],
  },
  {
    n: 9,
    title: b("Priority on letting and sale", "Priorité location et vente"),
    blocks: [
      {
        sub: b("9.1 Right of first refusal", "Droit de première proposition"),
        text: b(
          "Throughout the term of this agreement, should the Owner consider letting the Property (seasonally or on a long let) or selling it, the Owner undertakes to inform BSTAY in writing and to offer it that assignment in priority before entrusting it to any third party. BSTAY has thirty (30) days from that information to put forward a proposed mandate.",
          "Pendant toute la durée du contrat, le Propriétaire s'engage, s'il envisage de mettre le Bien en location (saisonnière ou de longue durée) ou de le vendre, à en informer BSTAY par écrit et à lui proposer en priorité cette mission avant de la confier à tout tiers. BSTAY dispose de trente (30) jours à compter de cette information pour remettre une proposition de mandat.",
        ),
      },
      {
        sub: b("9.2 Separate mandate", "Mandat distinct"),
        text: b(
          "Any letting or sale assignment is the subject of a separate written mandate, compliant with law no. 70-9 of 2 January 1970 and decree no. 72-678 of 20 July 1972, entered in BSTAY's register of mandates, stating its duration, the terms of remuneration and the means of revocation. This article does not constitute a letting or sale mandate.",
          "Toute mission de location ou de vente fait l'objet d'un mandat écrit distinct, conforme à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972, enregistré au registre des mandats de BSTAY, précisant sa durée, les conditions de rémunération et les modalités de dénonciation. Le présent article ne vaut pas mandat de location ou de vente.",
        ),
      },
      {
        sub: b("9.3 Breach", "Manquement"),
        text: b(
          "Should the Owner entrust such an assignment to a third party without having complied with article 9.1, the Owner shall owe BSTAY a fixed indemnity equal to three (3) months of the fee, without prejudice to BSTAY's right to terminate the agreement under article 8.5.",
          "Si le Propriétaire confie une telle mission à un tiers sans avoir respecté l'article 9.1, il sera redevable envers BSTAY d'une indemnité forfaitaire égale à trois (3) mois de forfait, sans préjudice de la faculté pour BSTAY de résilier le contrat dans les conditions de l'article 8.5.",
        ),
      },
    ],
  },
  {
    n: 10,
    title: b("Liability and insurance", "Responsabilité et assurances"),
    blocks: [
      {
        sub: b("10.1 Nature of the obligations", "Nature des obligations"),
        text: b(
          "BSTAY is bound by an obligation of means in carrying out its coordination and oversight assignment. It performs its services diligently and according to the standards of the profession.",
          "BSTAY est tenue d'une obligation de moyens dans l'exécution de sa mission de coordination et de suivi. Elle exécute ses prestations avec diligence et dans les règles de l'art de la profession.",
        ),
      },
      {
        sub: b("10.2 Third-party providers", "Prestataires tiers"),
        text: b(
          "Third-party providers act independently, under their own liability and their own insurance. BSTAY does not answer for delays, defects, poor workmanship or damage attributable to a third-party provider. BSTAY's liability may be engaged only for a proven breach of its obligation of means defined in article 10.1, within the limits of article 10.3. BSTAY assists the Owner, on request, in any claim against the provider at fault.",
          "Les prestataires tiers interviennent de manière indépendante, sous leur propre responsabilité et leurs propres assurances. BSTAY ne répond pas des retards, défauts, malfaçons ou dommages imputables à un prestataire tiers. La responsabilité de BSTAY ne peut être engagée qu'en cas de manquement prouvé à son obligation de moyens définie à l'article 10.1, dans les limites de l'article 10.3. BSTAY assiste le Propriétaire, à sa demande, dans ses réclamations contre le prestataire défaillant.",
        ),
      },
      {
        sub: b("10.3 Cap", "Plafond"),
        text: b(
          "Save for gross negligence, wilful misconduct or personal injury, BSTAY's liability under this agreement is limited, on all grounds taken together, to the total fees excluding VAT received over the twelve (12) months preceding the event giving rise to it. BSTAY does not answer for indirect loss, in particular loss of enjoyment, loss of rental income or damage to reputation.",
          "Sauf faute lourde, dol ou dommage corporel, la responsabilité de BSTAY au titre du présent contrat est limitée, toutes causes confondues, au montant total des honoraires hors taxes perçus au cours des douze (12) mois précédant le fait générateur. BSTAY ne répond pas des dommages indirects, notamment perte de jouissance, perte de revenus locatifs ou préjudice d'image.",
        ),
      },
      {
        sub: b("10.4 Exclusions", "Exclusions"),
        text: b(
          "BSTAY is not liable for damage arising from: a pre-existing defect or wear in the Property or its equipment; instructions from the Owner contrary to BSTAY's written recommendations; a refusal or delay of agreement by the Owner; a failure of the Owner's insurance; or an event occurring between two visits which could not reasonably have been detected or prevented.",
          "BSTAY n'est pas responsable des dommages résultant : d'un vice ou d'une vétusté préexistants du Bien ou de ses équipements ; d'instructions du Propriétaire contraires aux recommandations écrites de BSTAY ; d'un refus ou d'un retard d'accord du Propriétaire ; d'un défaut d'assurance du Propriétaire ; d'un événement survenu entre deux visites et qui ne pouvait raisonnablement être détecté ni prévenu.",
        ),
      },
      {
        sub: b("10.5 Insurance", "Assurances"),
        text: b(
          "BSTAY declares that it holds professional civil liability insurance with Generali (policy no. AL591311/31961) and a financial guarantee from CEGC (no. 31961GES261), evidenced on first request. The Owner maintains the insurance referred to in article 6.4 and declares any claim to its insurer; BSTAY assists with the declaration and the assessment.",
          "BSTAY déclare être titulaire d'une assurance responsabilité civile professionnelle auprès de Generali (police n° AL591311/31961) et d'une garantie financière CEGC (n° 31961GES261), dont elle justifie à première demande. Le Propriétaire maintient l'assurance visée à l'article 6.4 et déclare tout sinistre à son assureur ; BSTAY lui apporte son concours pour la déclaration et les constats.",
        ),
      },
    ],
  },
  {
    n: 11,
    title: b("Keys and access", "Clés et accès"),
    blocks: [
      {
        sub: b("11.1 Handover and safekeeping", "Remise et conservation"),
        text: b(
          "The keys, badges, remote controls and codes handed to BSTAY are the subject of a receipt drawn up by BSTAY and sent to the Owner, setting out their number and nature. BSTAY keeps them in a secure place, under an anonymous code which does not identify the Property.",
          "Les clés, badges, télécommandes et codes remis à BSTAY font l'objet d'un récépissé établi par BSTAY et transmis au Propriétaire, qui en détaille le nombre et la nature. BSTAY les conserve dans un lieu sécurisé, sous un code anonyme ne permettant pas d'identifier le Bien.",
        ),
      },
      {
        sub: b("11.2 Loss or theft", "Perte ou vol"),
        text: b(
          "Should a key entrusted to BSTAY be lost or stolen, BSTAY informs the Owner without delay and bears the replacement of the cylinders concerned and the corresponding keys, within the cap of article 10.3, unless the loss is attributable to the Owner, their occupants or a provider not engaged by BSTAY.",
          "En cas de perte ou de vol d'une clé confiée à BSTAY, celle-ci en informe le Propriétaire sans délai et prend en charge le remplacement des cylindres concernés et des clés correspondantes, dans la limite du plafond de l'article 10.3, sauf si la perte est imputable au Propriétaire, à ses occupants ou à un prestataire non mandaté par BSTAY.",
        ),
      },
      {
        sub: b("11.3 Return", "Restitution"),
        text: b(
          "At the end of the agreement, all keys and access devices are returned against receipt, in accordance with article 8.6.",
          "À la fin du contrat, l'intégralité des clés et supports d'accès est restituée contre récépissé, conformément à l'article 8.6.",
        ),
      },
    ],
  },
  {
    n: 12,
    title: b("Confidentiality", "Confidentialité"),
    blocks: [
      {
        sub: b("12.1 Confidential information", "Informations confidentielles"),
        text: b(
          "Each Party undertakes to keep strictly confidential information of any kind which it learns in connection with this agreement — for BSTAY, in particular the identity of the Owner and those close to them, the location and description of the Property, its accesses, the periods when it is occupied, its contents and its security systems; and for the Owner, BSTAY's methods, rates, tools and network of providers.",
          "Chaque Partie s'engage à tenir strictement confidentielles les informations de toute nature dont elle a connaissance à l'occasion du présent contrat, notamment, pour BSTAY, l'identité du Propriétaire et de ses proches, la localisation et la description du Bien, ses accès, ses périodes d'occupation, ses biens mobiliers et ses systèmes de sécurité ; et, pour le Propriétaire, les méthodes, tarifs, outils et réseau de prestataires de BSTAY.",
        ),
      },
      {
        sub: b("12.2 Exceptions", "Exceptions"),
        text: b(
          "The obligation of confidentiality does not apply to information that has entered the public domain without fault of the Party concerned, nor to information whose disclosure is required by law, an administrative authority or a court decision, nor to what is strictly necessary for the performance of the agreement by the providers, who are themselves bound to confidentiality.",
          "L'obligation de confidentialité ne s'applique pas aux informations tombées dans le domaine public sans faute de la Partie concernée, ni à celles dont la communication est exigée par la loi, une autorité administrative ou une décision de justice, ni à celles strictement nécessaires à l'exécution du contrat par les prestataires, eux-mêmes tenus à la confidentialité.",
        ),
      },
      {
        sub: b("12.3 Duration and sanctions", "Durée et sanctions"),
        text: b(
          "This obligation subsists for the whole term of the agreement and for five (5) years after it ends; information concerning the security of the Property and the identity of the Owner remains confidential without limit of time. BSTAY imposes an equivalent obligation on its employees and providers. No public communication (social media, commercial references, photographs) mentions the Owner or the Property without their prior written agreement.",
          "Cette obligation subsiste pendant toute la durée du contrat et cinq (5) ans après son terme ; les informations relatives à la sécurité du Bien et à l'identité du Propriétaire restent confidentielles sans limitation de durée. BSTAY impose à ses salariés et prestataires une obligation équivalente. Aucune communication publique (réseaux sociaux, références commerciales, photographies) ne mentionne le Propriétaire ou le Bien sans son accord écrit préalable.",
        ),
      },
    ],
  },
  {
    n: 13,
    title: b("Personal data", "Données personnelles"),
    blocks: [
      {
        text: b(
          "BSTAY processes, as controller, the personal data of the Owner, their representatives, occupants and guests, solely for the performance of this agreement, for invoicing and to meet its legal obligations, in accordance with Regulation (EU) 2016/679 (GDPR) and law no. 78-17 of 6 January 1978. That data is kept for the term of the agreement and then archived for the applicable limitation periods. It is disclosed to providers only so far as their intervention requires, and is not transferred outside the European Union without appropriate safeguards. The persons concerned have rights of access, rectification, erasure, restriction, objection and portability, exercised with BSTAY at {{gdprEmail}}, and may lodge a complaint with the CNIL. The Owner undertakes to inform their occupants and guests of this processing.",
          "BSTAY traite, en qualité de responsable de traitement, les données personnelles du Propriétaire, de ses représentants, occupants et invités, aux seules fins de l'exécution du présent contrat, de la facturation et du respect de ses obligations légales, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi n° 78-17 du 6 janvier 1978. Ces données sont conservées pendant la durée du contrat puis archivées pendant la durée des prescriptions légales applicables. Elles ne sont communiquées qu'aux prestataires dans la mesure nécessaire à leur intervention, et ne font l'objet d'aucun transfert hors de l'Union européenne sans garanties appropriées. Les personnes concernées disposent d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, qu'elles exercent auprès de BSTAY à l'adresse {{gdprEmail}}, et peuvent saisir la CNIL en cas de réclamation. Le Propriétaire s'engage à informer ses occupants et invités de ce traitement.",
        ),
      },
    ],
  },
  {
    n: 14,
    title: b("Non-solicitation", "Non-sollicitation"),
    blocks: [
      {
        text: b(
          "Throughout the term of this agreement and for the twelve (12) months following its end, the Owner shall not, directly or through another, employ or engage to work on their behalf, outside BSTAY's intermediation, any employee of BSTAY or any provider which BSTAY introduced to them under this agreement, without BSTAY's prior written agreement. This restriction does not apply to providers the Owner already employed before the agreement was signed and declared to BSTAY. Any breach gives rise to a fixed indemnity equal to three (3) months of the fee per person concerned, without prejudice to compensation for the actual loss.",
          "Pendant toute la durée du contrat et pendant les douze (12) mois suivant son terme, le Propriétaire s'interdit, directement ou par personne interposée, d'embaucher ou de faire travailler pour son compte, hors de l'intermédiation de BSTAY, tout salarié de BSTAY ou tout prestataire que BSTAY lui a présenté dans le cadre du présent contrat, sauf accord écrit préalable de BSTAY. Cette interdiction ne s'applique pas aux prestataires que le Propriétaire employait déjà avant la signature du contrat et qu'il a déclarés à BSTAY. Tout manquement donne lieu au versement d'une indemnité forfaitaire égale à trois (3) mois de forfait par personne concernée, sans préjudice de la réparation du préjudice réel.",
        ),
      },
    ],
  },
  {
    n: 15,
    title: b("Force majeure", "Force majeure"),
    blocks: [
      {
        text: b(
          "Neither Party is liable for a failure to perform its obligations resulting from an event of force majeure within the meaning of article 1218 of the Civil Code, in particular natural disaster, fire, flood, epidemic, administrative decision, general strike or prolonged network failure. The Party prevented informs the other without delay. The obligations affected are suspended for the duration of the event; should it exceed sixty (60) days, either Party may terminate the agreement by written notice, without indemnity. Fees remain due pro rata to the services actually rendered.",
          "Aucune des Parties ne sera tenue responsable d'un manquement à ses obligations résultant d'un événement de force majeure au sens de l'article 1218 du Code civil, notamment catastrophe naturelle, incendie, inondation, épidémie, décision administrative, grève générale ou défaillance prolongée des réseaux. La Partie empêchée en informe l'autre sans délai. Les obligations affectées sont suspendues pendant la durée de l'événement ; si celui-ci excède soixante (60) jours, chaque Partie peut résilier le contrat par notification écrite, sans indemnité. Les honoraires restent dus au prorata des prestations effectivement rendues.",
        ),
      },
    ],
  },
  {
    n: 16,
    title: b(
      "Assignment, subcontracting, entire agreement",
      "Cession, sous-traitance, intégralité",
    ),
    blocks: [
      {
        sub: b("16.1 Personal character", "Caractère personnel"),
        text: b(
          "This agreement is entered into in consideration of the person of the Owner and of the Property. It may not be assigned by the Owner without BSTAY's prior written agreement. Should the Property be sold, the agreement ends on the date ownership transfers, subject to the notice in article 8.2; failing that notice, the fees for the remaining notice period remain due. BSTAY may assign the agreement to any company succeeding it in its business, informing the Owner in writing.",
          "Le présent contrat est conclu en considération de la personne du Propriétaire et du Bien. Il ne peut être cédé par le Propriétaire sans l'accord écrit préalable de BSTAY. En cas de vente du Bien, le contrat prend fin à la date du transfert de propriété, sous réserve du préavis de l'article 8.2 ; à défaut de respect de ce préavis, les honoraires correspondant à la période de préavis restante demeurent dus. BSTAY peut céder le contrat à toute société qui lui succéderait dans son activité, en informant le Propriétaire par écrit.",
        ),
      },
      {
        sub: b("16.2 Subcontracting", "Sous-traitance"),
        text: b(
          "BSTAY may entrust the physical carrying out of interventions to third-party providers, on the terms of articles 4.3 and 10.2. It remains the Owner's single point of contact for coordination.",
          "BSTAY peut confier à des prestataires tiers l'exécution matérielle des interventions, dans les conditions des articles 4.3 et 10.2. Elle reste l'interlocuteur unique du Propriétaire pour la coordination.",
        ),
      },
      {
        sub: b(
          "16.3 Entire agreement and amendments",
          "Intégralité et modifications",
        ),
        text: b(
          "This agreement expresses the whole of the Parties' agreement and supersedes any prior exchange. The receipts, reports and accepted quotations exchanged while it runs supplement the agreement without modifying it. Any modification is the subject of a written amendment signed by both Parties.",
          "Le présent contrat exprime l'intégralité de l'accord des Parties et remplace tout échange antérieur. Les récépissés, rapports et devis acceptés échangés en cours d'exécution complètent le contrat sans le modifier. Toute modification fait l'objet d'un avenant écrit signé des deux Parties.",
        ),
      },
      {
        sub: b(
          "16.4 Partial invalidity and forbearance",
          "Nullité partielle et tolérance",
        ),
        text: b(
          "Should a provision of this agreement be declared void or unenforceable, the others retain their full effect and the Parties undertake to substitute a valid provision of equivalent effect. A Party's not relying on the other's breach does not amount to a waiver of the right to rely on it later.",
          "Si une stipulation du présent contrat est déclarée nulle ou inapplicable, les autres conservent leur plein effet et les Parties s'engagent à y substituer une stipulation valide d'effet équivalent. Le fait pour une Partie de ne pas se prévaloir d'un manquement de l'autre ne vaut pas renonciation à s'en prévaloir ultérieurement.",
        ),
      },
      {
        sub: b("16.5 Notices", "Notifications"),
        text: b(
          "Notices under this agreement are validly given to the postal and electronic addresses stated in article 1, or to any other address notified in writing. The Parties agree that email with a read receipt stands as writing for the purposes of this agreement, save for formal notice and termination for breach, which require a registered letter with acknowledgement of receipt.",
          "Les notifications prévues au présent contrat sont valablement faites aux adresses postales et électroniques indiquées à l'article 1, ou à toute autre adresse notifiée par écrit. Les Parties conviennent que le courriel avec accusé de lecture vaut écrit pour les besoins du présent contrat, hors mise en demeure et résiliation pour manquement qui requièrent une lettre recommandée avec accusé de réception.",
        ),
      },
    ],
  },
  {
    n: 17,
    title: b("Governing law and jurisdiction", "Loi applicable et juridiction"),
    blocks: [
      {
        sub: b("17.1 Governing law", "Loi applicable"),
        text: b(
          "This agreement is drawn up in the French language and governed by French law. In case of translation, only the French version is authoritative.",
          "Le présent contrat est rédigé en langue française et régi par le droit français. En cas de traduction, seule la version française fait foi.",
        ),
      },
      {
        sub: b("17.2 Amicable settlement", "Règlement amiable"),
        text: b(
          "The Parties endeavour to settle amicably any dispute concerning the interpretation or performance of this agreement, within thirty (30) days of the dispute being notified in writing by the more diligent Party.",
          "Les Parties s'efforcent de résoudre à l'amiable tout différend relatif à l'interprétation ou à l'exécution du présent contrat, dans un délai de trente (30) jours à compter de la notification écrite du différend par la Partie la plus diligente.",
        ),
      },
    ],
  },
  {
    n: 17,
    title: b("Governing law and jurisdiction", "Loi applicable et juridiction"),
    continued: true,
    blocks: [
      {
        sub: b("17.3 Jurisdiction", "Attribution de juridiction"),
        veryVisible: true,
        text: b(
          "FAILING AN AMICABLE SETTLEMENT, ANY DISPUTE CONCERNING THE FORMATION, INTERPRETATION, PERFORMANCE OR TERMINATION OF THIS AGREEMENT SHALL BE SUBMITTED TO THE EXCLUSIVE JURISDICTION OF THE COMMERCIAL COURT OF CANNES, NOTWITHSTANDING MULTIPLE DEFENDANTS OR THIRD-PARTY PROCEEDINGS, INCLUDING FOR URGENT OR PROTECTIVE PROCEEDINGS.",
          "À DÉFAUT D'ACCORD AMIABLE, TOUT LITIGE RELATIF À LA FORMATION, L'INTERPRÉTATION, L'EXÉCUTION OU LA RÉSILIATION DU PRÉSENT CONTRAT SERA SOUMIS À LA COMPÉTENCE EXCLUSIVE DU TRIBUNAL DE COMMERCE DE CANNES, NONOBSTANT PLURALITÉ DE DÉFENDEURS OU APPEL EN GARANTIE, Y COMPRIS POUR LES PROCÉDURES D'URGENCE OU CONSERVATOIRES.",
        ),
      },
    ],
  },
];
