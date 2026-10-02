import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Fonts are bundled locally (public/fonts) and registered by file path so the
// server render is deterministic — no network fetch, no system-font fallback.
//
// Two faces, and only two: Albertus Nova for the title block, Archivo for
// everything else. Passenger Display (Colophon), Neue Haas Grotesk Display Pro
// (Monotype) and Familjen Grotesk are retired with the old direction.
const dir = path.join(process.cwd(), "public", "fonts");
const p = (f: string) => path.join(dir, f);

let done = false;

export function registerDocumentFonts() {
  if (done) return;
  done = true;

  // Albertus Nova Thin (Monotype) — the title block, and nothing else.
  //
  // Weight 200, not 100: Monotype calls the cut "Thin" but stamps
  // usWeightClass 200 on the file, and that number is what react-pdf
  // matches a style against. One cut, because the face is only ever set in
  // Thin — titles and, on the inside pages, the values that used to be
  // Passenger Display. The family's other weights stay unregistered.
  //
  // The OTF, not the WOFF2 the interface loads, and that is not a preference.
  // Given the WOFF2 (TrueType outlines) react-pdf subsets it into a `glyf`
  // program no renderer will draw: the text is in the file and extracts
  // correctly, but nothing appears — verified in both Preview and Poppler. The
  // OTF carries CFF outlines, which take the same embedding path Archivo does
  // and come out right.
  Font.register({
    family: "Albertus Nova",
    fonts: [
      { src: p("albertusnovathin.otf"), fontWeight: 200 },
    ],
  });

  // Archivo (Google, OFL) — everything that is not a title.
  //
  // Static cuts, one file per weight, not the variable font. react-pdf pins a
  // variable font to its default instance and cannot move the `wght` axis, so
  // registering the variable file three times gives three identical weights —
  // checked, and 400/500/700 came out indistinguishable. These are the static
  // instances Google serves for the same family.
  Font.register({
    family: "Archivo",
    fonts: [
      { src: p("Archivo-Regular.ttf"), fontWeight: 400 },
      { src: p("Archivo-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: p("Archivo-Medium.ttf"), fontWeight: 500 },
      { src: p("Archivo-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // French legal prose reads better whole than hyphenated by an English
  // dictionary — keep words intact.
  Font.registerHyphenationCallback((word) => [word]);
}
