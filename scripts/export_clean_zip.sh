#!/usr/bin/env bash
# Creates a clean distribution ZIP archive of Traceforge
# Excludes .venv, node_modules, .git, and temporary caches

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_FILE="${ROOT_DIR}/traceforge-clean.zip"

echo "Creating clean archive at: ${OUTPUT_FILE}..."

cd "${ROOT_DIR}"

# Remove existing archive if present
rm -f "${OUTPUT_FILE}"

# Use zip excluding transient and virtual environment folders
zip -r "${OUTPUT_FILE}" . \
    -x "*.git*" \
    -x "*.venv*" \
    -x "*venv*" \
    -x "*node_modules*" \
    -x "*__pycache__*" \
    -x "*.pytest_cache*" \
    -x "*.db*" \
    -x "*.DS_Store*" \
    -x "*.zip"

echo "Success! Clean archive created:"
ls -lh "${OUTPUT_FILE}"
