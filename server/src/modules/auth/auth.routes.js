const { Router } = require('express');
const authController = require('./auth.controller');
const authGuard = require('../../middleware/auth.middleware');

const router = Router();

// Public routes — no token required
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected — authGuard verifies the JWT before the controller runs
router.get('/me', authGuard, authController.getMe);

module.exports = router;
