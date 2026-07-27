import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed the `middleware` convention to `proxy`.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every real page load except static assets and image files, so
     * the Supabase session stays fresh and protected routes are guarded.
     *
     * sw.js and offline.html are excluded deliberately: the service worker
     * must be served as a script from the root scope (not redirected to
     * /login), and the offline fallback page has to be reachable with no
     * session in hand.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
