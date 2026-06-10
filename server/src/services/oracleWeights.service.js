// Maps the user's three card choices to a concrete weight profile
// used by the algorithm Oracle. The math stays hidden from the user —
// they just pick cards, we do the rest.

// Each strength card sets how the three data-driven factors are distributed.
const STRENGTH_WEIGHTS = {
  legacy: { fifaRanking: 0.60, recentForm: 0.20, goalsQuality: 0.20 },
  hot:    { fifaRanking: 0.20, recentForm: 0.60, goalsQuality: 0.20 },
  goals:  { fifaRanking: 0.20, recentForm: 0.20, goalsQuality: 0.60 },
};

// The market card controls how much weight bookmaker odds carry.
// The strength weights are scaled down proportionally to make room.
const MARKET_BOOKMAKER_WEIGHT = {
  trust_market:  0.35,
  balanced:      0.20,
  ignore_market: 0.00,
};

// The upset card applies a post-calculation nudge to the final probabilities.
// Positive = boost the favourite, negative = boost the underdog.
const UPSET_BOOST = {
  favorites: +0.05,
  upsets:    -0.05,
  neutral:    0.00,
};

// Every combination of 3 cards maps to a unique Oracle name.
// 3 × 3 × 3 = 27 combinations, 27 names.
const ORACLE_NAMES = {
  'legacy+trust_market+favorites':   'The Banker',
  'legacy+trust_market+upsets':      'The Contrarian',
  'legacy+trust_market+neutral':     'The Conservative',
  'legacy+ignore_market+favorites':  'The Purist',
  'legacy+ignore_market+upsets':     'The Historian',
  'legacy+ignore_market+neutral':    'The Scholar',
  'legacy+balanced+favorites':       'The Veteran',
  'legacy+balanced+upsets':          'The Maverick',
  'legacy+balanced+neutral':         'The Traditionalist',
  'hot+trust_market+favorites':      'The Pundit',
  'hot+trust_market+upsets':         'The Gambler',
  'hot+trust_market+neutral':        'The Speculator',
  'hot+ignore_market+favorites':     'The Hawk',
  'hot+ignore_market+upsets':        'The Rebel',
  'hot+ignore_market+neutral':       'The Instinct',
  'hot+balanced+favorites':          'The Strategist',
  'hot+balanced+upsets':             'The Wildcard',
  'hot+balanced+neutral':            'The Tactician',
  'goals+trust_market+favorites':    'The Calculator',
  'goals+trust_market+upsets':       'The Alchemist',
  'goals+trust_market+neutral':      'The Quant',
  'goals+ignore_market+favorites':   'The Professor',
  'goals+ignore_market+upsets':      'The Disruptor',
  'goals+ignore_market+neutral':     'The Analyst',
  'goals+balanced+favorites':        'The Engineer',
  'goals+balanced+upsets':           'The Visionary',
  'goals+balanced+neutral':          'The Oracle',
};

// Combines all three card choices into a single weight profile object.
function buildWeightProfile(strengthCard, marketCard, upsetCard) {
  const base            = STRENGTH_WEIGHTS[strengthCard];
  const bookmakerWeight = MARKET_BOOKMAKER_WEIGHT[marketCard];
  const scale           = 1 - bookmakerWeight;

  return {
    fifaRanking:   base.fifaRanking   * scale,
    recentForm:    base.recentForm    * scale,
    goalsQuality:  base.goalsQuality  * scale,
    bookmakerOdds: bookmakerWeight,
    upsetBoost:    UPSET_BOOST[upsetCard],
  };
}

function generateOracleName(strengthCard, marketCard, upsetCard) {
  return ORACLE_NAMES[`${strengthCard}+${marketCard}+${upsetCard}`] ?? 'The Oracle';
}

// Default profile used for the canonical stored prediction (accuracy tracking).
// "Balanced across all factors" — no user bias applied.
const DEFAULT_WEIGHT_PROFILE = buildWeightProfile('hot', 'balanced', 'neutral');

module.exports = { buildWeightProfile, generateOracleName, DEFAULT_WEIGHT_PROFILE };
