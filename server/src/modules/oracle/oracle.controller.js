const oracleService = require('./oracle.service');

async function getProfile(req, res, next) {
  try {
    const profile = oracleService.getOracleProfile(req.user.userId);
    res.json({ profile });
  } catch (err) { next(err); }
}

async function saveProfile(req, res, next) {
  try {
    const result = oracleService.saveOracleProfile(req.user.userId, req.body);
    res.json(result);
  } catch (err) { next(err); }
}

async function getPrediction(req, res, next) {
  try {
    const prediction = oracleService.getOraclePrediction(
      Number(req.params.matchId),
      req.user.userId
    );
    res.json(prediction);
  } catch (err) { next(err); }
}

async function getTodayPredictions(req, res, next) {
  try {
    const predictions = oracleService.getTodayPredictions(req.user.userId);
    res.json({ predictions });
  } catch (err) { next(err); }
}

async function submitBet(req, res, next) {
  try {
    const result = oracleService.submitOracleBet(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function getBet(req, res, next) {
  try {
    const bet = oracleService.getOracleBet(req.user.userId, Number(req.params.matchId));
    res.json({ bet });
  } catch (err) { next(err); }
}

async function getAccuracy(req, res, next) {
  try {
    const accuracy = oracleService.getOracleAccuracy();
    res.json(accuracy);
  } catch (err) { next(err); }
}

module.exports = {
  getProfile,
  saveProfile,
  getPrediction,
  getTodayPredictions,
  submitBet,
  getBet,
  getAccuracy,
};
