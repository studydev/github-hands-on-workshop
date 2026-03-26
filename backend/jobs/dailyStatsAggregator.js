const { getSessions, getEvents, getDailyStats } = require('../db/cosmos');

/**
 * Aggregate stats for a single date (YYYY-MM-DD) and upsert to dailyStats container.
 * Also computes cumulative totals across all time.
 */
async function aggregateDate(dateStr) {
  const nextDate = new Date(dateStr + 'T00:00:00Z');
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateStr = nextDate.toISOString().substring(0, 10);

  // Daily counts for this date
  const { resources: dayEvents } = await getEvents().items
    .query({
      query: `SELECT e.type FROM e WHERE e.timestamp >= @start AND e.timestamp < @end`,
      parameters: [
        { name: '@start', value: dateStr + 'T00:00:00.000Z' },
        { name: '@end', value: nextDateStr + 'T00:00:00.000Z' },
      ],
    })
    .fetchAll();

  let started = 0, completed = 0, steps = 0;
  for (const e of dayEvents) {
    if (e.type === 'start') started++;
    else if (e.type === 'end') completed++;
    else if (e.type === 'step') steps++;
  }

  // Cumulative totals (all time)
  const { resources: sessionCount } = await getSessions().items
    .query({ query: 'SELECT VALUE COUNT(1) FROM c' })
    .fetchAll();
  const totalSessions = sessionCount[0] || 0;

  const { resources: allUsers } = await getEvents().items
    .query({ query: `SELECT e.username, e.type FROM e WHERE e.type IN ('start', 'end')` })
    .fetchAll();

  const startedSet = new Set();
  const completedSet = new Set();
  for (const e of allUsers) {
    if (e.type === 'start') startedSet.add(e.username);
    if (e.type === 'end') completedSet.add(e.username);
  }

  const doc = {
    id: dateStr,
    date: dateStr,
    started,
    completed,
    steps,
    totalSessions,
    totalParticipants: startedSet.size,
    totalCompleted: completedSet.size,
    updatedAt: new Date().toISOString(),
  };

  // Upsert (create or replace)
  await getDailyStats().items.upsert(doc);
  console.log(`[DailyStats] ${dateStr}: started=${started} completed=${completed} steps=${steps} | cumulative: sessions=${totalSessions} participants=${startedSet.size} completed=${completedSet.size}`);
  return doc;
}

/**
 * Backfill last N days of daily stats.
 */
async function backfillDailyStats(days = 30) {
  console.log(`[DailyStats] Backfilling last ${days} days...`);
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    try {
      await aggregateDate(dateStr);
    } catch (err) {
      console.error(`[DailyStats] Failed to aggregate ${dateStr}:`, err.message);
    }
  }
  console.log(`[DailyStats] Backfill complete.`);
}

/**
 * Aggregate yesterday's stats (called by daily cron).
 */
async function aggregateYesterday() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().substring(0, 10);
  return aggregateDate(dateStr);
}

/**
 * Get today's date string in KST (Asia/Seoul).
 */
function getTodayKST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // returns YYYY-MM-DD
}

/**
 * Aggregate today's stats (KST date, for up-to-date current day data).
 */
async function aggregateToday() {
  const dateStr = getTodayKST();
  return aggregateDate(dateStr);
}

module.exports = { aggregateDate, backfillDailyStats, aggregateYesterday, aggregateToday };
