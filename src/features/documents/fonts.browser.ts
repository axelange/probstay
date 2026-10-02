import { Font } from "@react-pdf/renderer";

// Client-side font registration for the live preview. The same files as the
// server (served from /public/fonts), so the browser preview is what the
// server will render: Albertus Nova for the title block, Archivo for the rest.
//
// See fonts.node.ts for why Albertus is the OTF and Archivo the static cuts —
// both choices are forced by react-pdf and must stay in step on both sides.
let done = false;

export function registerDocumentFontsBrowser() {
  if (done) return;
  done = true;

  const u = (f: string) => `/fonts/${f}`;

  Font.register({
    family: "Albertus Nova",
    fonts: [
      { src: u("albertusnovathin.otf"), fontWeight: 200 },
    ],
  });

  Font.register({
    family: "Archivo",
    fonts: [
      { src: u("Archivo-Regular.ttf"), fontWeight: 400 },
      { src: u("Archivo-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: u("Archivo-Medium.ttf"), fontWeight: 500 },
      { src: u("Archivo-Bold.ttf"), fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
