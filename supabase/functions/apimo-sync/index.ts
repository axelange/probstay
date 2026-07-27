import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!);

async function getSecret(name: string): Promise<string> {
  const [row] = await sql`
    select decrypted_secret
    from vault.decrypted_secrets
    where name = ${name}
  `;
  if (!row) {
    throw new Error(`secret not found in vault: ${name}`);
  }
  return row.decrypted_secret;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// deno-lint-ignore no-explicit-any
type ApimoProperty = Record<string, any>;

// --- Bathroom derivation ---------------------------------------------
// APIMO exposes no bathroom count, so it is derived. Ported verbatim
// from the public site (bstay/app/scripts/lib/apimo.mjs) rather than
// reinvented: both systems describe the same properties to the same
// clients, and a villa listed with 5 bathrooms on b-stay.com but 4 here
// is worse than either number being slightly off.
//
// Keep the two in step. If the site's logic changes, change this too.

/**
 * areas[].type ids for bathrooms (APIMO catalog: GET /catalogs/property_areas).
 * 8 Bathroom · 13 Shower room · 41 Bathroom/Lavatory · 42 Shower/Lavatory
 * Excludes 16 Toilettes and 107 Toilette PMR — a standalone WC is not a
 * bathroom.
 */
const BATHROOM_AREA_TYPES = new Set([8, 13, 41, 42]);

/** areas[].type ids for bedrooms. */
const BEDROOM_AREA_TYPES = new Set([1, 53, 115]);

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  sept: 7, huit: 8, neuf: 9, dix: 10,
};

/**
 * The French description.
 *
 * APIMO has no `description` field — the text lives in comments[], one
 * entry per language (en, fr, bg, ru here), under `comment`. Note
 * `comment_full` is null on every property, despite reading like the
 * fuller one.
 *
 * French only for now, since the interface is French. Returns null
 * rather than falling back to another language: a Russian description on
 * a French screen is worse than none, and silently mixing languages in
 * one column would hide that the choice was ever made. All 52 currently
 * carry French.
 */
function frenchDescription(property: ApimoProperty): string | null {
  const comments = Array.isArray(property?.comments) ? property.comments : [];
  const fr = comments.find(
    (c) => c?.language === "fr" && typeof c?.comment === "string" && c.comment.trim()
  );
  return fr ? fr.comment.trim() : null;
}

/** Descriptions live in comments[], not a description field. */
function propertyDescriptionText(property: ApimoProperty): string {
  const chunks: string[] = [];
  for (const comment of property?.comments ?? []) {
    for (const key of ["comment_full", "comment", "title", "subtitle"]) {
      const value = comment?.[key];
      if (typeof value === "string" && value.trim()) chunks.push(value);
    }
  }
  if (property?.name) chunks.push(String(property.name));
  return chunks.join("\n");
}

function bedroomsFromTitles(property: ApimoProperty): number {
  const comments = Array.isArray(property?.comments) ? property.comments : [];
  for (const c of comments) {
    const title = c.title ?? "";
    const match = title.match(/(\d+)\s*(?:chambres?|bedrooms?)\b/i);
    if (match) return Number(match[1]);
  }
  return 0;
}

function countBedroomsFromAreas(property: ApimoProperty): number {
  const areas = Array.isArray(property?.areas) ? property.areas : [];
  let fromAreas = 0;
  for (const area of areas) {
    if (!BEDROOM_AREA_TYPES.has(Number(area?.type))) continue;
    const count = Number(area?.number);
    fromAreas += Number.isFinite(count) && count > 0 ? count : 1;
  }
  return fromAreas;
}

function bedroomsFromDescriptions(property: ApimoProperty): number {
  const text = propertyDescriptionText(property);
  if (!text.trim()) return 0;

  let max = 0;
  const bump = (value: unknown) => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && n <= 24) max = Math.max(max, n);
  };

  const masterPlusOtherSuitesEn = text.match(
    /\bmaster\s+bedroom\b[^.\n]{0,160}\b(\d+)\s+other\s+suites?\b/i,
  );
  if (masterPlusOtherSuitesEn) bump(Number(masterPlusOtherSuitesEn[1]) + 1);

  const masterPlusOtherSuitesFr = text.match(
    /\bchambre\s+de\s+ma[iî]tre\b[^.\n]{0,160}\b(?:de\s+)?(\d+)\s+autres?\s+suites?\b/i,
  );
  if (masterPlusOtherSuitesFr) bump(Number(masterPlusOtherSuitesFr[1]) + 1);

  for (const match of text.matchAll(/\b(\d+)\s+autres?\s+suites?\b/gi)) {
    if (/\b(?:master\s+bedroom|chambre\s+de\s+ma[iî]tre)\b/i.test(text)) {
      bump(Number(match[1]) + 1);
    }
  }

  for (const match of text.matchAll(/\b(\d+)\s*(?:chambres?|bedrooms?)\b/gi)) {
    bump(match[1]);
  }

  return max;
}

function countBedrooms(property: ApimoProperty): number {
  const candidates = [
    Number(property?.bedrooms ?? 0),
    countBedroomsFromAreas(property),
    bedroomsFromTitles(property),
    bedroomsFromDescriptions(property),
  ].filter((n) => Number.isFinite(n) && n > 0);

  if (candidates.length > 0) return Math.max(...candidates);

  const sleeps = Number(property?.sleeps ?? 0);
  if (sleeps > 0) return Math.max(1, Math.floor(sleeps / 2));

  const rooms = Number(property?.rooms ?? 0);
  if (rooms > 1) return Math.max(1, Math.round(rooms) - 1);

  return 0;
}

function countBathroomsFromAreas(property: ApimoProperty): number {
  const areas = Array.isArray(property?.areas) ? property.areas : [];
  let total = 0;
  for (const area of areas) {
    if (!BATHROOM_AREA_TYPES.has(Number(area?.type))) continue;
    const count = Number(area?.number);
    total += Number.isFinite(count) && count > 0 ? count : 1;
  }
  return total;
}

function bathroomsFromDescriptions(property: ApimoProperty): number {
  const text = propertyDescriptionText(property);
  if (!text.trim()) return 0;

  const bedrooms = countBedrooms(property);
  let max = 0;
  const bump = (value: unknown) => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && n <= 24) max = Math.max(max, n);
  };

  const enSuiteEachEn = text.match(
    /\b(\d+)\s*bedrooms?\b[^.\n]{0,160}\beach\s+with\s+(?:its\s+own\s+)?en[- ]?suite\b/i,
  );
  if (enSuiteEachEn) bump(enSuiteEachEn[1]);

  const enSuiteEachFr = text.match(
    /\b(\d+)\s*chambres?\b[^.\n]{0,160}\b(?:chacune|chacun)\s+(?:en\s+suite\s+)?(?:avec\s+)?(?:sa\s+)?(?:salle\s+de\s+bains?|salle\s+de\s+douche)\b/i,
  );
  if (enSuiteEachFr) bump(enSuiteEachFr[1]);

  const chacuneEnSuiteFr = text.match(/\b(\d+)\s*chambres?\b[^.\n]{0,100}\bchacune\s+en\s+suite\b/i);
  if (chacuneEnSuiteFr) bump(chacuneEnSuiteFr[1]);

  const eachEnSuiteEn = text.match(/\b(\d+)\s*bedrooms?\b[^.\n]{0,100}\beach\s+en\s+suite\b/i);
  if (eachEnSuiteEn) bump(eachEnSuiteEn[1]);

  const wordEnSuiteEach = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(?:bedrooms?|chambres?)\b[^.\n]{0,120}\b(?:each\s+with|chacune\s+avec)\s+[^.\n]{0,40}en[- ]?suite\b/i,
  );
  if (wordEnSuiteEach) bump(WORD_NUMBERS[wordEnSuiteEach[1].toLowerCase()]);

  const bedsWithEnSuite = text.match(
    /\b(\d+)\s+(?:\w+\s+)*(?:double\s+)?bedrooms?\s+with\s+en[- ]?suite\s+bathrooms?\b/i,
  );
  if (bedsWithEnSuite) bump(bedsWithEnSuite[1]);

  const chambresWithEnSuite = text.match(
    /\b(\d+)\s+(?:\w+\s+)*chambres?\s+(?:avec|dotées)[^.\n]{0,40}en[- ]?suite\b/i,
  );
  if (chambresWithEnSuite) bump(chambresWithEnSuite[1]);

  let enSuiteBedroomSum = 0;
  for (const match of text.matchAll(/\b(\d+)\s+en[- ]?suite\s+bedrooms?\b/gi)) {
    enSuiteBedroomSum += Number(match[1]);
  }
  if (enSuiteBedroomSum > 0) bump(enSuiteBedroomSum);

  if (/\b(?:each|every)\s+bedroom\b[^.\n]{0,120}\ben[- ]?suite\b/i.test(text) && bedrooms > 0) {
    bump(bedrooms);
  }

  const masterPlusOtherSuitesEn = text.match(
    /\bmaster\s+bedroom\b[^.\n]{0,160}\b(\d+)\s+other\s+suites?\b/i,
  );
  if (masterPlusOtherSuitesEn) bump(Number(masterPlusOtherSuitesEn[1]) + 1);

  const masterPlusOtherSuitesFr = text.match(
    /\bchambre\s+de\s+ma[iî]tre\b[^.\n]{0,160}\b(?:de\s+)?(\d+)\s+autres?\s+suites?\b/i,
  );
  if (masterPlusOtherSuitesFr) bump(Number(masterPlusOtherSuitesFr[1]) + 1);

  for (const match of text.matchAll(/\b(\d+)\s+autres?\s+suites?\b/gi)) {
    if (/\b(?:master\s+bedroom|chambre\s+de\s+ma[iî]tre)\b/i.test(text)) {
      bump(Number(match[1]) + 1);
    } else {
      bump(match[1]);
    }
  }

  const bedsInTitle = bedroomsFromTitles(property);
  if (
    bedsInTitle > 0 &&
    (/\bsuites?\b/i.test(text) || /\ben[- ]?suite\b/i.test(text) ||
      /\bchambre\s+de\s+ma[iî]tre\b/i.test(text))
  ) {
    bump(bedsInTitle);
  }

  const patterns = [
    /\b(\d+)\s*(?:salles?\s+de\s+bains?|sdb)\b/gi,
    /\b(\d+)\s*(?:modern\s+)?bathrooms?\b/gi,
    /\b(\d+)\s*(?:salles?\s+d['’]eau|douches?)\b/gi,
    /\b(\d+)\s*(?:chambres?\s+en\s+suite|suites?\s+en\s+suite)\b/gi,
    /\b(\d+)\s*suites?\b/gi,
    /\b(\d+)\s*(?:en[- ]?suite\s+)?bathrooms?\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) bump(match[1]);
  }

  return max;
}

function countBathrooms(property: ApimoProperty): number {
  const fromAreas = countBathroomsFromAreas(property);
  const fromDescriptions = bathroomsFromDescriptions(property);

  if (fromAreas > 0 || fromDescriptions > 0) {
    return Math.max(fromAreas, fromDescriptions);
  }

  const bedrooms = countBedrooms(property);
  const rooms = Number(property?.rooms);
  // rooms − bedrooms mixes living/dining in with bathrooms — only trust
  // it for small apartments.
  if (bedrooms > 0 && bedrooms <= 2 && Number.isFinite(rooms) && rooms > bedrooms) {
    const nonBedrooms = Math.round(rooms - bedrooms);
    if (nonBedrooms >= 2 && nonBedrooms <= 3) return nonBedrooms;
  }

  const text = propertyDescriptionText(property);
  if (bedrooms >= 2 && (/\bsuites?\b/i.test(text) || /\ben[- ]?suite\b/i.test(text))) {
    return Math.max(bedrooms, bedroomsFromTitles(property));
  }

  // Every property has at least one. (The original expression here was
  // Math.max(1, bedrooms > 0 ? 1 : 1), which is always 1.)
  return 1;
}

/** Trimmed value, or null when APIMO sent "" / null / undefined. */
function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/**
 * Every contact the agency holds, keyed by APIMO id.
 *
 * `property.owner` is only a bare id — the owner's details live behind a
 * second endpoint, gated by its own `contacts` scope. Fetched in one
 * request and indexed rather than looked up per property: the agency has
 * 5052 contacts against 46 distinct owners, so per-owner requests would
 * be 46 round trips against an API whose rate limits APIMO has already
 * asked us to be careful with.
 */
async function fetchContactsById(
  agencyId: string,
  credentials: string
): Promise<Map<string, ApimoProperty>> {
  const response = await fetch(
    `https://api.apimo.pro/agencies/${agencyId}/contacts?limit=10000&offset=0`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  const bodyText = await response.text();
  if (!response.ok) {
    // Thrown, not swallowed: without contacts every property would sync
    // with a null owner, which looks like success.
    throw new Error(
      `apimo contacts request failed: ${response.status} ${bodyText.slice(0, 300)}`
    );
  }

  const body = JSON.parse(bodyText);
  const rows: ApimoProperty[] = Array.isArray(body.contacts) ? body.contacts : [];

  if (typeof body.total_items === "number" && body.total_items > rows.length) {
    console.warn(
      `apimo-sync: contacts total_items (${body.total_items}) exceeds returned (${rows.length}) — pagination needed above 10000.`
    );
  }

  return new Map(rows.map((c) => [String(c.id), c]));
}

/**
 * Upserts one APIMO contact as an Owner, returning our own uuid.
 *
 * Only the columns built from APIMO are written. `iban` and `notes` are
 * BSTAY's own and must survive every sync, the same rule that protects
 * `marketingName` on a property.
 *
 * APIMO's contact payload also carries a plaintext `password` for its
 * extranet, along with spouse details, tax codes and nationalities.
 * None of it is mapped. Do not add it without a reason that outlives
 * this comment.
 */
/**
 * APIMO has no columns for a company's legal form, registration number,
 * the representative's capacity, or a multi-nationality — so the agency
 * writes them as labelled lines in the contact's private `comment`, e.g.
 *
 *   Forme sociale : SOCIETE CIVILE PARTICULIERE
 *   Numéro d'immatriculation : 25SC26315
 *   Capacity / Qualité : GERANT
 *   Nationalité(s) : SUISSE / RUSSE
 *
 * Parsed on the first colon (labels themselves contain "/"), accent- and
 * case-insensitively, matched by keyword so wording can vary.
 */
function parseCommentFields(comment: unknown): {
  legalForm: string | null;
  registrationNumber: string | null;
  repCapacity: string | null;
  repNationality: string | null;
} {
  const out = {
    legalForm: null as string | null,
    registrationNumber: null as string | null,
    repCapacity: null as string | null,
    repNationality: null as string | null,
  };
  if (typeof comment !== "string" || !comment.trim()) return out;

  for (const line of comment.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const value = line.slice(idx + 1).trim();
    if (!value) continue;
    const label = line
      .slice(0, idx)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // strip accents

    if (label.includes("forme sociale")) out.legalForm = value;
    else if (label.includes("immatriculation")) out.registrationNumber = value;
    else if (label.includes("qualite") || label.includes("capacity")) out.repCapacity = value;
    else if (label.includes("nationalit")) out.repNationality = value;
  }
  return out;
}

async function upsertOwner(c: ApimoProperty): Promise<string | null> {
  const apimoId = toIntOrNull(c.id);

  // A company in APIMO carries its raison sociale in `name`, with the
  // person fields (firstname/lastname) holding the legal representative.
  // `name` is the reliable signal — category=2 alone is not (many are
  // professionals who are still individuals). When it is a company the
  // contact's display name IS the raison sociale.
  const companyName = text(c.name);
  const isCompany = companyName !== null;

  const lastName = isCompany ? companyName : text(c.lastname);

  // lastName is the one name the DB still requires (raison sociale for a
  // company, surname for a person). A record without one is unidentifiable,
  // so it is skipped loudly rather than invented.
  if (apimoId === null || !lastName) {
    console.warn(
      `apimo-sync: contact ${c?.id} has no usable name, skipping owner link`
    );
    return null;
  }

  // A company has no first name of its own — that belongs to its rep.
  const firstName = isCompany ? null : text(c.firstname);
  const kind = isCompany ? "COMPANY" : "INDIVIDUAL";
  // Lowercased so casing variants cannot become two people under the
  // unique index. Verified to introduce no collisions among the owners.
  const email = text(c.email)?.toLowerCase() ?? null;
  // `phone` is set on only 2 of 46 owners while `mobile` covers 30 —
  // the fallback is doing the real work here, not the primary field.
  const phone = text(c.phone) ?? text(c.mobile);

  // `types` is unioned rather than overwritten, so re-syncing an Owner
  // never erases a CLIENT (or other) membership added elsewhere.
  //
  // email/phone are COALESCEd, not overwritten: when APIMO carries none
  // (14 of 46 owners have no email), a value completed in BSTAY — an
  // agent filling a contract's missing contact detail — must survive the
  // next sync rather than be wiped back to null. APIMO still wins when it
  // does hold a value.
  const [row] = await sql`
    insert into contacts ("apimoId", "firstName", "lastName", "email", "phone", "kind", "types", "updatedAt")
    values (${apimoId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${kind}::"ContactKind", ${["OWNER"]}, ${new Date()})
    on conflict ("apimoId") do update set
      "firstName" = coalesce(excluded."firstName", contacts."firstName"),
      "lastName" = excluded."lastName",
      "email" = coalesce(excluded."email", contacts."email"),
      "phone" = coalesce(excluded."phone", contacts."phone"),
      "kind" = excluded."kind",
      "updatedAt" = excluded."updatedAt",
      "types" = (
        select array_agg(distinct t)
        from unnest(contacts."types" || excluded."types") as t
      )
    returning id
  `;
  const contactId = row.id as string;

  if (isCompany) {
    // Siège social from the structured address; the representative from the
    // person fields; the rest parsed from the private comment.
    const parsed = parseCommentFields(c.comment);
    const office =
      [text(c.address), text(c.address_more)].filter(Boolean).join(", ") || null;
    const repNationality = parsed.repNationality ?? text(c.nationality);

    // COALESCE(excluded, existing): APIMO wins where it provides a value,
    // but a field it does not carry never wipes a manual BSTAY entry.
    await sql`
      insert into contact_companies (
        "contactId", "legalForm", "registrationNumber", "registeredOffice",
        "repFirstName", "repLastName", "repCapacity", "repBirthDate",
        "repBirthPlace", "repNationality", "updatedAt"
      ) values (
        ${contactId}, ${parsed.legalForm}, ${parsed.registrationNumber}, ${office},
        ${text(c.firstname)}, ${text(c.lastname)}, ${parsed.repCapacity},
        ${toDateOrNull(c.birthday_at)}, ${text(c.birthplace)}, ${repNationality}, ${new Date()}
      )
      on conflict ("contactId") do update set
        "legalForm"          = coalesce(excluded."legalForm", contact_companies."legalForm"),
        "registrationNumber" = coalesce(excluded."registrationNumber", contact_companies."registrationNumber"),
        "registeredOffice"   = coalesce(excluded."registeredOffice", contact_companies."registeredOffice"),
        "repFirstName"       = coalesce(excluded."repFirstName", contact_companies."repFirstName"),
        "repLastName"        = coalesce(excluded."repLastName", contact_companies."repLastName"),
        "repCapacity"        = coalesce(excluded."repCapacity", contact_companies."repCapacity"),
        "repBirthDate"       = coalesce(excluded."repBirthDate", contact_companies."repBirthDate"),
        "repBirthPlace"      = coalesce(excluded."repBirthPlace", contact_companies."repBirthPlace"),
        "repNationality"     = coalesce(excluded."repNationality", contact_companies."repNationality"),
        "updatedAt"          = excluded."updatedAt"
    `;
  } else {
    // No longer (or never) a company: drop any stale company block. Only
    // APIMO-synced owners reach here; BSTAY-only contacts are never touched.
    await sql`delete from contact_companies where "contactId" = ${contactId}`;
  }

  return contactId;
}

async function upsertPictures(propertyId: string, pictures: unknown) {
  if (!Array.isArray(pictures)) return;

  for (const pic of pictures as ApimoProperty[]) {
    const apimoId = toIntOrNull(pic.id);
    if (apimoId === null || !pic.url) {
      console.warn("apimo-sync: skipping picture with missing id/url", JSON.stringify(pic));
      continue;
    }

    const record = {
      propertyId,
      apimoId,
      rank: toIntOrNull(pic.rank),
      url: pic.url,
      widthMax: toIntOrNull(pic.width_max),
      heightMax: toIntOrNull(pic.height_max),
      isPanorama: Boolean(pic.panorama),
    };

    await sql`
      insert into property_pictures ${sql(record)}
      on conflict ("apimoId") do update set ${sql(record, "rank", "url", "widthMax", "heightMax", "isPanorama")}
    `;
  }
}

/**
 * Whether the agency has broadcast this property to us.
 *
 * `exchanges` is APIMO's diffusion list — one entry per partner feed a
 * property is published to. An entry naming our own provider id is the
 * agency saying "this one is for BSTAY".
 *
 * This is not decoration. `step=1` returns every in-progress property
 * the agency has, including ones bound for other portals: at the time of
 * writing, 102 properties of which 52 carry our provider. Without this
 * filter the other 50 would be created here as though they were ours.
 *
 * The correspondence was verified against the 52 already synced: every
 * one carries our provider, and no property outside that set does.
 */
function isBroadcastToUs(p: ApimoProperty, providerId: string): boolean {
  const exchanges = Array.isArray(p.exchanges) ? p.exchanges : [];
  return exchanges.some((e) => String(e?.provider) === String(providerId));
}

// `agentId` is deliberately NOT synced from APIMO: this agency shares a single
// APIMO login, so `p.user` (the API caller) is always the same account holder
// on every property, not the property's real agent. Real assignment lives only
// in `properties.agentId`, set by hand in the app, and this sync must never
// overwrite it. `apimoAgentId` is kept as a raw diagnostic value only.
// `ownerId` is passed in rather than resolved here: owners are upserted
// once up front, since 46 distinct owners span 52 properties and several
// hold more than one.
async function syncProperty(
  p: ApimoProperty,
  ownerId: string | null
): Promise<void> {
  const record = {
    apimoId: p.id,
    reference: toIntOrNull(p.reference),
    apimoAgencyId: toIntOrNull(p.agency),
    ownerId,
    apimoAgentId: toIntOrNull(p.user?.id),

    category: toIntOrNull(p.category),
    subcategory: toIntOrNull(p.subcategory),
    type: toIntOrNull(p.type),
    subtype: toIntOrNull(p.subtype),
    status: toIntOrNull(p.status),
    step: toIntOrNull(p.step),
    quality: toIntOrNull(p.quality),
    name: p.name ?? null,

    address: p.address ?? null,
    addressMore: p.address_more ?? null,
    publishAddress: Boolean(p.publish_address),
    country: p.country ?? null,
    region: p.region?.name ?? null,
    regionApimoId: toIntOrNull(p.region?.id),
    city: p.city?.name ?? null,
    cityApimoId: toIntOrNull(p.city?.id),
    zipcode: p.city?.zipcode ?? null,
    district: p.district?.name ?? null,
    districtApimoId: toIntOrNull(p.district?.id),
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    altitude: toIntOrNull(p.altitude),

    areaValue: p.area?.value ?? null,
    areaUnit: toIntOrNull(p.area?.unit),
    areaTotal: p.area?.total ?? null,
    rooms: toIntOrNull(p.rooms),
    bedrooms: toIntOrNull(p.bedrooms),
    sleeps: toIntOrNull(p.sleeps),
    bathrooms: countBathrooms(p),

    priceValue: p.price?.value ?? null,
    priceMax: p.price?.max ?? null,
    priceCurrency: p.price?.currency ?? null,
    pricePeriod: toIntOrNull(p.price?.period),
    // The agency marked this rate not-to-publish. Distinct from a null
    // value, which is APIMO's "price on demand" — no rate at all.
    priceHidden: p.price?.hide === true,
    priceCommission: p.price?.commission ?? null,
    priceDeposit: p.price?.deposit ?? null,
    priceFees: p.price?.fees ?? null,

    condition: toIntOrNull(p.condition),
    standing: toIntOrNull(p.standing),
    constructionYear: toIntOrNull(p.construction?.construction_year),
    renovationYear: toIntOrNull(p.construction?.renovation_year),

    availability: p.availability ?? null,
    availableAt: toDateOrNull(p.available_at),
    deliveredAt: toDateOrNull(p.delivered_at),

    services: Array.isArray(p.services) ? p.services.map(Number) : [],
    proximities: Array.isArray(p.proximities) ? p.proximities.map(Number) : [],
    tags: Array.isArray(p.tags) ? p.tags.map(Number) : [],

    url: p.url ?? null,
    description: frenchDescription(p),
    updatedAt: new Date(),
  };

  const updateColumns = Object.keys(record).filter((c) => c !== "apimoId");

  const [{ id: propertyId }] = await sql`
    insert into properties ${sql(record)}
    on conflict ("apimoId") do update set ${sql(record, ...updateColumns)}
    returning id
  `;

  await upsertPictures(propertyId, p.pictures);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("expected POST request", { status: 405 });
  }

  const invokeSecret = await getSecret("apimo_sync_invoke_secret");
  if (req.headers.get("x-cron-secret") !== invokeSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const [providerId, token, agencyId] = await Promise.all([
      getSecret("APIMO_PROVIDER_ID"),
      getSecret("APIMO_TOKEN"),
      getSecret("APIMO_AGENCY_ID"),
    ]);

    const credentials = btoa(`${providerId}:${token}`);

    const response = await fetch(
      `https://api.apimo.pro/agencies/${agencyId}/properties?step=1`,
      { headers: { Authorization: `Basic ${credentials}` } }
    );

    const bodyText = await response.text();

    if (!response.ok) {
      console.error("APIMO request failed", response.status, bodyText);
      return new Response(
        JSON.stringify({
          error: "apimo_request_failed",
          status: response.status,
          body: bodyText,
        }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const data = JSON.parse(bodyText);
    const properties: ApimoProperty[] = Array.isArray(data.properties) ? data.properties : [];

    if (typeof data.total_items === "number" && data.total_items !== properties.length) {
      console.warn(
        `apimo-sync: total_items (${data.total_items}) does not match returned properties (${properties.length}) — APIMO may paginate this endpoint; pagination isn't implemented yet.`
      );
    }

    let synced = 0;
    const warnings: string[] = [];

    const ours = properties.filter((p) => isBroadcastToUs(p, providerId));
    const skipped = properties.length - ours.length;

    // Nothing carrying our provider, out of a non-empty feed, is far
    // more likely to be a changed provider id or a shape change at
    // APIMO than the agency genuinely un-broadcasting everything.
    // Surfaced in the response body rather than only the logs, since
    // that is what a human or a cron job actually reads.
    if (properties.length > 0 && ours.length === 0) {
      const message =
        `no property carries provider ${providerId} — refusing to ` +
        `treat ${properties.length} properties as an empty feed`;
      console.error(`apimo-sync: ${message}`);
      warnings.push(message);
    }

    // --- Owners -----------------------------------------------------
    // Resolved before any property is written, so a property is never
    // stored with a null owner merely because the contact had not been
    // fetched yet.
    const ownerApimoIds = [
      ...new Set(ours.map((p) => text(p.owner)).filter((v): v is string => v !== null)),
    ];

    const ownerUuidByApimoId = new Map<string, string>();
    let ownersSynced = 0;

    if (ownerApimoIds.length > 0) {
      const contactsById = await fetchContactsById(agencyId, credentials);

      for (const apimoOwnerId of ownerApimoIds) {
        const contact = contactsById.get(apimoOwnerId);

        if (!contact) {
          const message = `owner ${apimoOwnerId} not present in the contacts feed`;
          console.warn(`apimo-sync: ${message}`);
          warnings.push(message);
          continue;
        }

        try {
          const uuid = await upsertOwner(contact);
          if (uuid) {
            ownerUuidByApimoId.set(apimoOwnerId, uuid);
            ownersSynced++;
          } else {
            warnings.push(`owner ${apimoOwnerId}: no lastName, not linked`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`apimo-sync: failed to sync owner ${apimoOwnerId}`, message);
          warnings.push(`owner ${apimoOwnerId}: ${message}`);
        }
      }
    }

    // --- Properties -------------------------------------------------
    let ownerless = 0;

    for (const p of ours) {
      const apimoOwnerId = text(p.owner);
      const ownerId = apimoOwnerId
        ? ownerUuidByApimoId.get(apimoOwnerId) ?? null
        : null;

      if (ownerId === null) ownerless++;

      try {
        await syncProperty(p, ownerId);
        synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`apimo-sync: failed to sync property ${p.id}`, message);
        warnings.push(`property ${p.id}: ${message}`);
      }
    }

    // `skipped` is reported rather than silently dropped: it is the
    // number the agency controls, so a sudden change in it is the first
    // sign that something moved on their side.
    // `ownerless` is reported because it is the number that silently
    // used to be all of them: a property syncing fine with no owner is
    // the failure this rewrite exists to make visible.
    return new Response(
      JSON.stringify({
        total: properties.length,
        broadcastToUs: ours.length,
        skipped,
        synced,
        owners: {
          referenced: ownerApimoIds.length,
          synced: ownersSynced,
          propertiesLeftOwnerless: ownerless,
        },
        warnings,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("apimo-sync error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
