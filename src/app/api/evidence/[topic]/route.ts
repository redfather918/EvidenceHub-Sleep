// Evidence API — GET /api/evidence/[topic]
// Returns aggregated evidence for a topic/compound

import { NextResponse } from "next/server";
import { buildEvidenceApiResponse, getAllTopics } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: { topic: string } }
) {
  const data = buildEvidenceApiResponse(params.topic);

  if (!data) {
    const topics = getAllTopics().map((t) => t.slug);
    return NextResponse.json(
      {
        error: "Topic not found",
        topic: params.topic,
        availableTopics: topics,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...data,
    _links: {
      self: `/api/evidence/${params.topic}`,
    },
  });
}
