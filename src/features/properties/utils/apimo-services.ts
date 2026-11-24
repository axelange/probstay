/**
 * APIMO's equipment referentiel ("property_service"), as far as the agency
 * uses it.
 *
 * The sync stores a property's equipment as APIMO's numeric codes and nothing
 * else. These are the labels for every code the agency's listings carry, in
 * the two languages APIMO publishes them in, and sorted into the categories
 * b-stay.com shows them under — same ids, same grouping, so a property reads
 * the same on the site and in a mandate.
 *
 * A snapshot, not the whole referentiel: a code APIMO adds later is unknown
 * here and is left out rather than printed as a number. The durable fix is the
 * one `apimo-labels` names — sync the referentiel into its own table.
 */

export const SERVICE_CATEGORIES = [
  { id: "kitchen", label: "Cuisine" },
  { id: "comfort", label: "Confort & climat" },
  { id: "laundry", label: "Buanderie" },
  { id: "furnishings", label: "Aménagements" },
  { id: "entertainment", label: "Divertissement" },
  { id: "outdoor", label: "Extérieur & jardin" },
  { id: "wellness", label: "Bien-être & sport" },
  { id: "connectivity", label: "Connectivité" },
  { id: "security", label: "Sécurité & accès" },
  { id: "parking", label: "Stationnement" },
  { id: "building", label: "Immeuble & services" },
  { id: "other", label: "Autres" },
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]["id"];

export type ApimoService = {
  id: number;
  fr: string;
  en: string;
  category: ServiceCategoryId;
};

export const APIMO_SERVICES: readonly ApimoService[] = [
  { id: 1, fr: "Internet", en: "Internet", category: "connectivity" },
  { id: 2, fr: "Cheminée", en: "Fireplace", category: "comfort" },
  { id: 3, fr: "Accès PMR", en: "Disabled access", category: "building" },
  { id: 4, fr: "Air conditionné", en: "Air-conditioning", category: "comfort" },
  { id: 5, fr: "Alarme", en: "Alarm system", category: "security" },
  { id: 6, fr: "Ascenseur", en: "Lift", category: "building" },
  { id: 7, fr: "Gardien", en: "Caretaker", category: "building" },
  { id: 8, fr: "Double vitrage", en: "Double glazing", category: "comfort" },
  { id: 9, fr: "Interphone", en: "Intercom", category: "security" },
  { id: 11, fr: "Piscine", en: "Swimming pool", category: "outdoor" },
  { id: 12, fr: "Porte blindée", en: "Security door", category: "security" },
  { id: 13, fr: "Tennis", en: "Tennis court", category: "other" },
  { id: 14, fr: "Arrosage", en: "Irrigation sprinkler", category: "outdoor" },
  { id: 15, fr: "Barbecue", en: "Barbecue", category: "outdoor" },
  {
    id: 16,
    fr: "Portail électrique",
    en: "Electric gate",
    category: "security",
  },
  { id: 18, fr: "Abri de voiture", en: "Car port", category: "parking" },
  {
    id: 19,
    fr: "Maison de gardien",
    en: "Caretaker house",
    category: "building",
  },
  {
    id: 20,
    fr: "Fenêtres coulissantes",
    en: "Sliding windows",
    category: "comfort",
  },
  {
    id: 22,
    fr: "Volets roulants électriques",
    en: "Electric shutters",
    category: "comfort",
  },
  { id: 23, fr: "Stores", en: "Window shade", category: "comfort" },
  {
    id: 24,
    fr: "Stores électriques",
    en: "Electric awnings",
    category: "comfort",
  },
  { id: 25, fr: "Lave-linge", en: "Washing machine", category: "laundry" },
  { id: 26, fr: "Jacuzzi", en: "Jacuzzi", category: "wellness" },
  { id: 27, fr: "Sauna", en: "Sauna", category: "wellness" },
  { id: 28, fr: "Baignoire balnéo", en: "Whirlpool tub", category: "wellness" },
  { id: 30, fr: "Source", en: "Spring", category: "outdoor" },
  {
    id: 31,
    fr: "Groupe électrogène",
    en: "Engine generator",
    category: "other",
  },
  { id: 32, fr: "Lave-vaisselle", en: "Dishwasher", category: "kitchen" },
  { id: 33, fr: "Plaque de cuisson", en: "Hob", category: "kitchen" },
  { id: 34, fr: "Coffre-fort", en: "Safe", category: "security" },
  { id: 35, fr: "Héliport", en: "Helipad", category: "other" },
  { id: 36, fr: "Vidéophone", en: "Videophone", category: "security" },
  {
    id: 37,
    fr: "Vidéo surveillance",
    en: "Video security",
    category: "security",
  },
  { id: 38, fr: "Cuisinière", en: "Stove", category: "kitchen" },
  { id: 39, fr: "Fer à repasser", en: "Iron", category: "laundry" },
  { id: 40, fr: "Sèche-cheveux", en: "Hair dryer", category: "furnishings" },
  { id: 41, fr: "Télévision", en: "Television", category: "entertainment" },
  { id: 42, fr: "Lecteur DVD", en: "DVD Player", category: "entertainment" },
  { id: 43, fr: "Lecteur CD", en: "CD Player", category: "entertainment" },
  {
    id: 44,
    fr: "Éclairage extérieur",
    en: "Outdoor lighting",
    category: "outdoor",
  },
  { id: 45, fr: "Spa", en: "Spa", category: "wellness" },
  { id: 46, fr: "Domotique", en: "Home automation", category: "comfort" },
  { id: 47, fr: "Meublé", en: "Furnished", category: "furnishings" },
  { id: 48, fr: "Linge de maison", en: "Linens", category: "furnishings" },
  { id: 49, fr: "Vaisselle", en: "Tableware", category: "kitchen" },
  { id: 50, fr: "Sèche-linge", en: "Clothes dryer", category: "laundry" },
  { id: 51, fr: "Téléphone", en: "Phone", category: "connectivity" },
  { id: 52, fr: "Réfrigérateur", en: "Refrigerator", category: "kitchen" },
  { id: 53, fr: "Four", en: "Oven", category: "kitchen" },
  { id: 54, fr: "Reception 24/7", en: "Reception 24/7", category: "building" },
  { id: 55, fr: "Cafetière", en: "Coffeemaker", category: "kitchen" },
  {
    id: 56,
    fr: "Four à micro-ondes",
    en: "Microwave oven",
    category: "kitchen",
  },
  { id: 60, fr: "Digicode", en: "Digicode", category: "security" },
  {
    id: 61,
    fr: "Buanderie commune",
    en: "Common laundry",
    category: "laundry",
  },
  { id: 62, fr: "Animaux autorisés", en: "Pets allowed", category: "other" },
  {
    id: 70,
    fr: "Thermostat connecté",
    en: "Connected thermostat",
    category: "comfort",
  },
  { id: 71, fr: "Jeu de boules", en: "Boules court", category: "outdoor" },
  {
    id: 72,
    fr: "Adoucisseur d'eau",
    en: "Water softener",
    category: "outdoor",
  },
  { id: 73, fr: "Triple vitrage", en: "Triple glazing", category: "comfort" },
  { id: 74, fr: "Forage", en: "Well drilling", category: "outdoor" },
  {
    id: 75,
    fr: "Fibre optique",
    en: "Optical fiber",
    category: "connectivity",
  },
  {
    id: 80,
    fr: "Alarme incendie",
    en: "Fire alarm system",
    category: "security",
  },
  { id: 82, fr: "Terrain de jeux", en: "Playground", category: "outdoor" },
  { id: 83, fr: "Golf", en: "Golf", category: "outdoor" },
  {
    id: 105,
    fr: "Ventilation double flux",
    en: "Double flow ventilation",
    category: "comfort",
  },
  {
    id: 108,
    fr: "Jardin en copropriété",
    en: "Condominium garden",
    category: "outdoor",
  },
  { id: 111, fr: "Congélateur", en: "Freezer", category: "kitchen" },
  { id: 112, fr: "Concierge", en: "Concierge", category: "building" },
  { id: 114, fr: "Salle de sport", en: "Fitness", category: "wellness" },
  {
    id: 115,
    fr: "Borne voiture électrique",
    en: "Electric car terminal",
    category: "parking",
  },
  { id: 116, fr: "Panneaux solaires", en: "Solar panels", category: "other" },
  { id: 121, fr: "Place de port", en: "Berth", category: "parking" },
  { id: 123, fr: "Moustiquaires", en: "Flyscreens", category: "other" },
  {
    id: 124,
    fr: "Service de sécurité",
    en: "Security service",
    category: "security",
  },
  {
    id: 125,
    fr: "Piscine en copropriété",
    en: "Condominium pool",
    category: "outdoor",
  },
  { id: 128, fr: "Fenêtre PVC", en: "PVC window", category: "comfort" },
  {
    id: 129,
    fr: "Fenêtre aluminium",
    en: "Aluminum window",
    category: "comfort",
  },
  { id: 136, fr: "Clôture", en: "Fence", category: "outdoor" },
  { id: 140, fr: "Cinéma", en: "Cinema", category: "entertainment" },
  {
    id: 141,
    fr: "Barres de fenêtres",
    en: "Window bars",
    category: "security",
  },
];

const BY_ID = new Map(APIMO_SERVICES.map((s) => [s.id, s]));

/**
 * The equipment behind a list of codes, in the order a reader meets it:
 * category by category, as the site lists them. Unknown codes are dropped.
 */
export function servicesFromCodes(codes: readonly number[]): ApimoService[] {
  const wanted = new Set(codes);
  return SERVICE_CATEGORIES.flatMap((c) =>
    APIMO_SERVICES.filter((s) => s.category === c.id && wanted.has(s.id)),
  );
}

export const isApimoService = (id: number) => BY_ID.has(id);
