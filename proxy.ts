import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "./lib/supabase/server";

export async function proxy(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if ((await supabase.auth.getUser()).data.user) return;

  if (pathIsPublic(request.nextUrl.pathname)) return;

  return NextResponse.redirect(new URL("/login", request.url));
}

function pathIsPublic(pathname: string) {
  const publicPaths = ["/", "/login"];
  for (const publicPath of publicPaths) {
    if (pathname === publicPath) {
      return true;
    }
  }
  return false;
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: "/((?!api|_next/static|_next/image|.*\\.png$).*)",
};
