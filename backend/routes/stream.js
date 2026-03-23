const express = require('express');

const router = express.Router();

// GET /api/stream?sessionId= — Server-Sent Events
router.get('/', (req, res) => {
  const { sessionId } = req.query;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial keep-alive
  res.write(':ok\n\n');

  // Wrap res with session filter
  const client = {
    write(payload) {
      // If sessionId filter is set, only forward matching events
      if (sessionId) {
        try {
          const line = payload.replace(/^data: /, '').replace(/\n\n$/, '');
          const data = JSON.parse(line);
          if (data.sessionId && data.sessionId !== sessionId) return;
        } catch {
          // not JSON, forward anyway
        }
      }
      res.write(payload);
    },
  };

  const sseClients = req.app.get('sseClients');
  sseClients.add(client);

  // Keep-alive every 30s
  const keepAlive = setInterval(() => {
    res.write(':ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(client);
  });
});

module.exports = router;
