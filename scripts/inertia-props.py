"""Print the Inertia page payload embedded in a rendered HTML response.

Usage: python3 scripts/inertia-props.py /tmp/admin.html
"""

import html
import json
import re
import sys

doc = open(sys.argv[1], encoding="utf-8").read()

# Inertia 3 embeds the payload in a script tag, not a div attribute.
match = re.search(
    r'<script[^>]*data-page="app"[^>]*>(.*?)</script>', doc, re.S
)
if not match:
    sys.exit("no data-page script found — is @inertia rendering?")

page = json.loads(html.unescape(match.group(1)))

print("component :", page["component"])
print("url       :", page["url"])
print("props     :")
print(json.dumps(page["props"], indent=2))
