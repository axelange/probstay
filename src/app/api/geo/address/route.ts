import { NextResponse } from "next/server";
import { country } from "@/lib/countries";

/**
 * Address suggestions for the client's intake form.
 *
 * Proxied rather than called from the page, although Photon needs no key and
 * there is therefore no secret to hide. Two reasons remain:
 *
 *  - the intake page is public and unauthenticated, so a browser calling
 *    Photon directly would hand a stranger's IP to a third party on our
 *    behalf, once per keystroke;
 *  - a community service asks to be used reasonably, and the only place a cap
 *    can be enforced is here.
 *
 * Photon over Google or Mapbox: it is built for autocomplete rather than
 * geocoding with search bolted on, it needs no account, and nothing has to be
 * agreed about storing what comes back — which matters, since these addresses
 * are kept and printed on contracts.
 */

const PHOTON = "https://photon.komoot.io/api/";

/**
 * Results are drawn toward Cannes.
 *
 * Measured, not assumed: unbiased, "9 rue des Jonquières Cannes" returns a
 * street in Belgium first. Biased, it returns Cannes. The pull is soft — a
 * Moscow, Monaco or London address still resolves first try — so it costs the
 * international clientele nothing and fixes the local case entirely.
 */
const BIAS = { lat: "43.55", lon: "7.01" };

/**
 * Per-IP ceiling, in memory.
 *
 * Honest about what this is: one process's view. Several instances each keep
 * their own count, and a restart forgets everything, so it does not bound
 * total traffic. It bounds what a single page can do to Photon from one
 * address, which is the abuse this route exists to prevent — a token holder
 * holding down a key. A real bound belongs at the edge.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

function countHit(ip: string): { over: boolean; count: number } {
  const now = Date.now();
  const seen = hits.get(ip);
  if (!seen || now > seen.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Housekeeping: without it the map grows for the lifetime of the process.
    if (hits.size > 5_000) {
      for (const [key, v] of hits) if (now > v.resetAt) hits.delete(key);
    }
    return { over: false, count: 1 };
  }
  seen.count += 1;
  return { over: seen.count > MAX_PER_WINDOW, count: seen.count };
}

export type AddressSuggestion = {
  /** What the list shows. */
  label: string;
  /** Street line, house number included when Photon knows it. */
  street: string;
  postalCode: string;
  city: string;
  /** ISO 3166-1 alpha-2, or "" when Photon returns a country we do not list. */
  country: string;
};

type Feature = {
  properties?: Record<string, string | undefined>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  // Two characters match half of Europe and cost a round trip to find that
  // out; the field does not call before three either, and this is the half
  // that cannot be bypassed.
  if (q.length < 3 || q.length > 120) {
    return NextResponse.json({ suggestions: [] });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  // The count rides back on a header, which is both the conventional thing to
  // publish and the only way to see from outside whether the counter is
  // holding its state at all — a module-level map is only as durable as the
  // process, and that is not something to take on faith.
  const { over, count } = countHit(ip);
  const headers = {
    "X-RateLimit-Limit": String(MAX_PER_WINDOW),
    "X-RateLimit-Remaining": String(Math.max(0, MAX_PER_WINDOW - count)),
  };
  if (over) {
    return NextResponse.json(
      { suggestions: [], error: "rate_limited" },
      { status: 429, headers }
    );
  }

  const photon = new URL(PHOTON);
  photon.searchParams.set("q", q);
  photon.searchParams.set("limit", "6");
  photon.searchParams.set("lang", "fr");
  photon.searchParams.set("lat", BIAS.lat);
  photon.searchParams.set("lon", BIAS.lon);

  let payload: { features?: Feature[] };
  try {
    const res = await fetch(photon, {
      headers: { "User-Agent": "BSTAY intake form (contact@b-stay.com)" },
      // The field is typed into; a suggestion that arrives after the next
      // keystroke helps nobody, and the form stays usable without any.
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    payload = await res.json();
  } catch {
    // Silence rather than an error: suggestions are a convenience over fields
    // the client can always fill in by hand.
    return NextResponse.json({ suggestions: [] }, { headers });
  }

  const suggestions: AddressSuggestion[] = [];
  for (const f of payload.features ?? []) {
    const p = f.properties ?? {};
    const street = [p.housenumber, p.street ?? p.name].filter(Boolean).join(" ");
    const city = p.city ?? p.county ?? "";
    const code = (p.countrycode ?? "").toUpperCase();
    if (!street && !city) continue;
    suggestions.push({
      label: [street, [p.postcode, city].filter(Boolean).join(" "), p.country]
        .filter(Boolean)
        .join(", "),
      street,
      postalCode: p.postcode ?? "",
      city,
      // Only a code the application can resolve: an unknown one would fail
      // validation on save, after the client had seen the field fill in.
      country: country(code) ? code : "",
    });
  }

  return NextResponse.json({ suggestions }, { headers });
}
