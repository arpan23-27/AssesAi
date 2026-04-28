const authService = require('./auth.service')
const { InvalidCredentialsError } = require('../../utils/errors')

async function register(req, res, next) {
  try {
    const { email, password } = req.body
    const user = await authService.registerUser({ email, password })
    return res.status(201).json({ data: user })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const { accessToken, refreshToken } = await authService.loginUser({ email, password })
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    return res.status(200).json({ data: { accessToken } })
  } catch (err) {
    next(err)
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken) return next(new InvalidCredentialsError(null))
    const { accessToken, refreshToken } = await authService.refreshTokens(rawToken)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    return res.status(200).json({ data: { accessToken } })
  } catch (err) {
    next(err)
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken
    if (rawToken) {
      await authService.logout(rawToken, req.user?.jti, req.user?.exp)
    } else {
      // No refresh token cookie but still blacklist the access token
      await authService.blacklistToken(req.user?.jti, req.user?.exp)
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, refresh, logout }