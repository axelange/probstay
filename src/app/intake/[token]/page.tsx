import Image from "next/image";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/features/intake/components/intake-form";
import { resolveIntake } from "@/features/intake/services/intake-service";

export const metadata = {
  title: "Your details — BSTAY",
  // A client's identification form has no business in a search index, and the
  // token is in the path.
  robots: { index: false, follow: false },
};

/** The agency's own view of the coast, when the booking has no picture. */
const FALLBACK_BANNER = "/img/hero-bstay.webp";

/**
 * The one page a client reaches, and the only one outside the signed-in app.
 *
 * There is no session here: the token in the URL is the whole credential, and
 * proxy.ts lets this path through unauthenticated for exactly that reason.
 * Everything shown is resolved from the token server-side — nothing about
 * which contact this is ever travels in a query string or a form field.
 *
 * A token that is unknown, expired or revoked renders the same 404 as a typo.
 * Telling a visitor which of those it was would let someone probing tokens
 * learn which ones exist.
 *
 * It is laid out as a page of www.b-stay.com, to its own measurements: a fixed
 * 4rem bar, then a banner of `100svh - 4rem` split at `min(50%,720px)` with the
 * photograph on the right. The client has not seen the software and never will
 * — what reaches them should look like the agency they booked with.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveIntake(token);
  if (!resolved) notFound();

  const { stay } = resolved.prefill;
  const banner = stay?.coverPhoto ?? FALLBACK_BANNER;

  return (
    <>
      {/* The site's bar: 4rem, hairline under it, ink at 95% over a blur. The
          banner runs underneath it rather than starting below — which is why
          nothing here reserves its height. */}
      <header className="border-border bg-background/95 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-[12px]">
        <nav className="flex h-16 items-center px-6 md:px-12">
          {/* The "Small Sizes" cut, which is the one the site's bar carries —
              its lettering is drawn wider and lighter for a lockup only 20 px
              tall. The "Big Sizes" cut is a different ratio, 3.36 against
              4.42, and reads as a squatter mark at this height. */}
          <Image
            src="/img/bstay-lockup-white.svg"
            alt="BSTAY"
            width={445}
            height={101}
            priority
            className="h-5 w-auto md:h-6"
          />
        </nav>
      </header>

      <main className="bg-background">
        <section>
          {/* The band, at the site's own measure. `sticky` so it holds while
              the title rides up over it, which is the movement the inner pages
              open with. */}
          <div className="sticky top-0 h-[min(52vh,560px)] min-h-[15rem] w-full overflow-hidden">
            {/* `sticky` is a position, so it already establishes a containing
                block — but next/image refuses to count it as one and warns that
                a `fill` image needs absolute, fixed or relative above it. It
                drew correctly all the same, which is the kind of thing that
                holds until a version bump decides otherwise. A relative box
                inside the sticky one gives the image what it asks for and
                leaves the band's behaviour untouched. */}
            <div className="relative size-full">
              {/* The house they are coming to. Empty alt on purpose: its name is
                set immediately below, and a screen reader reading the picture
                and then the eyebrow would say it twice. */}
              <Image
                src={banner}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              {/* Closes the join between photograph and ground. Short — 3rem,
                5rem from `md` — so it darkens the foot of the picture without
                veiling it. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#111110] md:h-20"
              />
            </div>
          </div>

          <div className="bg-background relative z-10 px-6 pt-12 pb-16 md:px-12 md:pt-16">
            {stay ? (
              <p className="brand-eyebrow mb-5">{stay.property}</p>
            ) : null}
            <h1 className="brand-hero">Your details / Vos informations</h1>
            <p className="brand-lead mt-6 lg:w-3/5">
              {stay
                ? "Please check and complete the details below before your stay."
                : "Please check and complete the details below."}
              <span className="text-muted-foreground block italic">
                {stay
                  ? "Merci de vérifier et de compléter les informations ci-dessous avant votre séjour."
                  : "Merci de vérifier et de compléter les informations ci-dessous."}
              </span>
            </p>
          </div>
        </section>

        <section className="border-border bg-background relative z-10 border-t">
          <div className="mx-auto w-full max-w-2xl px-6 pt-16 pb-24">
            <IntakeForm token={token} prefill={resolved.prefill} />
          </div>
        </section>
      </main>
    </>
  );
}
