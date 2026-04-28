require('dotenv').config();
const app = require('./app');
const connectMongoDB = require('./config/mongodb');
const PORT = process.env.PORT || 3000;
const redis = require('./config/redis');



async function start() {
  await redis.ping();
  console.log('Redis ready');
  await connectMongoDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();