const knockoutService = require('./knockout.service');

function getKnockoutBracket(req, res, next) {
  try {
    const bracket = knockoutService.getKnockoutBracket();
    res.json({ bracket });
  } catch (err) {
    next(err);
  }
}

module.exports = { getKnockoutBracket };
