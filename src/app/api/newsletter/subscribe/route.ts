// Newsletter subscription API
// POST /api/newsletter/subscribe { email: string }

import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        ok: true,
        message: "Subscribed (demo mode — Supabase not configured)",
      });
    }

    const supabase = getSupabase()!;
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email,
          status: "active",
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[Newsletter] Subscribe failed:", error);
      return NextResponse.json(
        { ok: false, error: "Subscription failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Successfully subscribed to EvidenceHub Sleep newsletter",
    });
  } catch (err) {
    console.error("[Newsletter] Subscribe error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
