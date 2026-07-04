// Claim API — GET /api/claim/[slug]
// Returns structured claim data for AI consumption

import { NextResponse } from "next/server";
import { buildClaimApiResponse } from "@/lib/data";

export function generateStaticParams() {
  return [];
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const data = buildClaimApiResponse(params.slug);

  if (!data) {
    return NextResponse.json(
      {
        error: "Claim not found",
        slug: params.slug,
        availableEndpoints: ["/api/claim/glycine-sleep-latency", "/api/claim/magnesium-sleep-quality", "/api/claim/melatonin-sleep-latency"],
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...data,
    _links: {
      self: `/api/claim/${params.slug}`,
      webpage: `/claim/${params.slug}`,
    },
  });
}
