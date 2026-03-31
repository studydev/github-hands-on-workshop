const { getSessions, getEvents, getDailyStats } = require('../db/cosmos');

/**
 * Convert a KST date string (YYYY-MM-DD) to UTC boundary timestamps.
 * KST midnight = UTC 15:00 of the previous day.
 */
function kstDateToUtcRange(dateStr) {
  // KST is UTC+9, so KST midnight = previous day 15:00 UTC
  const kstMidnight = new Date(dateStr + 'T00:00:00+09:00');
  const nextDay = new Date(kstMidnight.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: kstMidnight.toISOString(),
    end: nextDay.toISOString(),
  };
}

/**
 * Aggregate stats for a single KST date (YYYY-MM-DD) and upsert to dailyStats container.
 * Uses KST day boundaries for consistent timezone handling.
 * Also computes cumulative totals across all time.
 */
async function aggregateDate(dateStr) {
  const { start, end } = kstDateToUtcRange(dateStr);

  // Daily counts for this KST date
  const { resources: dayEvents } = await getEvents().items
    .query({
      query: `SELECT e.type FROM e WHERE e.timestamp >= @start AND e.timestamp < @end`,
      parameters: [
        { name: '@start', value: start },
        { name: '@end', value: end },
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
 * Backfill last N days of daily stats (using KST dates).
 */
async function backfillDailyStats(days = 30) {
  console.log(`[DailyStats] Backfilling last ${days} days (KST)...`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
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
