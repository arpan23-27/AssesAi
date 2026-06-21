const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.schema');
const { authLimiter } = require('../../middleware/rateLimiter');
const auth = require('../../middleware/auth');

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router;
