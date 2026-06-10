const { Router }     = require('express');
const authGuard      = require('../../middleware/auth.middleware');
const oracleController = require('./oracle.controller');

const router = Router();

// All Oracle routes require a valid JWT
router.get('/profile',                 authGuard, oracleController.getProfile);
router.post('/profile',                authGuard, oracleController.saveProfile);
router.get('/today',                   authGuard, oracleController.getTodayPredictions);
router.get('/predictions/:matchId',    authGuard, oracleController.getPrediction);
router.post('/bet',                    authGuard, oracleController.submitBet);
router.get('/bet/:matchId',            authGuard, oracleController.getBet);
router.get('/accuracy',                authGuard, oracleController.getAccuracy);

module.exports = router;
