import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function backToLogin(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(message)}`
  );
}

/**
 * Where Google returns to after Supabase has handled the OAuth
 * exchange.
 *
 * A rejection from the before-user-created hook (an uninvited account)
 * arrives here as an `error` parameter rather than a code, so both
 * outcomes have to be handled — otherwise a blocked sign-in looks like
 * a silent failure.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return backToLogin(origin, authError);
  }

  const code = searchParams.get("code");
  if (!code) {
    return backToLogin(origin, "Aucun code d'autorisation reçu.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return backToLogin(origin, error.message);
  }

  return NextResponse.redirect(origin);
}
