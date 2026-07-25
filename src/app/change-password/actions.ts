"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: boolean; error?: string };

// Clears the first-login flag for the currently signed-in user. Called right
// after they successfully set a new password (client-side).
export async function clearPasswordFlag(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
