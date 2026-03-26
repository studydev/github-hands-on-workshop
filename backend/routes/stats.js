const express = require('express');
const { getDailyStats } = require('../db/cosmos');

const router = express.Router();

// GET /api/stats/overview — read pre-aggregated daily stats
router.get('/overview', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString().substring(0, 10);

    const { resources: dailyEvents } = await getDailyStats().items
      .query({
        query: 'SELECT * FROM c WHERE c.date >= @since ORDER BY c.date ASC',
        parameters: [{ name: '@since', value: sinceDate }],
      })
      .fetchAll();

    // Use the latest day's cumulative totals
    const latest = dailyEvents.length > 0 ? dailyEvents[dailyEvents.length - 1] : null;

    res.json({
      totalSessions: latest ? latest.totalSessions : 0,
      totalParticipants: latest ? latest.totalParticipants : 0,
      totalCompleted: latest ? latest.totalCompleted : 0,
      dailyEvents: dailyEvents.map(d => ({
        date: d.date,
        started: d.started,
        completed: d.completed,
        steps: d.steps,
      })),
    });
  } catch (err) {
    console.error('GET /api/stats/overview error:', err.message);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
