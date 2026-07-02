#!/usr/bin/env bash
# Regenerate IDA press release PDF from HTML source.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML="${SCRIPT_DIR}/press-release-pl.html"
PDF="${SCRIPT_DIR}/IDA-press-release-pl.pdf"

CHROME=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Error: Chrome/Chromium not found. Open press-release-pl.html and print to PDF manually." >&2
  exit 1
fi

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --user-data-dir="/tmp/ida-chrome-pdf-$$" \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=10000 \
  --print-to-pdf="${PDF}" \
  "file://${HTML}"

echo "Generated: ${PDF}"
