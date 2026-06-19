import { NextResponse } from "next/server";

/**
 * Q2 "Not me — switch" affordance. Clears the comment-identity cookies
 * on the FE origin so the next post forces a fresh identity-capture
 * prompt. The indexer's drsc_session bound by HMAC remains valid but
 * unreachable from the browser since the FE-origin cookie is gone.
 */

const FE_COOKIE_PATH = "/api/donor-research/shared/";

export function POST(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("drsc_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: FE_COOKIE_PATH,
    maxAge: 0,
  });
  res.cookies.set("drsc_name", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: FE_COOKIE_PATH,
    maxAge: 0,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
