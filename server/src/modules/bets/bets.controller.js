const betsService = require('./bets.service');

async function submitGroupBet(req, res, next) {
  try {
    const result = betsService.submitGroupBet(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function getGroupBets(req, res, next) {
  try {
    const bets = betsService.getGroupBets(req.user.userId);
    res.json({ bets });
  } catch (err) { next(err); }
}

async function submitKnockoutBet(req, res, next) {
  try {
    const result = betsService.submitKnockoutBet(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function getKnockoutBets(req, res, next) {
  try {
    const bets = betsService.getKnockoutBets(req.user.userId);
    res.json({ bets });
  } catch (err) { next(err); }
}

async function submitTopScorerBet(req, res, next) {
  try {
    const result = betsService.submitTopScorerBet(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function getTopScorerBet(req, res, next) {
  try {
    const bet = betsService.getTopScorerBet(req.user.userId);
    res.json({ bet });
  } catch (err) { next(err); }
}

async function getLeaderboard(req, res, next) {
  try {
    const leaderboard = betsService.getLeaderboard();
    res.json({ leaderboard });
  } catch (err) { next(err); }
}

module.exports = {
  submitGroupBet,
  getGroupBets,
  submitKnockoutBet,
  getKnockoutBets,
  submitTopScorerBet,
  getTopScorerBet,
  getLeaderboard,
};
