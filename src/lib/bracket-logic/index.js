/**
 * 대진 생성 진입점.
 * Each function returns matches: { round, court, team1_players, team2_players, team1_score, team2_score, status }[].
 */

import { generatePartnerRotation } from "./partner-rotation";
import { generateGroupMatching } from "./group-matching";
import { generateTeamDoubles } from "./team-doubles";
import { generateTournament } from "./tournament";
import { generateRandom } from "./random";

export function generateBracket(type, participants, seedConfig, options = {}) {
  switch (type) {
    case "partner_rotation":
      return generatePartnerRotation(
        participants,
        seedConfig,
        options.participant_attendance,
        options
      );
    case "group_matching":
      return generateGroupMatching(participants);
    case "team_doubles":
      return generateTeamDoubles(participants);
    case "tournament":
      return generateTournament(participants, options);
    case "group_stage":
      return generateTournament(participants, { ...options, groupStageOnly: true });
    case "random":
      return generateRandom(participants);
    default:
      return [];
  }
}

export { generatePartnerRotation } from "./partner-rotation";
export { generateGroupMatching } from "./group-matching";
export { generateTeamDoubles } from "./team-doubles";
export { generateTournament } from "./tournament";
export { generateRandom } from "./random";
