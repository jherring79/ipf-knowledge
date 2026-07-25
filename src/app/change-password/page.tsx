import { requireUser } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = { title: "Set your password · IPF Knowledge" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  // Must be signed in, but do NOT re-trigger the password gate (avoids a loop).
  const session = await requireUser({ skipPasswordGate: true });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold tracking-widest text-amber-500">
          IP FILTRATION
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Set your password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Welcome{session.profile?.full_name ? `, ${session.profile.full_name}` : ""}.
          Choose a new password to finish setting up your account.
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
