#!/usr/bin/env bash
# Create the protected staging env file and generate the internal secrets directly into it.
# Run as the deployment user (squarespell). Values are never printed. Does not overwrite an existing file.
set -euo pipefail
umask 077
ROOT=/srv/squarespell-quiz/staging
ENV="$ROOT/.env"
EXAMPLE="$(cd "$(dirname "$0")/.." && pwd)/.env.staging.example"

if [ -e "$ENV" ]; then echo ".env already exists; not overwriting"; exit 0; fi
[ -f "$EXAMPLE" ] || { echo "missing $EXAMPLE"; exit 1; }
install -m 600 "$EXAMPLE" "$ENV"

hex() { openssl rand -hex "$1"; }
b64u() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
setv() { sed -i "s|^$1=.*|$1=$2|" "$ENV"; }

JWT_SECRET="$(hex 32)"
now="$(date +%s)"; exp=$((now + 315360000))
hdr="$(printf '{"alg":"HS256","typ":"JWT"}' | b64u)"
pl="$(printf '{"role":"service_role","iss":"squarespell-staging","iat":%s,"exp":%s}' "$now" "$exp" | b64u)"
sig="$(printf '%s.%s' "$hdr" "$pl" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | b64u)"

setv POSTGRES_PASSWORD "$(hex 24)"
setv AUTHENTICATOR_PASSWORD "$(hex 24)"
setv PGRST_JWT_SECRET "$JWT_SECRET"
setv SUPABASE_SERVICE_ROLE_KEY "$hdr.$pl.$sig"
setv ENCRYPTION_KEY "$(hex 32)"
setv REPORT_SECRET "$(hex 24)"
setv CRON_SECRET "$(hex 24)"

chmod 600 "$ENV"
echo "created $ENV (mode $(stat -c %a "$ENV")); generated: POSTGRES_PASSWORD AUTHENTICATOR_PASSWORD PGRST_JWT_SECRET SUPABASE_SERVICE_ROLE_KEY ENCRYPTION_KEY REPORT_SECRET CRON_SECRET"
echo "still to set with scripts/set-secret.sh: ACME_EMAIL and the Clerk / Stripe (test) / AI / email values"
