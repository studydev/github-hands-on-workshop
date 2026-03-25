import subprocess, json

# Get Cosmos DB credentials from Azure CLI
endpoint = subprocess.check_output(
    ["az", "cosmosdb", "show", "--name", "workshop-tracker-cosmos",
     "--resource-group", "rg-workshop-tracker", "--query", "documentEndpoint", "-o", "tsv"]
).decode().strip()

key = subprocess.check_output(
    ["az", "cosmosdb", "keys", "list", "--name", "workshop-tracker-cosmos",
     "--resource-group", "rg-workshop-tracker", "--query", "primaryMasterKey", "-o", "tsv"]
).decode().strip()

from azure.cosmos import CosmosClient

client = CosmosClient(endpoint, key)
database = client.get_database_client("workshop-tracker")
events_container = database.get_container_client("events")

# Find all events in session 82934411 (resolve-merge-conflicts)
print("=== Searching events in session 82934411 (resolve-merge-conflicts) ===")
items = list(events_container.query_items(
    query="SELECT * FROM c WHERE c.sessionId = '82934411'",
    partition_key="82934411"
))

print(f"Found {len(items)} event(s):")
for item in items:
    print(f"  id={item['id']} | sessionId={item['sessionId']} | username={item['username']} | type={item['type']} | timestamp={item['timestamp']}")

if items:
    print(f"\n=== Deleting {len(items)} event(s) ===")
    for item in items:
        events_container.delete_item(item=item['id'], partition_key=item['sessionId'])
        print(f"  Deleted: id={item['id']} (sessionId={item['sessionId']}, username={item['username']})")
    print("\nDone!")
else:
    print("No events to delete.")
