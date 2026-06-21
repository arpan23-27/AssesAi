require('dotenv').config();
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const redis = require('../../config/redis');
const userRepository = require('../../repositories/user.repository');
const tokenRepository = require('../../repositories/token.repository');
const { DuplicateEmailError, InvalidCredentialsError } = require('../../utils/errors');

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

async function registerUser({ email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new DuplicateEmailError([{ field: 'email', issue: 'Already registered' }]);
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await userRepository.createUser({ email, password_hash });
  return { id: user.id, email: user.email, createdAt: user.created_at };
}

async function loginUser({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const hashToVerify = user ? user.password_hash : DUMMY_HASH;
  const passwordValid = await argon2.verify(hashToVerify, password);
  if (!user || !passwordValid) throw new InvalidCredentialsError(null);

  const jti = crypto.randomUUID();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, jti },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
  );
  const refreshToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await tokenRepository.storeToken({ userId: user.id, tokenHash, expiresAt });
  return { accessToken, refreshToken };
}

async function refreshTokens(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = await tokenRepository.findByHash(tokenHash);
  if (!tokenRecord) throw new InvalidCredentialsError(null);
  if (tokenRecord.revoked_at) {
    await tokenRepository.revokeAllForUser(tokenRecord.user_id);
    throw new InvalidCredentialsError(null);
  }
  if (new Date(tokenRecord.expires_at) < new Date()) throw new InvalidCredentialsError(null);
  await tokenRepository.revokeToken(tokenHash);
  const user = await userRepository.findById(tokenRecord.user_id);
  if (!user) throw new InvalidCredentialsError(null);

  const jti = crypto.randomUUID();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, jti },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
  );
  const newRefreshToken = crypto.randomBytes(32).toString('base64url');
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await tokenRepository.storeToken({ userId: user.id, tokenHash: newTokenHash, expiresAt });
  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(rawToken, jti, exp) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await tokenRepository.revokeToken(tokenHash);
  if (jti && exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
    }
  }
}
async function blacklistToken(jti, exp) {
  if (jti && exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
  }
}

module.exports = { registerUser, loginUser, refreshTokens, logout, blacklistToken };
