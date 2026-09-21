#!/usr/bin/env bash
# Set the production site password (HTTP basic auth) WITHOUT ever showing, logging or committing it.
# Prompts for a username and a password with hidden input, hashes the password with Caddy (bcrypt) and stores ONLY the username and the
# hash in the protected server env file (/opt/squarespell-quiz/edge.env, mode 600). Run as root on the server, then recreate the edge:
#   docker compose --env-file /opt/squarespell-quiz/edge.env -f infra/hostinger-edge/docker-compose.edge.yml up -d
# Switch it off (keeping the stored credentials) by setting SITE_AUTH_ENABLED=false in that file.
set -euo pipefail
umask 077
E=/opt/squarespell-quiz/edge.env
[ -f "$E" ] || { echo "missing $E"; exit 1; }
read -rp "Username for the site password: " U
read -rsp "Password (hidden, at least 12 characters): " P1; echo
read -rsp "Repeat password (hidden): " P2; echo
[ -n "$U" ] && [ -n "$P1" ] && [ "$P1" = "$P2" ] || { echo "empty or not matching; nothing changed"; exit 1; }
case "$U" in *[!A-Za-z0-9._-]*) echo "the username may only contain letters, digits, dot, underscore and dash"; exit 1;; esac
[ "${#P1}" -ge 12 ] || { echo "use at least 12 characters; nothing changed"; exit 1; }
# The plaintext is passed through an environment variable of a throwaway container, never on a command line.
HASH="$(PW="$P1" docker run --rm -e PW caddy:2.8 sh -c 'caddy hash-password --plaintext "$PW"')"
unset P1 P2
case "$HASH" in '$2a$'*) ;; *) echo "hashing failed; nothing changed"; exit 1;; esac
grep -v '^SITE_AUTH_' "$E" > "$E.new" || true
printf "SITE_AUTH_ENABLED=true\nSITE_AUTH_USER=%s\nSITE_AUTH_HASH='%s'\n" "$U" "$HASH" >> "$E.new"
mv "$E.new" "$E"; chmod 600 "$E"
echo "stored: username set, password hash length ${#HASH}, mode $(stat -c %a "$E")"
