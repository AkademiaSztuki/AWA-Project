#!/usr/bin/env bash
# Regenerate IDA press release PDFs from HTML sources.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CHROME=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Error: Chrome/Chromium not found. Open press-release-*.html and print to PDF manually." >&2
  exit 1
fi

generate_pdf() {
  local lang="$1"
  local html="${SCRIPT_DIR}/press-release-${lang}.html"
  local pdf="${SCRIPT_DIR}/IDA-press-release-${lang}.pdf"
  local user_data_dir
  user_data_dir="$(mktemp -d /tmp/ida-chrome-pdf-${lang}-XXXXXX)"

  timeout 30s "$CHROME" \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --disable-dev-shm-usage \
    --no-first-run \
    --user-data-dir="${user_data_dir}" \
    --print-to-pdf="${pdf}" \
    "file://${html}" \
    2>/dev/null || true

  rm -rf "${user_data_dir}"

  if [[ ! -s "${pdf}" ]]; then
    echo "Error: failed to generate ${pdf}" >&2
    exit 1
  fi

  echo "Generated: ${pdf}"
}

generate_pdf "pl"
sleep 1
generate_pdf "en"
