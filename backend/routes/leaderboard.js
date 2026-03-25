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
        query: 'SELECT e.username, e.type, e.timestamp, e.repo, e["step"] AS step, e.description FROM e WHERE e.sessionId = @sessionId',
        parameters: [{ name: '@sessionId', value: sessionId }],
      })
      .fetchAll();

    // Build user map
    const userMap = new Map();
    for (const e of events) {
      if (!userMap.has(e.username)) {
        userMap.set(e.username, { username: e.username, startedAt: null, startDescription: null, completedAt: null, endDescription: null, repo: '', steps: [] });
      }
      const u = userMap.get(e.username);
      if ((e.type === 'start' || e.type === 'started') && !u.startedAt) {
        u.startedAt = e.timestamp;
        u.startDescription = e.description || '시작';
      }
      if ((e.type === 'end' || e.type === 'completed') && !u.completedAt) {
        u.completedAt = e.timestamp;
        u.endDescription = e.description || '완료';
      }
      if (e.type === 'step' && e.step != null) {
        u.steps.push({ step: e.step, description: e.description || '', timestamp: e.timestamp });
      }
      if (e.repo) u.repo = e.repo;
    }

    // Sort steps by step number for each user
    for (const u of userMap.values()) {
      u.steps.sort((a, b) => a.step - b.step);
    }

    // Leaderboard: only completed users, ranked by completion time (earliest first)
    const completedUsers = Array.from(userMap.values())
      .filter((u) => u.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .map((u, idx) => ({
        rank: idx + 1,
        username: u.username,
        startedAt: u.startedAt,
        startDescription: u.startDescription,
        completedAt: u.completedAt,
        endDescription: u.endDescription,
        repo: u.repo,
        steps: u.steps,
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
        status: u.completedAt ? 'completed' : u.steps.length > 0 ? 'in_progress' : u.startedAt ? 'started' : 'unknown',
        startedAt: u.startedAt,
        startDescription: u.startDescription,
        completedAt: u.completedAt,
        endDescription: u.endDescription,
        repo: u.repo,
        steps: u.steps,
      }));

    // Recent events for feed (latest 10, sorted by timestamp desc)
    const recentEvents = events
      .map((e) => ({
        type: e.type,
        username: e.username,
        repo: e.repo,
        step: e.step,
        description: e.description,
        timestamp: e.timestamp,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({ leaderboard: completedUsers, participants, recentEvents });
  } catch (err) {
    console.error('GET leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
