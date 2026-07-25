// The single admin who can manage users. Must match the email of the
// Supabase auth user John signs in with.
export const ADMIN_EMAILS = ["john@warhorsepetroleum.com"];

// Starter password handed to every new user; they must change it on first login.
export const TEMP_PASSWORD = "welcome1";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
