//src/app.js
const cookieParser = require('cookie-parser');
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const resultsRoutes = require('./modules/results/routes');
const authRoutes  = require('./modules/auth/auth.routes');

const quizRoutes = require('./modules/quiz/routes');
const aiRoutes = require('./modules/ai/ai.routes');
const { globalLimiter } = require('./middleware/rateLimiter');

const cors = require('cors');
const app = express();


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

// Global limiter
app.use(globalLimiter);
//Routes
app.use('/api/auth', authRoutes);

app.use('/api/quiz', quizRoutes);

app.use('/api/results', resultsRoutes);

app.use('/api/ai', aiRoutes);


//Health check
app.get('/health', (req, res) =>
     res.status(200).json({status: 'ok'}));


//Error handler must be last
app.use(errorHandler);

module.exports = app;