/**
 * 파트너 로테이션 대진 (복식): 혼합복식/남복/여복, 출석·파트너 중복 최소화.
 * Each match: { round, court, team1_players, team2_players, team1_score, team2_score, status }.
 */

import { parseDurationHours, buildAvailabilityChecker, computeMaxRounds } from "./utils";

/**
 * 혼합복식 위주 파트너 로테이션
 * 한 라운드에 한 사람은 한 번만 등장. 출석에 따라 자동으로 라운드 수 조절.
 */
function generateMixedDoubles(males, females, attendanceByName, courtCount, options = {}) {
  const maxRounds = options.max_rounds != null ? Math.max(1, Math.floor(Number(options.max_rounds))) : undefined;
  const maxGamesPerPerson = Math.max(1, Math.min(20, Math.floor(Number(options.max_games_per_person) || 4)));
  const matchDurationMin = Number(options.match_duration_minutes) || 30;
  const courtStartTime = options.court_start_time;
  const maleCount = males.length;
  const femaleCount = females.length;
  const maleNames = males.map(m => m.name);
  const femaleNames = females.map(f => f.name);
  const allNames = [...maleNames, ...femaleNames];

  const allMatches = [];
  const seenMixed = new Set();

  const mixedRounds = Math.max(5, maleCount + femaleCount);

  for (let r = 0; r < mixedRounds; r++) {
    const maleOffset = r * 2;
    const femaleOffset = r;

    for (let i = 0; i < Math.floor(Math.min(maleCount, femaleCount) / 2); i++) {
      const m1 = (i * 2 + maleOffset) % maleCount;
      const m2 = (i * 2 + 1 + maleOffset) % maleCount;
      const f1 = (i * 2 + femaleOffset) % femaleCount;
      const f2 = (i * 2 + 1 + femaleOffset) % femaleCount;

      const names = [maleNames[m1], femaleNames[f1], maleNames[m2], femaleNames[f2]].sort();
      const key = names.join(',');
      if (seenMixed.has(key)) continue;
      seenMixed.add(key);

      const players = [maleNames[m1], femaleNames[f1], maleNames[m2], femaleNames[f2]];
      const hasEarly = players.some(name => attendanceByName[name]?.type === 'early_leave');
      const hasLate = players.some(name => attendanceByName[name]?.type === 'late_join');

      allMatches.push({
        team1_players: [maleNames[m1], femaleNames[f1]],
        team2_players: [maleNames[m2], femaleNames[f2]],
        players,
        hasEarly: hasEarly && !hasLate,
        hasLate: hasLate && !hasEarly,
        type: 'mixed',
      });
    }
  }

  if (maleCount >= 3 && femaleCount >= 1) {
    for (let r = 0; r < Math.max(3, maleCount); r++) {
      for (let m0 = 0; m0 < maleCount; m0++) {
        const m1 = (m0 + 1 + r) % maleCount;
        const m2 = (m0 + 2 + r) % maleCount;
        if (new Set([m0, m1, m2]).size !== 3) continue;
        for (let fi = 0; fi < femaleCount; fi++) {
          const players = [maleNames[m0], maleNames[m1], maleNames[m2], femaleNames[fi]];
          const key = [...players].sort().join(",");
          if (seenMixed.has(key)) continue;
          seenMixed.add(key);
          const hasEarly = players.some((name) => attendanceByName[name]?.type === "early_leave");
          const hasLate = players.some((name) => attendanceByName[name]?.type === "late_join");
          allMatches.push({
            team1_players: [maleNames[m0], maleNames[m1]],
            team2_players: [maleNames[m2], femaleNames[fi]],
            players,
            hasEarly: hasEarly && !hasLate,
            hasLate: hasLate && !hasEarly,
            type: "mixed_imbalanced",
          });
        }
      }
    }
  }
  if (femaleCount >= 3 && maleCount >= 1) {
    for (let r = 0; r < Math.max(3, femaleCount); r++) {
      for (let f0 = 0; f0 < femaleCount; f0++) {
        const f1 = (f0 + 1 + r) % femaleCount;
        const f2 = (f0 + 2 + r) % femaleCount;
        if (new Set([f0, f1, f2]).size !== 3) continue;
        for (let mi = 0; mi < maleCount; mi++) {
          const players = [femaleNames[f0], femaleNames[f1], femaleNames[f2], maleNames[mi]];
          const key = [...players].sort().join(",");
          if (seenMixed.has(key)) continue;
          seenMixed.add(key);
          const hasEarly = players.some((name) => attendanceByName[name]?.type === "early_leave");
          const hasLate = players.some((name) => attendanceByName[name]?.type === "late_join");
          allMatches.push({
            team1_players: [femaleNames[f0], femaleNames[f1]],
            team2_players: [femaleNames[f2], maleNames[mi]],
            players,
            hasEarly: hasEarly && !hasLate,
            hasLate: hasLate && !hasEarly,
            type: "mixed_imbalanced",
          });
        }
      }
    }
  }

  const seenMale = new Set();
  if (maleCount >= 4) {
    for (let r = 0; r < Math.max(2, maleCount); r++) {
      for (let i = 0; i < maleCount; i++) {
        const i0 = i;
        const i1 = (i + 1 + r) % maleCount;
        const i2 = (i + 2 + r) % maleCount;
        const i3 = (i + 3 + r) % maleCount;
        if (new Set([i0, i1, i2, i3]).size !== 4) continue;
        const players = [maleNames[i0], maleNames[i1], maleNames[i2], maleNames[i3]];
        const key = [...players].sort().join(',');
        if (seenMale.has(key)) continue;
        seenMale.add(key);
        const hasEarly = players.some(name => attendanceByName[name]?.type === 'early_leave');
        const hasLate = players.some(name => attendanceByName[name]?.type === 'late_join');
        allMatches.push({
          team1_players: [players[0], players[1]],
          team2_players: [players[2], players[3]],
          players,
          hasEarly: hasEarly && !hasLate,
          hasLate: hasLate && !hasEarly,
          type: 'male',
        });
      }
    }
  }

  const seenFemale = new Set();
  if (femaleCount >= 4) {
    for (let r = 0; r < Math.max(2, femaleCount); r++) {
      for (let i = 0; i < femaleCount; i++) {
        const i0 = i;
        const i1 = (i + 1 + r) % femaleCount;
        const i2 = (i + 2 + r) % femaleCount;
        const i3 = (i + 3 + r) % femaleCount;
        if (new Set([i0, i1, i2, i3]).size !== 4) continue;
        const players = [femaleNames[i0], femaleNames[i1], femaleNames[i2], femaleNames[i3]];
        const key = [...players].sort().join(',');
        if (seenFemale.has(key)) continue;
        seenFemale.add(key);
        const hasEarly = players.some(name => attendanceByName[name]?.type === 'early_leave');
        const hasLate = players.some(name => attendanceByName[name]?.type === 'late_join');
        allMatches.push({
          team1_players: [players[0], players[1]],
          team2_players: [players[2], players[3]],
          players,
          hasEarly: hasEarly && !hasLate,
          hasLate: hasLate && !hasEarly,
          type: 'female',
        });
      }
    }
  }

  allMatches.sort((a, b) => {
    if (a.hasEarly && !b.hasEarly) return -1;
    if (!a.hasEarly && b.hasEarly) return 1;
    if (a.hasLate && !b.hasLate) return 1;
    if (!a.hasLate && b.hasLate) return -1;
    return 0;
  });

  function pairKey(a, b) {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }

  const rounds = [];
  const used = new Set();
  const partnerPairsUsed = new Set();
  const matchesPerPlayer = Object.create(null);
  const availability = buildAvailabilityChecker(attendanceByName, courtStartTime, matchDurationMin);
  const roundsWithType = Object.create(null);

  while (used.size < allMatches.length) {
    const roundMatches = [];
    const usedPlayersThisRound = new Set();
    const roundNumber = rounds.length + 1;

    const earlyRoundThreshold = maxRounds != null ? Math.ceil(maxRounds / 2) : 99;
    const isEarlyRound = roundNumber <= earlyRoundThreshold;

    while (roundMatches.length < courtCount) {
      let bestIdx = -1;
      let bestEarlyLeave = -1;
      let bestTypeCount = Infinity;
      let bestNewPairs = -1;
      let bestUnderTwo = -1;
      const typeCountInRound = (type) => roundMatches.filter((m) => m.type === type).length;

      const countEarlyLeave = (match) =>
        match.players.filter((p) => attendanceByName[p]?.type === "early_leave").length;

      for (let i = 0; i < allMatches.length; i++) {
        if (used.has(i)) continue;
        const match = allMatches[i];
        if (match.type !== "mixed" && match.type !== "male" && match.type !== "female") continue;
        if (match.players.some(p => usedPlayersThisRound.has(p))) continue;
        if (availability.hasTimeInfo && match.players.some((p) => !availability.isAvailable(p, roundNumber))) continue;
        if (match.players.some(p => (matchesPerPlayer[p] || 0) >= maxGamesPerPerson)) continue;

        const t1 = match.team1_players;
        const t2 = match.team2_players;
        const k1 = pairKey(t1[0], t1[1]);
        const k2 = pairKey(t2[0], t2[1]);
        if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
        let newPairs = 0;
        if (!partnerPairsUsed.has(k1)) newPairs++;
        if (!partnerPairsUsed.has(k2)) newPairs++;
        const underTwo = match.players.filter((p) => (matchesPerPlayer[p] || 0) < 2).length;
        const earlyLeave = countEarlyLeave(match);

        const typeCount = typeCountInRound(match.type);
        const bestType = bestIdx === -1 ? null : allMatches[bestIdx].type;
        const roundsWithBest = bestType == null ? Infinity : (roundsWithType[bestType] || 0);
        const roundsWithThis = roundsWithType[match.type] || 0;
        const better = isEarlyRound
          ? (earlyLeave > bestEarlyLeave ||
            (earlyLeave === bestEarlyLeave && typeCount < bestTypeCount) ||
            (earlyLeave === bestEarlyLeave && typeCount === bestTypeCount && newPairs > bestNewPairs) ||
            (earlyLeave === bestEarlyLeave && typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo > bestUnderTwo) ||
            (earlyLeave === bestEarlyLeave && typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo === bestUnderTwo && roundsWithThis < roundsWithBest))
          : (typeCount < bestTypeCount ||
            (typeCount === bestTypeCount && newPairs > bestNewPairs) ||
            (typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo > bestUnderTwo) ||
            (typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo === bestUnderTwo && roundsWithThis < roundsWithBest));
        if (better) {
          bestEarlyLeave = earlyLeave;
          bestTypeCount = typeCount;
          bestNewPairs = newPairs;
          bestUnderTwo = underTwo;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) {
        for (let i = 0; i < allMatches.length; i++) {
          if (used.has(i)) continue;
          const match = allMatches[i];
          if (match.type !== "mixed_imbalanced") continue;
          if (match.players.some(p => usedPlayersThisRound.has(p))) continue;
          if (availability.hasTimeInfo && match.players.some((p) => !availability.isAvailable(p, roundNumber))) continue;
          if (match.players.some(p => (matchesPerPlayer[p] || 0) >= maxGamesPerPerson)) continue;

          const t1 = match.team1_players;
          const t2 = match.team2_players;
          const k1 = pairKey(t1[0], t1[1]);
          const k2 = pairKey(t2[0], t2[1]);
          if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
          let newPairs = 0;
          if (!partnerPairsUsed.has(k1)) newPairs++;
          if (!partnerPairsUsed.has(k2)) newPairs++;
          const underTwo = match.players.filter((p) => (matchesPerPlayer[p] || 0) < 2).length;
          const earlyLeave = countEarlyLeave(match);

          const typeCount = typeCountInRound(match.type);
          const better = isEarlyRound
            ? (earlyLeave > bestEarlyLeave ||
              (earlyLeave === bestEarlyLeave && typeCount < bestTypeCount) ||
              (earlyLeave === bestEarlyLeave && typeCount === bestTypeCount && newPairs > bestNewPairs) ||
              (earlyLeave === bestEarlyLeave && typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo > bestUnderTwo))
            : (typeCount < bestTypeCount ||
              (typeCount === bestTypeCount && newPairs > bestNewPairs) ||
              (typeCount === bestTypeCount && newPairs === bestNewPairs && underTwo > bestUnderTwo));
          if (better) {
            bestEarlyLeave = earlyLeave;
            bestTypeCount = typeCount;
            bestNewPairs = newPairs;
            bestUnderTwo = underTwo;
            bestIdx = i;
          }
        }
      }

      if (bestIdx === -1) {
        const canPlayThisRound = allNames.filter(
          (p) => (!availability.hasTimeInfo || availability.isAvailable(p, roundNumber)) && !usedPlayersThisRound.has(p)
        );
        if (canPlayThisRound.length >= 4) {
          const four = [...canPlayThisRound]
            .sort((a, b) => (matchesPerPlayer[a] || 0) - (matchesPerPlayer[b] || 0))
            .slice(0, 4)
            .sort();
          const splits = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];
          let bestSplit = null;
          for (const [t1, t2] of splits) {
            const k1 = pairKey(t1[0], t1[1]);
            const k2 = pairKey(t2[0], t2[1]);
            if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
            bestSplit = [t1, t2];
            break;
          }
          if (bestSplit === null) break;
          const [team1, team2] = bestSplit;
          const players = [...team1, ...team2];
          roundMatches.push({
            team1_players: team1,
            team2_players: team2,
            players,
            type: "mixed",
          });
          players.forEach((p) => {
            usedPlayersThisRound.add(p);
            matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1;
          });
          partnerPairsUsed.add(pairKey(team1[0], team1[1]));
          partnerPairsUsed.add(pairKey(team2[0], team2[1]));
        } else break;
        continue;
      }

      const match = allMatches[bestIdx];
      roundMatches.push(match);
      match.players.forEach(p => {
        usedPlayersThisRound.add(p);
        matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1;
      });
      used.add(bestIdx);
      partnerPairsUsed.add(pairKey(match.team1_players[0], match.team1_players[1]));
      partnerPairsUsed.add(pairKey(match.team2_players[0], match.team2_players[1]));
    }

    if (roundMatches.length === 0) break;
    if (maxRounds != null && rounds.length >= maxRounds) break;
    rounds.push(roundMatches);
    const typesInRound = new Set(roundMatches.map((m) => m.type));
    for (const t of typesInRound) roundsWithType[t] = (roundsWithType[t] || 0) + 1;
  }

  const MIN_GAMES = 2;
  let added = true;
  while (added) {
    added = false;
    const underMin = allNames.filter((p) => (matchesPerPlayer[p] || 0) < MIN_GAMES);
    if (underMin.length === 0) break;
    for (const p of underMin) {
      let found = false;
      for (let i = 0; i < allMatches.length && !found; i++) {
        if (used.has(i)) continue;
        const match = allMatches[i];
        if (!match.players.includes(p)) continue;
        if (match.players.some((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson)) continue;
        const k1 = pairKey(match.team1_players[0], match.team1_players[1]);
        const k2 = pairKey(match.team2_players[0], match.team2_players[1]);
        if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
        used.add(i);
        partnerPairsUsed.add(k1);
        partnerPairsUsed.add(k2);
        match.players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
        rounds.push([match]);
        added = true;
        found = true;
      }
      if (found) break;
      for (let i = 0; i < allMatches.length && !found; i++) {
        if (used.has(i)) continue;
        const match = allMatches[i];
        if (!match.players.includes(p)) continue;
        const over = match.players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
        if (over.length > 1) continue;
        const k1 = pairKey(match.team1_players[0], match.team1_players[1]);
        const k2 = pairKey(match.team2_players[0], match.team2_players[1]);
        if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
        used.add(i);
        partnerPairsUsed.add(k1);
        partnerPairsUsed.add(k2);
        match.players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
        rounds.push([match]);
        added = true;
        found = true;
      }
      if (found) break;
    }
  }

  const finalMatches = [];
  rounds.forEach((roundMatches, rIdx) => {
    roundMatches.forEach((match, courtIdx) => {
      finalMatches.push({
        round: rIdx + 1,
        court: courtIdx + 1,
        team1_players: match.team1_players,
        team2_players: match.team2_players,
        team1_score: null,
        team2_score: null,
        status: 'pending',
      });
    });
  });

  return finalMatches;
}

/**
 * 파트너 로테이션: 매 게임 파트너 교대, 같은 파트너 중복 없음.
 * 성별이 있으면 혼합복식 위주, 없으면 순수 로테이션.
 */
export function generatePartnerRotation(
  participants,
  seedConfig,
  participantAttendance,
  options = {}
) {
  if (!Array.isArray(participants) || participants.length < 4) return [];

  const BYE = "__BYE__";

  const normalized = participants.map(p =>
    typeof p === 'string' ? { name: p, gender: 'male' } : { name: p.name, gender: p.gender || 'male' }
  );
  const N = normalized.length;
  const isOdd = N % 2 !== 0;

  const courtCount = Math.max(1, Number(options.court_count) || 1);
  let totalCourtHours = Number(options.total_court_hours) || 0;
  if (totalCourtHours <= 0 && options.court_start_time && options.court_end_time) {
    const perCourt = parseDurationHours(options.court_start_time, options.court_end_time);
    if (perCourt > 0) totalCourtHours = perCourt * courtCount;
  }
  const matchDurationMin = Number(options.match_duration_minutes) || 30;
  const maxGamesPerPerson = Math.max(1, Math.min(20, Math.floor(Number(options.max_games_per_person) || 4)));
  let maxRounds = totalCourtHours > 0
    ? computeMaxRounds(totalCourtHours, courtCount, matchDurationMin)
    : undefined;
  if (N >= 4) {
    const minRounds = N >= 6 ? 4 : 2;
    if (maxRounds == null) maxRounds = minRounds;
    else if (maxRounds < minRounds) maxRounds = minRounds;
  }

  const attendanceByName = Object.create(null);
  if (Array.isArray(participantAttendance)) {
    for (let i = 0; i < N && i < participantAttendance.length; i++) {
      const name = normalized[i].name;
      if (name) attendanceByName[name] = participantAttendance[i];
    }
  }

  let sorted = [...normalized];
  if (seedConfig && typeof seedConfig === "object") {
    sorted.sort((a, b) => {
      const ra = seedConfig[a.name];
      const rb = seedConfig[b.name];
      if (ra != null && rb != null) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      return 0;
    });
  }

  const males = sorted.filter(p => p.gender === 'male');
  const females = sorted.filter(p => p.gender === 'female');
  const maleCount = males.length;
  const femaleCount = females.length;

  if (maleCount > 0 && femaleCount > 0) {
    return generateMixedDoubles(males, females, attendanceByName, courtCount, {
      max_rounds: maxRounds,
      max_games_per_person: maxGamesPerPerson,
      match_duration_minutes: matchDurationMin,
      court_start_time: options.court_start_time,
    });
  }

  let names = sorted.map(p => p.name);
  if (isOdd) names = [...names, BYE];
  const M = names.length;
  const R = isOdd ? M - 1 : Math.min(4, M - 1);

  function rotateOrder(round) {
    const order = [0];
    for (let i = 1; i < M; i++) order.push(i);
    let r = round % (M - 1);
    while (r--) {
      const last = order.pop();
      order.splice(1, 0, last);
    }
    return order;
  }

  const rawRounds = [];
  for (let r = 0; r < R; r++) {
    const order = rotateOrder(r);
    const pairs = [];
    for (let i = 0; i < order.length; i += 2)
      pairs.push([names[order[i]], names[order[i + 1]]]);
    const roundMatches = [];
    if (isOdd) {
      const realPairs = pairs.filter((p) => !p.includes(BYE));
      for (let i = 0; i < realPairs.length; i++) {
        for (let j = i + 1; j < realPairs.length; j++) {
          roundMatches.push({
            team1: realPairs[i],
            team2: realPairs[j],
            roundIndex: r,
          });
        }
      }
    } else {
      for (let j = 0; j < pairs.length; j += 2)
        roundMatches.push({
          team1: pairs[j],
          team2: pairs[j + 1],
          roundIndex: r,
        });
    }
    rawRounds.push(roundMatches);
  }

  const allMatches = rawRounds.flat();

  function getAtt(name) {
    return attendanceByName[name];
  }
  function matchHasEarlyLeave(m) {
    return [m.team1[0], m.team1[1], m.team2[0], m.team2[1]].some(
      (name) => getAtt(name)?.type === "early_leave"
    );
  }
  function matchHasLateJoin(m) {
    return [m.team1[0], m.team1[1], m.team2[0], m.team2[1]].some(
      (name) => getAtt(name)?.type === "late_join"
    );
  }

  const realNames = names.filter((n) => n !== BYE);
  const hasAnyAttendance = realNames.some(
    (name) =>
      getAtt(name)?.type === "early_leave" || getAtt(name)?.type === "late_join"
  );
  let matchesToAssign = allMatches.slice();
  if (maxRounds != null && !isOdd) {
    matchesToAssign = matchesToAssign.slice(0, maxRounds * courtCount);
  }
  if (hasAnyAttendance && matchesToAssign.length >= R) {
    const early = matchesToAssign.filter(
      (m) => matchHasEarlyLeave(m) && !matchHasLateJoin(m)
    );
    const late = matchesToAssign.filter(
      (m) => matchHasLateJoin(m) && !matchHasEarlyLeave(m)
    );
    const rest = matchesToAssign.filter(
      (m) =>
        !(matchHasEarlyLeave(m) && !matchHasLateJoin(m)) &&
        !(matchHasLateJoin(m) && !matchHasEarlyLeave(m))
    );
    matchesToAssign = [...early, ...rest, ...late];
  }

  const result = [];
  const matchesPerPlayer = Object.create(null);
  const availability = buildAvailabilityChecker(attendanceByName, options.court_start_time, matchDurationMin);

  const pairKey = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

  if (isOdd && matchesToAssign.length > 0) {
    const maxSlots = (maxRounds != null ? maxRounds : 99) * courtCount;
    const usedMatchIdx = new Set();
    const partnerPairsUsed = new Set();
    let slotIdx = 0;
    while (slotIdx < maxSlots) {
      const round = Math.floor(slotIdx / courtCount) + 1;
      const court = (slotIdx % courtCount) + 1;
      const usedThisRound = new Set();
      for (const prev of result) {
        if (prev.round !== round) continue;
        [...(prev.team1_players || []), ...(prev.team2_players || [])].forEach((p) => usedThisRound.add(p));
      }
      let bestIdx = -1;
      let bestScore = -1;
      for (let i = 0; i < matchesToAssign.length; i++) {
        if (usedMatchIdx.has(i)) continue;
        const m = matchesToAssign[i];
        const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
        if (players.some((p) => usedThisRound.has(p))) continue;
        if (availability.hasTimeInfo && players.some((p) => !availability.isAvailable(p, round))) continue;
        if (players.some((p) => (matchesPerPlayer[p] || 0) >= maxGamesPerPerson)) continue;
        const pk1 = pairKey(m.team1[0], m.team1[1]);
        const pk2 = pairKey(m.team2[0], m.team2[1]);
        if (partnerPairsUsed.has(pk1) || partnerPairsUsed.has(pk2)) continue;
        let newPairs = 0;
        if (!partnerPairsUsed.has(pk1)) newPairs++;
        if (!partnerPairsUsed.has(pk2)) newPairs++;
        const need = players.reduce(
          (sum, p) => sum + (maxGamesPerPerson - (matchesPerPlayer[p] || 0)),
          0
        );
        const underTwo = players.filter((p) => (matchesPerPlayer[p] || 0) < 2).length;
        const maxCurrentGames = Math.max(...players.map((p) => matchesPerPlayer[p] || 0));
        let score =
          newPairs * 2000 + (maxGamesPerPerson - maxCurrentGames) * 10000 + need + 1000 * underTwo;
        const earlyRoundThreshold = maxRounds != null ? Math.ceil(maxRounds / 2) : 99;
        if (round <= earlyRoundThreshold) {
          const earlyLeave = players.filter((p) => getAtt(p)?.type === "early_leave").length;
          score += earlyLeave * 5000;
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) {
        const realNamesHere = names.filter((n) => n !== BYE);
        const canPlayThisRound = realNamesHere.filter(
          (p) => (!availability.hasTimeInfo || availability.isAvailable(p, round)) && !usedThisRound.has(p)
        );
        if (canPlayThisRound.length >= 4) {
          const four = [...canPlayThisRound]
            .sort((a, b) => (matchesPerPlayer[a] || 0) - (matchesPerPlayer[b] || 0))
            .slice(0, 4)
            .sort();
          const splits = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];
          let bestSplit = null;
          for (const [t1, t2] of splits) {
            const k1 = pairKey(t1[0], t1[1]);
            const k2 = pairKey(t2[0], t2[1]);
            if (partnerPairsUsed.has(k1) || partnerPairsUsed.has(k2)) continue;
            bestSplit = [t1, t2];
            break;
          }
          if (bestSplit !== null) {
            const [team1, team2] = bestSplit;
            result.push({
              round,
              court,
              team1_players: team1,
              team2_players: team2,
              team1_score: null,
              team2_score: null,
              status: "pending",
            });
            [...team1, ...team2].forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
            partnerPairsUsed.add(pairKey(team1[0], team1[1]));
            partnerPairsUsed.add(pairKey(team2[0], team2[1]));
          }
        }
        slotIdx++;
        continue;
      }
      const m = matchesToAssign[bestIdx];
      usedMatchIdx.add(bestIdx);
      m.team1.forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
      m.team2.forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
      partnerPairsUsed.add(pairKey(m.team1[0], m.team1[1]));
      partnerPairsUsed.add(pairKey(m.team2[0], m.team2[1]));
      result.push({
        round,
        court,
        team1_players: m.team1,
        team2_players: m.team2,
        team1_score: null,
        team2_score: null,
        status: "pending",
      });
      slotIdx++;
    }

    const MIN_GAMES = 2;
    let nextRound = result.length ? Math.max(...result.map((r) => r.round)) + 1 : 1;
    const matchKeyOdd = (m) => [...(m.team1_players || m.team1), ...(m.team2_players || m.team2)].sort().join(",");
    const usedResultKeysOdd = new Set(result.map((r) => matchKeyOdd(r)));
    let added = true;
    while (added) {
      added = false;
      const underMin = realNames.filter((p) => (matchesPerPlayer[p] || 0) < MIN_GAMES);
      if (underMin.length === 0) break;
      for (const p of underMin) {
        let found = false;
        for (let i = 0; i < matchesToAssign.length && !found; i++) {
          if (usedMatchIdx.has(i)) continue;
          const m = matchesToAssign[i];
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          if (players.some((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson)) continue;
          const pk1 = pairKey(m.team1[0], m.team1[1]);
          const pk2 = pairKey(m.team2[0], m.team2[1]);
          if (partnerPairsUsed.has(pk1) || partnerPairsUsed.has(pk2)) continue;
          usedMatchIdx.add(i);
          usedResultKeysOdd.add(matchKeyOdd(m));
          partnerPairsUsed.add(pk1);
          partnerPairsUsed.add(pk2);
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
        }
        if (found) break;
        for (const m of allMatches) {
          if (usedResultKeysOdd.has(matchKeyOdd(m))) continue;
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          if (players.some((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson)) continue;
          if (partnerPairsUsed.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsed.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedResultKeysOdd.add(matchKeyOdd(m));
          partnerPairsUsed.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsed.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
        for (const m of allMatches) {
          if (usedResultKeysOdd.has(matchKeyOdd(m))) continue;
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          const over = players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
          if (over.length > 1) continue;
          if (partnerPairsUsed.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsed.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedResultKeysOdd.add(matchKeyOdd(m));
          partnerPairsUsed.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsed.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
        for (const m of allMatches) {
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          const over = players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
          if (over.length > 1) continue;
          if (partnerPairsUsed.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsed.has(pairKey(m.team2[0], m.team2[1]))) continue;
          partnerPairsUsed.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsed.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
      }
    }
  } else {
    const maxSlots = (maxRounds != null ? maxRounds : 99) * courtCount;
    const usedMatchIdx = new Set();
    const partnerPairsUsedEven = new Set();
    let slotIdx = 0;
    const earlyRoundThreshold = maxRounds != null ? Math.ceil(maxRounds / 2) : 99;
    while (slotIdx < maxSlots) {
      const round = Math.floor(slotIdx / courtCount) + 1;
      const court = (slotIdx % courtCount) + 1;
      const usedThisRound = new Set();
      for (const prev of result) {
        if (prev.round !== round) continue;
        [...(prev.team1_players || []), ...(prev.team2_players || [])].forEach((p) => usedThisRound.add(p));
      }
      let bestIdx = -1;
      let bestEarlyLeave = -1;
      let bestNewPairs = -1;
      let bestUnderTwo = -1;
      let bestNeed = -1;
      const isEarlyRound = round <= earlyRoundThreshold;
      for (let i = 0; i < matchesToAssign.length; i++) {
        if (usedMatchIdx.has(i)) continue;
        const m = matchesToAssign[i];
        const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
        if (players.some((p) => usedThisRound.has(p))) continue;
        if (availability.hasTimeInfo && players.some((p) => !availability.isAvailable(p, round))) continue;
        if (players.some((p) => (matchesPerPlayer[p] || 0) >= maxGamesPerPerson)) continue;
        const pk1 = pairKey(m.team1[0], m.team1[1]);
        const pk2 = pairKey(m.team2[0], m.team2[1]);
        if (partnerPairsUsedEven.has(pk1) || partnerPairsUsedEven.has(pk2)) continue;
        let newPairs = 0;
        if (!partnerPairsUsedEven.has(pk1)) newPairs++;
        if (!partnerPairsUsedEven.has(pk2)) newPairs++;
        const underTwo = players.filter((p) => (matchesPerPlayer[p] || 0) < 2).length;
        const need = players.reduce((sum, p) => sum + (maxGamesPerPerson - (matchesPerPlayer[p] || 0)), 0);
        const earlyLeave = players.filter((p) => getAtt(p)?.type === "early_leave").length;
        const better = isEarlyRound
          ? (earlyLeave > bestEarlyLeave ||
            (earlyLeave === bestEarlyLeave && newPairs > bestNewPairs) ||
            (earlyLeave === bestEarlyLeave && newPairs === bestNewPairs && underTwo > bestUnderTwo) ||
            (earlyLeave === bestEarlyLeave && newPairs === bestNewPairs && underTwo === bestUnderTwo && need > bestNeed))
          : (newPairs > bestNewPairs || (newPairs === bestNewPairs && underTwo > bestUnderTwo) || (newPairs === bestNewPairs && underTwo === bestUnderTwo && need > bestNeed));
        if (better) {
          bestEarlyLeave = earlyLeave;
          bestNewPairs = newPairs;
          bestUnderTwo = underTwo;
          bestNeed = need;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) {
        const realNamesHere = names.filter((n) => n !== BYE);
        const canPlayThisRound = realNamesHere.filter(
          (p) => (!availability.hasTimeInfo || availability.isAvailable(p, round)) && !usedThisRound.has(p)
        );
        if (canPlayThisRound.length >= 4) {
          const four = [...canPlayThisRound]
            .sort((a, b) => (matchesPerPlayer[a] || 0) - (matchesPerPlayer[b] || 0))
            .slice(0, 4)
            .sort();
          const splits = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];
          let bestSplit = null;
          for (const [t1, t2] of splits) {
            const k1 = pairKey(t1[0], t1[1]);
            const k2 = pairKey(t2[0], t2[1]);
            if (partnerPairsUsedEven.has(k1) || partnerPairsUsedEven.has(k2)) continue;
            bestSplit = [t1, t2];
            break;
          }
          if (bestSplit !== null) {
            const [team1, team2] = bestSplit;
            result.push({
              round,
              court,
              team1_players: team1,
              team2_players: team2,
              team1_score: null,
              team2_score: null,
              status: "pending",
            });
            [...team1, ...team2].forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
            partnerPairsUsedEven.add(pairKey(team1[0], team1[1]));
            partnerPairsUsedEven.add(pairKey(team2[0], team2[1]));
          }
        }
        slotIdx++;
        continue;
      }
      const m = matchesToAssign[bestIdx];
      usedMatchIdx.add(bestIdx);
      m.team1.forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
      m.team2.forEach((p) => { matchesPerPlayer[p] = (matchesPerPlayer[p] || 0) + 1; });
      partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
      partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
      result.push({
        round,
        court,
        team1_players: m.team1,
        team2_players: m.team2,
        team1_score: null,
        team2_score: null,
        status: "pending",
      });
      slotIdx++;
    }

    const MIN_GAMES = 2;
    let nextRound = result.length ? Math.max(...result.map((r) => r.round)) + 1 : 1;
    const matchKey = (m) => [...(m.team1_players || m.team1), ...(m.team2_players || m.team2)].sort().join(",");
    const usedResultKeys = new Set(result.map((r) => matchKey(r)));
    let added = true;
    while (added) {
      added = false;
      const underMin = realNames.filter((p) => (matchesPerPlayer[p] || 0) < MIN_GAMES);
      if (underMin.length === 0) break;
      for (const p of underMin) {
        let found = false;
        for (let i = 0; i < matchesToAssign.length && !found; i++) {
          if (usedMatchIdx.has(i)) continue;
          const m = matchesToAssign[i];
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          if (players.some((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson)) continue;
          if (partnerPairsUsedEven.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsedEven.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedMatchIdx.add(i);
          usedResultKeys.add(matchKey(m));
          partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
        }
        if (found) break;
        for (let i = 0; i < matchesToAssign.length && !found; i++) {
          if (usedMatchIdx.has(i)) continue;
          const m = matchesToAssign[i];
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          const over = players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
          if (over.length > 1) continue;
          if (partnerPairsUsedEven.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsedEven.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedMatchIdx.add(i);
          usedResultKeys.add(matchKey(m));
          partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
        }
        if (found) break;
        for (const m of allMatches) {
          if (usedResultKeys.has(matchKey(m))) continue;
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          if (players.some((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson)) continue;
          if (partnerPairsUsedEven.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsedEven.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedResultKeys.add(matchKey(m));
          partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
        for (const m of allMatches) {
          if (usedResultKeys.has(matchKey(m))) continue;
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          const over = players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
          if (over.length > 1) continue;
          if (partnerPairsUsedEven.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsedEven.has(pairKey(m.team2[0], m.team2[1]))) continue;
          usedResultKeys.add(matchKey(m));
          partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
        for (const m of allMatches) {
          const players = [m.team1[0], m.team1[1], m.team2[0], m.team2[1]];
          if (!players.includes(p)) continue;
          const over = players.filter((q) => (matchesPerPlayer[q] || 0) >= maxGamesPerPerson);
          if (over.length > 1) continue;
          if (partnerPairsUsedEven.has(pairKey(m.team1[0], m.team1[1])) || partnerPairsUsedEven.has(pairKey(m.team2[0], m.team2[1]))) continue;
          partnerPairsUsedEven.add(pairKey(m.team1[0], m.team1[1]));
          partnerPairsUsedEven.add(pairKey(m.team2[0], m.team2[1]));
          players.forEach((q) => { matchesPerPlayer[q] = (matchesPerPlayer[q] || 0) + 1; });
          result.push({
            round: nextRound,
            court: 1,
            team1_players: m.team1,
            team2_players: m.team2,
            team1_score: null,
            team2_score: null,
            status: "pending",
          });
          nextRound++;
          added = true;
          found = true;
          break;
        }
        if (found) break;
      }
    }
  }
  return result;
}
