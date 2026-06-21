//src/app.js
const cookieParser = require('cookie-parser');
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const resultsRoutes = require('./modules/results/routes');
const authRoutes = require('./modules/auth/auth.routes');

const quizRoutes = require('./modules/quiz/routes');
const aiRoutes = require('./modules/ai/ai.routes');
const { globalLimiter } = require('./middleware/rateLimiter');

const cors = require('cors');
const app = express();

// Allowed browser origins are driven by env so the same image runs locally and
// in production. CLIENT_ORIGIN is a comma-separated list (e.g. a Vercel prod
// URL plus a preview URL); it falls back to the Vite dev server for local runs.
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);

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
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

//Error handler must be last
app.use(errorHandler);

module.exports = app;
