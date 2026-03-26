const express = require('express');
const crypto = require('crypto');
const { getSessions, getEvents } = require('../db/cosmos');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Admin password required' });
  }
  next();
}

// POST /api/sessions — create a new session
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, track, startDate, endDate } = req.body;

    if (!name || !track) {
      return res.status(400).json({ error: 'name, track are required' });
    }

    const session = {
      id: crypto.randomBytes(4).toString('hex'),
      name,
      track,
      startDate: startDate || null,
      endDate: endDate || null,
      createdAt: new Date().toISOString(),
    };

    await getSessions().items.create(session);
    res.status(201).json({ sessionId: session.id, session });
  } catch (err) {
    console.error('POST /api/sessions error:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions — list sessions (newest first)
router.get('/', async (_req, res) => {
  try {
    const { resources } = await getSessions().items
      .query({
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
      })
      .fetchAll();

    res.json(resources);
  } catch (err) {
    console.error('GET /api/sessions error:', err.message);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// PUT /api/sessions/:sessionId — update a session
router.put('/:sessionId', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, track, startDate, endDate, createdAt } = req.body;

    if (!name || !track) {
      return res.status(400).json({ error: 'name, track are required' });
    }

    const { resource: existing } = await getSessions()
      .item(sessionId, sessionId)
      .read();

    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = {
      ...existing,
      name,
      track,
      startDate: startDate || null,
      endDate: endDate || null,
    };
    if (createdAt) updated.createdAt = createdAt;

    const { resource: result } = await getSessions()
      .item(sessionId, sessionId)
      .replace(updated);

    res.json({ sessionId: result.id, session: result });
  } catch (err) {
    console.error('PUT /api/sessions/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// GET /api/sessions/:sessionId — session detail + summary stats
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { resource: session } = await getSessions()
      .item(sessionId, sessionId)
      .read();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Gather stats from events
    const { resources: events } = await getEvents().items
      .query({
        query: 'SELECT e.username, e.type FROM e WHERE e.sessionId = @sessionId',
        parameters: [{ name: '@sessionId', value: sessionId }],
      })
      .fetchAll();

    const started = new Set();
    const completed = new Set();
    for (const e of events) {
      if (e.type === 'start') started.add(e.username);
      if (e.type === 'end') completed.add(e.username);
    }

    res.json({
      ...session,
      stats: {
        started: started.size,
        completed: completed.size,
        completionRate: started.size > 0 ? Math.round((completed.size / started.size) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('GET /api/sessions/:id error:', err.message);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

module.exports = router;
