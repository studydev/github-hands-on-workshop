const express = require('express');
const { getEvents, getSessions } = require('../db/cosmos');

const router = express.Router();

// GET /api/sessions/:sessionId/progress
router.get('/:sessionId/progress', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Fetch session for step definitions
    const { resource: session } = await getSessions()
      .item(sessionId, sessionId)
      .read();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch all events for this session
    const { resources: events } = await getEvents().items
      .query({
        query: 'SELECT * FROM e WHERE e.sessionId = @sessionId',
        parameters: [{ name: '@sessionId', value: sessionId }],
      })
      .fetchAll();

    // Build participant × step matrix
    const participantMap = new Map();

    for (const event of events) {
      if (!participantMap.has(event.username)) {
        participantMap.set(event.username, {
          username: event.username,
          steps: {},
          completedSteps: 0,
        });
      }
      const p = participantMap.get(event.username);
      p.steps[event.step] = {
        stepName: event.stepName,
        completedAt: event.completedAt,
      };
      p.completedSteps = Object.keys(p.steps).length;
    }

    const participants = Array.from(participantMap.values())
      .sort((a, b) => b.completedSteps - a.completedSteps)
      .map((p) => ({
        ...p,
        totalSteps: session.totalSteps,
        graduated: p.completedSteps >= session.totalSteps,
      }));

    res.json({
      session: {
        id: session.id,
        name: session.name,
        track: session.track,
        totalSteps: session.totalSteps,
        steps: session.steps,
      },
      participants,
    });
  } catch (err) {
    console.error('GET progress error:', err.message);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

module.exports = router;
