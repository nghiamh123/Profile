#!/usr/bin/env bash
# Deploy nghiadang.site to the VPS.
#
# Only writes inside $DEST on the server — other sites on the VPS are never touched.
# Usage:
#   ./deploy/deploy.sh             # upload the site
#   DRY_RUN=1 ./deploy/deploy.sh   # build the bundle locally and list it, no upload
#   DEPLOY_HOST=user@1.2.3.4 ./deploy/deploy.sh
set -euo pipefail

HOST="${DEPLOY_HOST:-nghia@103.200.20.41}"
DEST="/var/www/nghiadang.site"
# Offer only this key: the VPS runs fail2ban, and every extra key ssh tries counts as a failure.
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
SSH_CMD="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes"
FA="font/fontawesome-free-5.15.4-web"

cd "$(dirname "$0")/.."

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# Copy only what the page actually uses (no .claude/, .agents/, old images, root CV copies…)
cp index.html "$STAGE/"
cp -R style js cv "$STAGE/"
mkdir -p "$STAGE/images" "$STAGE/$FA/css"
cp -R images/work "$STAGE/images/"
cp images/logo.svg images/favicon.svg images/favicon-48.png images/apple-touch-icon.png "$STAGE/images/"
cp "$FA/css/all.min.css" "$STAGE/$FA/css/"
cp -R "$FA/webfonts" "$STAGE/$FA/"
find "$STAGE" -name '.DS_Store' -delete
# Set web-readable permissions here (macOS openrsync has no --chmod); rsync -a keeps them.
find "$STAGE" -type d -exec chmod 755 {} +
find "$STAGE" -type f -exec chmod 644 {} +

echo "Bundle: $(du -sh "$STAGE" | cut -f1), $(find "$STAGE" -type f | wc -l | tr -d ' ') files"

if [ "${DRY_RUN:-0}" = "1" ]; then
  (cd "$STAGE" && find . -type f | sort)
  exit 0
fi

# --delete is scoped to $DEST only, so stale files of this site are removed and nothing else.
rsync -az --delete -e "$SSH_CMD" "$STAGE/" "$HOST:$DEST/"
echo "Deployed to $HOST:$DEST"
