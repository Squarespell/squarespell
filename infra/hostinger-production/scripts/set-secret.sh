#!/usr/bin/env bash
# Set or check ONE value in the protected PRODUCTION env file WITHOUT echoing it or putting it on a command line.
# Usage: set-secret.sh NAME            prompts silently; paste the value and press Enter
#        set-secret.sh --check NAME    prints only: set/empty, length and a known public prefix (never the value)
# NAME must already exist in the file. Run as the deployment user (squarespell).
set -euo pipefail
umask 077
ENV=/opt/squarespell-quiz/production/.env
[ -f "$ENV" ] || { echo "missing $ENV"; exit 1; }

known_prefix() {
  case "$1" in
    pk_live_*) echo pk_live_;; pk_test_*) echo pk_test_;; sk_live_*) echo sk_live_;; sk_test_*) echo sk_test_;;
    rk_live_*) echo rk_live_;; rk_test_*) echo rk_test_;; sk-ant-*) echo sk-ant-;; re_*) echo re_;; whsec_*) echo whsec_;;
    price_*) echo price_;; *) echo other;;
  esac
}

if [ "${1:-}" = "--check" ]; then
  NAME="${2:?usage: set-secret.sh --check NAME}"
  grep -q "^$NAME=" "$ENV" || { echo "unknown variable: $NAME"; exit 1; }
  VALUE="$(grep -m1 "^$NAME=" "$ENV" | cut -d= -f2-)"
  if [ -z "$VALUE" ]; then echo "$NAME: EMPTY"; else echo "$NAME: set, length ${#VALUE}, prefix $(known_prefix "$VALUE")"; fi
  exit 0
fi

NAME="${1:?usage: set-secret.sh NAME}"
grep -q "^$NAME=" "$ENV" || { echo "unknown variable: $NAME"; exit 1; }
read -rs -p "Value for $NAME (hidden): " VALUE; echo
[ -n "$VALUE" ] || { echo "empty; nothing changed"; exit 1; }
case "$VALUE" in *"|"*|*$'\n'*) echo "value contains a character this helper cannot store safely"; exit 1;; esac

need_prefix() { case "$VALUE" in $1) ;; *) echo "REFUSED: $NAME must start with $1"; exit 1;; esac; }
case "$NAME" in
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) need_prefix 'pk_live_*';;
  CLERK_SECRET_KEY) need_prefix 'sk_live_*';;
  STRIPE_WEBHOOK_SECRET) need_prefix 'whsec_*';;
  ANTHROPIC_API_KEY) need_prefix 'sk-ant-*';;
  RESEND_API_KEY) need_prefix 're_*';;
  STRIPE_SECRET_KEY)
    case "$VALUE" in
      sk_live_*|rk_live_*)
        grep -Eq '^STRIPE_LIVE_AUTHORISED=yes$' "$ENV" || { echo "REFUSED: live Stripe key needs STRIPE_LIVE_AUTHORISED=yes (owner-set) in the env file"; exit 1; };;
      sk_test_*|rk_test_*) ;;
      *) echo "REFUSED: STRIPE_SECRET_KEY must be a Stripe secret or restricted key"; exit 1;;
    esac;;
esac

TMP="$(mktemp "$ENV.XXXXXX")"
SECRET_VALUE="$VALUE" awk -v n="$NAME" 'BEGIN{FS=OFS="="} $1==n {print n "=" ENVIRON["SECRET_VALUE"]; next} {print}' "$ENV" > "$TMP"
chmod 600 "$TMP"
mv "$TMP" "$ENV"
echo "$NAME updated (mode $(stat -c %a "$ENV"))"
