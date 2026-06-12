// Static presentational data for the Oracle Duel feature.
// NOTE: the 27 oracle names mirror ORACLE_NAMES in
// server/src/services/oracleWeights.service.js — the server is the source
// of truth for name GENERATION; this copy only feeds the info modal's
// display table (with extra UI labels the server doesn't need).

export const STRENGTH_CARDS = [
  {
    value: 'legacy',
    emoji: '🏆',
    title: 'Legacy & Ranking',
    desc:  'I trust FIFA rankings and historical dominance',
  },
  {
    value: 'hot',
    emoji: '⚡',
    title: 'Hot Right Now',
    desc:  'I trust who\'s playing best in this tournament',
  },
  {
    value: 'goals',
    emoji: '⚽',
    title: 'Goals Tell Everything',
    desc:  'I trust who\'s scoring more, against better teams',
  },
];

export const MARKET_CARDS = [
  {
    value: 'trust_market',
    emoji: '💰',
    title: 'The Market Knows Best',
    desc:  'Bookmaker odds carry heavy weight',
  },
  {
    value: 'ignore_market',
    emoji: '🧠',
    title: 'I Think For Myself',
    desc:  'Bookmaker odds are ignored completely',
  },
  {
    value: 'balanced',
    emoji: '⚖️',
    title: 'I Consider Everything',
    desc:  'Bookmaker odds are one factor among many',
  },
];

export const UPSET_CARDS = [
  {
    value: 'favorites',
    emoji: '🛡️',
    title: 'Favourites Win For A Reason',
    desc:  'Boost the stronger team\'s probability',
  },
  {
    value: 'upsets',
    emoji: '🐶',
    title: 'Underdog',
    desc:  'Boost the underdog\'s probability',
  },
  {
    value: 'neutral',
    emoji: '🎯',
    title: 'Let The Numbers Decide',
    desc:  'No adjustment — pure data',
  },
];

export const BUILDER_STEPS = [
  { key: 'strength_card', label: 'How do you judge a team?',          cards: STRENGTH_CARDS },
  { key: 'market_card',   label: 'Do you follow the bookmaker odds?',  cards: MARKET_CARDS   },
  { key: 'upset_card',    label: "What's your gut feeling on upsets?", cards: UPSET_CARDS   },
];

export const NAMES_BY_GROUP = [
  {
    strength: '🏆 Legacy & Ranking',
    desc: 'trusts FIFA history & rankings',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Banker'         },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Contrarian'     },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Conservative'   },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Purist'         },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Historian'      },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Scholar'        },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Veteran'        },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Maverick'       },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Traditionalist' },
    ],
  },
  {
    strength: '⚡ Hot Right Now',
    desc: 'trusts current tournament form',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Pundit'     },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Gambler'    },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Speculator' },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Hawk'       },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Rebel'      },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Instinct'   },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Strategist' },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Wildcard'   },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Tactician'  },
    ],
  },
  {
    strength: '⚽ Goals Tell Everything',
    desc: 'trusts goals scored & quality',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Calculator' },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Alchemist'  },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Quant'      },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Professor'  },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Disruptor'  },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Analyst'    },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Engineer'   },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Visionary'  },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Oracle'     },
    ],
  },
];
