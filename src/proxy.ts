import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/", "/login", "/signup"]);

function dashboardFor(role: string | null) {
  return role === "brand" ? "/brand/dashboard" : "/creator/dashboard";
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? null;
  const path = request.nextUrl.pathname;

  const isBrandOnly = path.startsWith("/brand");
  const isCreatorOnly =
    path.startsWith("/creator") || path === "/applications";
  const isAdminOnly = path.startsWith("/admin");

  // Authenticated users shouldn't see the auth screens.
  if (user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL(dashboardFor(role), request.url));
  }

  // Unauthenticated users are blocked from everything except public routes.
  if (!user && !PUBLIC.has(path)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Cross-role protection.
  if (user) {
    if (isBrandOnly && role !== "brand") {
      return NextResponse.redirect(new URL("/creator/dashboard", request.url));
    }
    if (isCreatorOnly && role !== "creator") {
      return NextResponse.redirect(new URL("/brand/dashboard", request.url));
    }
    if (isAdminOnly && role !== "admin") {
      return NextResponse.redirect(new URL(dashboardFor(role), request.url));
    }
  }

  return supabaseResponse;
}
