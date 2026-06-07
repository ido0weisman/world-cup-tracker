const { Router } = require('express');
const betsController = require('./bets.controller');
const authGuard = require('../../middleware/auth.middleware');

const router = Router();

// All betting routes require a valid JWT — guests cannot place or view bets
router.use(authGuard);

router.post('/group',       betsController.submitGroupBet);
router.get('/group',        betsController.getGroupBets);

router.post('/knockout',    betsController.submitKnockoutBet);
router.get('/knockout',     betsController.getKnockoutBets);

router.post('/top-scorer',  betsController.submitTopScorerBet);
router.get('/top-scorer',   betsController.getTopScorerBet);

router.get('/leaderboard',  betsController.getLeaderboard);
router.get('/my-score',     betsController.getMyScore);

module.exports = router;
