import { AGENCY } from "@/features/documents/agency";
import type { ContratData } from "@/features/documents/templates/contrat-location-saisonniere";
import type { ConfirmationData } from "@/features/documents/templates/rental-confirmation";

/** Fictional data for the sample document — not a real record. */
export const sampleContrat: ContratData = {
  reference: "BS-2026-0148",
  place: "Cannes",
  date: "23 juillet 2026",
  agency: {
    name: "B-STAY",
    tagline: "Locations d'exception · Côte d'Azur",
    legalForm: "SAS",
    capital: "50 000 €",
    rcs: "RCS Cannes 900 000 000",
    address: "12 boulevard de la Croisette, 06400 Cannes",
    representedBy: "Mme Valentine Roche",
    capacity: "Présidente",
  },
  owner: {
    name: "M. Thomas Buffa",
    detail: "Propriétaire du bien ci-après désigné.",
  },
  tenant: {
    kind: "COMPANY",
    name: "ALANIAN STAR",
    legalForm: "Société Civile Particulière",
    registrationNumber: "25SC26315",
    registeredOffice:
      "c/o Gordon S. Blair, 7 rue du Gabian, Le Gildo Pastor Center, 98000 Monaco",
    representative: "M. Aslan Khabliev",
    capacity: "Gérant",
  },
  property: {
    name: "Villa Reina",
    address: "42 boulevard de la Croisette",
    city: "Cannes (06400)",
    kind: "villa contemporaine avec piscine",
    surface: "320 m²",
    rooms: "8 pièces dont 5 chambres",
    sleeps: "jusqu'à 10 personnes",
  },
  stay: {
    checkIn: "13 août 2026",
    checkOut: "25 août 2026",
    nights: "12 nuits",
    guests: "10 personnes",
  },
  money: {
    rent: "48 000,00 €",
    services: [
      { label: "Conciergerie privée", amount: "2 400,00 €" },
      { label: "Chef à domicile (3 services)", amount: "1 800,00 €" },
    ],
    touristTax: "330,00 €",
    total: "52 530,00 €",
    securityDeposit: "10 000,00 €",
    deposit: "24 000,00 €",
  },
};

/** Fictional data for the sample "Rental Confirmation" — not a real record. */
export const sampleConfirmation: ConfirmationData = {
  reference: "BS-2026-0148",
  agency: {
    legalName: AGENCY.legalName,
    address: AGENCY.address,
    rcs: AGENCY.rcs,
    cartePro: AGENCY.cartePro,
    garantieFinanciere: AGENCY.garantieFinanciere,
    rcp: AGENCY.rcp,
    web: AGENCY.web,
    phone: AGENCY.phone,
  },
  owner: {
    name: "GALIMARD (SAS)",
    representedBy: "Mr Jean-Louis FRAGONARD, Président",
    contact: "jl.fragonard@gmail.com — +33 6 00 08 09 10",
  },
  tenant: {
    name: "Mme Lucie DUBOIS",
    details: [
      { label: { en: "Born in", fr: "Né(e) le" }, value: "10/12/1995, Cannes" },
      { label: { en: "Nationality", fr: "Nationalité" }, value: "Française" },
      { label: { en: "ID card", fr: "CNI" }, value: "n° 22HB032" },
    ],
  },
  property: {
    name: "Villa Solea",
    address: "28 Avenue des Grands Pins — Saint-Tropez 83990",
    securityDeposit: "—",
  },
  stay: {
    checkIn: "15/07/2026",
    checkOut: "15/08/2026",
    nights: "31",
    occupancy: "6 Guests / Occupants",
  },
  services: {
    included: [
      { en: "Water consumption", fr: "consommation d'eau" },
      { en: "Electricity consumption", fr: "consommation électricité" },
      { en: "Internet access Wifi", fr: "accès internet" },
      { en: "Bailiff check-in inspection (600€)", fr: "État des lieux d'entrée par huissier" },
      {
        en: "Housekeeping and pool maintenance at least once per week",
        fr: "entretien ménage et piscine 1 fois par semaine minimum",
      },
    ],
    notIncluded: [
      { en: "Tourist tax — 6,16 € / day / person", fr: "Taxe de séjour — 6,16 € / jour / personne" },
      { en: "Seasonal rental insurance", fr: "Assurance" },
      { en: "Linen and towels", fr: "Linge et serviette" },
      { en: "End-of-stay cleaning", fr: "ménage fin de séjour" },
      { en: "Bailiff check-out inspection", fr: "État des lieux de sortie par huissier" },
    ],
  },
  financial: {
    rows: [
      { label: { en: "Total Rent Excl. VAT", fr: "Loyer total HT" }, amount: "27 273 €" },
      { label: { en: "VAT 10 % (para-hotel service)" }, amount: "2 727 €" },
    ],
    total: "30 000 €",
  },
  payments: [
    { label: { en: "Deposit (50 %)", fr: "Acompte (50 %)" }, amount: "15 000 €", due: "10/04/2026" },
    { label: { en: "Balance", fr: "Solde" }, amount: "15 000 €", due: "15/05/2026" },
  ],
  cancellation: {
    en: [
      "The booking shall become firm and binding upon signature of this Rental Confirmation and full payment of the rental price by the Tenant.",
      "As the reservation is made less than one hundred and twenty (120) days prior to the arrival date, the full rental amount is due immediately from the Tenant.",
      "In the event of cancellation by the Tenant, for any reason whatsoever, no refund shall be made and the full rental amount shall remain payable to the Owner.",
      "In the event of cancellation by the Owner, all sums received shall be refunded to the Tenant.",
      "Force majeure events, as defined by applicable law, shall not give rise to any compensation by either Party.",
    ],
    fr: [
      "La réservation devient ferme et définitive dès signature de la présente Confirmation de location et paiement intégral du prix de la location par le Locataire.",
      "Compte tenu du fait que la réservation intervient à moins de cent vingt (120) jours de la date d'arrivée, la totalité du prix de la location est immédiatement due par le Locataire.",
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
      "This Rental Confirmation constitutes a binding agreement between the Parties.",
      "It forms part of the overall contractual framework governing the rental and shall be read in conjunction with the applicable rental terms.",
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
  signature: {
    owner: { name: "GALIMARD", representedBy: "Jean-Louis Fragonard, Président" },
    agent: { name: "BSTAY", representedBy: "Valentine Claitte, Présidente" },
  },
};
