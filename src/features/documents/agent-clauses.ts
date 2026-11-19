import type { Bilingual } from "@/features/documents/concierge-packages";

/**
 * The commercial agent agreement, article by article.
 *
 * Held as data and not as JSX, for the reason the Property Management clauses
 * are: this text is revised by lawyers, who should be able to find a clause
 * without reading a component.
 *
 * Both languages are the agency's own, carried over verbatim from
 * docs/BSTAY_Contrat_agent_commercial_FR-EN_par_section.md. Unlike the other
 * documents the French leads here and the English follows it, article by
 * article: the language clause says the French alone binds and that the
 * translation "figure en italique à la suite du texte français de chaque
 * article", so the page has to be set the way the contract describes itself.
 *
 * ---- Placeholders ----
 *
 * What changes from one agent to the next is a `{{token}}`, filled by the
 * builder: who the agent is, when the agreement takes effect and is signed,
 * the phase and progression revenue they start from, and whether they are
 * already on the register. What is the agency's policy — the rates, the
 * thresholds, the penalty, the territory — is written out.
 *
 * BSTAY's own party paragraphs are written out too rather than assembled from
 * the agency record: they state things the record does not hold (the licence's
 * endorsements and expiry, the insurers' addresses, that no client funds are
 * held for transactions). When one of those changes, it changes here.
 */

/** A paragraph, a sub-heading, or a line set in bold. */
export type AgentTextBlock = {
  kind: "p" | "sub" | "strong";
  fr: string;
  en: string;
  /** A bold lead-in — "Préambule." — ahead of the paragraph. */
  lead?: Bilingual;
  /**
   * Printed only in that case. Absent means always.
   *
   * The source was drafted for an agent whose registration was still being
   * prepared, and says so in the parties. An agent who is already registered
   * must not sign a contract stating they are not.
   */
  onlyWhen?: "rsacPending" | "rsacRegistered";
};

/**
 * A table cell.
 *
 * The source writes its tables once for both languages — "1 Débutant /
 * Beginner" — so a cell is that line, and the part before the slash for a
 * contract set in French alone.
 */
export type AgentTableCell = { fr: string; bi: string };

export type AgentTableBlock = {
  kind: "table";
  head: AgentTableCell[];
  rows: AgentTableCell[][];
};

export type AgentBlock = AgentTextBlock | AgentTableBlock;

export type AgentArticle = {
  n: number;
  title: Bilingual;
  blocks: AgentBlock[];
};

export const isAgentTable = (b: AgentBlock): b is AgentTableBlock =>
  b.kind === "table";

/**
 * Which version binds. Dropped from a contract set in French alone: a clause
 * saying which of two versions prevails has nothing to say when there is one.
 */
export const AGENT_LANGUAGE_CLAUSE: AgentBlock[] = [
  {
    kind: "p",
    fr: "La traduction anglaise, qui figure en italique à la suite du texte français de chaque article, est fournie à titre informatif afin de permettre à l’Agent, qui ne maîtrise pas la langue française, de comprendre pleinement ses droits et obligations. En cas de divergence, de contradiction ou de difficulté d’interprétation entre les deux versions, la version française prévaut. L’Agent reconnaît avoir reçu la version anglaise avant la signature et avoir disposé du temps nécessaire pour en prendre connaissance et, s’il le souhaitait, consulter un conseil.",
    en: "The English translation, which appears in italics after the French text of each article, is provided for information only, so that the Agent, who does not speak French, can fully understand his rights and obligations. In the event of any discrepancy, contradiction or difficulty of interpretation between the two versions, the French version prevails. The Agent acknowledges that he received the English version before signing and had sufficient time to read it and, if he so wished, to seek advice.",
    lead: {
      fr: "Le présent contrat est établi en français et en anglais. Seule la version française fait foi.",
      en: "This agreement is drawn up in French and English. Only the French version is legally binding.",
    },
  },
];

/** BSTAY, then the agent, then the preamble. */
export const AGENT_PARTIES: AgentBlock[] = [
  {
    kind: "p",
    fr: "Bstay, société par actions simplifiée au capital social de 1 000 euros, immatriculée au Registre du commerce et des sociétés de Cannes sous le numéro 920 635 356, dont le siège social est situé 9 Rond-Point Duboys d’Angers, 06400 Cannes,",
    en: "Bstay, a simplified joint-stock company (société par actions simplifiée) with share capital of EUR 1,000, registered with the Cannes Trade and Companies Register under number 920 635 356, whose registered office is at 9 Rond-Point Duboys d’Angers, 06400 Cannes, France,",
  },
  {
    kind: "p",
    fr: "Titulaire de la carte professionnelle n° CPI83042026000000007, portant les mentions « Transaction sur immeubles et fonds de commerce » et « Gestion immobilière », initialement délivrée dans le Var puis transférée auprès de la Chambre de commerce et d’industrie de Nice avec conservation du numéro, et valable jusqu’au 29 mars 2029,",
    en: "Holder of professional licence (carte professionnelle) no. CPI83042026000000007, bearing the endorsements “Transactions in real estate and business assets” and “Property management”, originally issued in the Var department and then transferred to the Nice Chamber of Commerce and Industry with the same number, valid until 29 March 2029,",
  },
  {
    kind: "p",
    fr: "Bénéficiant, pour son activité de gestion immobilière, d’une garantie financière auprès de la Compagnie Européenne de Garanties et Cautions (CEGC), 59 avenue Pierre Mendès France, 75013 Paris, contrat n° 31961GES261, selon attestation en cours de validité communiquée à l’Agent et actualisée conformément à l’article 10 ; exerçant son activité de transaction sans réception ni détention de fonds clients,",
    en: "Holding, for its property management activity, a financial guarantee from Compagnie Européenne de Garanties et Cautions (CEGC), 59 avenue Pierre Mendès France, 75013 Paris, contract no. 31961GES261, as shown by a currently valid certificate provided to the Agent and updated in accordance with Article 10; carrying out its transaction activity without receiving or holding any client funds,",
  },
  {
    kind: "p",
    fr: "Assurée en responsabilité civile professionnelle auprès de GENERALI IARD, 2 rue Pillet-Will, 75009 Paris, police n° AL591311/31961, pour les activités de transaction sur immeubles et fonds de commerce et de gestion immobilière, selon attestation en cours de validité communiquée à l’Agent et renouvelée conformément à l’article 10,",
    en: "Insured for professional liability with GENERALI IARD, 2 rue Pillet-Will, 75009 Paris, policy no. AL591311/31961, for transactions in real estate and business assets and for property management, as shown by a currently valid certificate provided to the Agent and renewed in accordance with Article 10,",
  },
  {
    kind: "p",
    fr: "Représentée par Valentine Marie Charlotte CLAITTE, en sa qualité de Présidente,",
    en: "Represented by Valentine Marie Charlotte CLAITTE, in her capacity as President,",
  },
  {
    kind: "p",
    fr: "Ci-après dénommée « BSTAY » ou « la Société »,",
    en: "Hereinafter referred to as “BSTAY” or “the Company”,",
  },
  {
    kind: "p",
    fr: "Et {{civility}} {{agentName}}, {{born}} le {{birthDate}} à {{birthPlace}}, {{domiciled}} {{address}}, souhaitant exercer la mission en qualité d’entrepreneur individuel, {{rsacStatus}},",
    en: "And {{civility}} {{agentName}}, born on {{birthDate}} in {{birthPlace}}, residing {{address}}, who wishes to perform the assignment as a sole trader (entrepreneur individuel), {{rsacStatus}},",
  },
  {
    kind: "p",
    fr: "Courriel de l’Agent : {{email}}",
    en: "Agent’s email: {{email}}",
  },
  {
    kind: "p",
    fr: "À la date de signature, l’Agent n’est pas encore immatriculé au registre spécial des agents commerciaux (RSAC). Il transmet à BSTAY son justificatif d’immatriculation dès son obtention, sans qu’un avenant soit nécessaire pour renseigner cette référence. Il fournit son attestation d’assurance de responsabilité civile professionnelle avant le début de son activité réglementée et communique son régime de TVA avant l’émission de sa première facture.",
    en: "At the date of signature, the Agent is not yet registered with the Special Register of Commercial Agents (RSAC). He will send BSTAY proof of registration as soon as he obtains it; no amendment is needed to record this reference. He will provide his professional liability insurance certificate before starting any regulated activity and will state his VAT status before issuing his first invoice.",
    onlyWhen: "rsacPending",
  },
  {
    kind: "p",
    onlyWhen: "rsacRegistered",
    fr: "L’Agent fournit son attestation d’assurance de responsabilité civile professionnelle avant le début de son activité réglementée et communique son régime de TVA avant l’émission de sa première facture.",
    en: "The Agent will provide his professional liability insurance certificate before starting any regulated activity and will state his VAT status before issuing his first invoice.",
  },
  {
    kind: "p",
    fr: "Ci-après dénommé(e) « l’Agent »,",
    en: "Hereinafter referred to as “the Agent”,",
  },
  {
    kind: "p",
    fr: "BSTAY exerce des activités de transaction immobilière, de location et de conciergerie. Le présent mandat, conclu dans l’intérêt commun des parties, porte sur la vente immobilière. Les demandes de location et de conciergerie identifiées dans le cadre de la collaboration sont orientées vers les services compétents de BSTAY. Les parties coopèrent loyalement à l’exécution du mandat.",
    en: "BSTAY carries out real estate transaction, rental and concierge activities. This mandate, entered into in the common interest of the parties, concerns real estate sales. Rental and concierge requests identified in the course of the collaboration are referred to the relevant BSTAY departments. The parties cooperate in good faith in performing the mandate.",
    lead: {
      fr: "Préambule.",
      en: "Preamble.",
    },
  },
];

export const AGENT_ARTICLES: AgentArticle[] = [
  {
    n: 1,
    title: {
      fr: "Cadre juridique et entrée en vigueur",
      en: "Legal framework and entry into force",
    },
    blocks: [
      {
        kind: "p",
        fr: "Le contrat est régi par les articles L.134-1 et suivants et R.134-1 et suivants du Code de commerce, la loi n° 70-9 du 2 janvier 1970 et le décret n° 72-678 du 20 juillet 1972, dans leurs versions applicables, ainsi que par les règles déontologiques de la profession immobilière.",
        en: "This agreement is governed by Articles L.134-1 et seq. and R.134-1 et seq. of the French Commercial Code, Law no. 70-9 of 2 January 1970 (the “Hoguet Law”) and Decree no. 72-678 of 20 July 1972, in their applicable versions, and by the ethical rules of the real estate profession.",
      },
      {
        kind: "p",
        fr: "Le contrat est conclu pour une durée indéterminée à compter du {{effectiveDate}}. Il peut être signé avant l’immatriculation de l’Agent pour permettre ses formalités. Ses obligations préparatoires, de confidentialité et de coopération prennent alors effet ; les missions immobilières réglementées ne commencent qu’après réunion des conditions ci-dessous. L’annexe financière en fait partie intégrante.",
        en: "The agreement is entered into for an indefinite term from {{effectiveDate}}. It may be signed before the Agent’s registration to enable his formalities. Its preparatory, confidentiality and cooperation obligations then take effect; regulated real estate assignments begin only once the conditions below are met. The financial annex forms an integral part of the agreement.",
      },
      {
        kind: "p",
        fr: "Avant tout acte réglementé de prospection immobilière, d’entremise, de visite ou de négociation pour BSTAY, l’Agent justifie de son immatriculation, de sa RCP et de l’attestation d’habilitation correspondant aux pouvoirs confiés. BSTAY demande cette attestation à la CCI compétente et en organise le renouvellement avec le concours de l’Agent. Le contrat signé peut servir aux formalités ; il ne tient pas lieu d’habilitation. L’Agent transmet ses justificatifs dès leur obtention, sans devoir signer de nouveau l’ensemble du contrat pour renseigner les références administratives.",
        en: "Before carrying out any regulated act of real estate prospecting, intermediation, viewing or negotiation for BSTAY, the Agent must provide proof of his registration, his professional liability insurance (RCP) and the authorisation certificate (attestation d’habilitation) matching the powers granted. BSTAY applies for this certificate to the competent Chamber of Commerce and Industry (CCI) and arranges its renewal with the Agent’s assistance. The signed agreement may be used for the formalities; it does not replace the authorisation. The Agent sends his supporting documents as soon as he obtains them, without having to re-sign the whole agreement to record administrative references.",
      },
      {
        kind: "p",
        fr: "L’Agent déclare ne faire l’objet d’aucune incapacité incompatible avec son activité et signale immédiatement toute modification affectant ses conditions d’exercice. Les informations d’identification et justificatifs sont communiqués avant le début des actes réglementés.",
        en: "The Agent declares that he is not subject to any legal incapacity incompatible with his activity and will immediately report any change affecting his conditions of practice. Identification details and supporting documents are provided before regulated acts begin.",
      },
    ],
  },
  {
    n: 2,
    title: {
      fr: "Mission et territoire",
      en: "Assignment and territory",
    },
    blocks: [
      {
        kind: "p",
        fr: "BSTAY confie à l’Agent une mission permanente de prospection, de présentation de biens et de négociation commerciale en matière de vente immobilière, au nom et pour le compte de BSTAY, dans la limite des pouvoirs confiés : recherche de vendeurs et d’acquéreurs, développement de mandats au profit de BSTAY, organisation des visites, transmission des offres et suivi commercial jusqu’à la réalisation des opérations. Ce mandat de représentation ne délègue pas à l’Agent les mandats reçus des clients de BSTAY.",
        en: "BSTAY entrusts the Agent with a permanent assignment of prospecting, presenting properties and commercial negotiation in real estate sales, in the name and on behalf of BSTAY, within the limits of the powers granted: finding sellers and buyers, developing mandates for BSTAY, organising viewings, passing on offers and commercial follow-up until completion of the transactions. This representation mandate does not delegate to the Agent the mandates BSTAY receives from its clients.",
      },
      {
        kind: "p",
        fr: "Les Alpes-Maritimes et le Var constituent la zone habituelle de prospection. Sauf avenant écrit, aucun secteur géographique ni groupe de clients n’est attribué à l’Agent au sens de l’article L.134-6 du Code de commerce. Cette zone n’ouvre aucun droit général à commission sur les ventes auxquelles il n’a pas participé ; l’attribution des parts suit l’article 7.2. L’Agent peut proposer une opération extérieure après accord écrit de BSTAY.",
        en: "The Alpes-Maritimes and Var departments are the usual prospecting area. Unless otherwise agreed by written amendment, no geographical sector or group of clients is allocated to the Agent within the meaning of Article L.134-6 of the Commercial Code. This area gives no general right to commission on sales in which he did not take part; shares are allocated in accordance with Article 7.2. The Agent may propose a transaction outside this area with BSTAY’s written consent.",
      },
      {
        kind: "p",
        fr: "La mission comprend les apports interservices de l’article 20, sans mission directe de location ou de conciergerie, ni pouvoir d’en négocier ou signer les contrats ou de détenir des fonds. Une extension exige un avenant conforme à la réglementation. Débutant, junior et senior désignent les niveaux contractuels de rémunération, sans pouvoir réglementaire supplémentaire. Un senior compétent peut être accompagnant par accord distinct avec BSTAY ; la phase 3 ne lui attribue pas automatiquement cette mission.",
        en: "The assignment includes the inter-department referrals of Article 20, without any direct rental or concierge assignment, nor any power to negotiate or sign such contracts or to hold funds. Any extension requires an amendment complying with the regulations. Beginner, junior and senior refer to contractual remuneration levels and confer no additional regulatory powers. A competent senior may act as a mentor under a separate agreement with BSTAY; phase 3 does not automatically give him this role.",
      },
    ],
  },
  {
    n: 3,
    title: {
      fr: "Indépendance et pouvoirs",
      en: "Independence and powers",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent organise librement ses horaires, déplacements, prospection et moyens de travail. Il n’est soumis à aucune obligation générale de présence, autorisation d’absence ou pouvoir disciplinaire. Il supporte ses charges fiscales, sociales et ses frais ordinaires. Le suivi des dossiers, les contrôles de conformité et les standards de service ne constituent pas un pouvoir hiérarchique.",
        en: "The Agent freely organises his working hours, travel, prospecting and working resources. He is not subject to any general attendance obligation, leave authorisation or disciplinary authority. He bears his own tax and social security charges and ordinary expenses. File monitoring, compliance checks and service standards do not constitute hierarchical authority.",
      },
      {
        kind: "p",
        fr: "L’Agent ne peut recevoir ou détenir, même indirectement, de fonds, chèques, dépôts ou valeurs appartenant aux clients ou destinés à leur compte. Il ne peut donner de consultations juridiques ni rédiger de compromis, promesses, baux ou autres actes interdits par son statut. Il ne peut diriger un établissement immobilier dans des conditions interdites par les textes.",
        en: "The Agent may not receive or hold, even indirectly, any funds, cheques, deposits or valuables belonging to clients or intended for their account. He may not give legal advice or draft preliminary sale agreements (compromis), promises to sell, leases or other deeds prohibited by his status. He may not manage a real estate branch in conditions prohibited by law.",
      },
      {
        kind: "p",
        fr: "Par choix d’organisation, BSTAY réserve également à sa direction la rédaction et la signature des mandats clients et des engagements contractuels. L’Agent présente les modèles validés et recueille les informations utiles. Une dérogation pour les seuls mandats légalement autorisés exige un pouvoir écrit spécifique et une habilitation concordante. Aucune autorisation ne peut déroger à une interdiction légale.",
        en: "As a matter of organisation, BSTAY also reserves to its management the drafting and signing of client mandates and contractual commitments. The Agent presents the approved templates and collects the relevant information. Any exception, for legally permitted mandates only, requires a specific written power and a matching authorisation. No authorisation may override a legal prohibition.",
      },
      {
        kind: "p",
        fr: "L’Agent peut présenter les biens, faire signer les bons de visite validés, recueillir et transmettre les offres sans accepter celles-ci au nom d’une partie. Il ne promet ni remise, prestation, délai garanti ni avantage sans validation écrite de BSTAY. Le senior accompagnant ne peut autoriser un engagement à la place de la Société.",
        en: "The Agent may present properties, have approved viewing slips (bons de visite) signed, and collect and pass on offers, without accepting them on behalf of any party. He promises no discount, service, guaranteed timeframe or benefit without BSTAY’s written approval. The mentoring senior may not authorise any commitment in place of the Company.",
      },
      {
        kind: "p",
        fr: "Le mandat est consenti en considération de l’Agent. Il ne peut sous-déléguer les actes réglementés, ni se faire substituer pour ces actes. Lorsqu’un autre négociateur intervient, BSTAY le mandate directement et vérifie son habilitation et ses pouvoirs. L’Agent peut recourir, à ses frais, à une assistance purement administrative, dans le respect des articles 11 et 12 et sans accès aux données hors des autorisations applicables.",
        en: "The mandate is granted personally to the Agent. He may not sub-delegate regulated acts or have anyone substitute for him in performing them. When another negotiator is involved, BSTAY appoints him directly and checks his authorisation and powers. The Agent may, at his own expense, use purely administrative assistance, in compliance with Articles 11 and 12 and without access to data beyond the applicable authorisations.",
      },
    ],
  },
  {
    n: 4,
    title: {
      fr: "Loyauté, concurrence et orientation des demandes",
      en: "Loyalty, competition and referral of requests",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent peut représenter d’autres mandants non concurrents sans autorisation. Il ne peut accepter de représenter une entreprise concurrente de BSTAY sans son accord écrit préalable, conformément à l’article L.134-3 du Code de commerce.",
        en: "The Agent may represent other non-competing principals without authorisation. He may not agree to represent a business competing with BSTAY without BSTAY’s prior written consent, in accordance with Article L.134-3 of the Commercial Code.",
      },
      {
        kind: "p",
        fr: "Pendant le contrat, l’Agent oriente sans délai vers le service compétent de BSTAY toute demande de location ou de conciergerie identifiée dans le cadre de sa mission ou auprès d’un client ou prospect rencontré grâce à la collaboration. Il ne détourne ni ne transmet ces demandes ou opportunités à un concurrent, directement ou par intermédiaire. La mise en relation respecte les règles applicables aux données personnelles et le libre choix du client. Elle ne donne aucun pouvoir de négocier ou de conclure au nom des services concernés. Les conditions de rémunération relèvent de l’article 20.",
        en: "During the agreement, the Agent promptly refers to the relevant BSTAY department any rental or concierge request identified in the course of his assignment or from a client or prospect met through the collaboration. He does not divert these requests or opportunities or pass them on to a competitor, directly or through an intermediary. Referrals respect the rules on personal data and the client’s freedom of choice. They give no power to negotiate or contract on behalf of the departments concerned. Remuneration terms are set out in Article 20.",
      },
      {
        kind: "p",
        fr: "Chaque partie agit loyalement et informe l’autre des difficultés susceptibles d’affecter les dossiers. BSTAY fournit les documents, tarifs et accès nécessaires, examine les propositions dans un délai raisonnable et ne détourne pas artificiellement une opération pour éluder une rémunération.",
        en: "Each party acts in good faith and informs the other of any difficulties likely to affect the files. BSTAY provides the necessary documents, price lists and access, reviews proposals within a reasonable time and does not artificially divert a transaction to avoid paying remuneration.",
      },
      {
        kind: "p",
        fr: "Conformément à l’article R.134-2 du Code de commerce, BSTAY met à disposition la documentation et les informations utiles, avise l’Agent dans un délai raisonnable d’une baisse sensible du volume d’affaires normalement attendu et l’informe de l’acceptation, du refus ou de l’inexécution d’une opération qu’il lui a apportée.",
        en: "In accordance with Article R.134-2 of the Commercial Code, BSTAY makes the relevant documentation and information available, notifies the Agent within a reasonable time of any significant drop in the normally expected volume of business, and informs him of the acceptance, refusal or non-performance of any transaction he has brought in.",
      },
    ],
  },
  {
    n: 5,
    title: {
      fr: "Accompagnement professionnel et progression",
      en: "Professional mentoring and progression",
    },
    blocks: [
      {
        kind: "sub",
        fr: "5.1 Les trois phases",
        en: "5.1 The three phases",
      },
      {
        kind: "table",
        head: [
          {
            fr: "Phase",
            bi: "Phase",
          },
          {
            fr: "CA cumulé",
            bi: "CA cumulé / Cumulative revenue",
          },
          {
            fr: "Agent – part vendeur",
            bi: "Agent – part vendeur / seller share",
          },
          {
            fr: "Agent – part acquéreur",
            bi: "Agent – part acquéreur / buyer share",
          },
          {
            fr: "Senior – part vendeur",
            bi: "Senior – part vendeur / seller share",
          },
          {
            fr: "Senior – part acquéreur",
            bi: "Senior – part acquéreur / buyer share",
          },
        ],
        rows: [
          [
            {
              fr: "1 Débutant",
              bi: "1 Débutant / Beginner",
            },
            {
              fr: "Moins de 50 000 € HT",
              bi: "Moins de 50 000 € HT / Under EUR 50,000 excl. VAT",
            },
            {
              fr: "15 %",
              bi: "15 %",
            },
            {
              fr: "15 %",
              bi: "15 %",
            },
            {
              fr: "10 % si appui effectif",
              bi: "10 % si appui effectif / if actual support",
            },
            {
              fr: "10 % si appui effectif",
              bi: "10 % si appui effectif / if actual support",
            },
          ],
          [
            {
              fr: "2 Junior",
              bi: "2 Junior",
            },
            {
              fr: "50 000 € à moins de 100 000 € HT",
              bi: "50 000 € à moins de 100 000 € HT / EUR 50,000 to under 100,000 excl. VAT",
            },
            {
              fr: "20 %",
              bi: "20 %",
            },
            {
              fr: "20 %",
              bi: "20 %",
            },
            {
              fr: "5 % si appui effectif",
              bi: "5 % si appui effectif / if actual support",
            },
            {
              fr: "5 % si appui effectif",
              bi: "5 % si appui effectif / if actual support",
            },
          ],
          [
            {
              fr: "3 Senior",
              bi: "3 Senior",
            },
            {
              fr: "À partir de 100 000 € HT",
              bi: "À partir de 100 000 € HT / From EUR 100,000 excl. VAT",
            },
            {
              fr: "25 %",
              bi: "25 %",
            },
            {
              fr: "25 %",
              bi: "25 %",
            },
            {
              fr: "0 %",
              bi: "0 %",
            },
            {
              fr: "0 %",
              bi: "0 %",
            },
          ],
        ],
      },
      {
        kind: "p",
        fr: "La « part vendeur » désigne la fraction de rémunération attribuée au titre de l’apport et du suivi du mandat de vente conclu au profit de BSTAY. La « part acquéreur » désigne celle attribuée au titre de l’apport et du suivi de l’acquéreur. Ces termes définissent la répartition interne des commissions, sans déterminer qui supporte les honoraires d’agence. Chaque taux s’applique à l’assiette de l’article 7. Les deux parts se cumulent si elles sont attribuées à l’Agent. La rémunération du senior est distincte ; seul l’apport interne de l’article 20.3 est prélevé sur la commission de l’Agent bénéficiaire.",
        en: "The “seller share” is the portion of remuneration allocated for bringing in and following up the sale mandate entered into for BSTAY. The “buyer share” is the portion allocated for bringing in and following up the buyer. These terms define the internal split of commissions and do not determine who bears the agency fees. Each rate applies to the commission base of Article 7. Both shares are cumulative if allocated to the Agent. The senior’s remuneration is separate; only the internal referral fee of Article 20.3 is deducted from the commission of the Agent concerned.",
      },
      {
        kind: "sub",
        fr: "5.2 Phase 1 et accompagnement à la demande de l’agent débutant",
        en: "5.2 Phase 1 and support at the beginner agent’s request",
      },
      {
        kind: "p",
        fr: "L’agent débutant choisit les dossiers pour lesquels il demande l’appui d’un senior : prospection, visites, offres, négociation et suivi. Le senior transmet les méthodes, le standing et les standards de BSTAY ainsi que les procédures réglementaires, notamment LCB-FT/TRACFIN, mandat, information et données clients. Cette aide ne remplace ni formation obligatoire ni validation de conformité. Avec ou sans appui, l’Agent reste à 15 % de l’assiette HT par part vendeur ou acquéreur, cumulables à 30 % pour les deux. Les 10 % du senior ne sont dus que pour la part effectivement accompagnée sur demande ; sinon ils restent à BSTAY sans majorer le taux de l’Agent.",
        en: "The beginner agent chooses the files for which he requests a senior’s support: prospecting, viewings, offers, negotiation and follow-up. The senior passes on BSTAY’s methods, quality level and standards, as well as regulatory procedures, in particular anti-money laundering (AML/CFT – TRACFIN), mandates, client information and client data. This support replaces neither mandatory training nor compliance approval. With or without support, the Agent remains at 15% of the commission base excl. VAT per seller or buyer share, i.e. 30% for both combined. The senior’s 10% is due only for the share actually supported at the Agent’s request; otherwise it remains with BSTAY and does not increase the Agent’s rate.",
      },
      {
        kind: "sub",
        fr: "5.3 Phase 2 et appui à la demande",
        en: "5.3 Phase 2 and support on request",
      },
      {
        kind: "p",
        fr: "L’Agent junior conduit ses dossiers en autonomie. L’appui du senior est facultatif et intervient à sa demande. L’Agent conserve un taux de 20 % au titre de la part vendeur et de 20 % au titre de la part acquéreur, qu’il sollicite ou non cet appui. Le senior ne perçoit 5 % qu’au titre de la seule part vendeur ou acquéreur ayant fait l’objet d’un accompagnement effectif sur le dossier ; une disponibilité théorique ou l’accompagnement passé n’ouvre aucun droit à rémunération. La demande, le périmètre et l’appui réalisé sont documentés. Sans accompagnement effectif, les 5 % non attribués restent à BSTAY et ne majorent pas la commission de l’Agent. Les contrôles réglementaires de BSTAY demeurent obligatoires.",
        en: "The junior Agent handles his files independently. The senior’s support is optional and provided at his request. The Agent keeps a rate of 20% for the seller share and 20% for the buyer share, whether or not he requests such support. The senior receives 5% only for the specific seller or buyer share that was actually supported on the file; theoretical availability or past support gives no right to remuneration. The request, scope and support provided are documented. Without actual support, the unallocated 5% remains with BSTAY and does not increase the Agent’s commission. BSTAY’s regulatory checks remain mandatory.",
      },
      {
        kind: "sub",
        fr: "5.4 Phase 3 et organisation de l’accompagnement",
        en: "5.4 Phase 3 and organisation of support",
      },
      {
        kind: "p",
        fr: "À partir du seuil de 100 000 € HT, l’accompagnement rémunéré cesse pour les nouvelles opérations soumises à cette phase. Les validations légales, réglementaires et financières de BSTAY restent applicables à toutes les phases.",
        en: "From the EUR 100,000 excl. VAT threshold, paid support ends for new transactions falling under this phase. BSTAY’s legal, regulatory and financial approvals continue to apply in all phases.",
      },
      {
        kind: "p",
        fr: "Aucun nom ni SIREN de senior n’est fixé dans ce contrat. L’identité, la demande et le périmètre d’appui sont confirmés par échange de dossier. BSTAY conclut avec le senior un accord distinct de mission, rémunération, responsabilité et confidentialité, auquel l’Agent n’est pas partie. Le senior n’a aucun pouvoir hiérarchique ou disciplinaire. Son indisponibilité ne réduit pas le taux de l’Agent et ne retarde pas sa progression.",
        en: "No senior’s name or SIREN number is fixed in this agreement. The identity, request and scope of support are confirmed through file exchanges. BSTAY enters into a separate agreement with the senior covering assignment, remuneration, liability and confidentiality, to which the Agent is not a party. The senior has no hierarchical or disciplinary authority. His unavailability does not reduce the Agent’s rate or delay his progression.",
      },
      {
        kind: "p",
        fr: "Plusieurs seniors se partagent, selon leur accord avec BSTAY, les seuls 10 % ou 5 % de la part effectivement accompagnée. Les validations réglementaires dues par BSTAY ne constituent pas cet appui commercial. Une trace des prestations justifie la rémunération, sans reporting de présence ni contrôle permanent de l’organisation de l’Agent. En phases 1 et 2, seules les demandes et les prestations d’appui réellement réalisées sont documentées pour justifier leur rémunération. Aucune trace de formation n’est exigée pour les dossiers non accompagnés. Les obligations réglementaires demeurent applicables.",
        en: "Several seniors share, under their agreement with BSTAY, only the 10% or 5% of the share actually supported. Regulatory approvals owed by BSTAY do not constitute this commercial support. A record of the services provided justifies the remuneration, without attendance reporting or permanent control of the Agent’s organisation. In phases 1 and 2, only support requests and support actually provided are documented to justify their remuneration. No training record is required for unsupported files. Regulatory obligations continue to apply.",
      },
    ],
  },
  {
    n: 6,
    title: {
      fr: "Calcul des seuils et changement de phase",
      en: "Threshold calculation and phase change",
    },
    blocks: [
      {
        kind: "sub",
        fr: "6.1 Définition du CA de progression",
        en: "6.1 Definition of progression revenue",
      },
      {
        kind: "p",
        fr: "Le CA de progression correspond aux honoraires HT de transaction revenant à BSTAY au titre d’opérations réalisées et encaissées, avant rémunération de l’Agent, de l’accompagnant et des autres collaborateurs internes. Il inclut donc la part conservée par BSTAY. Il ne correspond jamais à la commission personnelle perçue par l’Agent.",
        en: "Progression revenue means the transaction fees excl. VAT accruing to BSTAY from completed and collected transactions, before remuneration of the Agent, the mentor and other internal staff. It therefore includes the portion retained by BSTAY. It never means the personal commission received by the Agent.",
      },
      {
        kind: "p",
        fr: "En co-agence, seuls les honoraires HT revenant contractuellement à BSTAY sont retenus : la part revenant à l’agence partenaire est exclue. Les frais propres à l’opération et commissions d’apporteurs externes ne réduisent pas le CA de progression, même lorsqu’ils sont déductibles de l’assiette de commission de l’article 7. Aucune charge générale de BSTAY ne réduit ce cumul.",
        en: "In co-agency transactions (fee-sharing with a partner agency), only the fees excl. VAT contractually accruing to BSTAY are counted; the partner agency’s share is excluded. Transaction-specific costs and external referral fees do not reduce progression revenue, even where they are deductible from the commission base of Article 7. No BSTAY overheads reduce this cumulative total.",
      },
      {
        kind: "p",
        fr: "Sur chaque opération, 50 % de ce CA est comptabilisé pour la progression de l’Agent s’il détient uniquement la part vendeur ou la part acquéreur ; 100 % s’il détient les deux parts. Une même part n’est comptabilisée qu’une fois. Un partage entre plusieurs agents est convenu par écrit avant leur collaboration et entraîne le même prorata pour le CA de progression.",
        en: "On each transaction, 50% of this revenue counts towards the Agent’s progression if he holds only the seller share or only the buyer share; 100% if he holds both shares. A given share is counted only once. Any split between several agents is agreed in writing before they work together and applies the same proportion to progression revenue.",
      },
      {
        kind: "p",
        fr: "Seules les opérations de transaction immobilière relevant du présent contrat alimentent ce cumul, depuis sa prise d’effet, sans remise à zéro annuelle. Le cumul initial est de 0 € HT, sauf reprise d’antériorité expressément chiffrée et signée dans l’annexe financière.",
        en: "Only real estate transactions under this agreement count towards this total, from its effective date, with no annual reset. The initial total is EUR 0 excl. VAT, unless prior activity is expressly quantified and signed in the financial annex.",
      },
      {
        kind: "sub",
        fr: "6.2 Enregistrement et transparence",
        en: "6.2 Recording and transparency",
      },
      {
        kind: "p",
        fr: "Une opération est inscrite au cumul après réalisation définitive et encaissement des honoraires correspondants. En cas d’encaissement partiel, seule la fraction encaissée est inscrite. Une restitution effective d’honoraires donne lieu à une correction justifiée du cumul ; elle n’entraîne pas de déclassement d’une phase déjà acquise, sauf fraude établie.",
        en: "A transaction is added to the total after final completion and collection of the corresponding fees. In the event of partial collection, only the collected portion is recorded. An actual refund of fees gives rise to a justified correction of the total; it does not cause loss of a phase already reached, except in the case of established fraud.",
      },
      {
        kind: "p",
        fr: "BSTAY remet un état de progression avec chaque décompte : opération, part vendeur ou acquéreur attribuée, honoraires retenus, encaissements, cumul avant et après opération et phase acquise. L’Agent peut demander les justificatifs utiles. L’absence de contestation immédiate ne vaut pas renonciation à ses droits.",
        en: "BSTAY provides a progression statement with each commission statement: transaction, seller or buyer share allocated, fees counted, collections, total before and after the transaction, and phase reached. The Agent may request supporting documents. Failure to object immediately does not amount to a waiver of his rights.",
      },
      {
        kind: "sub",
        fr: "6.3 Date du changement et taux applicable",
        en: "6.3 Date of change and applicable rate",
      },
      {
        kind: "p",
        fr: "Le seuil est atteint à la date de l’encaissement effectivement crédité à BSTAY et inscrit dans le cumul, avec sa date réelle ; un retard de mise à jour du relevé ne reporte pas cette date. Le taux applicable à une vente dépend de la phase acquise à la date de son acte authentique, avant inscription de cette vente au cumul. La vente qui permet le franchissement reste rémunérée à l’ancien taux. Les autres actes signés avant l’encaissement qui franchit le seuil restent également à l’ancien taux ; ceux signés après bénéficient de la nouvelle phase. En cas d’événements le même jour, leur ordre justifié est retenu ; à défaut d’heure vérifiable, le nouveau taux s’applique aux actes du lendemain. Les pièces permettent de vérifier ce calcul.",
        en: "The threshold is reached on the date the collection is actually credited to BSTAY and recorded in the total, with its actual date; a delay in updating the statement does not postpone that date. The rate applicable to a sale depends on the phase reached on the date of its notarial deed (acte authentique), before that sale is added to the total. The sale that crosses the threshold is still paid at the previous rate. Other deeds signed before the collection that crosses the threshold also remain at the previous rate; those signed afterwards benefit from the new phase. For events on the same day, their documented order applies; if no time can be verified, the new rate applies to deeds signed the following day. Supporting documents allow this calculation to be checked.",
      },
      {
        kind: "p",
        fr: "Un dossier commencé avant le changement mais dont l’acte est signé après celui-ci bénéficie du nouveau taux. Les phases sont définitivement acquises sous réserve de fraude ; aucun avenant n’est nécessaire pour appliquer la grille convenue.",
        en: "A file started before the change but whose deed is signed afterwards benefits from the new rate. Phases, once reached, are permanent, subject to fraud; no amendment is needed to apply the agreed scale.",
      },
    ],
  },
  {
    n: 7,
    title: {
      fr: "Assiette et attribution des commissions",
      en: "Commission base and allocation",
    },
    blocks: [
      {
        kind: "sub",
        fr: "7.1 Assiette distincte du CA de progression",
        en: "7.1 Commission base distinct from progression revenue",
      },
      {
        kind: "p",
        fr: "L’assiette de commission correspond à la seule quote-part des honoraires HT revenant à BSTAY, à l’exclusion de celle du partenaire en cas de co-agence, après prise en compte des remises applicables à cette quote-part et déduction, une seule fois, des commissions externes licites imputables à BSTAY. Les taux ou montants externes sont fixés par écrit au cas par cas et ne sont pas automatiquement limités à 10 %. Les simples mises en relation par un non-professionnel ne sont acceptées que si leur caractère occasionnel et leur contenu sont légalement admissibles ; elles n’autorisent aucun acte réglementé. Les collaborations professionnelles récurrentes exigent le statut, la carte ou les habilitations requis pour les actes réalisés. BSTAY vérifie la licéité avant engagement et communique à l’Agent l’identité de l’intermédiaire, l’accord et les incidences sur l’assiette avant sa prise en charge. Une modification affectant un dossier déjà attribué est portée à sa connaissance avant engagement ; aucune décision ne peut servir à éluder déloyalement sa rémunération.",
        en: "The commission base is only the portion of fees excl. VAT accruing to BSTAY, excluding the partner’s portion in co-agency transactions, after any discounts applicable to that portion and after deducting, once only, lawful external commissions payable by BSTAY. External rates or amounts are set in writing case by case and are not automatically capped at 10%. Mere introductions by a non-professional are accepted only if their occasional nature and content are legally permissible; they authorise no regulated act. Recurring professional collaborations require the status, licence or authorisations needed for the acts performed. BSTAY checks lawfulness before committing and informs the Agent of the intermediary’s identity, the agreement and the effect on the commission base before he takes on the file. Any change affecting a file already allocated is notified to him before it is committed to; no decision may be used to unfairly avoid his remuneration.",
      },
      {
        kind: "p",
        fr: "Les frais directs d’open house et les cadeaux de signature au client ne sont déductibles de l’assiette globale de commission avant partage que si BSTAY et l’Agent ont approuvé par écrit, avant tout engagement, l’objet de la dépense, le budget retenu pour l’opération et sa déduction, quelle que soit la partie qui propose la dépense. Cet accord peut être donné par courriel, dans le CRM ou par tout autre échange écrit, notamment par SMS ou WhatsApp, à condition que l’accord exprès de chaque partie soit daté, conservé et attribuable à son auteur. Tout dépassement du budget convenu ou changement d’affectation nécessite un nouvel accord écrit des deux parties avant d’engager la dépense supplémentaire ou modifiée. Seuls les frais effectivement supportés par BSTAY et justifiés sont déduits. BSTAY remet les justificatifs à l’Agent et peut renoncer par écrit à tout ou partie de la déduction à titre de geste commercial.",
        en: "Direct open-house costs and signing gifts to the client are deductible from the overall commission base before the split only if BSTAY and the Agent have approved in writing, before any commitment, the purpose of the expense, the budget for the transaction and its deduction, whichever party proposes the expense. This approval may be given by email, in the CRM or by any other written exchange, including text message or WhatsApp, provided each party’s express approval is dated, kept and attributable to its author. Any overrun of the agreed budget or change of purpose requires a new written agreement of both parties before the additional or modified expense is incurred. Only costs actually borne by BSTAY and supported by evidence are deducted. BSTAY provides the supporting documents to the Agent and may waive all or part of the deduction in writing as a commercial gesture.",
      },
      {
        kind: "p",
        fr: "Les charges générales, loyers, salaires, abonnements et publicité courante ne sont pas déductibles. Les commissions de l’Agent, du senior et des apporteurs internes ne réduisent pas cette assiette. L’apport interne est prélevé exclusivement sur la commission de l’Agent bénéficiaire, selon l’article 20.3. Aucun coût n’est déduit deux fois ; aucun frais d’un dossier non conclu n’est reporté sur un autre sans accord écrit spécifique.",
        en: "Overheads, rent, salaries, subscriptions and routine advertising are not deductible. The commissions of the Agent, the senior and internal referrers do not reduce this base. The internal referral fee is deducted exclusively from the commission of the Agent concerned, under Article 20.3. No cost is deducted twice; no costs of an unsuccessful file are carried over to another without specific written agreement.",
      },
      {
        kind: "sub",
        fr: "7.2 Attribution de la part vendeur et de la part acquéreur",
        en: "7.2 Allocation of the seller share and the buyer share",
      },
      {
        kind: "p",
        fr: "La part vendeur est attribuée à l’Agent qui a obtenu et développé le mandat de vente valable au profit de BSTAY ; la part acquéreur à celui qui a apporté et effectivement suivi l’acquéreur. L’origine et le travail réalisé sont consignés dans le CRM et l’attribution est confirmée par BSTAY. La simple connaissance d’un nom ou la consultation d’une fiche ne suffit pas.",
        en: "The seller share is allocated to the Agent who obtained and developed the valid sale mandate for BSTAY; the buyer share to the agent who brought in and actually followed up the buyer. The source and work done are recorded in the CRM and the allocation is confirmed by BSTAY. Merely knowing a name or viewing a record is not sufficient.",
      },
      {
        kind: "p",
        fr: "Une relation préexistante est identifiée avant la prise en charge. Les demandes issues du site, de campagnes BSTAY ou du portefeuille commun sont attribuées par écrit, sans droit automatique de l’Agent. Conformément à l’article 2, aucun droit à commission territoriale ou de portefeuille n’est attribué. Les commissions se déterminent dossier par dossier selon les parts attribuées et le travail effectué, sous réserve des droits expressément convenus et des dispositions impératives.",
        en: "A pre-existing relationship is identified before the file is taken on. Leads from the website, BSTAY campaigns or the shared portfolio are allocated in writing, with no automatic right for the Agent. In accordance with Article 2, no territorial or portfolio commission right is granted. Commissions are determined file by file according to the shares allocated and the work done, subject to expressly agreed rights and mandatory provisions.",
      },
      {
        kind: "p",
        fr: "Si un autre agent bénéficie de l’autre part, l’Agent et son senior ne sont rémunérés que pour la part qui leur est attribuée selon le présent contrat. La part correspondant à un travail réalisé directement par BSTAY n’est pas attribuée à l’Agent. Toute reprise ou collaboration est documentée, sans retrait artificiel d’une attribution pour éluder une rémunération.",
        en: "If another agent holds the other share, the Agent and his senior are paid only for the share allocated to them under this agreement. The share corresponding to work done directly by BSTAY is not allocated to the Agent. Any takeover or collaboration is documented, with no artificial withdrawal of an allocation to avoid remuneration.",
      },
      {
        kind: "p",
        fr: "En co-agence, la grille s’applique aux parts vendeur et acquéreur attribuées à l’Agent, sur les honoraires revenant à BSTAY. Une co-agence ne donne pas automatiquement droit aux deux parts cumulées. Un schéma différent exige un accord écrit préalable précisant aussi le CA de progression. Pour une même opération réalisée au titre de ce mandat, l’Agent est rémunéré par BSTAY et ne sollicite ni n’accepte de paiement parallèle de l’agence partenaire.",
        en: "In co-agency transactions, the scale applies to the seller and buyer shares allocated to the Agent, on the fees accruing to BSTAY. A co-agency does not automatically entitle him to both shares. Any different arrangement requires prior written agreement that also specifies progression revenue. For any transaction carried out under this mandate, the Agent is paid by BSTAY and neither requests nor accepts any parallel payment from the partner agency.",
      },
    ],
  },
  {
    n: 8,
    title: {
      fr: "Acquisition et paiement",
      en: "Accrual and payment",
    },
    blocks: [
      {
        kind: "sub",
        fr: "8.1 Acquisition de la commission",
        en: "8.1 Accrual of commission",
      },
      {
        kind: "p",
        fr: "Les commissions sont acquises selon les articles L.134-9 et L.134-10 du Code de commerce, articulés avec la loi Hoguet pour les opérations concernées. La vérification administrative du dossier n’efface pas une commission légalement acquise. Les apports interservices suivent l’article 20.",
        en: "Commissions accrue in accordance with Articles L.134-9 and L.134-10 of the Commercial Code, read together with the Hoguet Law for the transactions concerned. Administrative review of the file does not cancel a legally accrued commission. Inter-department referrals are governed by Article 20.",
      },
      {
        kind: "sub",
        fr: "8.2 Dossier complet et délai de paiement",
        en: "8.2 Complete file and payment deadline",
      },
      {
        kind: "p",
        fr: "L’Agent constitue le dossier et transmet les pièces obligatoires au fil de l’opération, au plus tard à sa réalisation définitive pour les éléments alors disponibles. Le contrôle couvre notamment le mandat valable et enregistré, l’identité et les pouvoirs des parties, les diligences LCB-FT/TRACFIN applicables, les informations et diagnostics requis, les offres et engagements, les éléments établissant la réalisation de la vente et les honoraires, ainsi que la traçabilité de son intervention. La liste est adaptée à l’opération ; aucune pièce non pertinente n’est exigée.",
        en: "The Agent compiles the file and sends the mandatory documents as the transaction progresses, at the latest on final completion for the items then available. The review covers in particular the valid and registered mandate, the identity and powers of the parties, the applicable AML/CFT (TRACFIN) due diligence, the required information and technical surveys, offers and commitments, evidence of completion of the sale and of the fees, and the traceability of his involvement. The list is adapted to the transaction; no irrelevant document is required.",
      },
      {
        kind: "p",
        fr: "BSTAY vérifie la remise dans les cinq jours ouvrés et confirme la complétude ou notifie précisément les éléments manquants. L’Agent les régularise sans délai et signale toute indisponibilité dépendant d’un tiers. Une absence de réponse de BSTAY n’autorise pas un report indéfini. Les manquements répétés peuvent donner lieu à mise en demeure et aux recours contractuels légalement justifiés, sans confiscation automatique des commissions.",
        en: "BSTAY checks the submission within five business days and confirms that it is complete or specifies exactly what is missing. The Agent remedies this without delay and reports any item unavailable because of a third party. Failure by BSTAY to respond does not allow indefinite postponement. Repeated failures may lead to formal notice and legally justified contractual remedies, without automatic forfeiture of commissions.",
      },
      {
        kind: "p",
        fr: "Sous réserve des échéances légales impératives, le paiement intervient dans les quatorze jours calendaires suivant la dernière des trois dates suivantes : encaissement des honoraires par BSTAY, validation de la complétude du dossier et réception d’une facture valide et conforme de l’Agent. Toute anomalie de facture est signalée sans délai pour régularisation.",
        en: "Subject to mandatory legal deadlines, payment is made within fourteen calendar days of the latest of the following three dates: collection of the fees by BSTAY, approval of the file as complete, and receipt of a valid and compliant invoice from the Agent. Any invoice irregularity is reported without delay for correction.",
      },
      {
        kind: "p",
        fr: "Ce circuit ne peut repousser le paiement au-delà des échéances impératives de l’article L.134-9, notamment le dernier jour du mois suivant le trimestre d’acquisition. À cette échéance, les commissions légalement acquises sont réglées même si une régularisation documentaire demeure nécessaire. BSTAY conserve ses recours pour le manquement et le préjudice prouvés ; une compensation ne s’opère que dans les conditions légales.",
        en: "This process cannot delay payment beyond the mandatory deadlines of Article L.134-9, in particular the last day of the month following the quarter in which the commission accrued. On that date, legally accrued commissions are paid even if documents still need to be regularised. BSTAY retains its remedies for proven breach and loss; set-off applies only under the legal conditions.",
      },
      {
        kind: "sub",
        fr: "8.3 Décomptes et autres modalités",
        en: "8.3 Statements and other terms",
      },
      {
        kind: "p",
        fr: "Conformément à l’article R.134-3 du Code de commerce, BSTAY remet un relevé des commissions au plus tard le dernier jour du mois suivant le trimestre de leur acquisition, avec les éléments du calcul. L’Agent peut demander toutes les informations nécessaires à leur vérification, notamment un extrait pertinent des documents comptables, sans devoir préalablement contester le relevé. L’article R.134-4 protège ce droit contre les dérogations défavorables. Les commissions sont HT, majorées de la TVA applicable de l’Agent. Leur extinction ou restitution respecte l’article L.134-10 et fait l’objet d’une justification ; les pénalités de retard et indemnités de recouvrement légalement applicables restent dues. Les factures sont émises par l’Agent ; aucun mandat d’autofacturation n’est institué.",
        en: "In accordance with Article R.134-3 of the Commercial Code, BSTAY provides a commission statement no later than the last day of the month following the quarter in which they accrued, with the calculation details. The Agent may request all information needed to verify them, including a relevant extract from the accounting records, without first having to dispute the statement. Article R.134-4 protects this right against unfavourable derogations. Commissions are stated excl. VAT, plus any VAT applicable to the Agent. Their extinction or refund complies with Article L.134-10 and must be justified; legally applicable late-payment penalties and recovery fees remain due. Invoices are issued by the Agent; no self-billing mandate is established.",
      },
    ],
  },
  {
    n: 9,
    title: {
      fr: "Frais et moyens professionnels",
      en: "Expenses and professional resources",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent supporte ses dépenses ordinaires, déplacements, matériel et assurances. Aucun minimum de revenu n’est garanti. Les documents et accès propres à BSTAY nécessaires à sa mission sont fournis selon l’organisation de l’agence. Leur utilisation est limitée au contrat.",
        en: "The Agent bears his ordinary expenses, travel, equipment and insurance. No minimum income is guaranteed. BSTAY’s own documents and access needed for his assignment are provided according to the agency’s organisation. Their use is limited to the agreement.",
      },
      {
        kind: "p",
        fr: "Toute dépense exceptionnelle engagée pour BSTAY doit être autorisée au préalable par écrit, avec un budget défini pour la dépense et la désignation du payeur. Lorsqu’une dépense est destinée à être déduite de l’assiette de commission, l’accord préalable des deux parties est requis dans les conditions de l’article 7.1. Le remboursement d’une avance autorisée intervient sur justificatif dans les trente jours de sa remise. Aucun moyen de paiement donnant accès à des fonds clients n’est remis à l’Agent au titre du présent contrat. Toute organisation différente exige une vérification réglementaire préalable et un écrit distinct ; elle ne peut déroger aux interdictions légales.",
        en: "Any exceptional expense incurred for BSTAY must be authorised in advance in writing, with a defined budget and the payer identified. Where an expense is to be deducted from the commission base, the prior agreement of both parties is required under Article 7.1. An authorised advance is reimbursed on proof within thirty days of submission. No means of payment giving access to client funds is given to the Agent under this agreement. Any different arrangement requires a prior regulatory check and a separate written document; it may not override legal prohibitions.",
      },
      {
        kind: "p",
        fr: "BSTAY peut mettre à disposition, selon les besoins et disponibilités, des postes partagés et des salles de rendez-vous. Cet accès ne réserve aucun poste permanent à l’Agent et n’entraîne ni permanence ni obligation de présence.",
        en: "BSTAY may make shared desks and meeting rooms available, as needed and subject to availability. This access reserves no permanent desk for the Agent and entails no on-duty shifts or attendance obligation.",
      },
    ],
  },
  {
    n: 10,
    title: {
      fr: "Obligations réglementaires",
      en: "Regulatory obligations",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent maintient son immatriculation et une RCP adaptée à l’activité exercée, fournit son attestation avant intervention puis à chaque renouvellement et déclare les sinistres sans délai. Il justifie de sa situation sociale et fiscale à la demande de BSTAY et aux échéances légales, notamment tous les six mois lorsque l’obligation de vigilance l’exige.",
        en: "The Agent maintains his registration and professional liability insurance suited to his activity, provides his certificate before starting and at each renewal, and reports claims without delay. He provides proof of his social security and tax status at BSTAY’s request and at legal deadlines, in particular every six months where the due-diligence obligation requires it.",
      },
      {
        kind: "p",
        fr: "Il accomplit les formations continues légalement obligatoires et remet les attestations nécessaires au suivi et au renouvellement de son habilitation. L’accompagnement commercial ne dispense pas des formations réglementaires ; les coûts supplémentaires éventuellement pris en charge par BSTAY sont convenus par écrit.",
        en: "He completes the legally mandatory continuing training and provides the certificates needed to monitor and renew his authorisation. Commercial mentoring does not exempt him from regulatory training; any additional costs covered by BSTAY are agreed in writing.",
      },
      {
        kind: "p",
        fr: "L’Agent respecte les procédures de mandat, de publicité, d’information, de protection des consommateurs et de non-discrimination applicables. Il utilise les modèles validés, mentionne sa qualité d’agent commercial et les informations professionnelles obligatoires, et ne diffuse pas de bien sans vérification du mandat et des autorisations nécessaires. L’Agent refuse toute instruction discriminatoire et en informe BSTAY sans délai.",
        en: "The Agent complies with the applicable procedures on mandates, advertising, information, consumer protection and non-discrimination. He uses the approved templates, states his capacity as commercial agent and the mandatory professional information, and does not advertise any property without checking the mandate and necessary authorisations. The Agent refuses any discriminatory instruction and informs BSTAY without delay.",
      },
      {
        kind: "p",
        fr: "Pour les opérations assujetties à la lutte contre le blanchiment de capitaux et le financement du terrorisme (LCB-FT), BSTAY communique à l’Agent, avant les premières opérations, les procédures applicables à sa mission, la classification des risques et le canal sécurisé du référent. BSTAY organise ou s’assure d’une formation initiale puis régulière, adaptée aux opérations et aux risques. L’Agent y participe, justifie les formations suivies et applique les procédures actualisées qui lui sont communiquées.",
        en: "For transactions subject to anti-money laundering and counter-terrorist financing rules (AML/CFT), BSTAY provides the Agent, before the first transactions, with the procedures applicable to his assignment, the risk classification and the compliance officer’s secure channel. BSTAY organises or ensures initial and then regular training suited to the transactions and risks. The Agent takes part, provides proof of the training completed and applies the updated procedures provided to him.",
      },
      {
        kind: "p",
        fr: "L’Agent identifie le client et, le cas échéant, son bénéficiaire effectif ; il recueille et transmet les justificatifs requis et consigne les diligences selon la procédure applicable au dossier. Il signale immédiatement au référent toute anomalie et tout doute sérieux sur les informations, les parties ou l’opération. BSTAY organise la vérification et le traitement des alertes ; l’Agent n’engage pas une opération lorsque les vérifications requises restent impossibles ou qu’une validation obligatoire manque.",
        en: "The Agent identifies the client and, where applicable, the beneficial owner; he collects and sends the required documents and records the due diligence according to the procedure applicable to the file. He immediately reports to the compliance officer any anomaly or serious doubt about the information, the parties or the transaction. BSTAY organises the verification and handling of alerts; the Agent does not proceed with a transaction where the required checks remain impossible or a mandatory approval is missing.",
      },
      {
        kind: "p",
        fr: "Les procédures répartissent les tâches de vigilance et identifient les personnes chargées des échanges avec TRACFIN. Le signalement interne ne remplace pas les obligations légales propres de chaque partie, notamment déclaratives lorsqu’elles lui incombent. L’Agent respecte la confidentialité des alertes et des déclarations, ne les révèle pas aux personnes concernées, et coopère à la justification des diligences.",
        en: "The procedures allocate due-diligence tasks and identify the persons responsible for dealing with TRACFIN (the French financial intelligence unit). Internal reporting does not replace each party’s own legal obligations, including reporting obligations where they apply to it. The Agent keeps alerts and reports confidential, does not disclose them to the persons concerned, and cooperates in documenting the due diligence.",
      },
      {
        kind: "p",
        fr: "En cas de perte d’une condition d’exercice, les actes concernés sont immédiatement suspendus et les parties recherchent une régularisation. La suspension ne supprime pas les commissions déjà acquises et ne préjuge pas des conditions légales d’une rupture.",
        en: "If a condition of practice is lost, the acts concerned are immediately suspended and the parties seek to regularise the situation. Suspension does not cancel commissions already accrued and is without prejudice to the legal conditions of any termination.",
      },
      {
        kind: "p",
        fr: "BSTAY maintient sa carte professionnelle, la garantie financière requise pour ses activités et sa propre RCP. Elle communique les justificatifs en cours à la signature puis les versions actualisées à chaque renouvellement, et signale sans délai les retraits, suspensions ou modifications affectant les missions. La RCP de BSTAY ne dispense pas l’Agent de sa RCP personnelle ; leur étendue respective résulte des polices et n’est pas étendue par ce contrat. L’Agent n’accomplit pas les actes pour lesquels une condition d’exercice fait défaut ; une simple échéance documentaire appelle vérification de la couverture et remise du justificatif à jour. Les droits acquis sont préservés. Les références actualisées remplacent les anciennes références administratives sans avenant, sauf modification des pouvoirs ou du périmètre des missions.",
        en: "BSTAY maintains its professional licence, the financial guarantee required for its activities and its own professional liability insurance. It provides the current certificates on signature and updated versions at each renewal, and reports without delay any withdrawal, suspension or change affecting the assignments. BSTAY’s insurance does not exempt the Agent from his personal professional liability insurance; their respective scope results from the policies and is not extended by this agreement. The Agent does not perform acts for which a condition of practice is missing; a mere document expiry calls for checking the cover and providing the updated certificate. Accrued rights are preserved. Updated references replace earlier administrative references without amendment, unless the powers or scope of the assignments change.",
      },
    ],
  },
  {
    n: 11,
    title: {
      fr: "Clientèle et confidentialité",
      en: "Clients and confidentiality",
    },
    blocks: [
      {
        kind: "p",
        fr: "Les mandats sont conclus au profit de BSTAY. Les bases, dossiers, supports, photographies et outils de la Société restent sous son contrôle, dans la limite des droits qu’elle détient et des droits des tiers. Les clients conservent leur liberté de choix. Aucune clause ne crée un droit de propriété sur les personnes ou leurs données personnelles.",
        en: "Mandates are entered into for BSTAY. The Company’s databases, files, materials, photographs and tools remain under its control, within the limits of the rights it holds and the rights of third parties. Clients remain free to choose. No clause creates any ownership right over persons or their personal data.",
      },
      {
        kind: "p",
        fr: "L’Agent n’utilise les informations non publiques que pour sa mission. Cette obligation couvre notamment l’identité et les séjours des clients, les biens non publiés, prix confidentiels, codes d’accès, coordonnées, conditions commerciales, méthodes et documents internes. Elle ne couvre pas les informations devenues publiques sans faute, déjà légitimement connues ou obtenues licitement hors du contrat.",
        en: "The Agent uses non-public information only for his assignment. This obligation covers in particular clients’ identity and stays, unlisted properties, confidential prices, access codes, contact details, commercial terms, internal methods and documents. It does not cover information that has become public through no fault, was already lawfully known or was lawfully obtained outside the agreement.",
      },
      {
        kind: "p",
        fr: "L’obligation subsiste cinq ans après la cessation. La protection des secrets d’affaires perdure tant que les conditions légales de cette protection sont réunies ; les obligations légales relatives aux données personnelles restent applicables. Les communications légalement exigées, les signalements protégés et la défense des droits sont réservés, dans la stricte mesure nécessaire.",
        en: "This obligation survives for five years after termination. Protection of trade secrets continues for as long as the legal conditions for such protection are met; legal obligations relating to personal data remain applicable. Legally required disclosures, protected whistleblowing and the defence of rights are reserved, strictly to the extent necessary.",
      },
    ],
  },
  {
    n: 12,
    title: {
      fr: "Données personnelles et sécurité",
      en: "Personal data and security",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent utilise les données uniquement pour les missions confiées. Il protège ses appareils et identifiants, utilise les outils et canaux sécurisés communiqués par BSTAY et limite les copies aux besoins autorisés. Aucun export du portefeuille, stockage dans un compte personnel, transfert non autorisé ni envoi de pièces d’identité par messagerie personnelle n’est permis. Toute perte, divulgation, suspicion d’accès indu ou demande d’exercice d’un droit est signalée sans délai à BSTAY par le canal désigné.",
        en: "The Agent uses data solely for the assignments entrusted to him. He protects his devices and login credentials, uses the secure tools and channels provided by BSTAY and limits copies to authorised needs. No export of the portfolio, storage in a personal account, unauthorised transfer or sending of identity documents via personal messaging is permitted. Any loss, disclosure, suspected unauthorised access or data subject request is reported to BSTAY without delay through the designated channel.",
      },
      {
        kind: "p",
        fr: "BSTAY détermine les finalités et moyens essentiels de son fichier clients. L’Agent respecte les instructions documentées pour les opérations réalisées pour BSTAY et assume, en qualité de responsable de traitement, les traitements dont il détermine lui-même les finalités et moyens, notamment ceux requis pour ses propres obligations professionnelles. La qualification de chaque opération dépend des conditions réelles d’exercice.",
        en: "BSTAY determines the purposes and essential means of its client database. The Agent follows documented instructions for processing carried out for BSTAY and is responsible, as data controller, for processing whose purposes and means he determines himself, in particular processing required for his own professional obligations. The classification of each processing operation depends on how it is actually carried out.",
      },
      {
        kind: "strong",
        fr: "Traitements réalisés pour le compte de BSTAY",
        en: "Processing carried out on behalf of BSTAY",
      },
      {
        kind: "p",
        fr: "Dans la mesure où l’Agent agit comme sous-traitant, les clauses ci-dessous s’appliquent à la consultation, à la collecte, à la saisie, à la mise à jour et à la transmission sécurisée des données pour la prospection autorisée, les visites, les offres, le suivi des ventes, la mise en relation prévue à l’article 20 et la préparation des vérifications de conformité de BSTAY. Sont concernés les prospects, vendeurs, acquéreurs, contacts orientés vers la location, représentants et bénéficiaires effectifs. Les données se limitent aux coordonnées, informations sur le bien et l’opération, échanges et, lorsque nécessaires, justificatifs d’identité, de pouvoirs et de financement. Le traitement dure le temps de la mission concernée et de la restitution ou suppression prévue ci-dessous.",
        en: "To the extent the Agent acts as a processor, the clauses below apply to consulting, collecting, entering, updating and securely transmitting data for authorised prospecting, viewings, offers, sales follow-up, referrals under Article 20 and preparation of BSTAY’s compliance checks. The data subjects are prospects, sellers, buyers, contacts referred to the rental service, representatives and beneficial owners. The data are limited to contact details, information about the property and the transaction, correspondence and, where necessary, proof of identity, powers and financing. Processing lasts for the duration of the assignment concerned and of the return or deletion provided for below.",
      },
      {
        kind: "p",
        fr: "BSTAY définit et documente les instructions et les destinataires autorisés. L’Agent traite les données sur ces seules instructions, y compris pour les transferts hors de l’Espace économique européen. Si la loi lui impose un traitement, il en informe BSTAY avant de l’effectuer, sauf interdiction légale. Il signale immédiatement toute instruction qui lui paraît contraire aux règles de protection des données. Il veille à ce que les personnes autorisées soient tenues à la confidentialité et applique les mesures de sécurité de l’article 32 du RGPD, adaptées aux risques.",
        en: "BSTAY defines and documents the instructions and authorised recipients. The Agent processes the data only on these instructions, including for transfers outside the European Economic Area. If the law requires him to carry out processing, he informs BSTAY before doing so, unless legally prohibited. He immediately reports any instruction that appears to him to breach data protection rules. He ensures that authorised persons are bound by confidentiality and applies the security measures of Article 32 GDPR, appropriate to the risks.",
      },
      {
        kind: "p",
        fr: "L’Agent ne confie aucun traitement à un prestataire ultérieur sans autorisation écrite préalable et spécifique de BSTAY. Il lui impose les mêmes obligations de protection des données et demeure responsable envers BSTAY de leur exécution. Il aide BSTAY, compte tenu de la nature du traitement et des informations disponibles, à répondre aux demandes d’exercice des droits et à respecter les articles 32 à 36 du RGPD. Il notifie toute violation sans délai après en avoir pris connaissance et transmet les éléments connus nécessaires à son traitement.",
        en: "The Agent does not engage any sub-processor without BSTAY’s prior specific written authorisation. He imposes the same data protection obligations on it and remains liable to BSTAY for their performance. Taking into account the nature of the processing and the information available, he assists BSTAY in responding to data subject requests and complying with Articles 32 to 36 GDPR. He notifies any breach without delay after becoming aware of it and provides the known information needed to handle it.",
      },
      {
        kind: "p",
        fr: "L’Agent met à la disposition de BSTAY les informations nécessaires pour démontrer le respect de l’article 28 du RGPD et permet les vérifications et audits, y compris les inspections, réalisés par BSTAY ou son auditeur. En fin de traitement, selon le choix de BSTAY, il restitue ou supprime les données traitées pour son compte et détruit les copies, sauf conservation imposée par le droit applicable.",
        en: "The Agent makes available to BSTAY the information needed to demonstrate compliance with Article 28 GDPR and allows checks and audits, including inspections, carried out by BSTAY or its auditor. At the end of processing, at BSTAY’s choice, he returns or deletes the data processed on its behalf and destroys copies, unless retention is required by applicable law.",
      },
      {
        kind: "p",
        fr: "À la cessation, l’Agent cesse toute utilisation des données clients et confirme la restitution ou la suppression demandée. Les données conservées par l’Agent au titre de ses propres obligations légales ou, dans la stricte mesure nécessaire, à la défense de ses droits, sont isolées, sécurisées et exclues de toute prospection. BSTAY remet à l’Agent, séparément, la notice relative au traitement de ses propres données et le contact d’exercice de ses droits.",
        en: "On termination, the Agent stops all use of client data and confirms the requested return or deletion. Data kept by the Agent for his own legal obligations or, strictly to the extent necessary, for the defence of his rights, are isolated, secured and excluded from any prospecting. BSTAY separately provides the Agent with the notice on the processing of his own data and the contact for exercising his rights.",
      },
    ],
  },
  {
    n: 13,
    title: {
      fr: "Relation clientèle et image de BSTAY",
      en: "Client relations and BSTAY’s image",
    },
    blocks: [
      {
        kind: "p",
        fr: "L’Agent utilise la marque et les supports BSTAY uniquement pour ses missions et selon les autorisations reçues. Il utilise les modèles validés et fait figurer sa qualité d’agent commercial ainsi que les références professionnelles requises sur les publicités et documents concernés. Il respecte le barème BSTAY et n’accorde aucune remise sans accord écrit préalable. BSTAY établit les factures destinées aux clients ; l’Agent n’encaisse aucun règlement pour leur compte ou celui de BSTAY.",
        en: "The Agent uses the BSTAY brand and materials only for his assignments and as authorised. He uses the approved templates and shows his capacity as commercial agent and the required professional references on the relevant advertisements and documents. He complies with BSTAY’s fee schedule and grants no discount without prior written approval. BSTAY issues invoices to clients; the Agent collects no payment on their behalf or on BSTAY’s behalf.",
      },
      {
        kind: "p",
        fr: "Les informations données au client sont vérifiées, exactes et présentées avec soin. Une incertitude importante est signalée avant engagement. Les échanges sont courtois, clairs et adaptés ; les délais annoncés sont réalistes. Les identités, séjours, documents, habitudes et accès privés des clients sont protégés. Aucune publication de photo, vidéo ou présence d’un client n’intervient sans les autorisations nécessaires.",
        en: "Information given to clients is checked, accurate and carefully presented. Any significant uncertainty is reported before any commitment. Communications are courteous, clear and appropriate; timeframes announced are realistic. Clients’ identities, stays, documents, habits and private access are protected. No photo, video or mention of a client’s presence is published without the necessary authorisations.",
      },
      {
        kind: "p",
        fr: "Les clés et codes sont sécurisés et ne sont pas publiquement reliés à l’adresse du bien. Les incidents, réclamations et difficultés affectant un dossier sont signalés au référent BSTAY. L’Agent propose des solutions sans engager une remise, dépense ou responsabilité sans pouvoir. Ces standards concernent le résultat attendu du service et n’imposent ni horaires ni présence générale.",
        en: "Keys and codes are secured and are not publicly linked to the property’s address. Incidents, complaints and difficulties affecting a file are reported to the BSTAY contact person. The Agent may propose solutions but commits to no discount, expense or liability without authority. These standards concern the expected service outcome and impose neither working hours nor general attendance.",
      },
      {
        kind: "p",
        fr: "Les coordonnées, attributions, visites, offres, pièces et étapes utiles sont renseignées dans les outils autorisés pour permettre le suivi et la continuité du service. Le CRM n’est pas utilisé pour contrôler la présence, la durée du travail ou les déplacements personnels. Aucun compte rendu journalier systématique d’activité n’est exigé.",
        en: "Contact details, allocations, viewings, offers, documents and relevant steps are entered in the authorised tools to ensure follow-up and continuity of service. The CRM is not used to monitor attendance, working time or personal movements. No systematic daily activity report is required.",
      },
      {
        kind: "p",
        fr: "L’Agent transmet sans délai les réclamations des clients à BSTAY et utilise les mentions de médiation validées par celle-ci sur les supports concernés. Il ne prend aucun engagement au nom de BSTAY sans pouvoir écrit.",
        en: "The Agent forwards client complaints to BSTAY without delay and uses the mediation notices approved by BSTAY on the relevant materials. He makes no commitment on BSTAY’s behalf without written authority.",
      },
      {
        kind: "p",
        fr: "Chaque partie s’abstient de dénigrer l’autre. Cette obligation ne fait obstacle ni aux témoignages sincères, ni aux signalements licites, ni à l’exercice des droits de défense. La publicité ne doit pas présenter l’Agent comme titulaire personnel de la carte professionnelle de BSTAY.",
        en: "Each party refrains from disparaging the other. This obligation does not prevent truthful testimony, lawful reporting or the exercise of rights of defence. Advertising must not present the Agent as personally holding BSTAY’s professional licence.",
      },
    ],
  },
  {
    n: 14,
    title: {
      fr: "Protection de la clientèle après la cessation",
      en: "Client protection after termination",
    },
    blocks: [
      {
        kind: "p",
        fr: "Pendant douze mois à compter de la cessation effective du contrat, l’Agent s’abstient de démarcher activement et de manière ciblée les vendeurs ou acquéreurs qu’il a personnellement suivis pour BSTAY au cours des douze derniers mois de la collaboration, dans le but de détourner un dossier ou une relation commerciale au profit d’une activité concurrente de vente immobilière.",
        en: "For twelve months from the effective termination of the agreement, the Agent refrains from actively and specifically soliciting sellers or buyers he personally followed for BSTAY during the last twelve months of the collaboration, with the aim of diverting a file or business relationship to a competing real estate sales activity.",
      },
      {
        kind: "p",
        fr: "Cette obligation n’interdit pas à l’Agent d’exercer une activité concurrente ni de travailler dans une commune où il est intervenu. Une communication générale non ciblée ou une prise de contact spontanée et non provoquée d’un client ne constitue pas, à elle seule, une sollicitation interdite. Le libre choix du client demeure entier.",
        en: "This obligation does not prevent the Agent from carrying on a competing activity or working in a municipality where he has operated. General untargeted communication, or a spontaneous and unsolicited approach by a client, does not in itself constitute prohibited solicitation. The client’s freedom of choice remains complete.",
      },
      {
        kind: "p",
        fr: "L’Agent reste tenu aux obligations de confidentialité et de protection des données des articles 11 et 12. Il ne peut réutiliser les fichiers de BSTAY, ses dossiers ou ses informations confidentielles à des fins de prospection personnelle ou pour un tiers.",
        en: "The Agent remains bound by the confidentiality and data protection obligations of Articles 11 and 12. He may not reuse BSTAY’s databases, files or confidential information for his own prospecting or for a third party.",
      },
      {
        kind: "p",
        fr: "L’état prévu à l’article 18 peut identifier les clients effectivement suivis, les mandats en cours et l’avancement des négociations. Il sert à documenter les faits et n’étend pas le champ de l’obligation de non-sollicitation. L’Agent peut présenter ses observations et ses justificatifs.",
        en: "The statement provided for in Article 18 may identify the clients actually followed, current mandates and the progress of negotiations. It serves to document the facts and does not extend the scope of the non-solicitation obligation. The Agent may submit his comments and supporting documents.",
      },
      {
        kind: "p",
        fr: "Pendant le contrat et douze mois après, chaque partie s’abstient de débauchage actif et ciblé des salariés ou agents de l’autre avec lesquels elle a effectivement travaillé. Une annonce générale ou une candidature spontanée n’est pas interdite en elle-même. Aucun engagement ne restreint les signalements licites ou l’exercice des droits de défense.",
        en: "During the agreement and for twelve months afterwards, each party refrains from actively and specifically poaching the other’s employees or agents with whom it has actually worked. A general job advertisement or an unsolicited application is not prohibited in itself. No undertaking restricts lawful reporting or the exercise of rights of defence.",
      },
    ],
  },
  {
    n: 15,
    title: {
      fr: "Responsabilité et clause pénale",
      en: "Liability and penalty clause",
    },
    blocks: [
      {
        kind: "p",
        fr: "Chaque partie répond des fautes qui lui sont imputables. L’indépendance de l’Agent ne supprime pas les responsabilités légales de BSTAY envers les tiers. Un recours suppose une faute, un préjudice établi et un lien causal, en tenant compte des fautes partagées. Les parties coopèrent avec leurs assureurs ; l’Agent ne reconnaît aucune responsabilité au nom de BSTAY sans pouvoir écrit.",
        en: "Each party is liable for the faults attributable to it. The Agent’s independence does not remove BSTAY’s legal liability to third parties. Any claim requires a fault, established loss and a causal link, taking into account shared fault. The parties cooperate with their insurers; the Agent admits no liability on BSTAY’s behalf without written authority.",
      },
      {
        kind: "p",
        fr: "La violation prouvée d’une obligation de confidentialité ou de non-sollicitation valablement applicable peut donner lieu à une pénalité de 15 000 euros par manquement autonome. Une même séquence de faits sur un même dossier n’est pas sanctionnée plusieurs fois par cumul de qualifications. Il n’y a pas de double réparation d’un même préjudice ; des préjudices distincts peuvent être réparés sur preuve.",
        en: "A proven breach of a validly applicable confidentiality or non-solicitation obligation may give rise to a penalty of EUR 15,000 per separate breach. The same sequence of facts on the same file is not penalised more than once by combining legal characterisations. The same loss is not compensated twice; distinct losses may be compensated on proof.",
      },
      {
        kind: "p",
        fr: "Sauf inexécution définitive, la mise en demeure légalement requise précède l’exigibilité de la pénalité. Le pouvoir du juge de modérer ou augmenter une pénalité manifestement excessive ou dérisoire est réservé par l’article 1231-5 du Code civil. Aucune pénalité contestée n’est prélevée sur les commissions hors des conditions légales de compensation.",
        en: "Except in the case of definitive non-performance, the legally required formal notice must precede the penalty becoming payable. The court’s power to reduce or increase a manifestly excessive or derisory penalty is reserved under Article 1231-5 of the French Civil Code. No disputed penalty is deducted from commissions outside the legal conditions for set-off.",
      },
    ],
  },
  {
    n: 16,
    title: {
      fr: "Préavis et cessation",
      en: "Notice and termination",
    },
    blocks: [
      {
        kind: "p",
        fr: "Le contrat à durée indéterminée peut être rompu par chaque partie selon les notifications formelles de l’article 21. Le préavis minimal est d’un mois pendant la première année, deux mois pendant la deuxième année commencée et trois mois à compter de la troisième année commencée. Il court à la première présentation de la notification ; son terme coïncide avec la fin d’un mois civil conformément à l’article L.134-11, sauf convention licite contraire.",
        en: "This indefinite-term agreement may be terminated by either party by formal notification under Article 21. The minimum notice period is one month during the first year, two months once the second year has begun and three months once the third year has begun. It runs from the first presentation of the notification; it ends on the last day of a calendar month in accordance with Article L.134-11, unless otherwise lawfully agreed.",
      },
      {
        kind: "p",
        fr: "La faute grave et la force majeure produisent les effets légalement prévus. Un défaut de résultat ou une pièce manquante ne constitue pas automatiquement une faute grave. Un manquement régularisable appelle, sauf urgence ou inexécution définitive, une mise en demeure précise avec un délai adapté, en principe quinze jours. Les qualifications et les conséquences d’une rupture restent soumises aux règles impératives et à l’appréciation du juge.",
        en: "Serious misconduct (faute grave) and force majeure have the effects provided by law. Lack of results or a missing document does not automatically constitute serious misconduct. A remediable breach calls, except in urgent cases or definitive non-performance, for a precise formal notice with an appropriate deadline, in principle fifteen days. The characterisation and consequences of termination remain subject to mandatory rules and the court’s assessment.",
      },
    ],
  },
  {
    n: 17,
    title: {
      fr: "Dossiers en cours et droits après le départ",
      en: "Pending files and rights after departure",
    },
    blocks: [
      {
        kind: "sub",
        fr: "17.1 Commissions déjà acquises",
        en: "17.1 Commissions already accrued",
      },
      {
        kind: "p",
        fr: "La cessation ne supprime pas les commissions légalement acquises. Une vente réalisée avant le départ conserve son taux applicable même si les honoraires sont encaissés ensuite. Aucun abattement ne résulte du seul départ pour ces droits.",
        en: "Termination does not cancel legally accrued commissions. A sale completed before departure keeps its applicable rate even if the fees are collected afterwards. No reduction of these rights results from departure alone.",
      },
      {
        kind: "sub",
        fr: "17.2 Avant-contrat signé avant la cessation",
        en: "17.2 Preliminary agreement signed before termination",
      },
      {
        kind: "p",
        fr: "Lorsqu’un compromis, une promesse de vente ou un autre avant-contrat valable engageant les parties a été signé avant la cessation, les parts attribuées à l’Agent restent rémunérées au taux intégral applicable à la phase acquise à la cessation. La signature ultérieure de l’acte authentique n’entraîne pas, à elle seule, de réduction de cette commission. Le paiement suppose que l’opération ouvre effectivement droit à commission et respecte les conditions légales : la seule signature d’un avant-contrat ne rend pas inconditionnellement la commission immédiatement payable.",
        en: "Where a preliminary sale agreement (compromis), promise to sell or other valid preliminary agreement binding the parties was signed before termination, the shares allocated to the Agent continue to be paid at the full rate applicable to the phase reached on termination. Later signature of the notarial deed does not in itself reduce this commission. Payment requires that the transaction actually gives rise to commission and meets the legal conditions: signature of a preliminary agreement alone does not make the commission unconditionally and immediately payable.",
      },
      {
        kind: "p",
        fr: "Une offre acceptée n’est pas automatiquement assimilée à un compromis ou à une vente définitivement formée. Sa portée est appréciée d’après ses termes, les engagements des parties et le droit applicable ; elle bénéficie du présent régime si elle constitue déjà un engagement de vente remplissant les conditions correspondantes. Les commissions légalement acquises restent en toute hypothèse préservées.",
        en: "An accepted offer is not automatically treated as a compromis or a finally concluded sale. Its effect is assessed according to its terms, the parties’ commitments and applicable law; it benefits from this regime if it already constitutes a commitment to sell meeting the corresponding conditions. Legally accrued commissions remain protected in all cases.",
      },
      {
        kind: "sub",
        fr: "17.3 Reprise substantielle après un avant-contrat",
        en: "17.3 Substantial takeover after a preliminary agreement",
      },
      {
        kind: "p",
        fr: "Après un avant-contrat, si le successeur accomplit un travail commercial substantiel nécessaire à la réalisation de la vente, la commission de la part concernée peut être répartie équitablement entre les deux agents, en fonction de leurs contributions respectives. Une présence à l’acte authentique, une courtoisie commerciale ou une simple transmission administrative ne justifie pas un partage.",
        en: "After a preliminary agreement, if the successor performs substantial commercial work necessary to complete the sale, the commission for the share concerned may be divided fairly between the two agents according to their respective contributions. Attending the signing of the notarial deed, a commercial courtesy or a mere administrative handover does not justify a split.",
      },
      {
        kind: "p",
        fr: "BSTAY documente la reprise, en informe l’Agent sortant et propose une répartition motivée. Les intéressés recherchent un accord écrit sur la répartition, sans retarder le suivi du client. Aucune rémunération fixée unilatéralement pour le successeur ne peut être prélevée sur la commission du sortant. En cas de désaccord, la part non contestée est réglée à l’échéance et le différend est soumis à un accord amiable ou à la juridiction compétente.",
        en: "BSTAY documents the takeover, informs the departing Agent and proposes a reasoned split. Those concerned seek a written agreement on the split, without delaying client follow-up. No remuneration set unilaterally for the successor may be deducted from the departing agent’s commission. In the event of disagreement, the undisputed portion is paid when due and the dispute is settled amicably or referred to the competent court.",
      },
      {
        kind: "sub",
        fr: "17.4 Autres dossiers et droit de suite",
        en: "17.4 Other files and post-termination commission",
      },
      {
        kind: "p",
        fr: "Pour les ventes ne relevant pas des articles 17.1 et 17.2, l’Agent a droit à commission dans les conditions de l’article L.134-7 du Code de commerce : lorsque la vente est principalement due à son activité pendant le contrat et conclue dans un délai raisonnable après la cessation, ou lorsque l’ordre du tiers a été reçu par BSTAY ou par l’Agent avant la cessation, dans les conditions de l’article L.134-6 du même code.",
        en: "For sales not covered by Articles 17.1 and 17.2, the Agent is entitled to commission under the conditions of Article L.134-7 of the Commercial Code: where the sale is mainly due to his activity during the agreement and is concluded within a reasonable time after termination, or where the third party’s order was received by BSTAY or by the Agent before termination, under the conditions of Article L.134-6 of the same code.",
      },
      {
        kind: "p",
        fr: "Pour apprécier la contribution de l’Agent, il est tenu compte du lien entre son travail et la vente finalement conclue, notamment de l’obtention du mandat, de la recherche de l’acquéreur, des visites, des offres et de l’état des négociations. L’obtention du mandat de vente n’ouvre pas, à elle seule, un droit automatique à commission après la cessation du contrat. Son rôle dans la conclusion de la vente s’apprécie au regard des circonstances propres à chaque dossier, sans préjudice du droit à commission lorsque l’ordre du tiers a été reçu avant la cessation dans les conditions légales.",
        en: "To assess the Agent’s contribution, account is taken of the link between his work and the sale finally concluded, in particular obtaining the mandate, finding the buyer, viewings, offers and the state of negotiations. Obtaining the sale mandate does not, on its own, give an automatic right to commission after termination. Its role in concluding the sale is assessed in light of the circumstances of each file, without prejudice to the right to commission where the third party’s order was received before termination under the legal conditions.",
      },
      {
        kind: "p",
        fr: "Lorsque le droit est établi, la commission se calcule sur la part concernée, au taux contractuel de la phase acquise à la cessation et sur l’assiette de l’article 7, sans réduction du seul fait du départ. L’apport interne prévu à l’article 20.3 s’applique, le cas échéant. Un partage entre agents successifs n’intervient que si les circonstances le rendent équitable au sens de l’article L.134-8 du Code de commerce, en tenant compte de leurs contributions respectives. La seule intervention du successeur ne suffit pas à réduire la commission du sortant.",
        en: "Where the right is established, the commission is calculated on the share concerned, at the contractual rate of the phase reached on termination and on the base of Article 7, with no reduction merely because of departure. The internal referral fee under Article 20.3 applies where relevant. A split between successive agents applies only if the circumstances make it fair within the meaning of Article L.134-8 of the Commercial Code, taking into account their respective contributions. The successor’s involvement alone is not enough to reduce the departing agent’s commission.",
      },
      {
        kind: "sub",
        fr: "17.5 Apports entre services et indemnité",
        en: "17.5 Inter-department referrals and termination indemnity",
      },
      {
        kind: "p",
        fr: "Les apports interservices relèvent de l’article 20. Leur période de douze mois à compter de la mise en relation se poursuit après le départ ; le droit de suite des ventes ne régit ni les apports en location ni les apports en conciergerie. L’indemnité de cessation est distincte des commissions, de la rémunération de reprise et du préavis. Elle relève des articles L.134-12 et L.134-13, sans plafond ni renonciation anticipée. L’Agent doit notifier dans l’année de la cessation son intention de faire valoir ce droit.",
        en: "Inter-department referrals are governed by Article 20. Their twelve-month period from the introduction continues after departure; the post-termination commission rules for sales do not govern rental or concierge referrals. The termination indemnity is separate from commissions, takeover remuneration and notice. It is governed by Articles L.134-12 and L.134-13, with no cap and no advance waiver. The Agent must give notice, within one year of termination, of his intention to claim this right.",
      },
    ],
  },
  {
    n: 18,
    title: {
      fr: "Passation, décès et incapacité",
      en: "Handover, death and incapacity",
    },
    blocks: [
      {
        kind: "p",
        fr: "À la cessation, BSTAY remet à l’Agent un état daté des mandats, offres, avant-contrats, tâches restantes et commissions potentielles, même sans signature commune. L’Agent peut présenter ses observations et transmettre ses justificatifs. Il remet les dossiers, restitue clés, badges, matériels et supports, cesse d’utiliser la marque et applique l’article 12. La passation ne prive pas l’Agent des sommes légalement acquises. L’omission d’un dossier dans cet état n’emporte pas renonciation aux droits de l’Agent.",
        en: "On termination, BSTAY gives the Agent a dated statement of mandates, offers, preliminary agreements, remaining tasks and potential commissions, even without joint signature. The Agent may submit comments and supporting documents. He hands over the files, returns keys, badges, equipment and materials, stops using the brand and applies Article 12. The handover does not deprive the Agent of legally accrued sums. Omission of a file from this statement does not mean the Agent waives his rights.",
      },
      {
        kind: "p",
        fr: "À la cessation, l’Agent cesse d’utiliser et restitue son attestation d’habilitation à BSTAY. À défaut de restitution, BSTAY la demande par lettre recommandée avec avis de réception ; l’Agent la restitue dans les vingt-quatre heures de la demande, selon l’article 9 du décret n° 72-678. En cas de non-restitution, BSTAY en avise aussitôt le procureur de la République et le président de la CCI compétente et accomplit les formalités de retrait.",
        en: "On termination, the Agent stops using his authorisation certificate and returns it to BSTAY. If it is not returned, BSTAY requests it by registered letter with acknowledgement of receipt; the Agent returns it within twenty-four hours of the request, in accordance with Article 9 of Decree no. 72-678. If it is not returned, BSTAY immediately notifies the Public Prosecutor and the President of the competent CCI and completes the withdrawal formalities.",
      },
      {
        kind: "p",
        fr: "En cas de décès, le contrat personnel cesse ; les ayants droit conservent les commissions transmissibles et le droit à réparation prévu par l’article L.134-12, troisième alinéa. Ils n’exercent pas de missions immobilières sans titre. BSTAY organise la continuité et leur remet les éléments nécessaires à la liquidation des droits après justification de leur qualité.",
        en: "In the event of death, this personal agreement ends; the heirs retain transferable commissions and the right to compensation under the third paragraph of Article L.134-12. They do not carry out real estate assignments without the required licence. BSTAY organises continuity and provides them with the information needed to settle the rights once they prove their status.",
      },
      {
        kind: "p",
        fr: "Une incapacité ou indisponibilité n’efface pas les droits acquis et n’autorise pas un remplacement réglementé informel. Les parties examinent une adaptation ou la cessation selon les règles légales. Les exceptions de l’article L.134-13 relatives notamment à l’âge, l’infirmité ou la maladie empêchant raisonnablement la poursuite sont réservées.",
        en: "Incapacity or unavailability does not cancel accrued rights and does not permit informal replacement in regulated acts. The parties consider an adjustment or termination according to the legal rules. The exceptions in Article L.134-13, relating in particular to age, infirmity or illness reasonably preventing continuation, are reserved.",
      },
    ],
  },
  {
    n: 19,
    title: {
      fr: "Différends et dispositions finales",
      en: "Disputes and final provisions",
    },
    blocks: [
      {
        kind: "p",
        fr: "Le droit français s’applique. Les parties recherchent une solution amiable dans les trente jours de la notification d’un différend ; elles peuvent convenir d’une médiation. Cette démarche ne fait obstacle ni à l’urgence, ni aux mesures conservatoires, ni à la préservation des délais et droits. La compétence matérielle et territoriale résulte des règles légales, sans tribunal de commerce exclusivement imposé à une personne physique non commerçante.",
        en: "French law applies. The parties seek an amicable solution within thirty days of notification of a dispute; they may agree to mediation. This does not prevent urgent action, interim measures or the preservation of time limits and rights. Subject-matter and territorial jurisdiction follow the statutory rules, with no commercial court imposed exclusively on an individual who is not a trader.",
      },
      {
        kind: "p",
        fr: "Le contrat et son annexe financière remplacent les accords antérieurs de même objet sans effacer les droits acquis. Toute modification, hors progression automatique et actualisation administrative prévues, nécessite un avenant. Une clause écartée ne prive pas les autres d’effet si l’économie du contrat est préservée. Le contrat peut être signé électroniquement selon les articles 1366 et 1367 du Code civil ; chaque partie reçoit l’acte complet et les preuves disponibles.",
        en: "This agreement and its financial annex supersede any prior agreements with the same purpose without cancelling accrued rights. Any change, other than the automatic progression and administrative updates provided for, requires an amendment. If a clause is set aside, the others remain effective provided the overall balance of the agreement is preserved. The agreement may be signed electronically under Articles 1366 and 1367 of the Civil Code; each party receives the complete agreement and the available evidence.",
      },
    ],
  },
  {
    n: 20,
    title: {
      fr: "Apports entre services",
      en: "Inter-department referrals",
    },
    blocks: [
      {
        kind: "sub",
        fr: "20.1 Apports vers les autres services de BSTAY",
        en: "20.1 Referrals to other BSTAY departments",
      },
      {
        kind: "p",
        fr: "Pour un client apporté au service de location saisonnière ou de location de résidence secondaire de longue durée, sans suivi commercial de cette location par l’Agent, celui-ci perçoit 10 % des honoraires HT de location revenant à BSTAY pour les opérations réalisées dans les douze mois suivant la mise en relation. Les loyers et dépôts des tiers, taxes, débours et quotes-parts de co-agences sont exclus ; les rémunérations internes ne réduisent pas l’assiette.",
        en: "For a client referred to the holiday rental or long-term second-home rental department, without the Agent handling the commercial follow-up of the rental, the Agent receives 10% of the rental fees excl. VAT accruing to BSTAY for transactions completed within twelve months of the introduction. Third-party rents and deposits, taxes, disbursements and co-agency shares are excluded; internal remuneration does not reduce the base.",
      },
      {
        kind: "p",
        fr: "Un apport qualifié au service conciergerie reste attribué à l’Agent après la cessation. Sa rémunération, lorsqu’elle est prévue, est déterminée par les conditions écrites convenues pour cet apport, notamment le taux ou le forfait, l’assiette et les opérations éligibles. Le taux de 10 % applicable à la location ne s’étend pas à la conciergerie. L’apport ne confère à l’Agent aucune mission directe de location ou de conciergerie.",
        en: "A qualified referral to the concierge department remains attributed to the Agent after termination. Its remuneration, where provided for, is set by the written terms agreed for that referral, in particular the rate or flat fee, the base and the eligible transactions. The 10% rate applicable to rentals does not extend to concierge services. The referral gives the Agent no direct rental or concierge assignment.",
      },
      {
        kind: "sub",
        fr: "20.2 Preuve et durée",
        en: "20.2 Evidence and duration",
      },
      {
        kind: "p",
        fr: "La mise en relation est datée dans le CRM avec le client, le service, la demande qualifiée et les éléments de preuve. BSTAY accuse réception et justifie toute antériorité ou tout apport concurrent opposé. Un nom déjà exploité pour la même demande ne crée pas automatiquement de droit ; une demande distincte peut être reconnue par écrit. La période d’éligibilité est de douze mois à compter de la mise en relation, en location comme en conciergerie. Elle n’est ni raccourcie par le départ de l’Agent, ni renouvelée à chaque opération. Une opération éligible réalisée dans cette période ouvre droit à la rémunération prévue même si BSTAY encaisse après son terme. L’article 8 gouverne le paiement. Ces revenus n’alimentent pas les seuils de progression en transaction.",
        en: "The introduction is dated in the CRM with the client, the department, the qualified request and the evidence. BSTAY acknowledges receipt and justifies any prior or competing referral it relies on. A name already handled for the same request does not automatically create a right; a separate request may be recognised in writing. The eligibility period is twelve months from the introduction, for both rentals and concierge services. It is neither shortened by the Agent’s departure nor renewed with each transaction. An eligible transaction completed within this period gives the right to the agreed remuneration even if BSTAY collects after the period ends. Article 8 governs payment. This income does not count towards the transaction progression thresholds.",
      },
      {
        kind: "sub",
        fr: "20.3 Apports externes et internes en transaction",
        en: "20.3 External and internal referrals in transactions",
      },
      {
        kind: "p",
        fr: "L’apporteur externe ne fait pas partie des collaborateurs, salariés ou agents commerciaux de BSTAY. Sa commission licite est fixée par écrit au cas par cas, sans taux automatique limité à 10 %, et déduite de l’assiette globale avant partage, selon l’article 7.1. Une simple mise en relation occasionnelle ne doit pas masquer une entremise habituelle non autorisée ; une collaboration professionnelle récurrente exige les titres et habilitations applicables aux actes réellement effectués.",
        en: "An external referrer is not one of BSTAY’s staff, employees or commercial agents. Its lawful commission is set in writing case by case, with no automatic cap at 10%, and is deducted from the overall base before the split, under Article 7.1. An occasional introduction must not conceal unauthorised habitual intermediation; a recurring professional collaboration requires the licences and authorisations applicable to the acts actually performed.",
      },
      {
        kind: "p",
        fr: "L’apporteur interne est un collaborateur, salarié ou agent commercial de BSTAY, notamment d’un autre service. Il reçoit 10 % de la commission HT de l’Agent bénéficiaire pour la part concernée, après application de la phase et, le cas échéant, du droit de suite. La déduction affecte cette commission seulement : ni l’assiette globale, ni la part BSTAY, ni la rémunération du senior ou d’un autre agent ne diminuent. Si une seule part est apportée, les 10 % portent uniquement sur cette part ; si les deux sont apportées, ils portent sur les deux commissions cumulées. Aucune double déduction n’est admise. L’apport est identifié avant prise en charge et les droits de l’apporteur sont acceptés dans un accord le concernant.",
        en: "An internal referrer is a member of staff, employee or commercial agent of BSTAY, including from another department. He receives 10% of the commission excl. VAT of the Agent concerned for the relevant share, after applying the phase and, where applicable, the post-termination rules. The deduction affects only that commission: neither the overall base, nor BSTAY’s portion, nor the remuneration of the senior or another agent is reduced. If only one share was referred, the 10% applies only to that share; if both were referred, it applies to both commissions combined. No double deduction is allowed. The referral is identified before the file is taken on and the referrer’s rights are accepted in an agreement concerning him.",
      },
      {
        kind: "p",
        fr: "Exemple pour un agent senior avec les deux parts apportées : honoraires 20 000 euros HT ; apport externe convenu à 10 %, soit 2 000 euros ; assiette restante 18 000 euros. BSTAY conserve 9 000 euros. Commission de l’Agent : 9 000 euros avant apport interne, dont 900 euros pour l’apporteur interne ; solde Agent 8 100 euros. Si seule la part acquéreur est apportée, le prélèvement porte sur 4 500 euros : 450 euros, et non 900 euros. Pour un débutant ou junior, les 10 % portent de même sur la rémunération réellement calculée, pas sur une enveloppe théorique de 50 %. Tous les montants de cet exemple sont HT.",
        en: "Example for a senior agent with both shares referred: fees EUR 20,000 excl. VAT; external referral fee agreed at 10%, i.e. EUR 2,000; remaining base EUR 18,000. BSTAY retains EUR 9,000. Agent’s commission: EUR 9,000 before the internal referral fee, of which EUR 900 goes to the internal referrer; Agent’s balance EUR 8,100. If only the buyer share was referred, the deduction applies to EUR 4,500: EUR 450, not EUR 900. For a beginner or junior, the 10% likewise applies to the remuneration actually calculated, not to a theoretical 50% envelope. All amounts in this example are excl. VAT.",
      },
    ],
  },
  {
    n: 21,
    title: {
      fr: "Notifications",
      en: "Notices",
    },
    blocks: [
      {
        kind: "p",
        fr: "Les notifications formelles de rupture, mises en demeure et décisions relatives à la non-sollicitation sont adressées au siège de BSTAY ou au domicile professionnel ou personnel de l’Agent indiqué aux parties, par lettre recommandée avec avis de réception, lettre recommandée électronique respectant les conditions légales ou acte de commissaire de justice. Le préavis suit l’article 16 ; pour les autres délais, la date de réception légalement opposable s’applique.",
        en: "Formal termination notices, formal notices and decisions relating to non-solicitation are sent to BSTAY’s registered office or to the Agent’s business or home address stated in the parties section, by registered letter with acknowledgement of receipt, by electronic registered letter meeting the legal requirements, or by bailiff’s writ (acte de commissaire de justice). Notice periods follow Article 16; for other time limits, the legally enforceable date of receipt applies.",
      },
      {
        kind: "p",
        fr: "Pour les échanges ordinaires, dossiers, demandes d’appui et confirmations commerciales : BSTAY, valentine@b-stay.com ; Agent, courriel indiqué aux parties. Un courriel ordinaire ne remplace pas une notification formelle imposée ci-dessus, sauf accord ultérieur licite. Tout changement d’adresse ou de courriel est signalé sans délai par un moyen permettant d’en établir la réception ; la partie informée utilise alors les coordonnées actualisées.",
        en: "For ordinary communications, files, support requests and commercial confirmations: BSTAY, valentine@b-stay.com; Agent, the email stated in the parties section. An ordinary email does not replace a formal notification required above, unless subsequently lawfully agreed. Any change of address or email is notified without delay by a means that proves receipt; the party informed then uses the updated details.",
      },
    ],
  },
  {
    n: 22,
    title: {
      fr: "Évolution du mode d’exercice",
      en: "Change in form of business",
    },
    blocks: [
      {
        kind: "p",
        fr: "Un changement administratif ou de régime fiscal de l’entrepreneur individuel ne crée pas une nouvelle partie et ne remet pas son cumul à zéro. Un passage en société ne transfère pas automatiquement le présent contrat ni l’attestation personnelle : la société doit satisfaire aux conditions propres à l’exercice immobilier, notamment détenir sa carte professionnelle lorsque celle-ci est requise. Une reprise nécessite l’accord écrit de BSTAY et un acte de transfert ou un nouveau contrat, précisant les droits acquis, la continuité du CA de progression et la date autorisée de reprise. Aucun acte réglementé n’est accompli par une structure dépourvue du titre nécessaire.",
        en: "An administrative change or change of tax regime of the sole trader does not create a new party and does not reset his cumulative total to zero. Incorporation as a company does not automatically transfer this agreement or the personal authorisation certificate: the company must meet the conditions specific to real estate practice, in particular holding its own professional licence where required. A takeover requires BSTAY’s written consent and a transfer deed or new agreement specifying accrued rights, continuity of progression revenue and the authorised takeover date. No regulated act is performed by an entity lacking the required licence.",
      },
    ],
  },
];

/** The closing sentence, above the two signature boxes. */
export const AGENT_SIGNATURE_CLAUSE: AgentBlock[] = [
  {
    kind: "p",
    fr: "Fait à {{place}}, le {{signatureDate}}. Chaque partie reconnaît recevoir le contrat complet et son annexe financière{{languageMention}}.",
    en: "Done at {{place}}, on {{signatureDate}}. Each party acknowledges receipt of the complete agreement and its financial annex, in the binding French version accompanied by its English translation.",
  },
];

export const AGENT_ANNEX_TITLE: Bilingual = {
  fr: "Annexe financière – Paramètres et exemples",
  en: "Financial annex – Parameters and examples",
};

/** The financial annex: the agent's parameters, then the worked examples. */
export const AGENT_ANNEX: AgentBlock[] = [
  {
    kind: "p",
    fr: "L’annexe fait partie intégrante du présent contrat.",
    en: "This annex forms an integral part of this agreement.",
  },
  {
    kind: "p",
    fr: "Agent : {{agentName}}. Date de prise d’effet : {{effectiveDateShort}}. Date de signature : {{signatureDateShort}}. Phase initiale : {{initialPhase}}. CA de progression initial justifié : {{initialRevenue}}. Les phases applicables découlent de l’article 5 ; une phase initiale différente du cumul chiffré nécessite une dérogation écrite cohérente. Référence RSAC : {{rsacReference}}.",
    en: "Agent: {{agentName}}. Effective date: {{effectiveDateShort}}. Date of signature: {{signatureDateShort}}. Initial phase: {{initialPhase}}. Documented initial progression revenue: {{initialRevenue}}. Applicable phases follow from Article 5; an initial phase differing from the quantified total requires a consistent written exception. RSAC reference: {{rsacReference}}.",
  },
  {
    kind: "sub",
    fr: "A – CA retenu sur 20 000 euros HT",
    en: "A – Revenue counted on EUR 20,000 excl. VAT",
  },
  {
    kind: "table",
    head: [
      {
        fr: "Part attribuée",
        bi: "Part attribuée / Share allocated",
      },
      {
        fr: "CA ajouté à la progression",
        bi: "CA ajouté à la progression / Revenue added to progression",
      },
    ],
    rows: [
      [
        {
          fr: "Vendeur seul",
          bi: "Vendeur seul / Seller only",
        },
        {
          fr: "10 000 euros HT",
          bi: "10 000 euros HT / EUR 10,000 excl. VAT",
        },
      ],
      [
        {
          fr: "Acquéreur seul",
          bi: "Acquéreur seul / Buyer only",
        },
        {
          fr: "10 000 euros HT",
          bi: "10 000 euros HT / EUR 10,000 excl. VAT",
        },
      ],
      [
        {
          fr: "Vendeur et acquéreur",
          bi: "Vendeur et acquéreur / Seller and buyer",
        },
        {
          fr: "20 000 euros HT",
          bi: "20 000 euros HT / EUR 20,000 excl. VAT",
        },
      ],
    ],
  },
  {
    kind: "sub",
    fr: "B – Commissions sur 20 000 euros HT sans déduction",
    en: "B – Commissions on EUR 20,000 excl. VAT with no deductions",
  },
  {
    kind: "table",
    head: [
      {
        fr: "Phase",
        bi: "Phase",
      },
      {
        fr: "Agent une part",
        bi: "Agent une part / one share",
      },
      {
        fr: "Agent deux parts",
        bi: "Agent deux parts / two shares",
      },
      {
        fr: "Senior une part si appui",
        bi: "Senior une part si appui / one share if support",
      },
      {
        fr: "Senior deux parts si appui",
        bi: "Senior deux parts si appui / two shares if support",
      },
    ],
    rows: [
      [
        {
          fr: "Débutant",
          bi: "Débutant / Beginner",
        },
        {
          fr: "3 000 €",
          bi: "3 000 €",
        },
        {
          fr: "6 000 €",
          bi: "6 000 €",
        },
        {
          fr: "2 000 €",
          bi: "2 000 €",
        },
        {
          fr: "4 000 €",
          bi: "4 000 €",
        },
      ],
      [
        {
          fr: "Junior",
          bi: "Junior",
        },
        {
          fr: "4 000 €",
          bi: "4 000 €",
        },
        {
          fr: "8 000 €",
          bi: "8 000 €",
        },
        {
          fr: "1 000 €",
          bi: "1 000 €",
        },
        {
          fr: "2 000 €",
          bi: "2 000 €",
        },
      ],
      [
        {
          fr: "Senior",
          bi: "Senior",
        },
        {
          fr: "5 000 €",
          bi: "5 000 €",
        },
        {
          fr: "10 000 €",
          bi: "10 000 €",
        },
        {
          fr: "0 €",
          bi: "0 €",
        },
        {
          fr: "0 €",
          bi: "0 €",
        },
      ],
    ],
  },
  {
    kind: "p",
    fr: "« Une part » signifie vendeur ou acquéreur ; « deux parts » signifie leur cumul. Sans accompagnement, l’Agent conserve les mêmes taux : sur les deux parts, BSTAY conserve 14 000 euros en phase 1 et 12 000 euros en phase 2. Si les deux parts sont effectivement accompagnées, BSTAY conserve 10 000 euros dans les trois phases. Avec une seule part accompagnée, seule la commission de senior correspondante est versée. Tous ces montants sont HT, avant charges et sans frais ou apport externe.",
    en: "“One share” means seller or buyer; “two shares” means both combined. Without support, the Agent keeps the same rates: on both shares, BSTAY retains EUR 14,000 in phase 1 and EUR 12,000 in phase 2. If both shares are actually supported, BSTAY retains EUR 10,000 in all three phases. If only one share is supported, only the corresponding senior commission is paid. All these amounts are excl. VAT, before charges and with no costs or external referral fee.",
  },
  {
    kind: "sub",
    fr: "C – Exemple de franchissement",
    en: "C – Threshold-crossing example",
  },
  {
    kind: "p",
    fr: "Cumul 45 000 euros HT ; une vente génère 20 000 euros HT et l’Agent a une part. Sa rémunération reste en phase 1 ; le cumul passe à 55 000 euros HT à l’encaissement. Un autre acte signé avant cet encaissement reste en phase 1. Un acte signé après la date de franchissement relève de la phase 2, selon les modalités d’ordre chronologique de l’article 6.3.",
    en: "Cumulative total EUR 45,000 excl. VAT; a sale generates EUR 20,000 excl. VAT and the Agent holds one share. His remuneration remains in phase 1; the total rises to EUR 55,000 excl. VAT on collection. Another deed signed before that collection remains in phase 1. A deed signed after the threshold date falls under phase 2, according to the chronological rules of Article 6.3.",
  },
  {
    kind: "sub",
    fr: "D – Apport externe et apport interne",
    en: "D – External and internal referral",
  },
  {
    kind: "p",
    fr: "Sur 20 000 euros HT, un apport externe convenu à 10 % représente 2 000 euros. L’assiette de commission devient 18 000 euros. Pour une part vendeur d’un débutant : commission Agent 2 700 euros ; commission du senior 1 800 euros si appui effectif, sinon 0 euro. Si cette part vient d’un apport interne, celui-ci reçoit 270 euros, prélevés sur l’Agent qui conserve 2 430 euros. BSTAY et le senior ne supportent pas cette déduction interne. Le CA de progression reste de 10 000 euros HT car l’apport externe ne réduit pas le CA de progression défini à l’article 6.1. La part de co-agence, en revanche, en est exclue.",
    en: "On EUR 20,000 excl. VAT, an external referral fee agreed at 10% amounts to EUR 2,000. The commission base becomes EUR 18,000. For a beginner’s seller share: Agent’s commission EUR 2,700; senior’s commission EUR 1,800 if actual support, otherwise EUR 0. If this share came from an internal referral, the referrer receives EUR 270, deducted from the Agent, who keeps EUR 2,430. BSTAY and the senior do not bear this internal deduction. Progression revenue remains EUR 10,000 excl. VAT, because the external referral fee does not reduce progression revenue as defined in Article 6.1. A co-agency share, by contrast, is excluded from it.",
  },
  {
    kind: "sub",
    fr: "E – Reprise après compromis",
    en: "E – Takeover after a compromis",
  },
  {
    kind: "p",
    fr: "Agent junior part vendeur sur 10 000 euros HT : commission de référence 2 000 euros. Compromis signé avant son départ, puis acte à huit mois : taux intégral conservé, soit 2 000 euros, si la vente aboutit et ouvre droit à rémunération. Une simple présence d’un autre agent à l’acte ne réduit pas cette somme. Si une reprise commerciale substantielle est réellement nécessaire et évaluée contradictoirement à 400 euros HT, un partage équitable peut attribuer 400 euros au successeur et 1 600 euros à l’Agent sortant. Ce montant de 400 euros est un exemple, pas un forfait automatique.",
    en: "Junior Agent, seller share on EUR 10,000 excl. VAT: reference commission EUR 2,000. Compromis signed before his departure, then notarial deed eight months later: full rate kept, i.e. EUR 2,000, if the sale completes and gives rise to remuneration. Another agent merely attending the signing does not reduce this amount. If a substantial commercial takeover is genuinely necessary and jointly valued at EUR 400 excl. VAT, a fair split may allocate EUR 400 to the successor and EUR 1,600 to the departing Agent. This EUR 400 amount is an example, not an automatic flat fee.",
  },
  {
    kind: "p",
    fr: "Sans avant-contrat au départ : si l’Agent junior a droit à la part vendeur au titre de l’article 17.4, la commission sur la même assiette est de 2 000 euros HT avant un éventuel partage équitable. À l’inverse, si l’Agent sortant a seulement obtenu le mandat et qu’un successeur trouve l’acquéreur et mène la vente de bout en bout cinq mois plus tard, ces seuls faits n’ouvrent pas de droit automatique à commission au sortant.",
    en: "No preliminary agreement at departure: if the junior Agent is entitled to the seller share under Article 17.4, the commission on the same base is EUR 2,000 excl. VAT before any fair split. Conversely, if the departing Agent only obtained the mandate and a successor finds the buyer and handles the sale from start to finish five months later, these facts alone give the departing agent no automatic right to commission.",
  },
  {
    kind: "sub",
    fr: "F – Apports vers les autres services",
    en: "F – Referrals to other departments",
  },
  {
    kind: "p",
    fr: "Exemple : mise en relation avec le service location, puis location éligible dans les douze mois, même si l’Agent a quitté BSTAY entre-temps, générant 1 000 euros HT d’honoraires propres à BSTAY : apport Agent 100 euros HT. Un loyer ou dépôt client ne constitue pas l’assiette. Ces sommes ne font pas progresser les seuils de transaction.",
    en: "Example: introduction to the rental department, followed by an eligible rental within twelve months, even if the Agent has left BSTAY in the meantime, generating EUR 1,000 excl. VAT in fees for BSTAY: Agent’s referral fee EUR 100 excl. VAT. A client’s rent or deposit is not part of the base. These amounts do not count towards the transaction thresholds.",
  },
];

/**
 * How the parties sentence describes the agent's registration.
 *
 * The first is the source's own wording. The second is ours, for an agent who
 * already holds a number: the source has no such case, and a contract cannot
 * say a registration "est en cours de constitution" beside its number.
 */
export const AGENT_RSAC_STATUS: Record<"pending" | "registered", Bilingual> = {
  pending: {
    fr: "dont l’immatriculation au Registre spécial des agents commerciaux est en cours de constitution",
    en: "and whose registration with the Special Register of Commercial Agents is being prepared",
  },
  registered: {
    fr: "{{registered}} au Registre spécial des agents commerciaux sous le numéro {{rsac}}",
    en: "registered with the Special Register of Commercial Agents under number {{rsac}}",
  },
};

/** What the annex prints for the RSAC reference until there is one. */
export const AGENT_RSAC_REFERENCE_PENDING: Bilingual = {
  fr: "à communiquer après immatriculation",
  en: "to be provided after registration",
};

/**
 * What the closing sentence adds on a bilingual contract, and only there:
 * a contract set in French alone has no translation to acknowledge.
 */
export const AGENT_LANGUAGE_MENTION =
  ", en version française faisant foi accompagnée de sa traduction anglaise";

/** Who signs for BSTAY, as the source names her under the signature. */
export const AGENT_BSTAY_SIGNATORY: { name: string; capacity: Bilingual } = {
  name: "Valentine Marie Charlotte CLAITTE",
  capacity: { fr: "Présidente", en: "President" },
};
