const { Router } = require('express');
const knockoutController = require('./knockout.controller');

const router = Router();

router.get('/', knockoutController.getKnockoutBracket);

module.exports = router;
