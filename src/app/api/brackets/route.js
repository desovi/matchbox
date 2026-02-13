import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBracket } from "@/lib/bracket-logic";
import { z } from "zod";

const participantEntry = z.union([
  z.string().min(1),
  z.object({ name: z.string().min(1), gender: z.enum(["male", "female"]) }),
]);
const createBracketSchema = z.object({
  match_type: z.enum(["singles", "doubles"]),
  bracket_type: z.enum([
    "partner_rotation",
    "group_matching",
    "team_doubles",
    "tournament",
    "group_stage",
    "random",
  ]),
  participants: z.array(participantEntry).min(2).max(64),
  seed_config: z.record(z.number()).optional().nullable(),
  participant_attendance: z
    .array(
      z.object({
        type: z.enum(["full", "early_leave", "late_join"]),
        leaveAt: z.string().optional(),
        joinAt: z.string().optional(),
      })
    )
    .optional()
    .nullable(),
  court_count: z.number().int().min(1).max(20).optional().nullable(),
  match_duration_minutes: z.number().int().min(5).max(60).optional().nullable(),
  max_games_per_person: z.number().int().min(1).max(20).optional().nullable(),
  court_start_time: z.string().optional().nullable(),
  court_end_time: z.string().optional().nullable(),
  court_slots: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional()
    .nullable(),
  settings: z.record(z.unknown()).optional().nullable(),
  /** 미리보기에서 수정한 대진을 그대로 저장할 때 사용 */
  override_matches: z
    .array(
      z.object({
        round: z.number().int().min(1),
        court: z.number().int().min(1),
        team1_players: z.array(z.string()),
        team2_players: z.array(z.string()),
      })
    )
    .optional()
    .nullable(),
  /** 토너먼트 복식: 참가 팀(페어) 배열. 있으면 이걸로 대진 생성 */
  teams: z
    .array(z.object({ player1: z.string(), player2: z.string() }))
    .optional()
    .nullable(),
  /** 토너먼트/예선 조편성: 조당 팀 수 (3 또는 4) */
  teams_per_group: z.number().int().min(2).max(6).optional().nullable(),
});

function normalizeParticipants(participants) {
  return participants.map((p) =>
    typeof p === "string"
      ? { name: p, gender: "male" }
      : { name: p.name, gender: p.gender === "female" ? "female" : "male" }
  );
}

/** 코트 예약시간으로 총 코트·시간(시간 단위) 계산 → 라운드 수 제한에 사용 */
function computeTotalCourtHours(courtSlots, courtStartTime, courtEndTime, courtCount) {
  if (courtSlots?.length) {
    return courtSlots.reduce((sum, s) => {
      if (!s?.start || !s?.end) return sum;
      const [sh, sm] = s.start.split(":").map(Number);
      const [eh, em] = s.end.split(":").map(Number);
      return sum + (eh - sh) + (em - sm) / 60;
    }, 0);
  }
  if (courtStartTime && courtEndTime && courtCount) {
    const [sh, sm] = courtStartTime.split(":").map(Number);
    const [eh, em] = courtEndTime.split(":").map(Number);
    const hours = (eh - sh) + (em - sm) / 60;
    return hours * courtCount;
  }
  return 0;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const { data: bracket, error: bracketError } = await supabase
    .from("brackets")
    .select("*")
    .eq("id", id)
    .single();

  if (bracketError || !bracket) {
    return NextResponse.json(
      { error: "Bracket not found" },
      { status: 404 }
    );
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .eq("bracket_id", id)
    .order("round")
    .order("court");

  if (matchesError) {
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...bracket,
    participants: bracket.participants ?? [],
    matches: matches ?? [],
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = createBracketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      match_type,
      bracket_type,
      participants: rawParticipants,
      seed_config,
      participant_attendance,
      court_count,
      match_duration_minutes,
      max_games_per_person,
      court_start_time,
      court_end_time,
      court_slots,
      settings,
      override_matches,
      teams: rawTeams,
      teams_per_group,
    } = parsed.data;
    const participants = normalizeParticipants(rawParticipants);
    const isTeamEntryDoubles =
      (bracket_type === "tournament" || bracket_type === "group_stage") && match_type === "doubles";
    let teams =
      isTeamEntryDoubles && rawTeams?.length >= 2
        ? rawTeams.map((t) => ({
            player1: String(t.player1 ?? "").trim(),
            player2: String(t.player2 ?? "").trim(),
          }))
        : null;
    if (bracket_type === "group_stage" && match_type === "singles" && participants.length >= 2) {
      teams = participants.map((p) => ({
        player1: String(p.name ?? "").trim(),
        player2: "",
      }));
    }
    const supabase = await createClient();
    const courtCount = court_count ?? 1;
    const totalCourtHours = computeTotalCourtHours(
      court_slots ?? undefined,
      court_start_time ?? undefined,
      court_end_time ?? undefined,
      courtCount
    );

    const bracketInput = teams ?? participants;
    const generatedMatches =
      override_matches && override_matches.length > 0
        ? override_matches.map((m) => ({
            round: m.round,
            court: m.court,
            team1_players: m.team1_players ?? [],
            team2_players: m.team2_players ?? [],
            team1_score: null,
            team2_score: null,
            status: "pending",
          }))
        : generateBracket(
            bracket_type,
            bracketInput,
            seed_config ?? undefined,
            {
              participant_attendance: participant_attendance ?? undefined,
              court_count: courtCount,
              total_court_hours: totalCourtHours > 0 ? totalCourtHours : undefined,
              match_duration_minutes: match_duration_minutes ?? 30,
              max_games_per_person: max_games_per_person ?? undefined,
              court_start_time: court_start_time ?? undefined,
              court_end_time: court_end_time ?? undefined,
              court_slots: court_slots ?? undefined,
              teamsPerGroup: teams_per_group ?? undefined,
            }
          );

    const { data: bracket, error: bracketError } = await supabase
      .from("brackets")
      .insert({
        match_type,
        bracket_type,
        participant_count: participants.length,
        participants,
        seed_config: seed_config ?? null,
        settings: settings ?? null,
      })
      .select()
      .single();

    if (bracketError || !bracket) {
      return NextResponse.json(
        { error: bracketError?.message ?? "Failed to create bracket" },
        { status: 500 }
      );
    }

    if (generatedMatches.length > 0) {
      const matchRows = generatedMatches.map((m) => ({
        bracket_id: bracket.id,
        round: m.round,
        court: m.court,
        team1_players: m.team1_players,
        team2_players: m.team2_players,
        team1_score: m.team1_score ?? null,
        team2_score: m.team2_score ?? null,
        status: m.status,
      }));
      const { error: matchesError } = await supabase
        .from("matches")
        .insert(matchRows);

      if (matchesError) {
        return NextResponse.json(
          { error: matchesError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      id: bracket.id,
      edit_key: bracket.edit_key,
      created_at: bracket.created_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
