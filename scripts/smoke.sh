#!/usr/bin/env bash
# Drives the admin panel over HTTP: login, then inspect the /admin Inertia payload.
# Usage: php artisan serve --port=8321 &  then  bash scripts/smoke.sh
set -u
BASE=${BASE:-http://127.0.0.1:8321}
J=/tmp/zk-cookies.txt
rm -f "$J"

for _ in $(seq 1 30); do
  curl -s -o /dev/null "$BASE/login" && break
  sleep 0.3
done

echo "--- 1. GET /login ---"
curl -s -c "$J" -b "$J" "$BASE/login" -o /tmp/login.html -w "status=%{http_code}\n"

TOKEN=$(awk '/XSRF-TOKEN/ {print $7}' "$J" | python3 -c 'import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))')
echo "xsrf-token-len=${#TOKEN}"

echo "--- 2. POST /login ---"
curl -s -c "$J" -b "$J" -X POST "$BASE/login" \
  -H "X-XSRF-TOKEN: $TOKEN" \
  -d "email=admin@zksports.test" -d "password=password" \
  -o /tmp/post.html -w "status=%{http_code} redirect=%{redirect_url}\n"

echo "--- 3. GET /admin (Inertia JSON) ---"
curl -s -c "$J" -b "$J" "$BASE/admin" \
  -H "X-Inertia: true" \
  -o /tmp/admin.json -w "status=%{http_code}\n"
python3 -m json.tool /tmp/admin.json 2>/dev/null | head -40 || head -c 600 /tmp/admin.json

echo "--- 4. GET /admin (full HTML) ---"
curl -s -c "$J" -b "$J" "$BASE/admin" -o /tmp/admin.html -w "status=%{http_code} bytes=%{size_download}\n"
echo "theme-boot-script-hits: $(grep -c 'zk-appearance' /tmp/admin.html)"
echo "inertia-root-hits: $(grep -c 'id=.app.' /tmp/admin.html)"
