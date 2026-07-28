import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Fonts are bundled locally (public/fonts) and registered by file path so
// the server render is deterministic — no network fetch, no system-font
// fallback. These are the agency's own licensed brand faces: Passenger
// Display (Colophon) for titles, Neue Haas Grotesk Display Pro (Monotype)
// for body — the same files the brand uses on the web (delivered via
// Typekit there), embedded here rather than fetched from a CDN.
const dir = path.join(process.cwd(), "public", "fonts");
const p = (f: string) => path.join(dir, f);

let done = false;

export function registerDocumentFonts() {
  if (done) return;
  done = true;

  Font.register({
    family: "Passenger Display",
    fonts: [{ src: p("PassengerDisplay-Regular.ttf"), fontWeight: 400 }],
  });

  Font.register({
    family: "Neue Haas Grotesk",
    fonts: [
      { src: p("NeueHaasGrotesk-Light.otf"), fontWeight: 300 },
      { src: p("NeueHaasGrotesk-Roman.otf"), fontWeight: 400 },
      { src: p("NeueHaasGrotesk-Italic.otf"), fontWeight: 400, fontStyle: "italic" },
      { src: p("NeueHaasGrotesk-Medium.otf"), fontWeight: 500 },
      { src: p("NeueHaasGrotesk-Bold.otf"), fontWeight: 700 },
    ],
  });

  // French legal prose reads better whole than hyphenated by an English
  // dictionary — keep words intact.
  Font.registerHyphenationCallback((word) => [word]);
}
