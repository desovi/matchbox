import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateScoresSchema = z.object({
  edit_key: z.string().uuid(),
  scores: z.array(
    z.object({
      match_id: z.string().uuid(),
      team1_score: z.number().nullable(),
      team2_score: z.number().nullable(),
      status: z.enum(["pending", "in_progress", "completed"]),
    })
  ),
});

export async function PATCH(request, context) {
  const { id: bracketId } = await context.params;
  try {
    const body = await request.json();
    const parsed = updateScoresSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { edit_key, scores } = parsed.data;
    const supabase = await createClient();

    const { data: bracket, error: bracketError } = await supabase
      .from("brackets")
      .select("id")
      .eq("id", bracketId)
      .eq("edit_key", edit_key)
      .single();

    if (bracketError || !bracket) {
      return NextResponse.json(
        { error: "Invalid edit key or bracket not found" },
        { status: 403 }
      );
    }

    for (const s of scores) {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          team1_score: s.team1_score,
          team2_score: s.team2_score,
          status: s.status,
        })
        .eq("id", s.match_id)
        .eq("bracket_id", bracketId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
