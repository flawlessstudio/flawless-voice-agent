#!/usr/bin/env bash
# setup.sh — First-time project setup
# Usage: bash scripts/setup.sh

set -euo pipefail

echo "🔧 Flawless Voice Agent — Setup"
echo "================================"

# 1. Check Node version
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Current: $(node -v 2>/dev/null || echo 'not found')"
  echo "   Install via: nvm install 20 && nvm use 20"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 2. Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env created from .env.example — fill in your API keys"
else
  echo "ℹ️  .env already exists — skipping"
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm ci
echo "✅ Dependencies installed"

# 4. Build
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"

# 5. Run tests
echo "🧪 Running tests..."
npm test -- --passWithNoTests
echo "✅ Tests passed"

echo ""
echo "✅ Setup complete!"
echo "Next steps:"
echo "  1. Edit .env with your real API keys"
echo "  2. Start ngrok: ngrok http 5050"
echo "  3. Set PUBLIC_URL in .env"
echo "  4. Configure Twilio webhook to: https://your-ngrok-url/incoming-call"
echo "  5. Run: npm run dev"
