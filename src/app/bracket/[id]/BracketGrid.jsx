"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Plus, Share2, Check } from "lucide-react";

function groupByRound(matches) {
  const map = new Map();
  for (const m of matches) {
    const list = map.get(m.round) ?? [];
    list.push(m);
    map.set(m.round, list);
  }
  Array.from(map.values()).forEach((list) => {
    list.sort((a, b) => a.court - b.court || a.id.localeCompare(b.id));
  });
  return map;
}

function formatPlayers(players) {
  return players.filter(Boolean).join(" / ") || "—";
}

/** genderByName: name -> "male" | "female". 남/여 색상으로 이름 렌더. */
function renderPlayersWithGender(players, genderByName) {
  if (!Array.isArray(players) || players.length === 0) return "—";
  const list = players.filter(Boolean);
  if (list.length === 0) return "—";
  const getColor = (name) => {
    const g = genderByName?.[name];
    if (g === "female") return "text-[hsl(var(--female))]";
    return "text-[hsl(var(--male))]";
  };
  return (
    <>
      {list.map((name, i) => (
        <span key={`${name}-${i}`}>
          <span className={getColor(name)}>{name}</span>
          {i < list.length - 1 ? " / " : ""}
        </span>
      ))}
    </>
  );
}

function clampScore(v) {
  if (v === null) return 0;
  return Math.max(0, Math.min(999, v));
}

function ScoreEditor({ team1Score, team2Score, matchId, onScoreChange }) {
  const v1 = team1Score ?? 0;
  const v2 = team2Score ?? 0;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-300 bg-white">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-r-none"
          onClick={() =>
            onScoreChange(matchId, "team1", clampScore(v1 - 1) || null)
          }
          aria-label="팀1 점수 감소"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          className="h-9 w-12 border-0 p-0 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={team1Score ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onScoreChange(
              matchId,
              "team1",
              v === "" ? null : clampScore(parseInt(v, 10))
            );
          }}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== "")
              onScoreChange(matchId, "team1", clampScore(parseInt(v, 10)));
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-l-none"
          onClick={() => onScoreChange(matchId, "team1", v1 + 1)}
          aria-label="팀1 점수 증가"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-lg font-bold text-muted-foreground">:</span>
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-300 bg-white">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-r-none"
          onClick={() =>
            onScoreChange(matchId, "team2", clampScore(v2 - 1) || null)
          }
          aria-label="팀2 점수 감소"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          className="h-9 w-12 border-0 p-0 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={team2Score ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onScoreChange(
              matchId,
              "team2",
              v === "" ? null : clampScore(parseInt(v, 10))
            );
          }}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== "")
              onScoreChange(matchId, "team2", clampScore(parseInt(v, 10)));
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-l-none"
          onClick={() => onScoreChange(matchId, "team2", v2 + 1)}
          aria-label="팀2 점수 증가"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MatchCard({ match, editable = false, onScoreChange, className, genderByName }) {
  const team1Label = formatPlayers(match.team1_players);
  const team2Label = formatPlayers(match.team2_players);
  const t1 = match.team1_score ?? null;
  const t2 = match.team2_score ?? null;
  const statusColor =
    match.status === "completed"
      ? "border-success/30 bg-success/5"
      : match.status === "in_progress"
        ? "border-accent/50 bg-accent/5"
        : "border-gray-200";

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 transition-colors",
        statusColor,
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-gray-900">
              {genderByName && match.team1_players?.length
                ? renderPlayersWithGender(match.team1_players, genderByName)
                : team1Label}
            </p>
            <p className="mt-1 truncate text-base text-muted-foreground">
              {genderByName && match.team2_players?.length
                ? renderPlayersWithGender(match.team2_players, genderByName)
                : team2Label}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editable && onScoreChange ? (
              <ScoreEditor
                team1Score={t1}
                team2Score={t2}
                matchId={match.id}
                onScoreChange={onScoreChange}
              />
            ) : (
              <div className="flex items-center gap-1 text-2xl font-bold tabular-nums text-gray-900">
                <span>{t1 ?? "—"}</span>
                <span className="text-muted-foreground">:</span>
                <span>{t2 ?? "—"}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>라운드 {match.round}</span>
          <span>코트 {match.court}</span>
          <span
            className={cn(
              "font-medium",
              match.status === "completed" && "text-success",
              match.status === "in_progress" && "text-accent-foreground"
            )}
          >
            {match.status === "pending"
              ? "대기"
              : match.status === "in_progress"
                ? "진행중"
                : "완료"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShareLinkButton({ path, className }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4 text-success" />
          복사됨
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          링크 복사
        </>
      )}
    </Button>
  );
}

function getParticipantNames(participants) {
  if (!Array.isArray(participants) || participants.length === 0) return [];
  return participants
    .map((p) => (typeof p === "string" ? p : p?.name))
    .filter(Boolean);
}

export function BracketGrid({
  matches,
  participants = [],
  editable = false,
  onScoreChange,
  className,
}) {
  const byRound = groupByRound(matches);
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  const participantNames = getParticipantNames(participants);
  const genderByName = (() => {
    if (!Array.isArray(participants) || participants.length === 0) return null;
    const map = {};
    for (const p of participants) {
      const name = typeof p === "string" ? p : p?.name;
      if (name) map[name] = typeof p === "object" && p?.gender === "female" ? "female" : "male";
    }
    return Object.keys(map).length > 0 ? map : null;
  })();

  if (rounds.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center",
          className
        )}
      >
        <p className="text-base font-medium text-gray-600">아직 경기가 없습니다.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          대진 생성 알고리즘 구현 후 여기에 경기가 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {rounds.map((round) => {
        const roundMatches = byRound.get(round) ?? [];
        const playingNames = new Set(
          roundMatches.flatMap((m) => [
            ...(m.team1_players ?? []),
            ...(m.team2_players ?? []),
          ])
        );
        const restingNames =
          participantNames.length > 0
            ? participantNames.filter((name) => !playingNames.has(name))
            : [];
        return (
          <section key={round}>
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
              라운드 {round}
            </h3>
            {restingNames.length > 0 && (
              <p className="mb-2 text-sm text-muted-foreground">
                휴식:{" "}
                {genderByName
                  ? restingNames.map((name, i) => (
                      <span key={name}>
                        <span
                          className={
                            genderByName[name] === "female"
                              ? "text-[hsl(var(--female))] font-medium"
                              : "text-[hsl(var(--male))] font-medium"
                          }
                        >
                          {name}
                        </span>
                        {i < restingNames.length - 1 ? ", " : ""}
                      </span>
                    ))
                  : restingNames.join(", ")}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roundMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  editable={editable}
                  onScoreChange={onScoreChange}
                  genderByName={genderByName}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
