const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { initCosmos } = require('./db/cosmos');
const sessionsRouter = require('./routes/sessions');
const eventsRouter = require('./routes/events');
const leaderboardRouter = require('./routes/leaderboard');
const streamRouter = require('./routes/stream');
const usersRouter = require('./routes/users');
const statsRouter = require('./routes/stats');
const { backfillDailyStats, aggregateYesterday, aggregateToday } = require('./jobs/dailyStatsAggregator');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SSE client management ---
const sseClients = new Set();

function broadcastEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

app.set('sseClients', sseClients);
app.set('broadcastEvent', broadcastEvent);

// --- Middleware ---
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/events', limiter);

// --- Routes ---
app.use('/api/sessions', sessionsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/sessions', leaderboardRouter);
app.use('/api/stream', streamRouter);
app.use('/api/users', usersRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- Start ---
async function start() {
  await initCosmos();

  // Backfill daily stats on startup (idempotent via upsert)
  backfillDailyStats(30).catch(err => console.error('[DailyStats] Backfill error:', err.message));

  // Every hour at :55 KST — aggregate today's data (upsert, so last run of the day finalizes it)
  cron.schedule('55 * * * *', async () => {
    console.log('[Cron] Aggregating today stats (KST)...');
    try {
      await aggregateToday();
    } catch (err) {
      console.error('[Cron] Hourly stats error:', err.message);
    }
  }, { timezone: 'Asia/Seoul' });

  app.listen(PORT, () => {
    console.log(`Workshop Tracker API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
