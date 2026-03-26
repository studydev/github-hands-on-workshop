import json
path = '/Volumes/nvme1tb/Dev/github_workshop_01/frontend/app.js'
# Read content from the companion file
with open('/Volumes/nvme1tb/Dev/github_workshop_01/scripts/appjs_content.txt', 'r') as f:
    content = f.read()
with open(path, 'w') as f:
    f.write(content)
print('Written', len(content), 'bytes to', path)
