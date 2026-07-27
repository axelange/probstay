import { Font } from "@react-pdf/renderer";

// Client-side font registration for the live preview. Same Spectral files
// as the server (served from /public/fonts), so the browser preview is
// byte-for-byte what the server will render.
let done = false;

export function registerDocumentFontsBrowser() {
  if (done) return;
  done = true;

  const u = (f: string) => `/fonts/${f}`;
  Font.register({
    family: "Spectral",
    fonts: [
      { src: u("Spectral-ExtraLight.ttf"), fontWeight: 200 },
      { src: u("Spectral-Light.ttf"), fontWeight: 300 },
      { src: u("Spectral-Regular.ttf"), fontWeight: 400 },
      { src: u("Spectral-Medium.ttf"), fontWeight: 500 },
      { src: u("Spectral-SemiBold.ttf"), fontWeight: 600 },
      { src: u("Spectral-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
}
