#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:8790}"
CLIENT_URL="${CLIENT_URL:-http://localhost:5173}"

pass_count=0
fail_count=0
gateway_health_code=""
client_code=""

check_get() {
  local label="$1"
  local url="$2"
  local out_var="$3"
  local code

  code="$(curl -sS -o /dev/null -m 8 -w "%{http_code}" "$url" || true)"
  printf -v "$out_var" '%s' "${code:-000}"

  if [[ "$code" =~ ^(2|3) ]]; then
    echo "[ok]   $label -> $url (HTTP $code)"
    pass_count=$((pass_count + 1))
    return 0
  fi

  echo "[fail] $label -> $url (HTTP ${code:-000})"
  fail_count=$((fail_count + 1))
}

check_get "Client" "$CLIENT_URL" client_code
check_get "Gateway health" "$GATEWAY_URL/health" gateway_health_code
hotels_code=""
check_get "Hotels list" "$GATEWAY_URL/api/hotels?limit=1" hotels_code

# Optional auth smoke check when seeded users are available.
LOGIN_EMAIL="${LOGIN_EMAIL:-superadmin@hotel.local}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-SuperAdmin@123}"
if curl -fsS -m 8 -X POST "$GATEWAY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}" >/dev/null; then
  echo "[ok]   Auth login -> $LOGIN_EMAIL"
  pass_count=$((pass_count + 1))
else
  echo "[fail] Auth login -> $LOGIN_EMAIL"
  fail_count=$((fail_count + 1))
fi

echo ""
echo "Healthcheck summary: $pass_count passed, $fail_count failed"

if [ "$fail_count" -gt 0 ]; then
  gateway_port="${GATEWAY_URL##*:}"
  gateway_port="${gateway_port%%/*}"

  if [ "$gateway_health_code" = "404" ]; then
    echo "[hint] Gateway returned 404 on /health. Another app may be bound to port ${gateway_port}."
    echo "[hint] Set GATEWAY_PORT to a free port and restart."
  fi

  if [ "$gateway_health_code" = "000" ] || [ "$client_code" = "000" ]; then
    if ! docker info >/dev/null 2>&1; then
      echo "[hint] Docker daemon is not running. Start Docker Desktop first."
    fi
  fi

  exit 1
fi
