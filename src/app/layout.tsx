import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Inter: designed for UI at small sizes, with a tall x-height and
// tabular figures — this app is largely tables of prices, commissions
// and balances, where digits must line up column to column.
const inter = Inter({
  variable: "--font-inter",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
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
