import { Font } from "@react-pdf/renderer";

// Client-side font registration for the live preview. Same brand files as
// the server (served from /public/fonts), so the browser preview is
// byte-for-byte what the server will render: Passenger Display for titles,
// Neue Haas Grotesk Display Pro for body.
let done = false;

export function registerDocumentFontsBrowser() {
  if (done) return;
  done = true;

  const u = (f: string) => `/fonts/${f}`;

  Font.register({
    family: "Passenger Display",
    fonts: [{ src: u("PassengerDisplay-Regular.ttf"), fontWeight: 400 }],
  });

  Font.register({
    family: "Neue Haas Grotesk",
    fonts: [
      { src: u("NeueHaasGrotesk-Light.otf"), fontWeight: 300 },
      { src: u("NeueHaasGrotesk-Roman.otf"), fontWeight: 400 },
      { src: u("NeueHaasGrotesk-Italic.otf"), fontWeight: 400, fontStyle: "italic" },
      { src: u("NeueHaasGrotesk-Medium.otf"), fontWeight: 500 },
      { src: u("NeueHaasGrotesk-Bold.otf"), fontWeight: 700 },
    ],
  });

  // Familjen Grotesk (Google Fonts, OFL) — grotesque alternative to Neue Haas.
  Font.register({
    family: "Familjen Grotesk",
    fonts: [
      { src: u("FamiljenGrotesk-Regular.woff"), fontWeight: 400 },
      { src: u("FamiljenGrotesk-Italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: u("FamiljenGrotesk-Medium.woff"), fontWeight: 500 },
    ],
  });

  Font.registerHyphenationCallback((w) => [w]);
}
