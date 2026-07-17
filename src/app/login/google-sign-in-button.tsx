"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";

export function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function signIn() {
    setIsRedirecting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Pre-selects the company account in Google's chooser. Purely a
        // convenience — `hd` is a UI hint, not a restriction. Access is
        // enforced by the before-user-created hook against the
        // invitation table.
        queryParams: { hd: "b-stay.com" },
      },
    });

    if (error) {
      setIsRedirecting(false);
      window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
    }
  }

  return (
    <Button onClick={signIn} disabled={isRedirecting} className="w-full">
      {isRedirecting ? "Redirection…" : "Se connecter avec Google"}
    </Button>
  );
}
