const express = require('express');
const { getEvents } = require('../db/cosmos');

const router = express.Router();

// GET /api/sessions/:sessionId/leaderboard
// Returns completed users ranked by completion time (earliest first)
// + all participants with their status
router.get('/:sessionId/leaderboard', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { resources: events } = await getEvents().items
      .query({
        query: 'SELECT e.username, e.type, e.timestamp, e.repo FROM e WHERE e.sessionId = @sessionId',
        parameters: [{ name: '@sessionId', value: sessionId }],
      })
      .fetchAll();

    // Build user map
    const userMap = new Map();
    for (const e of events) {
      if (!userMap.has(e.username)) {
        userMap.set(e.username, { username: e.username, startedAt: null, completedAt: null, repo: '' });
      }
      const u = userMap.get(e.username);
      if (e.type === 'started' && !u.startedAt) u.startedAt = e.timestamp;
      if (e.type === 'completed' && !u.completedAt) u.completedAt = e.timestamp;
      if (e.repo) u.repo = e.repo;
    }

    // Leaderboard: only completed users, ranked by completion time (earliest first)
    const completedUsers = Array.from(userMap.values())
      .filter((u) => u.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .map((u, idx) => ({
        rank: idx + 1,
        username: u.username,
        startedAt: u.startedAt,
        completedAt: u.completedAt,
        repo: u.repo,
      }));

    // All participants sorted: completed first (by time), then started (by time)
    const participants = Array.from(userMap.values())
      .sort((a, b) => {
        if (a.completedAt && b.completedAt) return new Date(a.completedAt) - new Date(b.completedAt);
        if (a.completedAt) return -1;
        if (b.completedAt) return 1;
        if (a.startedAt && b.startedAt) return new Date(a.startedAt) - new Date(b.startedAt);
        return 0;
      })
      .map((u) => ({
        username: u.username,
        status: u.completedAt ? 'completed' : 'started',
        startedAt: u.startedAt,
        completedAt: u.completedAt,
        repo: u.repo,
      }));

    res.json({ leaderboard: completedUsers, participants });
  } catch (err) {
    console.error('GET leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
