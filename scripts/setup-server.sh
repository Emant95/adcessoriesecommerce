#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu/Debian server (e.g. a DigitalOcean droplet or AWS EC2).
# Installs Docker Engine + Compose plugin and opens the firewall for web traffic.
# Usage: sudo ./scripts/setup-server.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  apt-get update
  apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
fi

if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "Added $SUDO_USER to the docker group (log out and back in for it to apply)."
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

docker --version
docker compose version
echo "Server ready. Next: ./scripts/deploy.sh"
