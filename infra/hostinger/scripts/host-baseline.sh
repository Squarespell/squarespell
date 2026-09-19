#!/usr/bin/env bash
# Squarespell Quiz - Hostinger VPS security baseline (Ubuntu 24.04 LTS). Run once as root; safe to re-run.
# It does NOT disable root login or password SSH: do that only after key-based access for the
# deployment user has been tested (see RUNBOOK.md). It never prints secrets.
# Optional: SQUARESPELL_PUBKEY='ssh-ed25519 AAAA... comment' installs a PUBLIC key for the deploy user.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
WANT_HOST=squarespell-quiz-us-1
DEPLOY_USER=squarespell
BASE=/srv/squarespell-quiz

echo "== hostname and time (UTC) =="
hostnamectl set-hostname "$WANT_HOST"
grep -q "^127.0.1.1 $WANT_HOST" /etc/hosts || echo "127.0.1.1 $WANT_HOST" >> /etc/hosts
timedatectl set-timezone UTC
timedatectl set-ntp true

echo "== updates =="
apt-get update -y
apt-get -y upgrade
apt-get install -y ca-certificates curl gnupg git ufw fail2ban unattended-upgrades apt-listchanges openssl jq

echo "== automatic security updates =="
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

echo "== firewall: only 22, 80, 443 =="
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "== fail2ban (sshd) =="
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "== Docker Engine + Compose plugin =="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "local", "log-opts": { "max-size": "20m", "max-file": "5" }, "live-restore": true }
EOF
systemctl enable --now docker
systemctl restart docker

echo "== deployment user and directories =="
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
if [ -n "${SQUARESPELL_PUBKEY:-}" ]; then
  grep -qxF "$SQUARESPELL_PUBKEY" "/home/$DEPLOY_USER/.ssh/authorized_keys" || echo "$SQUARESPELL_PUBKEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$BASE" "$BASE/staging"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$BASE/backups"

echo "== summary =="
echo "hostname : $(hostname)"
timedatectl | grep -E 'Time zone|synchronized'
docker --version
docker compose version
ufw status verbose | sed -n '1,12p'
fail2ban-client status sshd | sed -n '1,8p'
systemctl is-active unattended-upgrades docker fail2ban
ls -ld "$BASE" "$BASE/staging" "$BASE/backups"
echo "Root and password SSH access were left unchanged."
