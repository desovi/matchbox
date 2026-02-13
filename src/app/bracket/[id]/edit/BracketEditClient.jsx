"use client";

import { useState, useCallback } from "react";
import { BracketGrid } from "../BracketGrid";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export function BracketEditClient({
  bracketId,
  editKey,
  initialMatches,
  participants = [],
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleScoreChange = useCallback(
    (matchId, team, score) => {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                [team === "team1" ? "team1_score" : "team2_score"]: score,
                status:
                  score !== null &&
                  (team === "team1"
                    ? m.team2_score !== null
                    : m.team1_score !== null)
                    ? "completed"
                    : "in_progress",
              }
            : m
        )
      );
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/brackets/${bracketId}/scores`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edit_key: editKey,
          scores: matches.map((m) => ({
            match_id: m.id,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            status: m.status,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <BracketGrid
        matches={matches}
        participants={participants}
        editable
        onScoreChange={handleScoreChange}
      />
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
        className="min-h-[48px] w-full sm:w-auto"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            저장 중...
          </>
        ) : saved ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5 text-white" />
            저장됨
          </>
        ) : (
          "저장"
        )}
      </Button>
    </div>
  );
}
