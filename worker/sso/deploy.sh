#!/bin/bash
# SSO Worker Deployment Script
# This script deploys the Vibe SSO worker to production

set -e  # Exit on error

echo "🚀 Deploying Vibe SSO Worker to Production"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found!"
    echo "   Please run this script from the worker/sso directory"
    exit 1
fi

# Check if secret is set
echo "🔐 Checking production secrets..."
echo ""
echo "⚠️  Make sure you've set VIBE_ACCESS_SECRET:"
echo "   wrangler secret put VIBE_ACCESS_SECRET --env production"
echo ""
read -p "Have you set the production secret? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please set the secret first:"
    echo "  wrangler secret put VIBE_ACCESS_SECRET --env production"
    echo ""
    exit 1
fi

echo ""
echo "📦 Deploying to production environment..."
echo ""

# Deploy to production
wrangler deploy --env production

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Add DNS record for sso.flexifunnels.com (if not done)"
echo "   2. Run migrations: curl https://sso.flexifunnels.com/migrate"
echo "   3. Add test users to database"
echo "   4. Test SSO flow"
echo ""
echo "🔗 Your SSO endpoint:"
echo "   https://sso.flexifunnels.com/auth/vibe-access"
echo ""
echo "🔍 Check deployment:"
echo "   https://dash.cloudflare.com/"
echo ""
