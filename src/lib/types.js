/** Bracket types available for singles (1v1) */
export const BRACKET_TYPES_SINGLES = ["group_stage", "tournament", "random"];

/** Bracket types available for doubles (2v2) */
export const BRACKET_TYPES_DOUBLES = [
  "partner_rotation",
  "group_matching",
  "team_doubles",
  "tournament",
  "group_stage",
  "random",
];

export const MATCH_TYPE_LABELS = {
  singles: "단식 (1:1)",
  doubles: "복식 (2:2)",
};

export const BRACKET_TYPE_LABELS = {
  partner_rotation: "파트너 로테이션",
  group_matching: "그룹별 매칭",
  team_doubles: "팀 대전",
  tournament: "토너먼트",
  group_stage: "예선 조편성",
  kdk: "KDK",
  random: "랜덤",
};

/** 이전 DB 호환: hanul_* 저장된 값도 표시 가능 */
export const BRACKET_TYPE_LABELS_LEGACY = {
  hanul_aa: "파트너 로테이션",
  hanul_ab: "그룹별 매칭",
  hanul_team: "팀 대전",
};

export function getBracketTypeLabel(type) {
  return BRACKET_TYPE_LABELS[type] ?? BRACKET_TYPE_LABELS_LEGACY[type] ?? type;
}

export const BRACKET_TYPE_DESCRIPTIONS = {
  partner_rotation: "매 게임 파트너 교대",
  group_matching: "A/B 그룹별 파트너, 남녀·실력별 최적화",
  team_doubles: "고정 팀 vs 팀",
  tournament: "단판 탈락 토너먼트. 복식은 페어(팀) 단위 신청, 참가팀 수에 따라 예선·본선 자동 편성.",
  group_stage: "예선 조별 라운드만 생성. 본선은 대회 운영 시 별도 작성.",
  kdk: "KDK 방식 대진",
  random: "참가자 랜덤 매칭",
};

export const BRACKET_RECOMMENDED_COUNT = {
  partner_rotation: "4~16명",
  group_matching: "8~16명 (각 그룹 동일 인원)",
  team_doubles: "5~13팀",
  tournament: "4, 8, 16, 32팀(직진) / 그 외 예선 조 편성",
  group_stage: "6팀 이상 (조별 예선만)",
  kdk: "5~10명",
  random: "제한 없음",
};
