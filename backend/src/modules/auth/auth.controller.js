const authService = require('./auth.service');
const { InvalidCredentialsError } = require('../../utils/errors');

const isProduction = process.env.NODE_ENV === 'production';

// Cross-site refresh cookies (frontend and API on different domains, the default
// Vercel + Render layout) require SameSite=None; Secure, or the browser silently
// drops the cookie and refresh/logout break. Override with COOKIE_SAMESITE if you
// serve both from the same site (then 'lax' or 'strict' is safe). SameSite=None
// is only valid alongside Secure, which is enabled in production.
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'strict');

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: COOKIE_SAMESITE,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.registerUser({ email, password });
    return res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authService.loginUser({ email, password });
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    return res.status(200).json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) return next(new InvalidCredentialsError(null));
    const { accessToken, refreshToken } = await authService.refreshTokens(rawToken);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    return res.status(200).json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      await authService.logout(rawToken, req.user?.jti, req.user?.exp);
    } else {
      // No refresh token cookie but still blacklist the access token
      await authService.blacklistToken(req.user?.jti, req.user?.exp);
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: COOKIE_SAMESITE,
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
