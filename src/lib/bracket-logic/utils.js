/**
 * 대진 생성 공통 유틸 (시간·출석·라운드 수 등)
 */

/**
 * "HH:MM" 구간을 시간 단위로 (분 포함)
 */
export function parseDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = String(startTime).split(":").map(Number);
  const [eh, em] = String(endTime).split(":").map(Number);
  return (eh - sh) + ((em || 0) - (sm || 0)) / 60;
}

export function parseTimeToMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function buildAvailabilityChecker(attendanceByName, courtStartTime, matchDurationMinutes = 30) {
  const startMin = parseTimeToMinutes(courtStartTime);
  const dur = Math.max(5, Number(matchDurationMinutes) || 30);
  if (startMin == null) {
    return { hasTimeInfo: false, isAvailable: () => true, roundStartMin: () => null, roundEndMin: () => null };
  }
  const roundStartMin = (round) => startMin + (Math.max(1, Number(round) || 1) - 1) * dur;
  const roundEndMin = (round) => roundStartMin(round) + dur;
  const isAvailable = (name, round) => {
    const att = attendanceByName?.[name];
    if (!att || att.type === "full") return true;
    const s = roundStartMin(round);
    const e = roundEndMin(round);
    if (att.type === "late_join") {
      const joinAt = parseTimeToMinutes(att.joinAt);
      if (joinAt == null) return true;
      return s >= joinAt;
    }
    if (att.type === "early_leave") {
      const leaveAt = parseTimeToMinutes(att.leaveAt);
      if (leaveAt == null) return true;
      return e <= leaveAt;
    }
    return true;
  };
  return { hasTimeInfo: true, isAvailable, roundStartMin, roundEndMin };
}

/**
 * 코트 예약시간(총 코트·시간)으로 최대 라운드 수 계산
 */
export function computeMaxRounds(totalCourtHours, courtCount, matchDurationMinutes = 30) {
  const h = Number(totalCourtHours);
  const c = Math.max(1, Number(courtCount));
  const m = Math.max(5, Number(matchDurationMinutes) || 30);
  if (h <= 0) return undefined;
  return Math.max(1, Math.floor((h * 60) / (c * m)));
}
