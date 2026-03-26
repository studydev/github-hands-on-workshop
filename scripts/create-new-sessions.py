"""Create 'All - ' sessions for new skills and print session IDs."""
import requests
import time

API = "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io"
ADMIN_PW = "hskim@microsoft.com"

NEW_SKILLS = [
    {"name": "All - Connect the Dots", "track": "Connect the Dots"},
    {"name": "All - Copilot Codespaces VS Code", "track": "Copilot + Codespaces + VS Code"},
    {"name": "All - Your First Extension for GitHub Copilot", "track": "Your First Extension for GitHub Copilot"},
    {"name": "All - Create Applications with Copilot CLI", "track": "Create Applications with Copilot CLI"},
    {"name": "All - Create AI Powered Actions", "track": "Create AI Powered Actions"},
    {"name": "All - Write JavaScript Actions", "track": "Write JavaScript Actions"},
    {"name": "All - Release Based Workflow", "track": "Release Based Workflow"},
    {"name": "All - Deploy to Azure", "track": "Deploy to Azure"},
    {"name": "All - Change Commit History", "track": "Change Commit History"},
    {"name": "All - Configure CodeQL Language Matrix", "track": "Configure CodeQL Language Matrix"},
]

results = []
for s in NEW_SKILLS:
    try:
        r = requests.post(
            f"{API}/api/sessions",
            json={"name": s["name"], "track": s["track"]},
            headers={"Content-Type": "application/json", "X-Admin-Password": ADMIN_PW},
            timeout=10,
        )
        data = r.json()
        sid = data.get("sessionId", "ERROR")
        print(f"{s['track']:50s} -> {sid}")
        results.append({"track": s["track"], "sessionId": sid, "name": s["name"]})
        time.sleep(0.5)
    except Exception as e:
        print(f"{s['track']:50s} -> ERROR: {e}")

print("\n=== Summary ===")
for r in results:
    print(f"  {r['track']}: {r['sessionId']}")
