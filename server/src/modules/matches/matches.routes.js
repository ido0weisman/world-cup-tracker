const { Router } = require('express');
const matchesController = require('./matches.controller');

const router = Router();

router.get('/today', matchesController.getToday);
router.get('/week',  matchesController.getThisWeek);
router.get('/all',   matchesController.getAll);

module.exports = router;
