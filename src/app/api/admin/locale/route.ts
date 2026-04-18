import { NextRequest, NextResponse } from "next/server";

/**
 * POST /admin/api/locale — Set the user's preferred locale via cookie.
 * Body: { locale: "en" | "ru" }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const locale = body.locale === "ru" ? "ru" : "en";

  const response = NextResponse.json({ locale });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}
