import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 32_768;

const isSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  console.error("[client-error]", JSON.stringify(payload));
  return new NextResponse(null, { status: 204 });
}
