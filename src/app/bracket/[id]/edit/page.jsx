import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BracketEditClient } from "./BracketEditClient";
import { getBracketTypeLabel } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function BracketEditPage({ params, searchParams }) {
  const { id } = await params;
  const { key: editKey } = await searchParams;

  if (!editKey) {
    redirect(`/bracket/${id}?edit=key_required`);
  }

  const supabase = await createClient();

  const { data: bracket, error: bracketError } = await supabase
    .from("brackets")
    .select("*")
    .eq("id", id)
    .eq("edit_key", editKey)
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
          <Link
            href={`/bracket/${id}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground tap-target"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">보기</span>
          </Link>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            <Badge variant="default">수정 모드</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-desktop px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {getBracketTypeLabel(bracket.bracket_type)} 대진표 (수정)
          </h1>
          <p className="mt-1 text-muted-foreground">
            참가자 {bracket.participant_count}명 · 점수를 입력하세요.
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <BracketEditClient
            bracketId={id}
            editKey={editKey}
            initialMatches={matches}
            participants={bracket.participants ?? []}
          />
        </div>
      </main>
    </div>
  );
}
