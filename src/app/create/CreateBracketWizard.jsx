"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BRACKET_TYPE_LABELS,
  BRACKET_TYPE_DESCRIPTIONS,
  BRACKET_RECOMMENDED_COUNT,
  BRACKET_TYPES_SINGLES,
  BRACKET_TYPES_DOUBLES,
  MATCH_TYPE_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Loader2,
  CheckCircle,
  User,
  Users,
  Trophy,
  Share2,
  Plus,
  Trash2,
  Info,
  X,
  ArrowLeft,
  Save,
  RefreshCw,
  LayoutGrid,
  Copy,
  Upload,
  FileDown,
} from "lucide-react";
import { generateBracket } from "@/lib/bracket-logic";
import * as XLSX from "xlsx";

const TOTAL_STEPS = 5;
const ALL_BRACKET_TYPES = [
  "partner_rotation",
  "group_matching",
  "team_doubles",
  "tournament",
  "group_stage",
  "random",
];
/** 현재 구현 완료되어 사용 가능한 대진 방식 (나머지는 준비 중으로 비활성화) */
const BRACKET_TYPES_READY = ["partner_rotation", "group_stage"];
/** 복식에서 코트/시간 설정 노출 대상 (토너먼트·예선 조편성 복식 포함) */
const DOUBLES_COURT_TYPES = ["partner_rotation", "group_matching", "team_doubles", "tournament", "group_stage"];
/** 시드 배정 노출 대상 */
const SEED_AVAILABLE_TYPES = [
  "partner_rotation",
  "group_matching",
  "team_doubles",
  "tournament",
  "group_stage",
];

/** 상세 안내 문구 (카드 정보 아이콘 → 모달용) */
const BRACKET_TYPE_GUIDE = {
  partner_rotation: {
    title: "파트너 로테이션",
    body: "매 게임마다 파트너가 바뀌는 복식 개인전입니다.\n같은 사람과 중복으로 붙지 않도록 최적화되어 있습니다.\n개인별 승패와 득실을 기록합니다.\n모든 참가자가 공평하게 4게임씩 진행합니다.",
    recommended: "4~16명",
  },
  group_matching: {
    title: "그룹별 매칭",
    body: "두 그룹(A/B)으로 나눠서 진행하는 복식 개인전입니다.\nA그룹 선수는 B그룹 선수하고만 파트너가 됩니다.\n개인별 승패와 득실을 기록합니다.\n남녀 혼복이나 실력별 그룹 게임에 최적화되어 있습니다.",
    recommended: "8~16명 (각 그룹 동일 인원)",
  },
  team_doubles: {
    title: "팀 대전",
    body: "파트너가 고정된 팀 단위 복식 대전입니다.\n매 게임마다 상대팀만 랜덤으로 바뀝니다.\n팀별 승패와 득실을 기록합니다.\n모든 팀이 공평하게 4게임씩 진행합니다.",
    recommended: "5~13팀",
  },
  tournament: {
    title: "토너먼트",
    body: "전통적인 토너먼트 방식입니다.\n복식은 페어(팀)를 함께 입력하고, 참가팀 수에 따라 예선 조·본선이 자동 편성됩니다.\n(예: 40팀 → 예선 조별 라운드 후 본선 토너먼트)",
    recommended: "4, 8, 16, 32팀 직진 / 그 외 예선 조 편성",
  },
  group_stage: {
    title: "예선 조편성",
    body: "예선 조별 라운드만 생성합니다.\n복식은 페어(팀)를 입력하고, 조 편성·조별 대진만 만들며 본선(추첨·bye)은 대회 운영 시 별도 작성합니다.",
    recommended: "6팀 이상 (조별 예선만)",
  },
  random: {
    title: "랜덤",
    body: "완전히 랜덤으로 매칭되는 자유 게임 방식입니다.\n단식과 복식 모두 가능합니다.\n빠르고 간단하게 대진표를 만들 수 있습니다.\n별도의 규칙 없이 자유롭게 즐기고 싶을 때 사용하세요.",
    recommended: "제한 없음",
  },
};

/** 모달용 예시 (상세 안내와 함께 표시) */
const BRACKET_TYPE_EXAMPLES = {
  partner_rotation: "R1: 1-2 vs 3-4\nR2: 1-3 vs 2-5 (파트너 교대)\nR3: 1-4 vs 2-3",
  group_matching: "1A-1B vs 2A-2B | 3A-3B vs 4A-4B\n1A-2B vs 3A-4B (크로스 페어링)",
  team_doubles: "R1: 팀1 vs 팀2 | 팀3 vs 팀4\nR2: 팀1 vs 팀3 | 팀2 vs 팀5 (상대만 변경)",
  tournament: "8강 → 4강 → 결승\n단판 탈락, 4·8·16·32명",
  group_stage: "",
  random: "게임1: 랜덤 vs 랜덤\n게임2: 랜덤 vs 랜덤 (완전 랜덤)",
};

function StepIndicator({ currentStep, totalSteps, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-2",
        className
      )}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`단계 ${currentStep} / ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            "h-2 flex-1 rounded-full transition-colors",
            step <= currentStep ? "bg-primary" : "bg-gray-300"
          )}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700 min-w-[3rem]">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}

const MATCH_TYPES_READY = ["singles", "doubles"];

function MatchTypeSelector({ value, onChange }) {
  const icons = {
    singles: <User className="h-6 w-6" />,
    doubles: <Users className="h-6 w-6" />,
  };
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-900">경기 방식 선택</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {["singles", "doubles"].map((type) => {
          const isSelected = value === type;
          const isReady = MATCH_TYPES_READY.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={!isReady}
              aria-label={`${MATCH_TYPE_LABELS[type]}${!isReady ? " (준비 중)" : ""} 선택`}
              className={cn(
                "relative w-full rounded-xl border-2 p-4 text-left shadow-md transition-all sm:p-6",
                "touch-manipulation",
                isReady ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "cursor-not-allowed opacity-60",
                isSelected
                  ? "border-primary bg-primary/15 ring-2 ring-primary ring-offset-2 shadow-sm"
                  : "border-gray-200 bg-white text-gray-900"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isReady) onChange(type);
              }}
            >
              {!isReady && (
                <span className="absolute right-3 top-3 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  준비 중
                </span>
              )}
              <div className="flex flex-row items-center gap-3 pb-2">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {icons[type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900">{MATCH_TYPE_LABELS[type]}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BracketTypeSelector({ value, onChange, allowedTypes }) {
  const [modalType, setModalType] = useState(null);
  const   icons = {
    partner_rotation: <Users className="h-6 w-6" />,
    group_matching: <Users className="h-6 w-6" />,
    team_doubles: <Users className="h-6 w-6" />,
    tournament: <Trophy className="h-6 w-6" />,
    group_stage: <LayoutGrid className="h-6 w-6" />,
    random: <Share2 className="h-6 w-6" />,
  };
  const types =
    allowedTypes && allowedTypes.length > 0 ? allowedTypes : ALL_BRACKET_TYPES;
  const sortedTypes = [...types].sort((a, b) => {
    const aReady = BRACKET_TYPES_READY.includes(a);
    const bReady = BRACKET_TYPES_READY.includes(b);
    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;
    return types.indexOf(a) - types.indexOf(b);
  });
  const guide = modalType ? BRACKET_TYPE_GUIDE[modalType] : null;

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-gray-900">대진 방식 선택</label>
      <div className="grid gap-4 sm:grid-cols-2">
        {sortedTypes.map((type) => {
          const isReady = BRACKET_TYPES_READY.includes(type);
          return (
            <Card
              key={type}
              role="button"
              tabIndex={isReady ? 0 : -1}
              aria-pressed={value === type}
              aria-disabled={!isReady}
              aria-label={`${BRACKET_TYPE_LABELS[type]}${!isReady ? " (준비 중)" : ""} 선택`}
              className={cn(
                "relative transition-all",
                isReady
                  ? "cursor-pointer hover:scale-[1.02] hover:shadow-card-hover"
                  : "cursor-not-allowed opacity-60",
                value === type && "ring-2 ring-primary border-primary bg-primary/5"
              )}
              onClick={() => isReady && onChange(type)}
              onKeyDown={(e) => {
                if (!isReady) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(type);
                }
              }}
            >
              {!isReady && (
                <span className="absolute right-12 top-3 z-10 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  준비 중
                </span>
              )}
              <button
                type="button"
                aria-label={`${BRACKET_TYPE_LABELS[type]} 상세 안내`}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setModalType(type);
                }}
              >
                <Info className="h-4 w-4" />
              </button>
            <CardHeader className="flex flex-row items-start gap-3 pb-2 pr-10">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  value === type ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                )}
              >
                {icons[type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">{BRACKET_TYPE_LABELS[type]}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {BRACKET_TYPE_DESCRIPTIONS[type]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  권장: {BRACKET_RECOMMENDED_COUNT[type]}
                </p>
              </div>
            </CardHeader>
          </Card>
          );
        })}
      </div>

      {guide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalType(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 id="guide-title" className="text-lg font-bold text-gray-900">
                {guide.title}
              </h3>
              <button
                type="button"
                aria-label="닫기"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setModalType(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 text-sm text-gray-600">
              <p className="whitespace-pre-line">{guide.body}</p>
              <p className="mt-3 text-gray-500">권장: {guide.recommended}</p>
              {BRACKET_TYPE_EXAMPLES[modalType] && (
                <div className="mt-4 rounded-lg bg-gray-100 px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    예시
                  </p>
                  <p
                    className="mt-1 font-mono text-xs leading-relaxed text-gray-700"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {BRACKET_TYPE_EXAMPLES[modalType]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 참가자 항목: { name, gender } 또는 예전 호환용 문자열 */
function normalizeParticipant(p) {
  if (p == null) return { name: "", gender: "male" };
  if (typeof p === "string") return { name: p.trim() || "", gender: "male" };
  return {
    name: (p?.name ?? "").trim() || "",
    gender: p?.gender === "female" ? "female" : "male",
  };
}
function getParticipantName(p) {
  return normalizeParticipant(p).name;
}

function ParticipantInput({
  participants,
  onChange,
  minCount = 4,
  maxCount = 64,
  descriptionExtra,
}) {
  const [newName, setNewName] = useState("");
  const normalized = participants.map(normalizeParticipant).filter((p) => p.name);
  const names = normalized.map((p) => p.name);

  const addParticipant = () => {
    const trimmed = newName.trim();
    if (!trimmed || names.includes(trimmed) || normalized.length >= maxCount)
      return;
    onChange([...normalized, { name: trimmed, gender: "male" }]);
    setNewName("");
  };

  const removeParticipant = (index) => {
    onChange(normalized.filter((_, i) => i !== index));
  };

  const setGender = (index, gender) => {
    const next = normalized.map((p, i) =>
      i === index ? { ...p, gender } : p
    );
    onChange(next);
  };

  const maleNames = normalized.filter((p) => p.gender === "male").map((p) => p.name);
  const femaleNames = normalized.filter((p) => p.gender === "female").map((p) => p.name);

  return (
    <div>
      <CardContent className="space-y-4 p-0">
        <div className="flex gap-2">
          <Input
            placeholder="이름 입력"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addParticipant())
            }
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={addParticipant}
            disabled={!newName.trim() || normalized.length >= maxCount}
            aria-label="참가자 추가"
            className="shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {normalized.length > 0 && (
          <ul className="space-y-2">
            {normalized.map((p, index) => (
              <li
                key={`${p.name}-${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <span
                  className={cn(
                    "min-w-[4rem] flex-1 text-base font-medium",
                    p.gender === "female"
                      ? "text-[hsl(var(--female))]"
                      : "text-[hsl(var(--male))]"
                  )}
                >
                  {p.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGender(index, "male")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      p.gender === "male"
                        ? "bg-[hsl(var(--male))] text-[hsl(var(--male-foreground))]"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    남자
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender(index, "female")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      p.gender === "female"
                        ? "bg-[hsl(var(--female))] text-[hsl(var(--female-foreground))]"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    여자
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeParticipant(index)}
                  aria-label={`${p.name} 제거`}
                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {normalized.length > 0 && (
          <div className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">남자</p>
              <p className="text-sm text-gray-900">
                {maleNames.length > 0 ? maleNames.join(", ") : "—"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">여자</p>
              <p className="text-sm text-gray-900">
                {femaleNames.length > 0 ? femaleNames.join(", ") : "—"}
              </p>
            </div>
          </div>
        )}
        {normalized.length < minCount && normalized.length > 0 && (
          <p className="text-sm text-destructive">
            최소 {minCount}명이 필요합니다. ({normalized.length}/{minCount})
          </p>
        )}
      </CardContent>
    </div>
  );
}

/** 대표명 한 번에 입력 시: 쉼표 또는 / 로 구분된 문자열에서 이름 배열 추출 */
function parseTeamNamesFromPaste(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\s*,\s*|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Excel/CSV 파일에서 참가자(1) 열 추출 (복식용) */
function parseTeamNamesFromExcel(file, onSuccess) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length === 0) {
        onSuccess([]);
        return;
      }
      
      const headers = jsonData[0];
      const player1ColIndex = headers.findIndex((h) => 
        String(h).includes("참가자(1)") || String(h).includes("참가자1") || String(h).trim() === "참가자(1)"
      );
      
      if (player1ColIndex === -1) {
        onSuccess([]);
        return;
      }
      
      const names = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const name = row[player1ColIndex];
        if (name && String(name).trim()) {
          names.push(String(name).trim());
        }
      }
      onSuccess(names);
    } catch (err) {
      console.error("Excel 파싱 오류:", err);
      onSuccess([]);
    }
  };
  reader.readAsArrayBuffer(file);
}

/** Excel/CSV 파일에서 참가자 이름 열 추출 (단식용) */
function parseParticipantNamesFromExcel(file, onSuccess) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length === 0) {
        onSuccess([]);
        return;
      }
      
      const headers = jsonData[0];
      const nameColIndex = headers.findIndex((h) => 
        String(h).includes("참가자 이름") || String(h).includes("참가자") || String(h).trim() === "참가자 이름"
      );
      
      if (nameColIndex === -1) {
        onSuccess([]);
        return;
      }
      
      const names = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const name = row[nameColIndex];
        if (name && String(name).trim()) {
          names.push(String(name).trim());
        }
      }
      onSuccess(names);
    } catch (err) {
      console.error("Excel 파싱 오류:", err);
      onSuccess([]);
    }
  };
  reader.readAsArrayBuffer(file);
}

/** CSV 텍스트에서 첫 번째 열(대표명) 추출. 첫 줄은 헤더로 건너뛸 수 있음 */
function parseTeamNamesFromCsv(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  const names = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const firstCell = line.includes(",") ? line.split(",")[0].trim() : line.trim();
    const decoded = firstCell.replace(/^"|"$/g, "").trim();
    if (decoded && (i > 0 || decoded !== "대표명")) names.push(decoded);
  }
  return names;
}

/** 토너먼트 복식용: 참가 팀(페어) 입력. 각 팀 = [player1, player2]. representativeOnly면 player1만 있어도 팀으로 인정 */
function TeamInput({ teams, onChange, minCount = 2, maxCount = 64, representativeOnly = false }) {
  const addTeam = () => {
    if (teams.length >= maxCount) return;
    onChange([...teams, { player1: "", player2: "" }]);
  };
  const removeTeam = (index) => {
    if (teams.length <= minCount) return;
    onChange(teams.filter((_, i) => i !== index));
  };
  const setTeamPlayer = (index, field, value) => {
    onChange(
      teams.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const validCount = teams.filter((t) => {
    const p1 = (t.player1 ?? "").trim();
    const p2 = (t.player2 ?? "").trim();
    return representativeOnly ? !!p1 : !!p1 && !!p2;
  }).length;

  return (
    <div>
      <CardContent className="space-y-4 p-0">
        <ul className="space-y-2">
          {teams.map((team, index) => (
            <li
              key={`team-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="w-12 shrink-0 text-sm font-medium text-gray-500">
                팀 {index + 1}
              </span>
              <Input
                placeholder="선수 1"
                value={team.player1 ?? ""}
                onChange={(e) => setTeamPlayer(index, "player1", e.target.value)}
                className="min-w-[6rem] flex-1"
              />
              <Input
                placeholder="선수 2"
                value={team.player2 ?? ""}
                onChange={(e) => setTeamPlayer(index, "player2", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && teams.length < maxCount) {
                    e.preventDefault();
                    addTeam();
                  }
                }}
                className="min-w-[6rem] flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTeam(index)}
                disabled={teams.length <= minCount}
                aria-label="팀 제거"
                className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTeam}
          disabled={teams.length >= maxCount}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          팀 추가
        </Button>
        <p className="text-sm text-muted-foreground">
          참가팀 수: <strong>{validCount}팀</strong>
          {validCount < minCount && validCount > 0 && (
            <span className="ml-2 text-destructive"> (최소 {minCount}팀 필요)</span>
          )}
        </p>
      </CardContent>
    </div>
  );
}

/** 코트 시작 시각: 06:00 ~ 23:00 (1시간 단위, 전시간 선택 가능) */
const COURT_START_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${h.toString().padStart(2, "0")}:00`;
});
/** 시작 시각 이후 ~ 24:00 직전까지 1시간 단위 종료 시각 (대회 등 전시간 사용) */
function getCourtEndOptions(startTime) {
  if (!startTime) return [];
  const startMins = parseTime(startTime);
  const endMaxMins = 23 * 60; // 23:00까지
  if (startMins >= endMaxMins) return [];
  const slots = [];
  for (let m = startMins + 60; m <= endMaxMins; m += 60) slots.push(formatTime(m));
  return slots;
}
/** 구간 길이를 시간 단위로 (분 포함). 예: 14:00~17:00 → 3, 14:00~14:30 → 0.5 */
function courtDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh - sh) + ((em || 0) - (sm || 0)) / 60;
}
/** 시간 수 기준 1인당 대략 게임 수 (참가자 5~16명 가정). totalCourtHours는 코트별 시간 합(예: 2코트×3h=6). maxCap 있으면 그 값으로 상한. */
function estimateGamesPerPerson(totalCourtHours, participantCount, maxCap) {
  const h = Math.min(8, Math.round(Number(totalCourtHours) || 0));
  const base = { 2: 4, 3: 5, 4: 6, 5: 6, 6: 7, 7: 7, 8: 8 }[h] ?? 4;
  let raw = base;
  if (participantCount <= 8) raw = base;
  else if (participantCount <= 12) raw = Math.max(3, base - 1);
  else raw = Math.max(3, base - 2);
  return maxCap != null ? Math.min(raw, maxCap) : raw;
}
/** courtSlots 배열에서 총 코트·시간(시간 단위) 합계 */
function totalCourtHoursFromSlots(courtSlots) {
  if (!courtSlots?.length) return 0;
  return courtSlots.reduce(
    (sum, s) => sum + (courtDurationHours(s?.start, s?.end) || 0),
    0
  );
}
/** courtSlots 전체 구간(가장 이른 시작 ~ 가장 늦은 종료) */
function courtSlotsRange(courtSlots) {
  if (!courtSlots?.length) return { minStart: "", maxEnd: "" };
  const starts = courtSlots.map((s) => s?.start).filter(Boolean);
  const ends = courtSlots.map((s) => s?.end).filter(Boolean);
  if (!starts.length || !ends.length) return { minStart: "", maxEnd: "" };
  const minStart = starts.reduce((a, b) => (parseTime(a) <= parseTime(b) ? a : b));
  const maxEnd = ends.reduce((a, b) => (parseTime(a) >= parseTime(b) ? a : b));
  return { minStart, maxEnd };
}

/** "HH:MM" → 분 단위 */
function parseTime(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
/** 분 단위 → "HH:MM" */
function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** startTime ~ endTime(미포함) 30분 단위 시각 배열 */
function getTimeSlotsBetween(startTime, endTime) {
  if (!startTime || !endTime) return [];
  let start = parseTime(startTime);
  let end = parseTime(endTime);
  const slots = [];
  for (let t = start; t < end; t += 30) slots.push(formatTime(t));
  return slots;
}
/** 조퇴: 퇴장 시각 옵션 (코트 시작 ~ 종료 30분 전까지) */
function getLeaveAtOptions(courtStartTime, courtEndTime) {
  if (!courtStartTime || !courtEndTime) return [];
  const end = parseTime(courtEndTime) - 30;
  const start = parseTime(courtStartTime);
  if (end <= start) return [];
  return getTimeSlotsBetween(courtStartTime, formatTime(end + 30));
}
/** 늦참: 입장 시각 옵션 (코트 시작 30분 후 ~ 종료 전) */
function getJoinAtOptions(courtStartTime, courtEndTime) {
  if (!courtStartTime || !courtEndTime) return [];
  const start = parseTime(courtStartTime) + 30;
  const end = parseTime(courtEndTime);
  if (end <= start) return [];
  return getTimeSlotsBetween(formatTime(start), courtEndTime);
}

export function CreateBracketWizard({ onBracketInfoChange }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [matchType, setMatchType] = useState(null);
  const [bracketType, setBracketType] = useState(null);

  useEffect(() => {
    onBracketInfoChange?.({ matchType, bracketType });
  }, [matchType, bracketType, onBracketInfoChange]);
  const [participants, setParticipants] = useState([]);
  const [useSeed, setUseSeed] = useState(false);
  const [courtStartTime, setCourtStartTime] = useState("");
  const [courtEndTime, setCourtEndTime] = useState("");
  const [courtCount, setCourtCount] = useState(1);
  const [perCourtTimesOverride, setPerCourtTimesOverride] = useState(false);
  const [courtSlotsPerCourt, setCourtSlotsPerCourt] = useState([]);
  const [participantAttendance, setParticipantAttendance] = useState([]);
  const [maxGamesPerPerson, setMaxGamesPerPerson] = useState(4);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  /** 토너먼트 복식일 때만 사용: [{ player1, player2 }, ...] */
  const [tournamentTeams, setTournamentTeams] = useState([
    { player1: "", player2: "" },
    { player1: "", player2: "" },
  ]);
  /** 예선 조편성 복식 전용: 입력 방식 "manual" | "paste" | "excel" */
  const [teamInputMode, setTeamInputMode] = useState("manual");
  /** 예선 조편성 복식 "한 번에 입력"용 텍스트 */
  const [teamNamesPaste, setTeamNamesPaste] = useState("");
  /** 예선 조편성 단식 전용: 입력 방식 "manual" | "paste" | "excel" */
  const [participantInputMode, setParticipantInputMode] = useState("manual");
  /** 예선 조편성 단식 "한 번에 입력"용 텍스트 */
  const [participantNamesPaste, setParticipantNamesPaste] = useState("");
  /** 토너먼트/예선 조편성: 조당 팀 수 (3 또는 4) */
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMatches, setPreviewMatches] = useState(null);
  /** 예선 조편성 미리보기: 랜덤 조 편성 결과 [ [팀,팀,팀], [팀,팀], ... ] */
  const [previewGroupStageGroups, setPreviewGroupStageGroups] = useState(null);
  /** 예선 조편성 제출 시 사용할 팀 순서(미리보기와 동일한 랜덤 순서) */
  const [previewGroupStageTeamsForSubmit, setPreviewGroupStageTeamsForSubmit] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  /** 미리보기에서 같은 매치 내 중복 참가자 있는지 (제출 비활성화용) */
  const hasPreviewDuplicate = useMemo(() => {
    if (!previewMatches || previewMatches.length === 0) return false;
    return previewMatches.some((m) => {
      const all = [...(m.team1_players ?? []), ...(m.team2_players ?? [])].filter(Boolean);
      return all.length !== new Set(all).size;
    });
  }, [previewMatches]);

  const courtHours = courtDurationHours(courtStartTime, courtEndTime);
  const courtEndOptions = getCourtEndOptions(courtStartTime);

  const courtSlots =
    perCourtTimesOverride && courtSlotsPerCourt.length > 0
      ? courtSlotsPerCourt.slice(0, courtCount).map((s) => ({
          start: s?.start ?? courtStartTime,
          end: s?.end ?? courtEndTime,
        }))
      : Array.from({ length: Math.max(1, courtCount) }, () => ({
          start: courtStartTime,
          end: courtEndTime,
        }));

  const totalCourtHours = totalCourtHoursFromSlots(courtSlots);
  const { minStart: attendanceMinStart, maxEnd: attendanceMaxEnd } =
    courtSlotsRange(courtSlots);
  const attendanceRangeStart =
    attendanceMinStart || courtStartTime;
  const attendanceRangeEnd =
    attendanceMaxEnd || courtEndTime;

  const handleParticipantsChange = (newParticipants) => {
    const normalizedNew = newParticipants.map(normalizeParticipant).filter((p) => p.name);
    setParticipants(normalizedNew);
    setParticipantAttendance((prev) => {
      const oldList = participantsRef.current.map(normalizeParticipant).filter((p) => p.name);
      const oldNames = oldList.map((p) => p.name);
      return normalizedNew.map((p) => {
        const oldIdx = oldNames.indexOf(p.name);
        if (oldIdx >= 0) {
          const existing = prev[oldIdx];
          return typeof existing === "object" && existing?.type
            ? { ...existing }
            : { type: "full" };
        }
        return { type: "full" };
      });
    });
  };

  const setAttendanceType = (index, type) => {
    setParticipantAttendance((prev) => {
      const next = [...prev];
      if (type === "full") {
        next[index] = { type: "full" };
      } else if (type === "early_leave") {
        const opts = getLeaveAtOptions(attendanceRangeStart, attendanceRangeEnd);
        next[index] = {
          type: "early_leave",
          leaveAt: opts.length ? opts[opts.length - 1] : undefined,
        };
      } else {
        const opts = getJoinAtOptions(attendanceRangeStart, attendanceRangeEnd);
        next[index] = {
          type: "late_join",
          joinAt: opts.length ? opts[0] : undefined,
        };
      }
      return next;
    });
  };

  const setAttendanceTime = (index, field, time) => {
    setParticipantAttendance((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (cur?.type && cur.type !== "full")
        next[index] = { ...cur, [field]: time || undefined };
      return next;
    });
  };

  const leaveAtOptions = getLeaveAtOptions(attendanceRangeStart, attendanceRangeEnd);
  const joinAtOptions = getJoinAtOptions(attendanceRangeStart, attendanceRangeEnd);

  const setPerCourtSlot = (index, field, value) => {
    setCourtSlotsPerCourt((prev) => {
      const next = prev.slice(0, courtCount);
      while (next.length <= index) next.push({ start: courtStartTime, end: courtEndTime });
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCourtCountChange = (n) => {
    const num = Math.max(1, Math.min(20, Number(n) || 1));
    setCourtCount(num);
    if (perCourtTimesOverride) {
      setCourtSlotsPerCourt((prev) => {
        const next = prev.slice(0, num);
        while (next.length < num)
          next.push({ start: courtStartTime, end: courtEndTime });
        return next;
      });
    }
  };

  const handlePerCourtOverrideChange = (checked) => {
    setPerCourtTimesOverride(checked);
    if (checked) {
      setCourtSlotsPerCourt(
        Array.from({ length: courtCount }, () => ({
          start: courtStartTime,
          end: courtEndTime,
        }))
      );
    }
  };

  const allowedBracketTypes =
    matchType === "singles"
      ? BRACKET_TYPES_SINGLES
      : matchType === "doubles"
        ? BRACKET_TYPES_DOUBLES
        : null;

  const isTournamentDoubles = bracketType === "tournament" && matchType === "doubles";
  const isGroupStageDoubles = bracketType === "group_stage" && matchType === "doubles";
  const isGroupStageSingles = bracketType === "group_stage" && matchType === "singles";
  const isTeamEntryDoubles = isTournamentDoubles || isGroupStageDoubles;
  const validTournamentTeams = tournamentTeams.filter((t) => {
    const p1 = (t.player1 ?? "").trim();
    const p2 = (t.player2 ?? "").trim();
    if (bracketType === "group_stage" && matchType === "doubles") return !!p1;
    return !!p1 && !!p2;
  });
  const validTournamentTeamsCount = validTournamentTeams.length;

  const courtRequired =
    DOUBLES_COURT_TYPES.includes(bracketType) &&
    bracketType !== "group_stage" &&
    (!courtStartTime || !courtEndTime);

  const canGoNext =
    (step === 1 && matchType !== null) ||
    (step === 2 && bracketType !== null) ||
    (step === 3 &&
      (isTeamEntryDoubles
        ? validTournamentTeamsCount >= 2 &&
          (bracketType === "group_stage" || (courtStartTime && courtEndTime))
        : participants.length >= 2 &&
          (!DOUBLES_COURT_TYPES.includes(bracketType) ||
            bracketType === "group_stage" ||
            (courtStartTime && courtEndTime))));

  const canSubmit =
    matchType !== null &&
    bracketType !== null &&
(isTeamEntryDoubles
          ? validTournamentTeamsCount >= 2
      : participants.length >= 2) &&
    (!DOUBLES_COURT_TYPES.includes(bracketType) ||
      bracketType === "group_stage" ||
      (courtStartTime && courtEndTime)) &&
    !loading;

  const handleMatchTypeChange = (type) => {
    setMatchType(type);
    if (
      type === "singles" &&
      bracketType !== null &&
      !BRACKET_TYPES_SINGLES.includes(bracketType)
    ) {
      setBracketType(null);
    }
    if (MATCH_TYPES_READY.includes(type)) setStep(2);
  };

  const handleBracketTypeChange = (type) => {
    setBracketType(type);
    if (BRACKET_TYPES_READY.includes(type)) setStep(3);
  };

  const getPreviewOptions = () => {
    const isDoubles = DOUBLES_COURT_TYPES.includes(bracketType);
    const isGroupStage = bracketType === "group_stage";
    const courtCountVal = isDoubles && !isGroupStage ? courtCount : 1;
    let totalHours = totalCourtHours;
    if (totalHours <= 0 && isDoubles && !isGroupStage && courtStartTime && courtEndTime) {
      const per = courtDurationHours(courtStartTime, courtEndTime);
      if (per != null && per > 0) totalHours = per * courtCountVal;
    }
    return {
    participant_attendance:
      bracketType === "partner_rotation" ? participantAttendance : undefined,
    court_count: isGroupStage ? undefined : courtCountVal,
    total_court_hours: isDoubles && !isGroupStage && totalHours > 0 ? totalHours : undefined,
    match_duration_minutes: 30,
    max_games_per_person:
      bracketType === "partner_rotation" ? maxGamesPerPerson : undefined,
    court_start_time:
      DOUBLES_COURT_TYPES.includes(bracketType) && !isGroupStage ? courtStartTime || undefined : undefined,
    court_end_time:
      DOUBLES_COURT_TYPES.includes(bracketType) && !isGroupStage ? courtEndTime || undefined : undefined,
    court_slots:
      DOUBLES_COURT_TYPES.includes(bracketType) && !isGroupStage && perCourtTimesOverride
        ? courtSlots
        : undefined,
    teamsPerGroup:
      (bracketType === "tournament" || bracketType === "group_stage") ? teamsPerGroup : undefined,
  };
  };

  /** Fisher–Yates shuffle */
  const shuffleTeams = (teams) => {
    const a = teams.map((t) => ({ ...t }));
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** 예선 조편성: 팀 배열을 조당 팀 수에 맞춰 그룹으로 나눔 (각 조는 최소 2팀, 최대 perGroup팀) */
  const computeGroupStageGroups = (teams, perGroup) => {
    const N = teams.length;
    if (N < 2) return [];
    const groups = [];
    let remaining = N;
    let idx = 0;

    while (remaining > 0) {
      if (remaining >= perGroup) {
        const size = perGroup;
        groups.push(teams.slice(idx, idx + size));
        idx += size;
        remaining -= size;
      } else {
        // 남은 팀이 perGroup보다 적을 때
        if (remaining === 1 && groups.length > 0) {
          // 마지막 조에서 1팀을 가져와서 2팀 조를 하나 더 만든다.
          const lastGroup = groups[groups.length - 1];
          const moved = lastGroup.pop();
          // moved가 빠진 그룹은 여전히 최소 2팀 이상이어야 함 (perGroup 최소 2 보장)
          const newGroup = [moved, teams[idx]];
          groups.push(newGroup);
          idx += 1;
          remaining = 0;
        } else if (remaining >= 2) {
          groups.push(teams.slice(idx, idx + remaining));
          idx += remaining;
          remaining = 0;
        } else {
          break;
        }
      }
    }

    return groups;
  };

  const handlePreview = () => {
    if (!canSubmit) return;
    setError(null);
    setPreviewLoading(true);
    setPreviewGroupStageGroups(null);
    if (bracketType !== "group_stage") setPreviewGroupStageTeamsForSubmit(null);
    setStep(5);
    setTimeout(() => {
      try {
        let input;
        if (bracketType === "group_stage") {
          const raw =
            matchType === "doubles"
              ? validTournamentTeams.map((t) => ({
                  player1: (t.player1 ?? "").trim(),
                  player2: (t.player2 ?? "").trim(),
                }))
              : participants.map((p) => ({
                  player1: (getParticipantName(p) ?? "").trim(),
                  player2: "",
                })).filter((t) => t.player1);
          const shuffled = shuffleTeams(raw);
          const groups = computeGroupStageGroups(shuffled, teamsPerGroup);
          setPreviewGroupStageGroups(groups);
          setPreviewGroupStageTeamsForSubmit(shuffled);
          input = shuffled;
        } else if (bracketType === "tournament") {
          input = validTournamentTeams.map((t) => ({
            player1: (t.player1 ?? "").trim(),
            player2: (t.player2 ?? "").trim(),
          }));
        } else {
          input = participants;
        }
        const generated = generateBracket(
          bracketType,
          input,
          useSeed && SEED_AVAILABLE_TYPES.includes(bracketType) ? {} : undefined,
          getPreviewOptions()
        );
        setPreviewMatches(generated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "대진 생성 오류");
      } finally {
        setPreviewLoading(false);
      }
    }, 0);
  };

  const handlePreviewRefresh = () => {
    if (!canSubmit) return;
    setError(null);
    setPreviewLoading(true);
    setPreviewGroupStageGroups(null);
    if (bracketType !== "group_stage") setPreviewGroupStageTeamsForSubmit(null);
    setTimeout(() => {
      try {
        let input;
        if (bracketType === "group_stage") {
          const raw =
            matchType === "doubles"
              ? validTournamentTeams.map((t) => ({
                  player1: (t.player1 ?? "").trim(),
                  player2: (t.player2 ?? "").trim(),
                }))
              : participants.map((p) => ({
                  player1: (getParticipantName(p) ?? "").trim(),
                  player2: "",
                })).filter((t) => t.player1);
          const shuffled = shuffleTeams(raw);
          const groups = computeGroupStageGroups(shuffled, teamsPerGroup);
          setPreviewGroupStageGroups(groups);
          setPreviewGroupStageTeamsForSubmit(shuffled);
          input = shuffled;
        } else if (bracketType === "tournament") {
          input = validTournamentTeams.map((t) => ({
            player1: (t.player1 ?? "").trim(),
            player2: (t.player2 ?? "").trim(),
          }));
        } else {
          input = participants;
        }
        const generated = generateBracket(
          bracketType,
          input,
          useSeed && SEED_AVAILABLE_TYPES.includes(bracketType) ? {} : undefined,
          getPreviewOptions()
        );
        setPreviewMatches(generated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "대진 재생성 오류");
      } finally {
        setPreviewLoading(false);
      }
    }, 0);
  };

  /** 미리보기에서 특정 슬롯 참가자 변경 (select용). matchIndex = previewMatches 내 인덱스 */
  const handlePreviewPlayerChange = (matchIndex, team, slotIndex, newName) => {
    setPreviewMatches((prev) => {
      const next = prev.map((m) => ({ ...m, team1_players: [...(m.team1_players || [])], team2_players: [...(m.team2_players || [])] }));
      const m = next[matchIndex];
      if (!m) return next;
      const arr = team === "team1" ? m.team1_players : m.team2_players;
      if (arr.length <= slotIndex) arr.length = slotIndex + 1;
      arr[slotIndex] = newName || "";
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !bracketType || !matchType) return;
    if (step === 5 && hasPreviewDuplicate) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        match_type: matchType,
        bracket_type: bracketType,
        participants:
          bracketType === "group_stage" &&
          matchType === "singles" &&
          previewGroupStageTeamsForSubmit?.length > 0
            ? previewGroupStageTeamsForSubmit.map((t) => {
                const p = participants.find((p) => getParticipantName(p) === (t.player1 ?? "").trim());
                return p !== undefined
                  ? typeof p === "string"
                    ? p
                    : { name: p.name, gender: p.gender }
                  : (t.player1 ?? "").trim();
              })
            : isTeamEntryDoubles
              ? validTournamentTeams.flatMap((t) => [
                  (t.player1 ?? "").trim(),
                  (t.player2 ?? "").trim(),
                ])
              : participants,
        seed_config: useSeed && SEED_AVAILABLE_TYPES.includes(bracketType) ? {} : null,
        participant_attendance:
          bracketType === "partner_rotation" ? participantAttendance : null,
        court_count:
          DOUBLES_COURT_TYPES.includes(bracketType) && bracketType !== "group_stage" ? courtCount : null,
        match_duration_minutes: 30,
        max_games_per_person:
          bracketType === "partner_rotation" ? maxGamesPerPerson : null,
        court_start_time:
          DOUBLES_COURT_TYPES.includes(bracketType) && bracketType !== "group_stage" ? courtStartTime || null : null,
        court_end_time:
          DOUBLES_COURT_TYPES.includes(bracketType) && bracketType !== "group_stage" ? courtEndTime || null : null,
        court_slots:
          DOUBLES_COURT_TYPES.includes(bracketType) && bracketType !== "group_stage" && perCourtTimesOverride
            ? courtSlots
            : null,
        settings: null,
      };
      if (isTeamEntryDoubles) {
        const raw =
          bracketType === "group_stage" && previewGroupStageTeamsForSubmit?.length > 0
            ? previewGroupStageTeamsForSubmit
            : validTournamentTeams;
        body.teams = raw.map((t) => ({
          player1: (t.player1 ?? "").trim(),
          player2: (t.player2 ?? "").trim(),
        }));
      }
      if (bracketType === "tournament" || bracketType === "group_stage") {
        body.teams_per_group = teamsPerGroup;
      }
      if (step === 5 && previewMatches && previewMatches.length > 0 && !hasPreviewDuplicate) {
        body.override_matches = previewMatches.map((m) => ({
          round: m.round,
          court: m.court,
          team1_players: m.team1_players ?? [],
          team2_players: m.team2_players ?? [],
        }));
      }
      const res = await fetch("/api/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }
      router.push(`/bracket/${data.id}/edit?key=${data.edit_key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative mx-auto flex max-w-desktop items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground hover:text-foreground tap-target"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="font-medium">이전</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground hover:text-foreground tap-target"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="font-medium">이전</span>
            </Link>
          )}
          <Link
            href="/"
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 font-bold text-gray-900"
          >
            <span className="text-lg leading-tight">MatchBox</span>
          </Link>
          <div className="min-w-0 flex-1 text-right">
            {step >= 3 && matchType && bracketType && (
              <div className="flex flex-col items-end gap-0 text-sm font-medium text-gray-700 sm:flex-row sm:items-center sm:justify-end sm:gap-x-1">
                <span>{MATCH_TYPE_LABELS[matchType]}</span>
                <span className="sm:before:ml-1">{BRACKET_TYPE_LABELS[bracketType]}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-mobile px-4 py-6 sm:max-w-desktop sm:px-6 sm:py-8">
        <StepIndicator
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          className="mb-8"
        />

        <form onSubmit={handleSubmit} className="space-y-8">
        {step === 1 && (
          <Card className="relative z-10 animate-in fade-in duration-200">
            <CardHeader>
              <CardTitle>1. 경기 방식 선택</CardTitle>
              <CardDescription>
                단식(1:1) 또는 복식(2:2)을 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MatchTypeSelector value={matchType} onChange={handleMatchTypeChange} />
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="relative z-10 animate-in fade-in duration-200">
            <CardHeader>
              <CardTitle>2. 대진 방식 선택</CardTitle>
              <CardDescription>사용할 대진 방식을 선택하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BracketTypeSelector
                value={bracketType}
                onChange={handleBracketTypeChange}
                allowedTypes={allowedBracketTypes ?? undefined}
              />
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="relative z-10 animate-in fade-in duration-200">
            <CardHeader>
              <CardTitle>
                {isTeamEntryDoubles ? "3. 참가 팀 (페어) 입력" : "3. 참가자 입력"}
              </CardTitle>
              <CardDescription>
                {isTeamEntryDoubles
                  ? "참가자 이름을 입력하세요. (최소 2팀)"
                  : "참가자 이름을 입력하세요. (최소 4명, 최대 64명)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isTeamEntryDoubles ? (
                <>
                  {isGroupStageDoubles && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">입력 방식</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="teamInputMode"
                            value="manual"
                            checked={teamInputMode === "manual"}
                            onChange={() => setTeamInputMode("manual")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">팀별로 입력 (선수1, 선수2)</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="teamInputMode"
                            value="paste"
                            checked={teamInputMode === "paste"}
                            onChange={() => setTeamInputMode("paste")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">한 번에 입력 (대표명)</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="teamInputMode"
                            value="excel"
                            checked={teamInputMode === "excel"}
                            onChange={() => setTeamInputMode("excel")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">엑셀(CSV) 업로드</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {(!isGroupStageDoubles || teamInputMode === "manual") && (
                    <TeamInput
                      teams={tournamentTeams}
                      onChange={setTournamentTeams}
                      minCount={2}
                      maxCount={64}
                      representativeOnly={isGroupStageDoubles}
                    />
                  )}
                  {isGroupStageDoubles && teamInputMode === "paste" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        페어 대표명을 쉼표(,) 또는 줄바꿈으로 구분해 입력하세요. 각 이름은 한 팀(페어)을 의미합니다.
                      </p>
                      <textarea
                        value={teamNamesPaste}
                        onChange={(e) => setTeamNamesPaste(e.target.value)}
                        placeholder={"예: 홍길동, 김철수, 이영희\n박민수"}
                        className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={4}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const names = parseTeamNamesFromPaste(teamNamesPaste);
                          if (names.length === 0) return;
                          setTournamentTeams(
                            names.map((name) => ({ player1: name, player2: "" }))
                          );
                        }}
                      >
                        목록 적용
                      </Button>
                      {validTournamentTeamsCount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          적용됨: <strong>{validTournamentTeamsCount}팀</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {isGroupStageDoubles && teamInputMode === "excel" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        템플릿을 받아 엑셀에서 정보를 채운 뒤, Excel 파일(.xlsx) 또는 CSV 파일로 저장하여 업로드하세요. "참가자(1)" 열의 이름만 읽어서 사용합니다.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const headers = ["순번", "참가자1", "클럽", "참가자2", "클럽", "비고"];
                            const worksheet = XLSX.utils.aoa_to_sheet([headers]);
                            const workbook = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(workbook, worksheet, "팀 목록");
                            XLSX.writeFile(workbook, "팀_등록_템플릿.xlsx");
                          }}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          템플릿 다운로드
                        </Button>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                          <Upload className="h-4 w-4" />
                          <span>Excel/CSV 파일 선택</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target?.files?.[0];
                              if (!file) return;
                              
                              if (file.name.endsWith(".csv")) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const text = reader.result;
                                  const names = parseTeamNamesFromCsv(
                                    typeof text === "string" ? text : ""
                                  );
                                  if (names.length > 0) {
                                    setTournamentTeams(
                                      names.map((name) => ({ player1: name, player2: "" }))
                                    );
                                  }
                                  e.target.value = "";
                                };
                                reader.readAsText(file, "UTF-8");
                              } else {
                                parseTeamNamesFromExcel(file, (names) => {
                                  if (names.length > 0) {
                                    setTournamentTeams(
                                      names.map((name) => ({ player1: name, player2: "" }))
                                    );
                                  }
                                  e.target.value = "";
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                      {validTournamentTeamsCount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          업로드됨: <strong>{validTournamentTeamsCount}팀</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {isGroupStageDoubles && teamInputMode !== "manual" && validTournamentTeamsCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      예선 조편성에서는 팀 대표명만 있어도 됩니다. 파트너 정보는 엑셀 등에서 별도 관리하세요.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {isGroupStageSingles && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">입력 방식</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="participantInputMode"
                            value="manual"
                            checked={participantInputMode === "manual"}
                            onChange={() => setParticipantInputMode("manual")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">개별 입력</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="participantInputMode"
                            value="paste"
                            checked={participantInputMode === "paste"}
                            onChange={() => setParticipantInputMode("paste")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">한 번에 입력</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                          <input
                            type="radio"
                            name="participantInputMode"
                            value="excel"
                            checked={participantInputMode === "excel"}
                            onChange={() => setParticipantInputMode("excel")}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-900">엑셀(CSV) 업로드</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {(!isGroupStageSingles || participantInputMode === "manual") && (
                    <ParticipantInput
                      participants={participants}
                      onChange={handleParticipantsChange}
                      minCount={4}
                      maxCount={64}
                      descriptionExtra={
                        matchType === "doubles"
                          ? "복식: 참가자 2명씩 페어로 매칭됩니다."
                          : undefined
                      }
                    />
                  )}
                  {isGroupStageSingles && participantInputMode === "paste" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        참가자 이름을 쉼표(,) 또는 줄바꿈으로 구분해 입력하세요.
                      </p>
                      <textarea
                        value={participantNamesPaste}
                        onChange={(e) => setParticipantNamesPaste(e.target.value)}
                        placeholder={"예: 홍길동, 김철수, 이영희\n박민수"}
                        className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={4}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const names = parseTeamNamesFromPaste(participantNamesPaste);
                          if (names.length === 0) return;
                          handleParticipantsChange(
                            names.map((name) => (typeof name === "string" ? name : name.name || ""))
                          );
                        }}
                      >
                        목록 적용
                      </Button>
                      {participants.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          적용됨: <strong>{participants.length}명</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {isGroupStageSingles && participantInputMode === "excel" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        템플릿을 받아 엑셀에서 참가자 이름을 채운 뒤, Excel 파일(.xlsx) 또는 CSV 파일로 저장하여 업로드하세요. "참가자 이름" 열의 이름을 읽어서 사용합니다.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const headers = ["순번", "참가자 이름", "클럽", "비고"];
                            const worksheet = XLSX.utils.aoa_to_sheet([headers]);
                            const workbook = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(workbook, worksheet, "참가자 목록");
                            XLSX.writeFile(workbook, "참가자_등록_템플릿.xlsx");
                          }}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          템플릿 다운로드
                        </Button>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                          <Upload className="h-4 w-4" />
                          <span>Excel/CSV 파일 선택</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target?.files?.[0];
                              if (!file) return;
                              
                              if (file.name.endsWith(".csv")) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const text = reader.result;
                                  const lines = (typeof text === "string" ? text : "").split(/\r?\n/).filter((line) => line.trim());
                                  const names = [];
                                  for (let i = 0; i < lines.length; i++) {
                                    const line = lines[i];
                                    const firstCell = line.includes(",") ? line.split(",")[0].trim() : line.trim();
                                    const decoded = firstCell.replace(/^"|"$/g, "").trim();
                                    if (decoded && (i > 0 || (decoded !== "참가자 이름" && decoded !== "대표명"))) {
                                      names.push(decoded);
                                    }
                                  }
                                  if (names.length > 0) {
                                    handleParticipantsChange(
                                      names.map((name) => name)
                                    );
                                  }
                                  e.target.value = "";
                                };
                                reader.readAsText(file, "UTF-8");
                              } else {
                                parseParticipantNamesFromExcel(file, (names) => {
                                  if (names.length > 0) {
                                    handleParticipantsChange(
                                      names.map((name) => name)
                                    );
                                  }
                                  e.target.value = "";
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                      {participants.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          업로드됨: <strong>{participants.length}명</strong>
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              {(bracketType === "tournament" || bracketType === "group_stage") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    조당 팀 수
                  </p>
                  <p className="text-xs text-muted-foreground">
                    한 조에 몇 팀씩 편성할지 선택하세요.
                  </p>
                  <div className="flex gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50">
                      <input
                        type="radio"
                        name="teamsPerGroup"
                        value="3"
                        checked={teamsPerGroup === 3}
                        onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-900">3팀</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50">
                      <input
                        type="radio"
                        name="teamsPerGroup"
                        value="4"
                        checked={teamsPerGroup === 4}
                        onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-900">4팀</span>
                    </label>
                  </div>
                  {((bracketType === "group_stage" && matchType === "singles" && participants.length >= 2) ||
                    (isTeamEntryDoubles && validTournamentTeamsCount >= 2)) &&
                  (() => {
                    const count = matchType === "singles" ? participants.length : validTournamentTeamsCount;
                    const numGroups = Math.ceil(count / teamsPerGroup);
                    let lastGroupSize = count % teamsPerGroup;
                    let actualNumGroups = numGroups;
                    if (lastGroupSize === 1) {
                      actualNumGroups = Math.max(1, numGroups - 1);
                      lastGroupSize = count - (actualNumGroups - 1) * teamsPerGroup;
                    } else if (lastGroupSize === 0) {
                      lastGroupSize = teamsPerGroup;
                    }
                    return (
                      <p className="text-xs text-muted-foreground">
                        {matchType === "singles" ? `${count}명` : `${count}팀`} 기준: {actualNumGroups}조
                        {actualNumGroups > 0 && ` (마지막 조는 ${lastGroupSize}${matchType === "singles" ? "명" : "팀"})`}
                      </p>
                    );
                  })()}
                </div>
              )}
              {DOUBLES_COURT_TYPES.includes(bracketType) && bracketType !== "group_stage" && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">
                      코트 사용 시간
                    </p>
                    <p className="text-xs text-muted-foreground">
                      예약하신 시작·종료 시각을 선택하세요.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={courtStartTime}
                        onChange={(e) => {
                          setCourtStartTime(e.target.value);
                          setCourtEndTime("");
                        }}
                        className="h-11 min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">시작 시각</option>
                        {COURT_START_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">~</span>
                      <select
                        value={courtEndTime}
                        onChange={(e) => setCourtEndTime(e.target.value)}
                        disabled={!courtStartTime}
                        className="h-11 min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      >
                        <option value="">종료 시각</option>
                        {courtEndOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      코트 개수
                    </p>
                    <p className="text-xs text-muted-foreground">
                      위에서 선택한 시간이 모든 코트에 적용됩니다.
                    </p>
                    <select
                      value={courtCount}
                      onChange={(e) => handleCourtCountChange(e.target.value)}
                      className="h-11 min-h-[44px] w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}코트
                        </option>
                      ))}
                    </select>
                  </div>
                  {(isTeamEntryDoubles ? validTournamentTeamsCount >= 2 : participants.length >= 4) &&
                    bracketType !== "group_stage" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span className="font-medium">코트 사용 안내</span>
                      <p className="mt-0.5">
                        {isTournamentDoubles
                          ? `참가팀 ${validTournamentTeamsCount}팀이면 한 라운드에 동시에 최대 ${Math.floor(validTournamentTeamsCount / 2)}코트만 사용할 수 있습니다.`
                          : `참가자 ${participants.length}명이면 한 라운드에 동시에 최대 ${Math.floor(participants.length / 4)}코트만 사용할 수 있습니다.`}
                        {courtCount > (isTeamEntryDoubles ? Math.floor(validTournamentTeamsCount / 2) : Math.floor(participants.length / 4)) && (
                          <span className="mt-1 block font-medium">
                            코트 {courtCount}개 선택 시 실제 대진에는 동시에{" "}
                            {isTeamEntryDoubles ? Math.floor(validTournamentTeamsCount / 2) : Math.floor(participants.length / 4)}코트만
                            사용됩니다.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {courtRequired && (
                    <p className="text-sm text-amber-600">
                      복식 대진을 만들려면 코트 사용 시간(시작·종료)을
                      선택해주세요.
                    </p>
                  )}
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2">
                    <input
                      type="checkbox"
                      checked={perCourtTimesOverride}
                      onChange={(e) =>
                        handlePerCourtOverrideChange(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      일부 코트만 시간이 다르면 여기서 설정
                    </span>
                  </label>
                  {perCourtTimesOverride && (
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-700">
                        코트별 사용 시간
                      </p>
                      {courtSlots.slice(0, courtCount).map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="w-14 text-sm text-gray-600">
                            코트 {idx + 1}
                          </span>
                          <select
                            value={slot.start}
                            onChange={(e) => {
                              setPerCourtSlot(idx, "start", e.target.value);
                              setPerCourtSlot(idx, "end", "");
                            }}
                            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                          >
                            <option value="">시작</option>
                            {COURT_START_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <span className="text-muted-foreground">~</span>
                          <select
                            value={slot.end}
                            onChange={(e) =>
                              setPerCourtSlot(idx, "end", e.target.value)
                            }
                            disabled={!slot.start}
                            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 disabled:opacity-50"
                          >
                            <option value="">종료</option>
                            {getCourtEndOptions(slot.start).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                  {bracketType === "partner_rotation" &&
                    (totalCourtHours > 0 || (isTeamEntryDoubles ? validTournamentTeamsCount >= 2 : participants.length >= 2)) && (
                      <div className="space-y-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">예상 1인당 게임 수</span>
                          <label className="flex items-center gap-1.5">
                            <span className="text-gray-600">1인당 최대</span>
                            <select
                              value={maxGamesPerPerson}
                              onChange={(e) =>
                                setMaxGamesPerPerson(
                                  Number(e.target.value)
                                )
                              }
                              className="rounded border border-gray-300 bg-white px-2 py-0.5 text-gray-900"
                            >
                              {[2, 3, 4, 5, 6].map((n) => (
                                <option key={n} value={n}>
                                  {n}경기
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {totalCourtHours > 0 && (isTeamEntryDoubles ? validTournamentTeamsCount >= 2 : participants.length >= 2) && (
                          <p className="mt-0.5">
                            {isTeamEntryDoubles ? `참가팀 ${validTournamentTeamsCount}팀` : `참가자 ${participants.length}명`}, 코트 {courtCount}개
                            {perCourtTimesOverride
                              ? ` (총 ${totalCourtHours}코트·시간)`
                              : ` × ${courtHours}시간`}{" "}
                            → 1인당 약{" "}
                            {estimateGamesPerPerson(
                              totalCourtHours,
                              isTeamEntryDoubles ? validTournamentTeamsCount * 2 : participants.length,
                              maxGamesPerPerson
                            )}
                            게임 (최대 {maxGamesPerPerson}게임)
                          </p>
                        )}
                        {(!totalCourtHours || (isTeamEntryDoubles ? validTournamentTeamsCount < 2 : participants.length < 2)) && (
                          <p className="mt-0.5">
                            1인당 최대 {maxGamesPerPerson}게임까지 배정 (휴식
                            고려)
                          </p>
                        )}
                      </div>
                    )}
                  {bracketType === "partner_rotation" && participants.length >= 2 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        참가별 출석 (선택)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        일찍 가거나 늦게 오는 경우 퇴장/입장 시각을 선택하면
                        게임 수를 조정할 수 있습니다. (코트 시간 30분 단위)
                      </p>
                      <ul className="space-y-2">
                        {participants.map((p, i) => {
                          const name = getParticipantName(p);
                          const att = participantAttendance[i];
                          const type = typeof att === "object" ? att?.type : "full";
                          const leaveAt = typeof att === "object" ? att?.leaveAt : undefined;
                          const joinAt = typeof att === "object" ? att?.joinAt : undefined;
                          return (
                            <li
                              key={`${name}-${i}`}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                            >
                              <span className="min-w-[4rem] text-sm font-medium text-gray-900">
                                {name}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {[
                                  { value: "full", label: "전시간" },
                                  { value: "early_leave", label: "조퇴" },
                                  { value: "late_join", label: "늦참" },
                                ].map(({ value, label }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setAttendanceType(i, value)}
                                    className={cn(
                                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                                      type === value
                                        ? "bg-primary text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                  >
                                    {label}
                                  </button>
                                ))}
                                {type === "early_leave" && leaveAtOptions.length > 0 && (
                                  <select
                                    value={leaveAt && leaveAtOptions.includes(leaveAt) ? leaveAt : ""}
                                    onChange={(e) =>
                                      setAttendanceTime(i, "leaveAt", e.target.value)
                                    }
                                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none"
                                  >
                                    <option value="">퇴장 시각</option>
                                    {leaveAtOptions.map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {type === "late_join" && joinAtOptions.length > 0 && (
                                  <select
                                    value={joinAt && joinAtOptions.includes(joinAt) ? joinAt : ""}
                                    onChange={(e) =>
                                      setAttendanceTime(i, "joinAt", e.target.value)
                                    }
                                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none"
                                  >
                                    <option value="">입장 시각</option>
                                    {joinAtOptions.map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {SEED_AVAILABLE_TYPES.includes(bracketType) && (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2">
                  <input
                    type="checkbox"
                    checked={useSeed}
                    onChange={(e) => setUseSeed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    시드 배정 사용
                  </span>
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="animate-in fade-in duration-200">
            <CardHeader>
              <CardTitle>4. 확인 후 생성</CardTitle>
              <CardDescription>
                설정을 확인하고 대진표를 생성하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  경기 방식: {matchType ? MATCH_TYPE_LABELS[matchType] : "—"}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700">
                  대진 방식:{" "}
                  {bracketType ? BRACKET_TYPE_LABELS[bracketType] : "—"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {isTeamEntryDoubles
                    ? `참가팀 ${validTournamentTeamsCount}팀`
                    : `참가자 ${participants.length}명`}
                </p>
                {DOUBLES_COURT_TYPES.includes(bracketType) &&
                  (courtStartTime || totalCourtHours > 0) && (
                    <p className="mt-1 text-sm text-gray-600">
                      코트 {courtCount}개
                      {perCourtTimesOverride && courtSlots.length > 0
                        ? ` (${courtSlots
                            .map(
                              (s, i) =>
                                `코트${i + 1}: ${s.start || "—"}~${s.end || "—"}`
                            )
                            .join(", ")})`
                        : courtStartTime &&
                          courtEndTime &&
                          ` ${courtStartTime} ~ ${courtEndTime} 동일`}
                    </p>
                  )}
                {bracketType === "partner_rotation" &&
                  participantAttendance.some(
                    (a) => typeof a === "object" && a?.type && a.type !== "full"
                  ) && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        전시간{" "}
                        {
                          participantAttendance.filter(
                            (a) => !a || (typeof a === "object" && a?.type === "full")
                          ).length
                        }
                        명 · 조퇴{" "}
                        {
                          participantAttendance.filter(
                            (a) =>
                              typeof a === "object" && a?.type === "early_leave"
                          ).length
                        }
                        명 · 늦참{" "}
                        {
                          participantAttendance.filter(
                            (a) =>
                              typeof a === "object" && a?.type === "late_join"
                          ).length
                        }
                        명
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-sm text-gray-600">
                        {participants.map((p, i) => {
                          const att = participantAttendance[i];
                          const type = typeof att === "object" ? att?.type : "full";
                          if (type === "early_leave" && att?.leaveAt) {
                            return (
                              <li key={`early-${i}`}>
                                <span className="font-medium text-gray-800">
                                  {getParticipantName(p)}
                                </span>{" "}
                                {att.leaveAt} 퇴장 (조퇴)
                              </li>
                            );
                          }
                          if (type === "late_join" && att?.joinAt) {
                            return (
                              <li key={`late-${i}`}>
                                <span className="font-medium text-gray-800">
                                  {getParticipantName(p)}
                                </span>{" "}
                                {att.joinAt} 입장 (늦참)
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    </div>
                  )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isTeamEntryDoubles ? "참가 팀 목록" : "참가자 목록"}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {isTeamEntryDoubles
                    ? validTournamentTeams.map((t, i) => (
                        <li
                          key={`team-${i}-${t.player1}-${t.player2}`}
                          className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          팀 {i + 1}: {(t.player1 ?? "").trim()} / {(t.player2 ?? "").trim()}
                        </li>
                      ))
                    : participants.map((p, i) => (
                        <li
                          key={`${getParticipantName(p)}-${i}`}
                          className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          {getParticipantName(p)}
                        </li>
                      ))}
                </ul>
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div>
                <Button
                  type="button"
                  size="lg"
                  disabled={!canSubmit}
                  onClick={handlePreview}
                  className="w-full min-h-[48px]"
                >
                  <ArrowRight className="mr-2 h-5 w-5" />
                  미리보기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="animate-in fade-in duration-200">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>5. 미리보기</CardTitle>
                <CardDescription>
                  생성된 대진표를 확인하세요. 마음에 들지 않으면 이전으로 돌아가 수정하거나 새로고침으로 재생성할 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {bracketType === "partner_rotation" &&
                  previewMatches &&
                  previewMatches.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const rounds = [...new Set(previewMatches.map((m) => m.round))].sort((a, b) => a - b);
                        const lines = [];
                        for (const round of rounds) {
                          const roundMatches = previewMatches.filter((m) => m.round === round);
                          lines.push(`Round ${round}`);
                          for (const m of roundMatches) {
                            const t1 = (m.team1_players ?? []).filter(Boolean).join("-");
                            const t2 = (m.team2_players ?? []).filter(Boolean).join("-");
                            lines.push(`  Court ${m.court ?? ""}: ${t1} vs ${t2}`);
                          }
                          lines.push("");
                        }
                        const text = lines.join("\n").trimEnd();
                        try {
                          await navigator.clipboard.writeText(text);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        } catch {
                          setError("클립보드 복사에 실패했습니다.");
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copySuccess ? "복사 완료" : "복사"}
                    </Button>
                  )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSubmit || previewLoading}
                  onClick={handlePreviewRefresh}
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      새로고침
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bracketType === "partner_rotation" &&
                participantAttendance.some(
                  (a) => typeof a === "object" && a?.type && a.type !== "full"
                ) && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                    <p className="mb-1.5 font-medium text-gray-800">출석 (조퇴 / 늦참)</p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {participants.map((p, i) => {
                        const att = participantAttendance[i];
                        const type = typeof att === "object" ? att?.type : "full";
                        if (type === "early_leave" && att?.leaveAt) {
                          return (
                            <li key={`early-${i}`}>
                              <span className="font-medium">{getParticipantName(p)}</span>{" "}
                              {att.leaveAt} 퇴장 (조퇴)
                            </li>
                          );
                        }
                        if (type === "late_join" && att?.joinAt) {
                          return (
                            <li key={`late-${i}`}>
                              <span className="font-medium">{getParticipantName(p)}</span>{" "}
                              {att.joinAt} 입장 (늦참)
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}
              {previewLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>대진 생성 중...</span>
                </div>
              ) : !previewMatches || previewMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">생성된 경기가 없습니다.</p>
              ) : bracketType === "group_stage" && previewGroupStageGroups?.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">조 편성 (랜덤 배정)</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {previewGroupStageGroups.map((group, gi) => (
                      <div
                        key={gi}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <p className="mb-3 border-b border-gray-100 pb-2 text-base font-bold text-gray-900">
                          조 {gi + 1}
                        </p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {group.map((t, ti) => (
                            <li key={ti} className="flex items-center gap-2">
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {ti + 1}
                              </span>
                              {matchType === "doubles"
                                ? [t.player1, t.player2].filter(Boolean).join(" / ")
                                : (t.player1 || t.player2 || "").trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const participantNames =
                      (bracketType === "tournament" || bracketType === "group_stage")
                        ? [...new Set(validTournamentTeams.flatMap((t) => [(t.player1 ?? "").trim(), (t.player2 ?? "").trim()].filter(Boolean)))]
                        : participants.map((p) => getParticipantName(p)).filter(Boolean);
                    const getDuplicateInMatch = (match) => {
                      const all = [...(match.team1_players ?? []), ...(match.team2_players ?? [])].filter(Boolean);
                      const counts = {};
                      all.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
                      return Object.entries(counts).filter(([, c]) => c > 1).map(([name]) => name);
                    };
                    const hasAnyDuplicate = previewMatches.some((m) => getDuplicateInMatch(m).length > 0);
                    return (
                      <>
                        {hasAnyDuplicate && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            일부 경기에 같은 참가자가 두 번 포함되어 있습니다. 아래에서 수정해 주세요.
                          </div>
                        )}
                        {Array.from(
                          new Set(previewMatches.map((m) => m.round))
                        )
                          .sort((a, b) => a - b)
                          .map((round) => {
                            const roundMatches = previewMatches.filter((m) => m.round === round);
                            const playingNames = new Set(
                              roundMatches.flatMap((m) => [
                                ...(m.team1_players ?? []),
                                ...(m.team2_players ?? []),
                              ])
                            );
                            const restingNames =
                              bracketType === "tournament"
                                ? participantNames.filter((name) => !playingNames.has(name))
                                : participants
                                    .map((p) => getParticipantName(p))
                                    .filter((name) => name && !playingNames.has(name));
                            return (
                              <div key={round} className="space-y-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  Round {round}
                                </h3>
                                {restingNames.length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    휴식: {restingNames.join(", ")}
                                  </p>
                                )}
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {roundMatches.map((match, idx) => {
                                    const matchIndex = previewMatches.indexOf(match);
                                    const duplicates = getDuplicateInMatch(match);
                                    const t1 = [...(match.team1_players ?? [])];
                                    const t2 = [...(match.team2_players ?? [])];
                                    while (t1.length < 2) t1.push("");
                                    while (t2.length < 2) t2.push("");
                                    const renderSelect = (team, slotIndex, value) => {
                                      const p = participants.find((x) => (typeof x === "string" ? x : x?.name) === value);
                                      const g = typeof p === "object" && p?.gender === "female" ? "female" : "male";
                                      return (
                                        <select
                                          key={`${team}-${slotIndex}`}
                                          value={value || ""}
                                          onChange={(e) => handlePreviewPlayerChange(matchIndex, team, slotIndex, e.target.value || "")}
                                          className={cn(
                                            "min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                                            g === "female" ? "text-[hsl(var(--female))]" : "text-[hsl(var(--male))]"
                                          )}
                                        >
                                          <option value="">선택</option>
                                          {participantNames.map((name) => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                        </select>
                                      );
                                    };
                                    return (
                                      <div
                                        key={`${round}-${match.court}-${idx}`}
                                        className={cn(
                                          "rounded-lg border bg-white p-3 shadow-sm",
                                          duplicates.length > 0 ? "border-amber-400 bg-amber-50/50" : "border-gray-200"
                                        )}
                                      >
                                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                                          Court {match.court}
                                        </div>
                                        {duplicates.length > 0 && (
                                          <p className="mb-2 text-xs text-amber-700">
                                            같은 참가자가 두 번 포함됨: {duplicates.join(", ")} — 수정해 주세요.
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <div className="min-w-0 flex-1 space-y-1 text-sm">
                                            {renderSelect("team1", 0, t1[0])}
                                            {renderSelect("team1", 1, t1[1])}
                                          </div>
                                          <span className="text-sm text-muted-foreground shrink-0">vs</span>
                                          <div className="min-w-0 flex-1 space-y-1 text-right text-sm">
                                            {renderSelect("team2", 0, t2[0])}
                                            {renderSelect("team2", 1, t2[1])}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </>
                    );
                  })()}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit || loading || (step === 5 && hasPreviewDuplicate)}
                  className="w-full min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      저장하고 대진표 보기
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step >= 3 && step < 4 && (
          <div className="sticky bottom-4 z-0 sm:static">
            <Button
              type="button"
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                if (canGoNext && step < TOTAL_STEPS) {
                  setStep((s) => s + 1);
                }
              }}
              disabled={!canGoNext}
              className="min-h-[44px] w-full"
            >
              확인
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
        </form>
      </main>
    </div>
  );
}
