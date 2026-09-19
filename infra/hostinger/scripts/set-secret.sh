#!/usr/bin/env bash
# Set one value in the protected staging env file WITHOUT echoing it or putting it on a command line.
# Usage: set-secret.sh NAME          (prompts silently; paste the value, press Enter)
# NAME must already exist in the file. Run as the deployment user (squarespell).
set -euo pipefail
umask 077
ENV=/srv/squarespell-quiz/staging/.env
NAME="${1:?usage: set-secret.sh NAME}"
[ -f "$ENV" ] || { echo "run gen-env.sh first"; exit 1; }
grep -q "^$NAME=" "$ENV" || { echo "unknown variable: $NAME"; exit 1; }
read -rs -p "Value for $NAME (hidden): " VALUE; echo
[ -n "$VALUE" ] || { echo "empty; nothing changed"; exit 1; }
case "$NAME" in
  STRIPE_SECRET_KEY)
    case "$VALUE" in sk_live_*|rk_live_*) echo "REFUSED: live Stripe keys are not allowed on staging"; exit 1;; esac;;
esac
case "$VALUE" in *"|"*|*$'\n'*) echo "value contains a character this helper cannot store safely"; exit 1;; esac
TMP="$(mktemp "$ENV.XXXXXX")"
awk -v n="$NAME" -v v="$VALUE" 'BEGIN{FS=OFS="="} $1==n {print n "=" v; next} {print}' "$ENV" > "$TMP"
chmod 600 "$TMP"; mv "$TMP" "$ENV"
echo "$NAME updated (mode $(stat -c %a "$ENV"))"
