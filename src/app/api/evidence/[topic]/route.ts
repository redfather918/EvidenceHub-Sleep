// Evidence API — GET /api/evidence/[topic]
// Returns aggregated evidence for a topic/compound

import { NextResponse } from "next/server";
import { buildEvidenceApiResponseDb, getAllTopicsDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { topic: string } }
) {
  const data = await buildEvidenceApiResponseDb(params.topic);

  if (!data) {
    const topics = await getAllTopicsDb();
    return NextResponse.json(
      {
        error: "Topic not found",
        topic: params.topic,
        availableTopics: topics.map((t) => t.slug),
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
