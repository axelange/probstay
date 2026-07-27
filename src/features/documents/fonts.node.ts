import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Fonts are bundled locally (public/fonts) and registered by file path so
// the server render is deterministic — no network fetch, no system-font
// fallback. Spectral (Production Type, OFL) across its static weights.
const dir = path.join(process.cwd(), "public", "fonts");
const p = (f: string) => path.join(dir, f);

let done = false;

export function registerDocumentFonts() {
  if (done) return;
  done = true;

  Font.register({
    family: "Spectral",
    fonts: [
      { src: p("Spectral-ExtraLight.ttf"), fontWeight: 200 },
      { src: p("Spectral-Light.ttf"), fontWeight: 300 },
      { src: p("Spectral-Regular.ttf"), fontWeight: 400 },
      { src: p("Spectral-Medium.ttf"), fontWeight: 500 },
      { src: p("Spectral-SemiBold.ttf"), fontWeight: 600 },
      { src: p("Spectral-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });

  // French legal prose reads better whole than hyphenated by an English
  // dictionary — keep words intact.
  Font.registerHyphenationCallback((word) => [word]);
}
