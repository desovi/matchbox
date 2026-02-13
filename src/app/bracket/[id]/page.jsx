import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BracketGrid, ShareLinkButton } from "./BracketGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBracketTypeLabel } from "@/lib/types";
import { Edit } from "lucide-react";

function formatDate(iso) {
  try {
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${y}년 ${m}월 ${day}일`;
  } catch {
    return "";
  }
}

export default async function BracketViewPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bracket, error: bracketError } = await supabase
    .from("brackets")
    .select("*")
    .eq("id", id)
    .single();

  if (bracketError || !bracket) {
    notFound();
  }

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .eq("bracket_id", id)
    .order("round")
    .order("court");

  const matches = matchesData ?? [];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-desktop items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Badge variant="default" className="shrink-0">
              {getBracketTypeLabel(bracket.bracket_type)}
            </Badge>
            <span className="truncate text-sm text-muted-foreground">
              {formatDate(bracket.created_at)} · 참가자 {bracket.participant_count}명
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <ShareLinkButton path={`/bracket/${id}`} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/bracket/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                수정 (키 필요)
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-desktop px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {getBracketTypeLabel(bracket.bracket_type)} 대진표
          </h1>
          <p className="mt-1 text-muted-foreground">읽기 전용</p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <BracketGrid
          matches={matches}
          participants={bracket.participants ?? []}
          editable={false}
        />
        </div>
      </main>
    </div>
  );
}
