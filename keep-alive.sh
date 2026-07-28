#!/bin/bash
# Keep-alive wrapper for Next.js server
cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js production server..."
  npx next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done