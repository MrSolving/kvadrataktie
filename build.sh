#!/bin/bash
set -e
echo "==> Installerar server-beroenden..."
cd server && npm ci && cd ..

echo "==> Installerar och bygger klient..."
cd client && npm ci && npm run build && cd ..

echo "==> Bygget klart."
