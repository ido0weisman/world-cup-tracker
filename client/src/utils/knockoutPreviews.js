// FIFA's official Round of 32 schedule (Matches 73–88), in kickoff order —
// published ahead of the tournament in the regulations' bracket template.
// Pairs that depend on which 8 third-placed teams qualify can't be pinned to
// one exact group until the group stage ends, so those show the shortlist of
// groups the qualifying team could come from instead of a single guess.
//
// Shared between KnockoutBetting (where users place picks) and the Overview
// knockout bracket (read-only view) — both zip this onto the R32 matches by
// index, since the backend already returns them ordered by kickoff date, the
// same order FIFA numbered them in.
export const R32_PREVIEWS = [
  ['2nd place Group A', '2nd place Group B'],
  ['1st place Group E', 'Best 3rd-placed team (Groups A/B/C/D/F)'],
  ['1st place Group F', '2nd place Group C'],
  ['1st place Group C', '2nd place Group F'],
  ['1st place Group I', 'Best 3rd-placed team (Groups C/D/F/G/H)'],
  ['2nd place Group E', '2nd place Group I'],
  ['1st place Group A', 'Best 3rd-placed team (Groups C/E/F/H/I)'],
  ['1st place Group L', 'Best 3rd-placed team (Groups E/H/I/J/K)'],
  ['1st place Group D', 'Best 3rd-placed team (Groups B/E/F/I/J)'],
  ['1st place Group G', 'Best 3rd-placed team (Groups A/E/H/I/J)'],
  ['2nd place Group K', '2nd place Group L'],
  ['1st place Group H', '2nd place Group J'],
  ['1st place Group B', 'Best 3rd-placed team (Groups E/F/G/I/J)'],
  ['1st place Group J', '2nd place Group H'],
  ['1st place Group K', 'Best 3rd-placed team (Groups D/E/I/J/L)'],
  ['2nd place Group D', '2nd place Group G'],
];

// Returns the [home, away] preview labels for a given stage + match index, or
// null if that stage doesn't map cleanly onto group placements. Only the
// Round of 32 does — later rounds are "winner of match X", which isn't
// meaningful to show before those matches are actually played.
export function getMatchPreview(stage, index) {
  return stage === 'R32' ? (R32_PREVIEWS[index] ?? null) : null;
}
