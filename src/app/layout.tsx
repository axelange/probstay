import type { Metadata } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Inter for everything read in bulk: built for UI at small sizes, tall
// x-height, and tabular figures — this app is largely columns of prices,
// commissions and balances, where digits must line up.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Space Grotesk for headings only. It's a geometric display face: it
// gives the interface some character at large sizes, but its quirks work
// against legibility in dense data, so it never touches body text.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BSTAY PRO",
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
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
