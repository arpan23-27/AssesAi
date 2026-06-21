require('dotenv').config();
const app = require('./app');
const redis = require('./config/redis');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  // Fail fast if core infrastructure is unreachable.
  await pool.query('SELECT 1');
  console.log('PostgreSQL ready');
  await redis.ping();
  console.log('Redis ready');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
