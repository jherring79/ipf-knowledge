"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEMP_PASSWORD } from "@/lib/constants";

export type ActionResult = { ok: boolean; error?: string };

export async function createUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEMP_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the user.",
    };
  }

  // The trigger created a starter profile; fill in phone/name and ensure the
  // first-login password change is required.
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      phone: phone || null,
      full_name: fullName || null,
      email,
      must_change_password: true,
    })
    .eq("id", data.user.id);

  if (profErr) {
    return { ok: false, error: `User created, but profile update failed: ${profErr.message}` };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { ok: false, error: "Missing user id." };

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: TEMP_PASSWORD,
  });
  if (error) return { ok: false, error: error.message };

  // Re-require a password change on next login (except for the admin's own
  // account, which is exempt from the gate anyway).
  if (userId !== session.user!.id) {
    const { error: profErr } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);
    if (profErr) {
      return {
        ok: false,
        error: `Password reset, but flag update failed: ${profErr.message}`,
      };
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { ok: false, error: "Missing user id." };

  // Guard: don't let the admin delete their own account.
  if (userId === session.user!.id) {
    return { ok: false, error: "You can't delete your own admin account." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
