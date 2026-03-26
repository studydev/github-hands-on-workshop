const { CosmosClient } = require('@azure/cosmos');

let sessionsContainer;
let eventsContainer;
let dailyStatsContainer;

async function initCosmos() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
  }

  const client = new CosmosClient({ endpoint, key });

  const { database } = await client.databases.createIfNotExists({
    id: 'workshop-tracker',
  });

  const { container: sessions } = await database.containers.createIfNotExists({
    id: 'sessions',
    partitionKey: { paths: ['/id'] },
  });

  const { container: events } = await database.containers.createIfNotExists({
    id: 'events',
    partitionKey: { paths: ['/sessionId'] },
    uniqueKeyPolicy: {
      uniqueKeys: [{ paths: ['/runId'] }],
    },
  });

  const { container: dailyStats } = await database.containers.createIfNotExists({
    id: 'dailyStats',
    partitionKey: { paths: ['/date'] },
  });

  sessionsContainer = sessions;
  eventsContainer = events;
  dailyStatsContainer = dailyStats;

  console.log('Cosmos DB initialized: workshop-tracker');
}

function getSessions() {
  return sessionsContainer;
}

function getEvents() {
  return eventsContainer;
}

function getDailyStats() {
  return dailyStatsContainer;
}

module.exports = { initCosmos, getSessions, getEvents, getDailyStats };
