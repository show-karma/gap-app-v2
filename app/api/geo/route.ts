import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const headersList = await headers();

  // Vercel provides these headers automatically
  const country = headersList.get("x-vercel-ip-country") || "US";
  const region = headersList.get("x-vercel-ip-country-region");
  const city = headersList.get("x-vercel-ip-city");

  return NextResponse.json({
    country,
    region,
    city,
  });
}
