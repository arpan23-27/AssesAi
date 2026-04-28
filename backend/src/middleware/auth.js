const jwt = require('jsonwebtoken')
const redis = require('../config/redis')
const { TokenExpiredError, TokenInvalidError } = require('../utils/errors')

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new TokenInvalidError())
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

    // Blacklist check
    if (decoded.jti) {
      const blacklisted = await redis.get(`blacklist:${decoded.jti}`)
      if (blacklisted) return next(new TokenInvalidError())
    }

    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new TokenExpiredError())
    return next(new TokenInvalidError())
  }
}

module.exports = auth