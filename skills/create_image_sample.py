# Install required packages: `pip install requests pillow azure-identity`
import os
import requests
import base64
from PIL import Image
from io import BytesIO

# You will need to set these environment variables or edit the following values.
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://genai-thon-04.openai.azure.com/")
deployment = os.getenv("DEPLOYMENT_NAME", "gpt-image-1.5")
api_version = os.getenv("OPENAI_API_VERSION", "2025-04-01-preview")
subscription_key = os.getenv("AZURE_OPENAI_API_KEY")

def decode_and_save_image(b64_data, output_filename):
  image = Image.open(BytesIO(base64.b64decode(b64_data)))
  image.show()
  image.save(output_filename)

def save_response(response_data, filename_prefix):
  for idx, item in enumerate(response_data['data']):
    b64_img = item['b64_json']
    filename = f"{filename_prefix}_{idx+1}.png"
    decode_and_save_image(b64_img, filename)
    print(f"Image saved to: '{filename}'")

base_path = f'openai/deployments/{deployment}/images'
params = f'?api-version={api_version}'

generation_url = f"https://genai-thon-04.openai.azure.com/{base_path}/generations{params}"
generation_body = {
  "prompt": "A wide promotional illustration for \"Creating Your Own Development Space with GitHub\".\nDark navy-charcoal background (#0d1117) with subtle dot grain texture.\n\nCenter composition: A stylized GitHub repository card floating in the middle — white rounded-rect card showing a repo name \"my-first-project\" with a green lock icon, file tree (README.md, PROFILE.md, .github/), and a commit history timeline with 3-4 colored dots connected by lines.\n\nLeft side: A glowing git branch diagram — a horizontal \"main\" line in blue with a branch splitting downward labeled \"my-first-branch\" in green, then merging back with a merge node in purple. Small commit dots along the branch.\n\nRight side: A pull request card mockup — rounded white card with a green \"Open\" badge, title \"Add PROFILE.md\", two reviewer avatar circles, and a green \"Merge\" button at the bottom.\n\nBottom area: Four small icon badges in a row — (1) a folder/repo icon, (2) a branch fork icon, (3) a commit checkmark icon, (4) a merge icon — each in a slightly elevated dark card with soft glow underneath.\n\nTop: Title text \"Creating Your Own Development Space with GitHub\" in clean white sans-serif font.\n\nStyle: Flat vector illustration with minimal soft shadows for depth. No gradients on objects. GitHub dark theme color palette. Professional, modern, clean. Similar aesthetic to GitHub's official marketing illustrations. No photorealism, no 3D rendering. 1152×896 resolution, horizontal layout.",
  "n": 1,
  "size": "1536x1024",
  "quality": "medium",
  "output_format": "png"
}
generation_response = requests.post(
  generation_url,
  headers={
    'Api-Key': subscription_key,
    'Content-Type': 'application/json',
  },
  json=generation_body
).json()
save_response(generation_response, "generated_image")

# In addition to generating images, you can edit them.
edit_url = f"{endpoint}{base_path}/edits{params}"
edit_body = {
  "prompt": "A wide promotional illustration for \"Creating Your Own Development Space with GitHub\".\nDark navy-charcoal background (#0d1117) with subtle dot grain texture.\n\nCenter composition: A stylized GitHub repository card floating in the middle — white rounded-rect card showing a repo name \"my-first-project\" with a green lock icon, file tree (README.md, PROFILE.md, .github/), and a commit history timeline with 3-4 colored dots connected by lines.\n\nLeft side: A glowing git branch diagram — a horizontal \"main\" line in blue with a branch splitting downward labeled \"my-first-branch\" in green, then merging back with a merge node in purple. Small commit dots along the branch.\n\nRight side: A pull request card mockup — rounded white card with a green \"Open\" badge, title \"Add PROFILE.md\", two reviewer avatar circles, and a green \"Merge\" button at the bottom.\n\nBottom area: Four small icon badges in a row — (1) a folder/repo icon, (2) a branch fork icon, (3) a commit checkmark icon, (4) a merge icon — each in a slightly elevated dark card with soft glow underneath.\n\nTop: Title text \"Creating Your Own Development Space with GitHub\" in clean white sans-serif font.\n\nStyle: Flat vector illustration with minimal soft shadows for depth. No gradients on objects. GitHub dark theme color palette. Professional, modern, clean. Similar aesthetic to GitHub's official marketing illustrations. No photorealism, no 3D rendering. 1152×896 resolution, horizontal layout.",
  "n": 1,
  "size": "1536x1024",
  "quality": "medium"
}
files = {
  "image": ("generated_image_1.png", open("generated_image_1.png", "rb"), "image/png"),
  # You can use a mask to specify which parts of the image you want to edit.
  # The mask must be the same size as the input image.
  # "mask": ("mask.png", open("mask.png", "rb"), "image/png"),
}
edit_response = requests.post(
  edit_url,
  headers={'Api-Key': subscription_key},
  data=edit_body,
  files=files
).json()
save_response(edit_response, "edited_image")