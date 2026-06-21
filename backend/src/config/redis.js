// src/config/redis.js
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;
const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
  //Do not crash -caching is optional
});

module.exports = redis;
