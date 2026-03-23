const { CosmosClient } = require('@azure/cosmos');

let sessionsContainer;
let eventsContainer;

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

  sessionsContainer = sessions;
  eventsContainer = events;

  console.log('Cosmos DB initialized: workshop-tracker');
}

function getSessions() {
  return sessionsContainer;
}

function getEvents() {
  return eventsContainer;
}

module.exports = { initCosmos, getSessions, getEvents };
