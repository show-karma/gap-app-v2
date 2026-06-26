import { NextResponse } from "next/server";

/**
 * Placeholder for per-comment operations (advisor mark-seen in v1.1,
 * delete-own in v1.5). v1 has no per-comment route on the indexer side
 * either; this file exists so the API surface is allocated and adding
 * the operations later is a route-shape change only.
 */

export function GET(): NextResponse {
  return NextResponse.json({ error: "not_implemented" }, { status: 405 });
}

export function PATCH(): NextResponse {
  return NextResponse.json({ error: "not_implemented" }, { status: 405 });
}

export function DELETE(): NextResponse {
  return NextResponse.json({ error: "not_implemented" }, { status: 405 });
}
