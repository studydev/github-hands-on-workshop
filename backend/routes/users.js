const express = require('express');
const { getEvents, getSessions } = require('../db/cosmos');

const router = express.Router();

// GET /api/users/search?q=username_or_org
// Searches events by username or by repo owner (org).
// Returns sessions the user participated in with their status.
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) {
      return res.status(400).json({ error: 'q (search query) is required' });
    }

    // Search events where username matches or repo starts with "org/"
    const { resources: events } = await getEvents().items
      .query({
        query:
          'SELECT e.sessionId, e.username, e.type, e.timestamp, e.repo, e.track FROM e WHERE LOWER(e.username) = @q OR STARTSWITH(LOWER(e.repo), @orgPrefix)',
        parameters: [
          { name: '@q', value: q },
          { name: '@orgPrefix', value: q + '/' },
        ],
      })
      .fetchAll();

    if (events.length === 0) {
      return res.json({ query: q, results: [] });
    }

    // Group by sessionId + username
    const sessionUserMap = new Map();
    for (const e of events) {
      const key = `${e.sessionId}::${e.username}`;
      if (!sessionUserMap.has(key)) {
        sessionUserMap.set(key, {
          sessionId: e.sessionId,
          username: e.username,
          repo: '',
          track: e.track || '',
          startedAt: null,
          completedAt: null,
        });
      }
      const entry = sessionUserMap.get(key);
      if (e.type === 'started' && !entry.startedAt) entry.startedAt = e.timestamp;
      if (e.type === 'completed' && !entry.completedAt) entry.completedAt = e.timestamp;
      if (e.repo) entry.repo = e.repo;
    }

    // Collect unique session IDs to fetch session names
    const sessionIds = [...new Set(Array.from(sessionUserMap.values()).map((e) => e.sessionId))];

    // Fetch session details
    const sessionMap = new Map();
    for (const sid of sessionIds) {
      try {
        const { resource: session } = await getSessions().item(sid, sid).read();
        if (session) {
          sessionMap.set(sid, { name: session.name, track: session.track });
        }
      } catch {
        // session may have been deleted
      }
    }

    // Build results
    const results = Array.from(sessionUserMap.values()).map((entry) => {
      const session = sessionMap.get(entry.sessionId);
      return {
        sessionId: entry.sessionId,
        sessionName: session ? session.name : '(삭제됨)',
        sessionTrack: session ? session.track : entry.track,
        username: entry.username,
        repo: entry.repo,
        repoUrl: entry.repo ? `https://github.com/${entry.repo}` : '',
        status: entry.completedAt ? 'completed' : 'started',
        startedAt: entry.startedAt,
        completedAt: entry.completedAt,
      };
    });

    // Sort by startedAt descending (most recent first)
    results.sort((a, b) => {
      const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return tb - ta;
    });

    res.json({ query: q, results });
  } catch (err) {
    console.error('GET /api/users/search error:', err.message);
    res.status(500).json({ error: 'Failed to search user history' });
  }
});

module.exports = router;
