import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Knowledge Base";
  const description =
    searchParams.get("description") || "Learn about grant funding, accountability, and reputation";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#0F172A",
        padding: "60px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div style={{ fontSize: 28, color: "#818CF8", fontWeight: 700 }}>Karma Knowledge Base</div>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          lineHeight: 1.2,
          marginBottom: "24px",
          maxWidth: "900px",
        }}
      >
        {title.length > 60 ? `${title.slice(0, 57)}...` : title}
      </div>
      <div
        style={{
          fontSize: 22,
          color: "#94A3B8",
          lineHeight: 1.5,
          maxWidth: "800px",
        }}
      >
        {description.length > 140 ? `${description.slice(0, 137)}...` : description}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 20, color: "#64748B" }}>karmahq.xyz/knowledge</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    }
  );
}
