"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateBracketWizard } from "./CreateBracketWizard";
import { MATCH_TYPE_LABELS, BRACKET_TYPE_LABELS } from "@/lib/types";

export default function CreateBracketPage() {
  const [bracketInfo, setBracketInfo] = useState({ matchType: null, bracketType: null });

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-desktop items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-muted-foreground hover:text-foreground tap-target"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">홈</span>
          </Link>
          {bracketInfo.matchType && bracketInfo.bracketType && (
            <p className="min-w-0 truncate text-sm font-medium text-gray-700">
              {MATCH_TYPE_LABELS[bracketInfo.matchType]} &middot; {BRACKET_TYPE_LABELS[bracketInfo.bracketType]}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-mobile sm:max-w-desktop px-4 py-6 sm:px-6 sm:py-8">
        <CreateBracketWizard onBracketInfoChange={setBracketInfo} />
      </main>
    </div>
  );
}
