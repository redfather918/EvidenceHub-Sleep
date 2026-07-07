// GET /api/graph/[entity] — Evidence Graph subgraph centered on an entity.
// Entity can be a topic slug, claim slug, or "claim:slug" / "topic:slug" / "study:pmid".
// Query: depth (1-3, default 2), limit (max nodes, default 250)

import { NextRequest, NextResponse } from "next/server";
import { getGraphDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { entity: string } }
) {
  const entity = params.entity;
  const { searchParams } = new URL(request.url);

  const depthRaw = parseInt(searchParams.get("depth") || "2", 10);
  const depth = Math.min(3, Math.max(1, depthRaw || 2));

  try {
    const graph = await getGraphDb(entity, depth);

    if (!graph.center) {
      return NextResponse.json(
        {
          error: "Entity not found",
          message: `No matching node for "${entity}". Try a topic or claim slug.`,
          _links: { self: `/api/graph/${entity}?depth=${depth}` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(graph, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("[API] /api/graph failed:", err);
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}
