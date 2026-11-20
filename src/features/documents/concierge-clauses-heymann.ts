/**
 * The Heymann agreement: a Serenity package for a property that is let.
 *
 * ---- Why this is a file of its own ----
 *
 * It is not a variation of the three packages. Article 9 is about letting the
 * property — direct lettings, third-party agencies, tenants, stays — where the
 * standard contract's article 9 is a right of first refusal. Articles 11 (keys
 * and access) and 14 (non-solicitation) have no counterpart at all. Article 5
 * gains subscriptions, article 7 gains an operating fund, a late-payment clause
 * and an annual SYNTEC revision, and article 10's exclusions are written around
 * tenants and agencies.
 *
 * Folded into the shared clause set behind `onlyFor` marks, almost every block
 * would carry a condition and neither contract would be readable. Kept apart,
 * the standard three are untouched and this one deletes in a single file.
 *
 * ---- French only ----
 *
 * Article 17.1 says the contract is drawn in French and that an English
 * translation, if provided, is for information. The source's own notes say a
 * bilingual version would have to be a faithful article-by-article translation,
 * which this is not and should not pretend to be. `f()` therefore puts the same
 * French in both halves, and the builder forces the French-only setting for
 * this package so the English half is never drawn.
 *
 * ---- Figures ----
 *
 * The bracketed values of the source become tokens where the preview has a
 * field for them — the fee, the start date, the two ceilings of article 5, the
 * fund and its replenishment threshold. The rest are written out: they are
 * terms of this agreement, not parameters of a package.
 */

import type { Article } from "@/features/documents/concierge-clauses";
import type { Bilingual } from "@/features/documents/concierge-packages";
import type { ConciergeServiceGroup } from "@/features/documents/templates/contrat-conciergerie";

/** One French text, in both halves. See the note on French only, above. */
const f = (text: string): Bilingual => ({ en: text, fr: text });

/**
 * Article 4.1's table of included services.
 *
 * The source lays it out as five domains against a cell of prose each. Split
 * on the semicolons the prose already uses, so the page reads as a list rather
 * than five paragraphs — and so it is set exactly as the other packages' table
 * is. Every line is included outright; this package has no on-request tier.
 */
export const HEYMANN_SERVICES: ConciergeServiceGroup[] = [
  {
    title: f("Veille sur le Bien"),
    lines: [
      { label: f("Visite et inspection générale du Bien"), inclusion: "FULL" },
      {
        label: f("Identification et signalement des anomalies"),
        inclusion: "FULL",
      },
      { label: f("Rapport après chaque visite"), inclusion: "FULL" },
    ],
  },
  {
    title: f("Gestion et entretien"),
    lines: [
      { label: f("Coordination des interventions"), inclusion: "FULL" },
      { label: f("Suivi des demandes jusqu'à résolution"), inclusion: "FULL" },
      { label: f("Prise et suivi des rendez-vous"), inclusion: "FULL" },
      { label: f("Accès au Bien pour les prestataires"), inclusion: "FULL" },
      { label: f("Gestion des clés et des accès"), inclusion: "FULL" },
      {
        label: f("Mise en place et suivi des abonnements (article 5.4)"),
        inclusion: "FULL",
      },
    ],
  },
  {
    title: f("Gestion opérationnelle des Séjours"),
    lines: [
      {
        label: f(
          "Préparation du Bien avant chaque arrivée : contrôle, mise en place, linge et consommables selon les standards convenus",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Accueil du Locataire à l'arrivée, remise des clés et présentation du Bien",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Assistance du Locataire pendant le Séjour et organisation des interventions nécessaires",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Accompagnement au départ, récupération des clés et contrôle de l'état du Bien",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Organisation du ménage et de la remise en état après chaque départ",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Signalement au Propriétaire, et le cas échéant à l'Agence, de tout dommage ou anomalie constaté",
        ),
        inclusion: "FULL",
      },
    ],
  },
  {
    title: f("Coordination des Canaux de location"),
    lines: [
      {
        label: f(
          "Pour les Locations Propriétaire : gestion des réservations dans le compte Plateforme du Propriétaire via l'accès fourni par celui-ci (tenue du calendrier, réponse aux demandes et acceptation des réservations selon les consignes du Propriétaire, messagerie avec les voyageurs, communication des informations d'arrivée), coordination des arrivées et départs",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Pour les Locations via Agence : réception du calendrier et des informations de Séjour, coordination des arrivées et départs, remise et récupération des clés auprès de l'Agence (article 9.3)",
        ),
        inclusion: "FULL",
      },
      {
        label: f(
          "Pour tous les Canaux : synchronisation du calendrier d'occupation afin d'éviter tout chevauchement",
        ),
        inclusion: "FULL",
      },
    ],
  },
  {
    title: f("Suivi financier et reporting"),
    lines: [
      {
        label: f(
          "Tenue du registre des dépenses engagées pour le compte du Propriétaire",
        ),
        inclusion: "FULL",
      },
      { label: f("Conservation des justificatifs"), inclusion: "FULL" },
      {
        label: f("État trimestriel du fonds d'exploitation (article 7.3)"),
        inclusion: "FULL",
      },
    ],
  },
];

/**
 * The seventeen articles, in French.
 *
 * Drawn from docs/contrat-property-management-heymann.md. Where the source
 * left a value in brackets and the preview has a field for it, it became a
 * token; the rest are written out as terms of this agreement.
 *
 * It departs from the source where the client's negotiation changed it: the
 * agency-information duty of article 6 and the priority clause 9.6 are gone,
 * 8.3 lets notice be given with invoices outstanding, 14 and 16.1 bind both
 * parties, and 16.2 keeps the tenants' welcome with BSTAY itself.
 */
export const ARTICLES_HEYMANN: Article[] = [
  {
    n: 1,
    title: f("Parties"),
    blocks: [
      { slot: "parties" },
      {
        text: f(
          "BSTAY et le Propriétaire sont ci-après désignés ensemble « les Parties » et individuellement « la Partie ».",
        ),
      },
    ],
  },
  {
    n: 2,
    title: f("Le Bien"),
    blocks: [
      {
        sub: f("2.1 Désignation"),
        text: f(
          "Le présent contrat porte sur le bien immobilier suivant, ci-après « le Bien », mis en location saisonnière par BSTAY, par le Propriétaire via des plateformes en ligne, ou par des agences tierces (article 9) :",
        ),
      },
      { slot: "property" },
      {
        sub: f("2.2 Déclarations du Propriétaire"),
        text: f(
          "Le Propriétaire déclare être propriétaire du Bien, ou disposer des pouvoirs nécessaires pour le confier en gestion à BSTAY, et garantit que le Bien n'est frappé d'aucune mesure ou procédure faisant obstacle à l'exécution du présent contrat, et que sa mise en location saisonnière est conforme à la réglementation applicable (déclaration en mairie, numéro d'enregistrement, règlement de copropriété, taxe de séjour). Lors de la première visite, BSTAY établit un rapport d'état initial du Bien, accompagné de photographies et d'un inventaire du mobilier et des équipements, qu'elle transmet au Propriétaire par courriel ; ce rapport fait foi de l'état du Bien à la prise d'effet du contrat, sauf observations écrites du Propriétaire dans les quinze (15) jours de sa réception. Lorsque le Bien est déjà géré par BSTAY au titre d'un contrat antérieur, le dernier rapport de visite ou état des lieux établi par BSTAY avant la prise d'effet du présent contrat, et dont le Propriétaire reconnaît avoir reçu copie, tient lieu de rapport d'état initial.",
        ),
      },
    ],
  },
  {
    n: 3,
    title: f("Objet du contrat et définitions"),
    blocks: [
      {
        sub: f("3.1 Objet"),
        text: f(
          "Le Propriétaire confie à BSTAY, qui accepte, la mission de veille, de coordination et de conciergerie locative du Bien, selon le forfait {{tier}} dont le périmètre est fixé à l'article 4.",
        ),
      },
      {
        sub: f("3.2 Qualité de BSTAY"),
        text: f(
          "BSTAY agit en qualité de mandataire, de coordinateur et de concierge opérationnel pour le compte du Propriétaire. Elle organise, planifie et suit les interventions des prestataires nécessaires à la bonne tenue du Bien et au bon déroulement des séjours, sans réaliser elle-même de travaux. Le présent contrat ne confère à BSTAY aucun mandat de location, de vente ou de représentation en assemblée de copropriété ; la commercialisation locative du Bien par BSTAY relève exclusivement du mandat de location saisonnière distinct visé à l'article 9.1. La gestion par BSTAY des réservations issues des plateformes en ligne du Propriétaire (article 9.2) est une prestation de services opérationnelle, rémunérée par le forfait de l'article 7.1 indépendamment de toute location, sans commission ni encaissement de fonds par BSTAY.",
        ),
      },
      {
        sub: f("3.3 Définitions"),
        intro: f("Au sens du présent contrat :"),
        // A list within 3.3, not four more sub-clauses: numbered 1 to 4.
        numberedFromOne: true,
        items: [
          f(
            "« Location BSTAY » désigne une location du Bien commercialisée et contractualisée par BSTAY au nom et pour le compte du Propriétaire, dans le cadre du mandat de location saisonnière visé à l'article 9.1 ;",
          ),
          f(
            "« Location Propriétaire » désigne une location du Bien commercialisée par le Propriétaire lui-même, notamment par l'intermédiaire de plateformes de réservation en ligne (ci-après « la Plateforme »), le Propriétaire étant seul cocontractant du Locataire et titulaire du compte Plateforme, BSTAY gérant les réservations et les prestations opérationnelles dans les conditions de l'article 9.2 ;",
          ),
          f(
            "« Location via Agence » désigne une location du Bien commercialisée et contractualisée par une agence immobilière tierce (ci-après « l'Agence ») mandatée par le Propriétaire, BSTAY n'intervenant alors que pour les prestations opérationnelles de l'article 4 ;",
          ),
          f(
            "« Canal de location » désigne indifféremment l'un des trois modes ci-dessus ;",
          ),
          f(
            "« Locataire » désigne toute personne occupant le Bien au titre d'un Canal de location, ainsi que ses accompagnants ;",
          ),
          f(
            "« Séjour » désigne la période d'occupation du Bien par un Locataire, de son arrivée à son départ.",
          ),
        ],
      },
    ],
  },
  {
    n: 4,
    title: f("Prestations incluses et exclues"),
    blocks: [
      {
        sub: f("4.1 Prestations incluses dans le forfait {{tier}}"),
        text: f(
          "Les prestations suivantes constituent le périmètre limitatif du forfait {{tier}} :",
        ),
      },
      { slot: "services" },
      {
        text: f(
          "Dans le cadre du forfait {{tier}}, la visite régulière du Bien est assurée deux (2) fois par mois hors Séjour, et la gestion opérationnelle des Séjours est assurée sans limitation de nombre d'arrivées et de départs. Les prestations ci-dessus sont fournies dans la limite d'un usage normal correspondant à l'exploitation locative habituelle du Bien ; lorsque le volume ou la fréquence des demandes excède manifestement cet usage, BSTAY en informe le Propriétaire et les demandes excédentaires sont traitées selon l'article 7.2.",
        ),
      },
      {
        sub: f("4.2 Prestations exclues"),
        text: f(
          "Ne relèvent pas du forfait {{tier}}, et font l'objet d'une demande distincte soumise à devis, accord écrit préalable et facturation séparée : la maîtrise d'œuvre et le suivi de travaux de rénovation ou d'aménagement ; la gestion des sinistres au-delà de la déclaration initiale et de la mise en sécurité ; la commercialisation locative, la rédaction des contrats de location, l'encaissement des loyers et la gestion des dépôts de garantie, qui relèvent du mandat de location saisonnière (article 9.1), du Propriétaire (article 9.2) ou de l'Agence (article 9.3) ; la création et la rédaction initiale des annonces, la politique tarifaire et la stratégie de commercialisation sur les Plateformes, qui demeurent décidées par le Propriétaire, BSTAY pouvant formuler des recommandations ; les démarches administratives, fiscales ou juridiques, y compris la déclaration et le reversement de la taxe de séjour lorsqu'ils n'incombent pas à BSTAY au titre du mandat de location ; la représentation du Propriétaire auprès du syndic ou en assemblée générale ; les services de conciergerie personnelle au bénéfice des Locataires (article 9.4).",
        ),
      },
      {
        sub: f("4.3 Prestataires tiers"),
        text: f(
          "Les prestations d'entretien récurrent (ménage, blanchisserie, jardinage, entretien de piscine, petite maintenance) et toute intervention technique sont réalisées par des prestataires tiers et facturées directement au Propriétaire, réglées sur le fonds d'exploitation ou refacturées à prix coûtant selon l'article 7.3. BSTAY coordonne ces prestataires mais n'en est ni l'employeur ni le sous-traitant.",
        ),
      },
    ],
  },
  {
    n: 5,
    title: f("Étendue du mandat et engagement de dépenses"),
    blocks: [
      {
        sub: f("5.1 Pouvoirs de BSTAY"),
        text: f(
          "Le Propriétaire donne mandat à BSTAY, au nom et pour le compte du Propriétaire, de solliciter des devis, de commander les interventions nécessaires à la conservation, à l'entretien courant du Bien et au bon déroulement des Séjours, et d'en assurer le suivi. Les contrats et commandes passés auprès des prestataires le sont au nom et pour le compte du Propriétaire, qui en demeure seul débiteur. Lorsque la bonne gestion opérationnelle l'exige, BSTAY peut contracter en son nom propre pour le compte du Propriétaire, qui s'engage à la garantir de toute somme ainsi engagée.",
        ),
      },
      {
        sub: f("5.2 Seuils d'engagement"),
        text: f(
          "BSTAY peut engager sans accord préalable toute dépense de gestion courante n'excédant pas {{threshold}} HT par intervention. Au-delà, toute dépense requiert l'accord écrit préalable du Propriétaire (courriel suffisant) sur la base d'un devis. Le Propriétaire s'engage à répondre à toute demande d'accord dans un délai de cinq (5) jours ouvrés, ramené à vingt-quatre (24) heures lorsque la dépense conditionne le bon déroulement d'un Séjour en cours ou imminent ; à défaut de réponse, BSTAY est réputée autorisée à ne pas engager la dépense et ne saurait être tenue responsable des conséquences de ce report, y compris à l'égard du Locataire.",
        ),
      },
      {
        sub: f("5.3 Urgences"),
        text: f(
          "En cas d'urgence menaçant la sécurité des personnes ou l'intégrité du Bien (fuite, effraction, incendie, panne de chauffage en période de gel, panne rendant le Bien inhabitable pendant un Séjour), BSTAY peut engager sans accord préalable les mesures conservatoires strictement nécessaires, dans la limite de {{emergency}} HT, à charge d'en informer le Propriétaire sans délai.",
        ),
      },
      {
        sub: f("5.4 Abonnements et services récurrents"),
        text: f(
          "Sur demande ou avec l'accord préalable du Propriétaire, BSTAY peut mettre en place et suivre, au nom du Propriétaire, les abonnements nécessaires à l'exploitation du Bien (électricité, eau, internet, télésurveillance, etc.) et en faciliter le règlement sur le fonds d'exploitation. Ces abonnements demeurent sous la seule responsabilité du Propriétaire, qui en est le titulaire.",
        ),
      },
      {
        sub: f("5.5 Compte rendu"),
        text: f(
          "BSTAY tient le Propriétaire informé des Séjours, des interventions réalisées et des dépenses engagées, et lui adresse trimestriellement l'état du fonds d'exploitation prévu à l'article 7.3.",
        ),
      },
    ],
  },
  {
    n: 6,
    title: f("Obligations du Propriétaire"),
    blocks: [
      {
        intro: f("Le Propriétaire s'engage à :"),
        items: [
          f(
            "remettre à BSTAY, à la signature, deux (2) jeux complets de clés, badges, télécommandes et codes d'accès, contre récépissé, et l'informer de tout changement ;",
          ),
          f(
            "communiquer à BSTAY toute information utile sur le Bien : plans, notices et contrats des équipements, coordonnées des prestataires en place, règlement de copropriété le cas échéant, contraintes d'accès, règles d'occupation à faire respecter par les Locataires ;",
          ),
          f(
            "maintenir le Bien en conformité avec la réglementation applicable à la location saisonnière (sécurité électrique et gaz, sécurité des piscines, détecteurs de fumée, déclaration et numéro d'enregistrement, affichages obligatoires) et en informer BSTAY ;",
          ),
          f(
            "souscrire et maintenir pendant toute la durée du contrat une assurance multirisque habitation couvrant le Bien, son contenu et la responsabilité civile du Propriétaire, étendue à la location saisonnière et aux périodes d'inoccupation, et en justifier à première demande ;",
          ),
          f(
            "constituer et reconstituer le fonds d'exploitation dans les conditions de l'article 7.3 ;",
          ),
          f(
            "fournir à BSTAY, à la signature, et maintenir pendant toute la durée du contrat un accès à chacun de ses comptes Plateforme permettant la gestion des réservations (statut de co-hôte ou équivalent, ou identifiants dédiés), l'informer de toute modification des paramètres de l'annonce ou des conditions de location, et l'informer au moins cinq (5) jours à l'avance de toute occupation du Bien qu'il organise lui-même, afin que BSTAY puisse bloquer le calendrier et préparer le Bien ;",
          ),
          f(
            "informer BSTAY de l'identité et des coordonnées de toute Agence mandatée pour la location du Bien, et de toute modification ;",
          ),
          f(
            "désigner un interlocuteur unique habilité à donner des instructions et des accords au nom du Propriétaire ;",
          ),
          f(
            "répondre aux demandes d'accord de BSTAY dans les délais de l'article 5.2 ;",
          ),
          f(
            "régler les honoraires et les frais dans les conditions de l'article 7 ;",
          ),
          f(
            "ne pas donner d'instructions directes aux prestataires mandatés par BSTAY sans l'en informer, afin de préserver la cohérence du suivi.",
          ),
        ],
      },
    ],
  },
  {
    n: 7,
    title: f("Honoraires, frais et paiement"),
    blocks: [
      {
        sub: f("7.1 Forfait"),
        text: f(
          "En contrepartie des prestations de l'article 4.1, le Propriétaire verse à BSTAY un forfait mensuel de {{fee}} HT (TVA au taux en vigueur, actuellement 20 %). Le forfait couvre l'intégralité des prestations incluses, sans décompte horaire ni décompte du nombre de Séjours, et est dû quelle que soit l'occupation du Bien. Le présent contrat prend effet le {{startDate}} ; le premier trimestre est facturé au prorata.",
        ),
      },
      { slot: "fees" },
      {
        sub: f("7.2 Prestations hors forfait"),
        text: f(
          "Les prestations exclues de l'article 4.2 et les demandes excédentaires visées à l'article 4.1 sont facturées uniquement sur devis accepté.",
        ),
      },
      {
        sub: f("7.3 Fonds d'exploitation"),
        text: f(
          "Afin de permettre le règlement des dépenses courantes d'exploitation du Bien (prestataires, consommables, petites interventions, abonnements, urgences), le Propriétaire constitue auprès de BSTAY, à la signature, un fonds d'exploitation d'un montant de {{provision}}. Ce fonds appartient au Propriétaire ; il est conservé par BSTAY sur un compte dédié, distinct de ses fonds propres, dans le respect de sa garantie financière, et ne peut être affecté qu'aux dépenses engagées pour le compte du Propriétaire dans les conditions de l'article 5. Lorsque le solde du fonds atteint ou devient inférieur à {{fundThreshold}}, BSTAY en informe le Propriétaire, qui le reconstitue à son montant initial dans un délai de sept (7) jours ouvrés. BSTAY adresse trimestriellement au Propriétaire un état des dépenses réglées sur le fonds, du solde disponible et des justificatifs correspondants.",
        ),
      },
      {
        sub: f("7.4 Facturation et paiement"),
        text: f(
          "Le forfait est facturé trimestriellement, d'avance, le premier jour de chaque trimestre civil, pour un montant égal à trois (3) mensualités, la première facture étant émise à la date de démarrage pour la fraction du trimestre en cours. Les factures sont payables à sept (7) jours à compter de leur date d'émission, par virement bancaire sur le compte indiqué sur la facture, les éventuels frais bancaires restant à la charge du Propriétaire. Aucun escompte n'est accordé pour paiement anticipé.",
        ),
      },
      {
        sub: f("7.5 Retard de paiement"),
        text: f(
          "Toute somme non réglée à l'échéance porte de plein droit, sans mise en demeure préalable, des pénalités de retard au taux de trois fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € par facture, conformément aux articles L441-10 et D441-5 du Code de commerce, sans préjudice d'une indemnisation complémentaire sur justificatif. En cas de retard de paiement ou de défaut de reconstitution du fonds d'exploitation supérieur à trente (30) jours, BSTAY peut suspendre tout ou partie de ses prestations après notification écrite, y compris les prestations liées aux Séjours à venir, sans que cette suspension puisse lui être reprochée.",
        ),
      },
      {
        sub: f("7.6 Révision"),
        text: f(
          "Le forfait est révisé à chaque date anniversaire du contrat selon la variation de l'indice SYNTEC publié par la Fédération Syntec, selon la formule : P1 = P0 × (S1 / S0), où P0 est le forfait en vigueur, S0 le dernier indice publié à la date de signature (ou de la précédente révision) et S1 le dernier indice publié à la date de révision. En cas de disparition de l'indice, les Parties lui substituent l'indice de remplacement officiel ou, à défaut, l'indice le plus proche. BSTAY notifie le nouveau montant au Propriétaire au moins trois (3) mois avant l'échéance annuelle.",
        ),
      },
    ],
  },
  {
    n: 8,
    title: f("Durée, renouvellement, résiliation"),
    blocks: [
      {
        sub: f("8.1 Durée"),
        text: f(
          "Le présent contrat est conclu pour une durée de douze (12) mois à compter de sa signature. Il se renouvelle ensuite par tacite reconduction pour des périodes successives de douze (12) mois, sauf résiliation dans les conditions ci-dessous.",
        ),
      },
      {
        sub: f("8.2 Préavis"),
        text: f(
          "Chaque Partie peut résilier le contrat par notification écrite (lettre recommandée avec accusé de réception ou courriel avec accusé de lecture), moyennant un préavis de deux (2) mois courant à compter de la réception de la notification. Pendant le préavis, le contrat se poursuit dans les mêmes conditions.",
        ),
      },
      {
        sub: f("8.3 Conditions de la résiliation par le Propriétaire"),
        text: f(
          "La résiliation à l'initiative du Propriétaire peut être notifiée à tout moment, y compris lorsque des factures émises n'ont pas encore été réglées, dès lors qu'à la date de la notification aucun prestataire tiers mandaté par BSTAY pour le compte du Propriétaire n'est engagé sur une mission en cours (travaux, rénovation, sinistre, aménagement, etc.). Les factures émises à la date de la notification, ainsi que celles émises pendant le préavis, doivent être intégralement réglées au plus tard au terme du préavis. Ne sont pas considérées comme des missions en cours au sens du présent article les prestations récurrentes d'entretien courant (ménage, blanchisserie, jardinage, entretien de piscine, petite maintenance, etc.) ni la gestion opérationnelle des Séjours, lesquelles prennent fin au terme du préavis. BSTAY communique au Propriétaire, sur simple demande, l'état des missions en cours.",
        ),
      },
      {
        sub: f("8.4 Séjours et missions se poursuivant au-delà du préavis"),
        text: f(
          "Les Séjours dont l'arrivée est postérieure au terme du préavis ne sont pas pris en charge par BSTAY, sauf accord écrit entre les Parties. Si une mission confiée à BSTAY avant le terme du contrat devait se poursuivre au-delà de l'expiration du préavis, le Propriétaire choisit, au plus tard quinze (15) jours avant ce terme, entre : (a) le maintien du suivi par BSTAY jusqu'à l'achèvement de la mission, moyennant le paiement du forfait mensuel au prorata temporis de la durée restante ; ou (b) la signature d'une décharge constatant l'état d'avancement de la mission à la date du terme, par laquelle BSTAY est libérée de toute obligation de suivi et de toute responsabilité relative à la poursuite de ladite mission. À défaut de choix exprimé dans ce délai, l'option (a) s'applique.",
        ),
      },
      {
        sub: f("8.5 Résiliation pour manquement"),
        text: f(
          "En cas de manquement grave de l'une des Parties à ses obligations, notamment le défaut de paiement d'une facture trimestrielle ou de reconstitution du fonds d'exploitation plus de trente (30) jours après son échéance, le refus répété d'accès au Bien, la mise en location du Bien dans des conditions non conformes à la réglementation ou tout comportement rendant la poursuite de la mission impossible, l'autre Partie peut résilier le contrat de plein droit, quinze (15) jours après une mise en demeure par lettre recommandée avec accusé de réception restée sans effet, sans préjudice de tous dommages et intérêts. Les honoraires restent dus jusqu'à la date effective de résiliation.",
        ),
      },
      {
        sub: f("8.6 Fin du contrat"),
        text: f(
          "Au terme du préavis, BSTAY remet au Propriétaire les clés, documents et codes d'accès contre récépissé, et établit un décompte final. Le solde du fonds d'exploitation est restitué au Propriétaire dans un délai maximum d'un (1) mois suivant le terme du préavis, après déduction des sommes dues aux prestataires et des prestations en cours, accompagné d'un état financier détaillé.",
        ),
      },
    ],
  },
  {
    n: 9,
    title: f("Location du Bien : rôle de BSTAY, Agences tierces, Locataires"),
    blocks: [
      {
        sub: f("9.1 Location BSTAY"),
        text: f(
          "BSTAY peut, le cas échéant, louer directement le Bien à ses propres clients, exclusivement dans le cadre et aux conditions du mandat de location saisonnière distinct conclu avec le Propriétaire, conforme à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972 et enregistré au registre des mandats de BSTAY. Ce mandat régit seul la commercialisation, la conclusion des contrats de location, l'encaissement des loyers, la gestion des dépôts de garantie et la rémunération de BSTAY à ce titre. Pour les Locations BSTAY, les prestations opérationnelles de l'article 4 sont fournies au titre du présent contrat et couvertes par le forfait de l'article 7.1, sans cumul avec la rémunération du mandat de location. Le présent article ne vaut pas mandat de location.",
        ),
      },
      {
        sub: f("9.2 Location Propriétaire (Plateformes)"),
        text: f(
          "Lorsque le Propriétaire commercialise lui-même le Bien sur une ou plusieurs Plateformes, BSTAY gère les réservations et les Séjours correspondants au titre du présent contrat, au nom et pour le compte du Propriétaire, depuis le compte Plateforme du Propriétaire et avec l'accès fourni par celui-ci (article 6). Cette prestation est couverte par le forfait de l'article 7.1, qui est dû qu'il y ait ou non des locations ; BSTAY ne perçoit aucune commission sur les locations ainsi réalisées et n'encaisse aucun fonds. En conséquence : (a) le Propriétaire demeure seul titulaire de l'annonce et du compte Plateforme, seul hôte au sens des conditions de la Plateforme et seul cocontractant du Locataire ; il encaisse directement les sommes versées par la Plateforme et fait son affaire de la taxe de séjour collectée ou non par celle-ci, de la conformité de l'annonce et de ses obligations déclaratives ; (b) BSTAY agit dans les limites des consignes écrites du Propriétaire (tarifs, durées minimales, conditions d'accueil, profils acceptés) ; (c) BSTAY n'est pas responsable des décisions, suspensions, modifications de conditions ou défaillances de la Plateforme, ni des conséquences d'une description du Bien inexacte ou d'un paramétrage de l'annonce non conforme aux consignes données ; (d) le Propriétaire garantit BSTAY contre toute réclamation de la Plateforme ou d'un Locataire fondée sur le contrat de location, l'annonce ou l'encaissement.",
        ),
      },
      {
        sub: f("9.3 Location via Agence"),
        text: f(
          "Lorsque le Bien est loué par l'intermédiaire d'une Agence mandatée par le Propriétaire, BSTAY intervient exclusivement pour le compte du Propriétaire, en qualité de concierge et de coordinateur opérationnel, et n'agit à aucun moment comme agent de location, mandataire ou préposé de l'Agence. En conséquence : (a) la commercialisation, le contrat de location, l'encaissement des loyers, le dépôt de garantie, la taxe de séjour et les relations contractuelles avec le Locataire relèvent de l'Agence et du Propriétaire ; (b) BSTAY remet à l'Agence, contre récépissé, les clés et accès nécessaires aux Séjours, dans les conditions de l'article 11.2, l'Agence en étant responsable jusqu'à leur restitution ; (c) BSTAY n'est pas responsable des défaillances de l'Agence, de ses engagements envers le Locataire, ni des informations erronées ou tardives qu'elle lui communique ; (d) le Propriétaire fait son affaire de l'articulation entre le mandat confié à l'Agence et le présent contrat, et garantit BSTAY contre toute réclamation de l'Agence à ce titre.",
        ),
      },
      {
        sub: f("9.4 Prestations complémentaires aux Locataires"),
        text: f(
          "À la demande d'un Locataire, quel que soit le Canal de location, BSTAY peut lui fournir des prestations de conciergerie personnelle (réservations, transport et chauffeur, services bien-être et hospitalité, expériences sur mesure, approvisionnement, personnel de maison). Ces prestations ne relèvent pas du présent contrat : elles font l'objet d'une tarification distincte, d'un accord préalable du Locataire et d'une facturation directe par BSTAY au Locataire, sans que le Propriétaire en soit redevable ni n'y soit intéressé. Le Propriétaire autorise BSTAY à proposer ces prestations aux Locataires du Bien.",
        ),
      },
      {
        sub: f("9.5 Dommages causés par les Locataires"),
        text: f(
          "BSTAY signale au Propriétaire et, le cas échéant, à l'Agence, tout dommage constaté au départ d'un Locataire, avec photographies, dans les vingt-quatre (24) heures suivant le contrôle du Bien. Pour les Locations Propriétaire, BSTAY effectue, depuis le compte Plateforme du Propriétaire et dans les délais imposés par la Plateforme, la déclaration du dommage et la demande d'indemnisation auprès de la Plateforme ou du Locataire (garantie hôte, retenue sur dépôt de garantie), sur la base de son constat et des justificatifs de valeur que le Propriétaire s'engage à lui fournir sans délai ; les sommes obtenues sont versées au Propriétaire, et BSTAY ne garantit pas l'issue de la réclamation, qui dépend de la Plateforme. Pour les Locations BSTAY, la réclamation relève du mandat de location saisonnière ; pour les Locations via Agence, elle relève de l'Agence et du Propriétaire, BSTAY y apportant son concours sur demande. BSTAY ne répond pas des dommages, vols, dégradations ou nuisances causés par les Locataires ou leurs accompagnants.",
        ),
      },
    ],
  },
  {
    n: 10,
    title: f("Responsabilité et assurances"),
    blocks: [
      {
        sub: f("10.1 Nature des obligations"),
        text: f(
          "BSTAY est tenue d'une obligation de moyens dans l'exécution de sa mission de coordination, de suivi et de conciergerie locative. Elle exécute ses prestations avec diligence, discrétion et dans les règles de l'art de la profession.",
        ),
      },
      {
        sub: f("10.2 Prestataires tiers, Agences et Locataires"),
        text: f(
          "Les prestataires tiers et les Agences interviennent de manière indépendante, sous leur propre responsabilité et leurs propres assurances. BSTAY ne répond pas des retards, défauts, malfaçons ou dommages imputables à un prestataire tiers, à une Agence ou à un Locataire. La responsabilité de BSTAY ne peut être engagée qu'en cas de manquement prouvé à son obligation de moyens définie à l'article 10.1, dans les limites de l'article 10.3. BSTAY assiste le Propriétaire, à sa demande, dans ses réclamations contre le prestataire, l'Agence ou le Locataire défaillant.",
        ),
      },
      {
        sub: f("10.3 Plafond"),
        text: f(
          "Sauf faute lourde, dol ou dommage corporel, la responsabilité de BSTAY au titre du présent contrat est limitée, toutes causes confondues, au montant total des honoraires hors taxes perçus au cours des douze (12) mois précédant le fait générateur. BSTAY ne répond pas des dommages indirects, notamment perte de jouissance, perte de revenus locatifs, annulation de réservations, avis ou notations défavorables des Locataires ou préjudice d'image.",
        ),
      },
      {
        sub: f("10.4 Exclusions"),
        text: f(
          "BSTAY n'est pas responsable des dommages résultant : d'un vice ou d'une vétusté préexistants du Bien ou de ses équipements ; d'instructions du Propriétaire ou de l'Agence contraires aux recommandations écrites de BSTAY ; d'un refus ou d'un retard d'accord du Propriétaire ; d'un défaut d'assurance du Propriétaire ; d'informations relatives à un Séjour transmises tardivement ou de manière erronée par le Propriétaire ou l'Agence, quel que soit le Canal de location ; d'une occupation du Bien organisée par le Propriétaire sans en avoir informé BSTAY dans le délai de l'article 6 ; d'une interruption ou d'une restriction de l'accès de BSTAY au compte Plateforme ; de la non-conformité du Bien à la réglementation de la location saisonnière ; d'un événement survenu entre deux visites ou pendant un Séjour et qui ne pouvait raisonnablement être détecté ni prévenu.",
        ),
      },
      {
        sub: f("10.5 Assurances"),
        text: f(
          "BSTAY déclare être titulaire d'une assurance responsabilité civile professionnelle auprès de Generali (police n° AL591311/31961) et d'une garantie financière CEGC (n° 31961GES261), dont elle justifie à première demande. Le Propriétaire maintient l'assurance visée à l'article 6.4 et déclare tout sinistre à son assureur ; BSTAY lui apporte son concours pour la déclaration et les constats.",
        ),
      },
    ],
  },
  {
    n: 11,
    title: f("Clés et accès"),
    blocks: [
      {
        sub: f("11.1 Remise et conservation"),
        text: f(
          "Les clés, badges, télécommandes et codes remis à BSTAY font l'objet d'un récépissé établi par BSTAY et transmis au Propriétaire, qui en détaille le nombre et la nature. BSTAY les conserve dans un lieu sécurisé, sous un code anonyme ne permettant pas d'identifier le Bien.",
        ),
      },
      {
        sub: f("11.2 Remise aux Agences et aux Locataires"),
        text: f(
          "Dans le cadre d'une Location via Agence, BSTAY remet à l'Agence, contre récépissé daté et signé, le jeu de clés et les accès nécessaires au Séjour, et les récupère contre récépissé au retour ; l'Agence en est seule responsable entre ces deux remises. Dans le cadre d'une Location BSTAY ou d'une Location Propriétaire, BSTAY remet les clés au Locataire à l'arrivée et les récupère au départ, sans remise à un tiers. Les codes d'accès communiqués aux Agences ou aux Locataires peuvent être modifiés à l'issue de chaque Séjour avec l'accord du Propriétaire.",
        ),
      },
      {
        sub: f("11.3 Perte ou vol"),
        text: f(
          "En cas de perte ou de vol d'une clé confiée à BSTAY, celle-ci en informe le Propriétaire sans délai et prend en charge le remplacement des cylindres concernés et des clés correspondantes, dans la limite du plafond de l'article 10.3, sauf si la perte est imputable au Propriétaire, à ses occupants, à une Agence, à un Locataire ou à un prestataire non mandaté par BSTAY.",
        ),
      },
      {
        sub: f("11.4 Restitution"),
        text: f(
          "À la fin du contrat, l'intégralité des clés et supports d'accès détenus par BSTAY est restituée contre récépissé, conformément à l'article 8.6.",
        ),
      },
    ],
  },
  {
    n: 12,
    title: f("Confidentialité"),
    blocks: [
      {
        sub: f("12.1 Informations confidentielles"),
        text: f(
          "Chaque Partie s'engage à tenir strictement confidentielles les informations de toute nature dont elle a connaissance à l'occasion du présent contrat, notamment, pour BSTAY, l'identité du Propriétaire et de ses proches, la localisation et la description du Bien, ses accès, son calendrier d'occupation, l'identité des Locataires, les identifiants et accès aux comptes Plateforme, ses biens mobiliers et ses systèmes de sécurité ; et, pour le Propriétaire, les méthodes, tarifs, outils, clientèle et réseau de prestataires de BSTAY.",
        ),
      },
      {
        sub: f("12.2 Exceptions"),
        text: f(
          "L'obligation de confidentialité ne s'applique pas aux informations tombées dans le domaine public sans faute de la Partie concernée, ni à celles dont la communication est exigée par la loi, une autorité administrative ou une décision de justice, ni à celles strictement nécessaires à l'exécution du contrat par les prestataires et les Agences, eux-mêmes tenus à la confidentialité.",
        ),
      },
      {
        sub: f("12.3 Durée et sanctions"),
        text: f(
          "Cette obligation subsiste pendant toute la durée du contrat et cinq (5) ans après son terme ; les informations relatives à la sécurité du Bien et à l'identité du Propriétaire restent confidentielles sans limitation de durée. BSTAY impose à ses salariés et prestataires une obligation équivalente. Aucune communication publique (réseaux sociaux, références commerciales, photographies) ne mentionne le Propriétaire ou le Bien sans son accord écrit préalable, à l'exception des supports de commercialisation prévus par le mandat de location saisonnière.",
        ),
      },
    ],
  },
  {
    n: 13,
    title: f("Données personnelles"),
    blocks: [
      {
        text: f(
          "BSTAY traite, en qualité de responsable de traitement, les données personnelles du Propriétaire, de ses représentants, des Locataires et de leurs accompagnants, aux seules fins de l'exécution du présent contrat, de la gestion des Séjours, de la facturation et du respect de ses obligations légales, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi n° 78-17 du 6 janvier 1978. Les données des Locataires transmises par une Agence ou accessibles via le compte Plateforme du Propriétaire le sont sous la responsabilité de l'Agence ou du Propriétaire, qui garantissent avoir informé les personnes concernées ; BSTAY n'extrait ni ne conserve ces données au-delà de ce qu'exige la gestion du Séjour. Ces données sont conservées pendant la durée du contrat puis archivées pendant la durée des prescriptions légales applicables. Elles ne sont communiquées qu'aux prestataires et Agences dans la mesure nécessaire à leur intervention, et ne font l'objet d'aucun transfert hors de l'Union européenne sans garanties appropriées. Les personnes concernées disposent d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, qu'elles exercent auprès de BSTAY à l'adresse {{gdprEmail}}, et peuvent saisir la CNIL en cas de réclamation.",
        ),
      },
    ],
  },
  {
    n: 14,
    title: f("Non-sollicitation"),
    blocks: [
      {
        text: f(
          "Pendant toute la durée du contrat et pendant les douze (12) mois suivant son terme, chaque Partie s'interdit, directement ou par personne interposée, d'embaucher ou de faire travailler pour son compte, hors de l'intermédiation de l'autre Partie, tout salarié de l'autre Partie ou tout prestataire que celle-ci lui a présenté dans le cadre du présent contrat, sauf accord écrit préalable de cette dernière. Le Propriétaire s'interdit ainsi de solliciter les salariés de BSTAY et les prestataires qu'elle lui a présentés ; BSTAY s'interdit de même de solliciter le personnel de maison et les salariés du Propriétaire, ainsi que les prestataires que celui-ci lui a présentés. Cette interdiction ne s'applique pas aux personnes avec lesquelles la Partie concernée travaillait déjà avant la signature du contrat. Tout manquement donne lieu au versement, par la Partie qui en est l'auteur, d'une indemnité forfaitaire égale à trois (3) mois de forfait par personne concernée, sans préjudice de la réparation du préjudice réel.",
        ),
      },
    ],
  },
  {
    n: 15,
    title: f("Force majeure"),
    blocks: [
      {
        text: f(
          "Aucune des Parties ne sera tenue responsable d'un manquement à ses obligations résultant d'un événement de force majeure au sens de l'article 1218 du Code civil, notamment catastrophe naturelle, incendie, inondation, épidémie, décision administrative, grève générale ou défaillance prolongée des réseaux. La Partie empêchée en informe l'autre sans délai. Les obligations affectées sont suspendues pendant la durée de l'événement ; si celui-ci excède soixante (60) jours, chaque Partie peut résilier le contrat par notification écrite, sans indemnité. Les honoraires restent dus au prorata des prestations effectivement rendues.",
        ),
      },
    ],
  },
  {
    n: 16,
    title: f("Cession, sous-traitance, intégralité"),
    blocks: [
      {
        sub: f("16.1 Caractère personnel"),
        text: f(
          "Le présent contrat est conclu en considération de la personne de chacune des Parties et du Bien. Il ne peut être cédé par l'une des Parties sans l'accord écrit préalable de l'autre. En cas de vente du Bien, le contrat prend fin à la date du transfert de propriété, sous réserve du préavis de l'article 8.2 ; à défaut de respect de ce préavis, les honoraires correspondant à la période de préavis restante demeurent dus. De la même manière, en cas de vente de BSTAY (cession de son fonds de commerce ou changement de contrôle de la société), le contrat prend fin à la date de l'opération, sous réserve du préavis de l'article 8.2 que BSTAY notifie au Propriétaire ; les honoraires réglés d'avance pour une période postérieure à cette date sont restitués au Propriétaire au prorata, et l'article 8.6 s'applique.",
        ),
      },
      {
        sub: f("16.2 Sous-traitance"),
        text: f(
          "BSTAY peut confier à des prestataires tiers l'exécution matérielle des interventions et des prestations liées aux Séjours, dans les conditions des articles 4.3 et 10.2. L'accueil des Locataires (arrivée, remise des clés et présentation du Bien) ne peut toutefois être sous-traité : il est assuré par BSTAY elle-même. Elle reste l'interlocuteur unique du Propriétaire pour la coordination.",
        ),
      },
      {
        sub: f("16.3 Intégralité et modifications"),
        text: f(
          "Le présent contrat exprime l'intégralité de l'accord des Parties sur son objet et remplace tout échange antérieur. Il s'applique sans préjudice du mandat de location saisonnière visé à l'article 9.1, qui régit seul la commercialisation locative du Bien ; en cas de contradiction entre les deux, le mandat prévaut pour les questions de location et le présent contrat pour les prestations opérationnelles. Les récépissés, rapports et devis acceptés échangés en cours d'exécution complètent le contrat sans le modifier. Toute modification fait l'objet d'un avenant écrit signé des deux Parties.",
        ),
      },
      {
        sub: f("16.4 Nullité partielle et tolérance"),
        text: f(
          "Si une stipulation du présent contrat est déclarée nulle ou inapplicable, les autres conservent leur plein effet et les Parties s'engagent à y substituer une stipulation valide d'effet équivalent. Le fait pour une Partie de ne pas se prévaloir d'un manquement de l'autre ne vaut pas renonciation à s'en prévaloir ultérieurement.",
        ),
      },
      {
        sub: f("16.5 Notifications"),
        text: f(
          "Les notifications prévues au présent contrat sont valablement faites aux adresses postales et électroniques indiquées à l'article 1, ou à toute autre adresse notifiée par écrit. Les Parties conviennent que le courriel avec accusé de lecture vaut écrit pour les besoins du présent contrat, hors mise en demeure et résiliation pour manquement qui requièrent une lettre recommandée avec accusé de réception.",
        ),
      },
    ],
  },
  {
    n: 17,
    title: f("Loi applicable et juridiction"),
    blocks: [
      {
        sub: f("17.1 Loi applicable"),
        text: f(
          "Le présent contrat est rédigé en langue française et régi par le droit français. Une traduction en langue anglaise peut être fournie à titre d'information ; en cas de divergence, seule la version française fait foi.",
        ),
      },
      {
        sub: f("17.2 Règlement amiable"),
        text: f(
          "Les Parties s'efforcent de résoudre à l'amiable tout différend relatif à l'interprétation ou à l'exécution du présent contrat, dans un délai de trente (30) jours à compter de la notification écrite du différend par la Partie la plus diligente.",
        ),
      },
      {
        sub: f("17.3 Attribution de juridiction"),
        text: f(
          "À défaut d'accord amiable, tout litige relatif à la formation, l'interprétation, l'exécution ou la résiliation du présent contrat sera soumis à la compétence exclusive du Tribunal de commerce de Cannes, nonobstant pluralité de défendeurs ou appel en garantie, y compris pour les procédures d'urgence ou conservatoires.",
        ),
        veryVisible: true,
      },
    ],
  },
];
