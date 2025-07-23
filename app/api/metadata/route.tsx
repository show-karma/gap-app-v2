import { type NextRequest, NextResponse } from "next/server";
import type { Hex } from "viem";
import { getMetadata } from "@/utilities/sdk/getMetadata";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const type = searchParams.get("type") as "project" | "community" | "grant";
	const uid = searchParams.get("uid") as Hex;

	if (!type || !uid) {
		return NextResponse.json(
			{ error: "Missing required parameters" },
			{ status: 400 },
		);
	}

	try {
		const metadata = await getMetadata(type, uid);
		if (metadata) {
			return NextResponse.json(metadata);
		} else {
			return NextResponse.json(
				{ error: "Metadata not found" },
				{ status: 404 },
			);
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
