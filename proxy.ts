import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(req: NextRequest) {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  // Admin routes require admin role
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // @ts-expect-error: role does exist on admin object
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/leaderboard", "/roster", "/chat/:path*"],
};
