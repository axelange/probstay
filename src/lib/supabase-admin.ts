import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * A client holding the service role, bypassing every RLS policy.
 *
 * There is exactly one legitimate use in this application: the client intake
 * link. That page carries no session — the token in its URL is the whole
 * credential — so the visitor has no database identity for a policy to check,
 * and the `identity-documents` bucket has no policies at all.
 *
 * Every caller must therefore have validated the token itself before reaching
 * this. Anything with a signed-in user belongs on `supabase-server.ts`, whose
 * client carries that user and is checked by the policies.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("service role credentials missing");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
