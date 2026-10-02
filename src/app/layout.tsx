import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Archivo for everything read in bulk. A grotesque drawn for small sizes and
// dense setting, which is what this app mostly is — columns of prices,
// commissions and balances. latin-ext as well as latin: the guests are
// international and a contact named Łukasz or Škoda must not fall back to a
// system face mid-word.
//
// The variable cut, so weight costs one file rather than one per step.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
});

// Albertus Nova (Monotype) — the agency's display face, licensed and
// self-hosted from public/fonts. Reserved for page titles and the title block
// of the commercial documents; it is a flared glyphic face, cut for incised
// capitals, and it earns its keep there and nowhere else.
//
// The Thin cut alone, because the titles are set in it and titles are the only
// thing this face touches. The family also ships Light, Regular, Bold and
// Black in the same folder, unregistered because nothing asks for them — a
// declared face the browser never fetches is still a line someone has to read.
//
// Declared at 200, not 100: the file says so itself. Monotype names the cut
// "Thin" but stamps usWeightClass 200 on it, which is ExtraLight, and the
// number is what the browser matches on.
const albertusNova = localFont({
  variable: "--font-albertus-nova",
  display: "swap",
  src: [
    { path: "../../public/fonts/albertusnovathin.woff2", weight: "200", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "PROBSTAY",
    template: "%s",
  },
  description: "Application métier interne de BSTAY.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="fr": the interface is French, and screen readers pick their
    // pronunciation from this.
    <html
      lang="fr"
      className={`${archivo.variable} ${albertusNova.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* SidebarProvider doesn't supply this, and the sidebar renders
            tooltips for its labels when collapsed to icons. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
