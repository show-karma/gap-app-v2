import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
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
