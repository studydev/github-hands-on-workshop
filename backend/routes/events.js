const express = require('express');
const crypto = require('crypto');
const { getEvents } = require('../db/cosmos');

const router = express.Router();

// POST /api/events — receive start/step/end event from GitHub Actions
router.post('/', async (req, res) => {
  try {
    const { sessionId, type, username, repo, track, runId } = req.body;

    if (!sessionId || !username || !runId || !type) {
      return res.status(400).json({
        error: 'sessionId, type, username, runId are required',
      });
    }

    if (!['start', 'started', 'step', 'end', 'completed'].includes(type)) {
      return res.status(400).json({
        error: 'type must be "start", "step", or "end"',
      });
    }

    // Normalize legacy type values
    const normalizedType = type === 'started' ? 'start' : type === 'completed' ? 'end' : type;

    const { step, description } = req.body;
    if (normalizedType === 'step' && (step == null || step === '')) {
      return res.status(400).json({
        error: 'step (number) is required when type is "step"',
      });
    }

    const event = {
      id: crypto.randomUUID(),
      sessionId,
      runId: String(runId),
      type: normalizedType,
      username: username.toLowerCase(),
      repo: repo || '',
      track: track || '',
      step: normalizedType === 'step' ? Number(step) : null,
      description: description || null,
      timestamp: new Date().toISOString(),
    };

    await getEvents().items.create(event);

    // Broadcast to SSE clients
    const broadcast = req.app.get('broadcastEvent');
    broadcast({
      type: event.type,
      sessionId: event.sessionId,
      username: event.username,
      repo: event.repo,
      step: event.step,
      description: event.description,
      timestamp: event.timestamp,
    });

    res.status(201).json({ status: 'recorded', id: event.id });
  } catch (err) {
    // Cosmos DB unique key violation → duplicate runId
    if (err.code === 409) {
      return res.status(200).json({ status: 'already_recorded' });
    }
    console.error('POST /api/events error:', err.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

module.exports = router;
