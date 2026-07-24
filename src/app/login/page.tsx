import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · IPF Knowledge" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold tracking-widest text-amber-500">
          IP FILTRATION
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Knowledge Capture</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to capture and store field knowledge.
        </p>
      </div>
      <LoginForm />
      <p className="safe-b mt-8 text-center text-xs text-slate-600">
        Access is invite-only. Ask John if you need an account.
      </p>
    </main>
  );
}
