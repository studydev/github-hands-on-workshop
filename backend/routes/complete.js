const express = require('express');
const crypto = require('crypto');
const { getEvents } = require('../db/cosmos');

const router = express.Router();

// POST /api/complete — receive completion event from GitHub Actions
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      username,
      repo,
      track,
      step,
      stepName,
      totalSteps,
      runId,
      completedAt,
    } = req.body;

    if (!sessionId || !username || !runId || step == null) {
      return res.status(400).json({
        error: 'sessionId, username, runId, step are required',
      });
    }

    const event = {
      id: crypto.randomUUID(),
      sessionId,
      runId: String(runId),
      username: username.toLowerCase(),
      repo: repo || '',
      track: track || '',
      step: Number(step),
      stepName: stepName || `Step ${step}`,
      totalSteps: Number(totalSteps) || 0,
      completedAt: completedAt || new Date().toISOString(),
    };

    await getEvents().items.create(event);

    // Broadcast to SSE clients
    const broadcast = req.app.get('broadcastEvent');
    broadcast({
      type: 'completion',
      sessionId: event.sessionId,
      username: event.username,
      step: event.step,
      stepName: event.stepName,
      totalSteps: event.totalSteps,
      completedAt: event.completedAt,
    });

    res.status(201).json({ status: 'recorded', id: event.id });
  } catch (err) {
    // Cosmos DB unique key violation → duplicate runId
    if (err.code === 409) {
      return res.status(200).json({ status: 'already_recorded' });
    }
    console.error('POST /api/complete error:', err.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

module.exports = router;
