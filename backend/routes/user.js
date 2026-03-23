const express = require('express');
const { getEvents, getSessions } = require('../db/cosmos');

const router = express.Router();

// GET /api/sessions/:sessionId/user/:username
router.get('/:sessionId/user/:username', async (req, res) => {
  try {
    const { sessionId, username } = req.params;
    const lowerUsername = username.toLowerCase();

    // Fetch session
    const { resource: session } = await getSessions()
      .item(sessionId, sessionId)
      .read();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch user events
    const { resources: events } = await getEvents().items
      .query({
        query: `
          SELECT * FROM e
          WHERE e.sessionId = @sessionId AND e.username = @username
          ORDER BY e.step ASC
        `,
        parameters: [
          { name: '@sessionId', value: sessionId },
          { name: '@username', value: lowerUsername },
        ],
      })
      .fetchAll();

    // Build step detail
    const completedStepMap = new Map();
    for (const event of events) {
      completedStepMap.set(event.step, {
        step: event.step,
        stepName: event.stepName,
        completedAt: event.completedAt,
      });
    }

    const stepDetails = session.steps.map((s) => ({
      step: s.step,
      stepName: s.stepName,
      completed: completedStepMap.has(s.step),
      completedAt: completedStepMap.get(s.step)?.completedAt || null,
    }));

    const completedSteps = completedStepMap.size;

    res.json({
      username: lowerUsername,
      sessionId,
      track: session.track,
      totalSteps: session.totalSteps,
      completedSteps,
      graduated: completedSteps >= session.totalSteps,
      steps: stepDetails,
    });
  } catch (err) {
    console.error('GET user progress error:', err.message);
    res.status(500).json({ error: 'Failed to get user progress' });
  }
});

module.exports = router;
