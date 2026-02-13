/**
 * 토너먼트 대진 (단판 승부, 탈락제)
 * 복식: teams = [{ player1, player2 }, ...]. 참가팀 수에 따라 직진(2^k) 또는 예선 조 편성.
 * Returns matches: { round, court, team1_players, team2_players, team1_score, team2_score, status }[].
 */

const TBD = "TBD";

function teamToPlayers(team) {
  if (!team || typeof team !== "object") return [TBD, TBD];
  const p1 = (team.player1 ?? team[0] ?? "").trim() || TBD;
  const p2 = (team.player2 ?? team[1] ?? "").trim() || TBD;
  return [p1, p2];
}

/**
 * 직진 토너먼트: N = 2, 4, 8, 16, 32. 1라운드에 실제 대진, 이후 라운드는 TBD.
 */
function knockoutMatches(teams, courtCount = 1) {
  const N = teams.length;
  const matches = [];
  let round = 1;
  let matchCount = Math.floor(N / 2);
  let offset = 0;

  while (matchCount >= 1) {
    for (let c = 0; c < matchCount; c++) {
      const court = (c % courtCount) + 1;
      const i = offset + c * 2;
      const j = offset + c * 2 + 1;
      const team1 = round === 1 && i < N ? teams[i] : null;
      const team2 = round === 1 && j < N ? teams[j] : null;
      matches.push({
        round,
        court,
        team1_players: team1 ? teamToPlayers(team1) : [TBD, TBD],
        team2_players: team2 ? teamToPlayers(team2) : [TBD, TBD],
        team1_score: null,
        team2_score: null,
        status: "pending",
      });
    }
    offset = 0;
    matchCount = Math.floor(matchCount / 2);
    round++;
  }

  return matches;
}

/**
 * 참가팀 수에 따라 예선 조 + 본선 생성.
 * - 2팀: 1경기 (순위 결정전)
 * - 4, 8, 16, 32팀: 직진 단판 탈락
 * - 그 외(예: 40팀): 예선 조별 라운드로 본선 진출팀 수를 16 또는 32로 맞춘 뒤 본선 토너먼트
 */
export function generateTournament(teams, options = {}) {
  if (!Array.isArray(teams) || teams.length < 2) return [];

  const normalized = teams.map((t) =>
    typeof t === "object" && t !== null
      ? {
          player1: String(t.player1 ?? t[0] ?? "").trim(),
          player2: String(t.player2 ?? t[1] ?? "").trim(),
        }
      : { player1: "", player2: "" }
  ).filter((t) => t.player1 || t.player2);

  const N = normalized.length;
  if (N < 2) return [];

  const courtCount = Math.max(1, Number(options.court_count) || 1);

  // 2팀: 1경기
  if (N === 2) {
    return [
      {
        round: 1,
        court: 1,
        team1_players: teamToPlayers(normalized[0]),
        team2_players: teamToPlayers(normalized[1]),
        team1_score: null,
        team2_score: null,
        status: "pending",
      },
    ];
  }

  // 4, 8, 16, 32: 직진 단판 탈락 (예선만 모드가 아닐 때만)
  const groupStageOnly = Boolean(options.groupStageOnly);
  const log2 = Math.log2(N);
  if (!groupStageOnly && Math.abs(log2 - Math.round(log2)) < 1e-6) {
    return knockoutMatches(normalized, courtCount);
  }

  // 그 외, 또는 예선만 모드: 예선 조 편성 (옵션에 따라 본선 TBD 슬롯 생략)
  const teamsPerGroup = Math.max(2, Math.min(6, Number(options.teamsPerGroup) || 4)); // 기본값 4, 최소 2 최대 6
  let numGroups = Math.ceil(N / teamsPerGroup);
  
  // 마지막 조가 1팀만 남으면 안 됨 (최소 2팀). 조 수를 조정
  const lastGroupSize = N % teamsPerGroup;
  if (lastGroupSize === 1) {
    numGroups = Math.max(1, numGroups - 1); // 조 수를 하나 줄여서 마지막 조에 더 많은 팀 배정
  }

  const result = [];

  // 예선: 조별 라운드 로빈 (간단히 조당 1라운드 = 한 번씩 대전)
  // 각 조에 팀 배정: 앞 조들은 teamsPerGroup, 마지막 조는 나머지 (최소 2팀 보장)
  const groupIndices = [];
  let remaining = N;
  for (let g = 0; g < numGroups; g++) {
    const start = g * teamsPerGroup;
    // 마지막 조는 남은 팀을 모두 배정 (최소 2팀 보장됨)
    const size = g === numGroups - 1 ? remaining : Math.min(teamsPerGroup, remaining);
    const end = start + size;
    if (size >= 2) {
      groupIndices.push({ start, end, size });
    }
    remaining -= size;
  }

  for (const { start, end, size } of groupIndices) {
    if (size < 2) continue;
    const groupTeams = normalized.slice(start, end);
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        result.push({
          round: 1,
          court: (result.length % courtCount) + 1,
          team1_players: teamToPlayers(groupTeams[i]),
          team2_players: teamToPlayers(groupTeams[j]),
          team1_score: null,
          team2_score: null,
          status: "pending",
        });
      }
    }
  }

  if (groupStageOnly) return result;

  // 본선: totalAdvance팀을 2^k로 맞춘 뒤 토너먼트 (실제 팀 배정은 예선 결과 후이므로 TBD)
  const targetKnockout = N <= 8 ? 8 : N <= 16 ? 16 : N <= 32 ? 32 : 32;
  const advancePerGroup = Math.max(1, Math.floor(targetKnockout / numGroups));
  const totalAdvance = advancePerGroup * numGroups;
  const knockoutSize = totalAdvance <= 4 ? 4 : totalAdvance <= 8 ? 8 : totalAdvance <= 16 ? 16 : 32;
  const nextRound = Math.max(...result.map((m) => m.round), 0) + 1;
  let matchCount = knockoutSize / 2;
  let rr = nextRound;
  while (matchCount >= 1) {
    for (let c = 0; c < matchCount; c++) {
      result.push({
        round: rr,
        court: (c % courtCount) + 1,
        team1_players: [TBD, TBD],
        team2_players: [TBD, TBD],
        team1_score: null,
        team2_score: null,
        status: "pending",
      });
    }
    matchCount = Math.floor(matchCount / 2);
    rr++;
  }

  return result;
}
