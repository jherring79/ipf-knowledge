import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/constants";

export type Profile = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  must_change_password: boolean;
  created_at: string;
};

// Returns the signed-in user (or null) plus their profile row.
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: (profile as Profile | null) ?? null,
    isAdmin: isAdminEmail(user.email),
  };
}

// Use on protected pages: ensures a signed-in user and that first-login
// password change is completed (admins are exempt).
export async function requireUser(opts?: { skipPasswordGate?: boolean }) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  if (
    !opts?.skipPasswordGate &&
    !session.isAdmin &&
    session.profile?.must_change_password
  ) {
    redirect("/change-password");
  }
  return session;
}

// Use on the admin page: only John gets through.
export async function requireAdmin() {
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (!session.isAdmin) redirect("/");
  return session;
}
