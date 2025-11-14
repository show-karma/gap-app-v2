import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get("url")

  if (!imageUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error("Failed to fetch image")
    }
    const imageBuffer = await response.arrayBuffer()

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Length": imageBuffer.byteLength.toString(),
      },
    })
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 })
  }
}
