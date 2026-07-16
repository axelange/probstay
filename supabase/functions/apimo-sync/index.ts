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

// APIMO's populated `owner` shape is unconfirmed (null on every sampled
// property so far). Validate defensively — skip and log rather than
// crash the batch if it doesn't look like what we expect. `email` is
// required (NOT NULL + unique in the DB), so it's validated here too.
async function resolveOwnerId(ownerData: unknown): Promise<string | null> {
  if (!ownerData || typeof ownerData !== "object") return null;
  const owner = ownerData as ApimoProperty;

  const apimoId = toIntOrNull(owner.id);
  const firstName = owner.firstname ?? owner.first_name ?? null;
  const lastName = owner.lastname ?? owner.last_name ?? null;
  const email = owner.email ?? null;

  if (apimoId === null || !firstName || !lastName || !email) {
    console.warn(
      "apimo-sync: unexpected owner shape, skipping contact link",
      JSON.stringify(owner)
    );
    return null;
  }

  const phone = owner.phone ?? owner.mobile ?? null;
  const updatedAt = new Date();

  // `types` is unioned with whatever's already there (rather than
  // overwritten) so re-syncing an Owner never erases a CLIENT (or
  // other) type membership added through a different flow later.
  const [row] = await sql`
    insert into contacts ("apimoId", "firstName", "lastName", "email", "phone", "types", "updatedAt")
    values (${apimoId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${["OWNER"]}, ${updatedAt})
    on conflict ("apimoId") do update set
      "firstName" = excluded."firstName",
      "lastName" = excluded."lastName",
      "email" = excluded."email",
      "phone" = excluded."phone",
      "updatedAt" = excluded."updatedAt",
      "types" = (
        select array_agg(distinct t)
        from unnest(contacts."types" || excluded."types") as t
      )
    returning id
  `;

  return row.id;
}

// APIMO's `user.id` is a different ID space than our own User UUIDs, so
// resolve the actual FK by matching email. Left null if no match — the
// agent likely isn't provisioned as a User yet.
async function resolveAgentId(userData: unknown): Promise<string | null> {
  if (!userData || typeof userData !== "object") return null;
  const user = userData as ApimoProperty;
  if (!user.email) return null;

  const [row] = await sql`select id from users where email = ${user.email}`;
  return row?.id ?? null;
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

async function syncProperty(p: ApimoProperty): Promise<void> {
  const [ownerId, agentId] = await Promise.all([
    resolveOwnerId(p.owner),
    resolveAgentId(p.user),
  ]);

  const record = {
    apimoId: p.id,
    reference: toIntOrNull(p.reference),
    apimoAgencyId: toIntOrNull(p.agency),
    ownerId,
    agentId,
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

    priceValue: p.price?.value ?? null,
    priceMax: p.price?.max ?? null,
    priceCurrency: p.price?.currency ?? null,
    pricePeriod: toIntOrNull(p.price?.period),
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

    for (const p of properties) {
      try {
        await syncProperty(p);
        synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`apimo-sync: failed to sync property ${p.id}`, message);
        warnings.push(`property ${p.id}: ${message}`);
      }
    }

    return new Response(
      JSON.stringify({ total: properties.length, synced, warnings }),
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
