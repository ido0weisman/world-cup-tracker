const matchesService = require('./matches.service');

function getToday(req, res, next) {
  try {
    const matches = matchesService.getMatchesToday();
    res.json({ matches });
  } catch (err) {
    next(err);
  }
}

function getThisWeek(req, res, next) {
  try {
    const matches = matchesService.getMatchesThisWeek();
    res.json({ matches });
  } catch (err) {
    next(err);
  }
}

module.exports = { getToday, getThisWeek };
