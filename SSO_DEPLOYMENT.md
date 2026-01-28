# SSO Worker Deployment Guide

The SSO handoff worker is a **separate Cloudflare Worker** from the main Vibe application. It handles the Flexi → Vibe authentication handoff.

## Architecture

```
Main Vibe App (this worker)           SSO Handoff Worker (separate)
├── Frontend (React)                  ├── JWT Verification (RS256)
├── API Routes                        ├── Session Cookie (HS256)
├── Authentication                    ├── Replay Prevention
└── Code Generation                   └── Protected Route Proxy
```

## Quick Deploy

### 1. Navigate to SSO Directory

```bash
cd worker/sso
```

### 2. Create D1 Database

```bash
# Create database
wrangler d1 create vibe-sso-db

# Update database ID in wrangler.toml
# Replace: database_id = "your-database-id-here"
```

### 3. Set Secrets

```bash
# Generate secure secret
openssl rand -base64 32

# Set in Cloudflare
wrangler secret put VIBE_ACCESS_SECRET
# Paste the generated secret when prompted
```

### 4. Update Configuration

Edit `wrangler.toml` and update:
- `database_id` - Your D1 database ID
- `FLEXI_JWKS_URL` - Your Flexi JWKS endpoint
- Route pattern for production domain

### 5. Run Migrations

```bash
# Development
wrangler dev

# In another terminal
curl http://localhost:8787/migrate

# Production (temporarily set ALLOW_MIGRATE=true)
wrangler deploy
curl https://proxyserverless.flexifunnels.com/migrate
# Then set ALLOW_MIGRATE=false in wrangler.toml
```

### 6. Add Test Users

```bash
wrangler d1 execute vibe-sso-db --command "
  INSERT INTO sso_users (email, user_id, status, roles)
  VALUES
    ('karthik@flexifunnels.com', 'usr_001', 'active', 'admin'),
    ('test@flexifunnels.com', 'usr_002', 'active', 'viewer')
"
```

### 7. Deploy

```bash
wrangler deploy
```

## Environment Variables

Required in `wrangler.toml`:

```toml
FLEXI_JWKS_URL = "https://api.flexifunnels.com/.well-known/jwks.json"
FLEXI_ISS = "flexi"
FLEXI_AUD = "vibe-handoff"

VIBE_ISS = "vibe-edge"
VIBE_AUD = "vibe-app"

VIBE_COOKIE_NAME = "vibe_access"
VIBE_COOKIE_DOMAIN = ".proxyserverless.flexifunnels.com"

PROTECTED_PREFIX = "/app/"
VIBE_ORIGIN = "https://proxyserverless.flexifunnels.com"
```

Required secrets (via `wrangler secret put`):
- `VIBE_ACCESS_SECRET` - HS256 signing secret

## Testing

### 1. Health Check

```bash
curl https://proxyserverless.flexifunnels.com/auth/health
# Expected: {"ok":true}
```

### 2. SSO Handoff (requires valid Flexi JWT)

```bash
curl -X POST https://proxyserverless.flexifunnels.com/auth/vibe-access \
  -H 'Origin: https://flexifunnels.com' \
  -H 'Content-Type: application/json' \
  -d '{
    "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "user@flexifunnels.com"
  }' \
  -i

# Expected: 204 No Content with Set-Cookie header
```

### 3. Get Current User

```bash
curl https://proxyserverless.flexifunnels.com/auth/me \
  --cookie "vibe_access=eyJhbGc..."

# Expected: {"user_id":"usr_001","email":"user@flexifunnels.com","roles":"admin"}
```

### 4. Protected Route

```bash
curl https://proxyserverless.flexifunnels.com/app/dashboard \
  --cookie "vibe_access=eyJhbGc..." \
  -v

# Expected: Proxied to main Vibe app with X-User-* headers
```

## Integration with Main Vibe App

The SSO worker is **independent** from the main Vibe app at the root directory.

### Main App (`/`)
- Uses `wrangler.jsonc` at project root
- Handles frontend, API, code generation
- Accessed at: `https://build.cloudflare.dev` or `http://localhost:5174`

### SSO Worker (`/worker/sso`)
- Uses `worker/sso/wrangler.toml`
- Handles Flexi authentication handoff
- Accessed at: `https://proxyserverless.flexifunnels.com`

### Protected Routes Flow

1. User authenticated via SSO → gets `vibe_access` cookie
2. User accesses `/app/*` on SSO worker domain
3. SSO worker verifies cookie, adds user headers
4. Request proxied to main Vibe app with context

## Frontend Integration (Flexi Side)

```typescript
// Button click handler on flexifunnels.com
async function accessVibe() {
  const userJwt = getCurrentUserJWT(); // Your Flexi JWT
  const email = getCurrentUserEmail();

  const response = await fetch(
    'https://proxyserverless.flexifunnels.com/auth/vibe-access',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jwt: userJwt, email }),
    }
  );

  if (response.status === 204) {
    // Success - redirect to Vibe app
    window.location.href = 'https://proxyserverless.flexifunnels.com/app/';
  } else {
    const error = await response.json();
    console.error('SSO failed:', error);
  }
}
```

## Monitoring

### Check Active Sessions

```bash
wrangler d1 execute vibe-sso-db --command "
  SELECT email, user_id, status, roles
  FROM sso_users
  WHERE status = 'active'
"
```

### Check Replay Prevention

```bash
wrangler d1 execute vibe-sso-db --command "
  SELECT jti, datetime(seen_at, 'unixepoch') as seen_time
  FROM jwt_seen
  ORDER BY seen_at DESC
  LIMIT 10
"
```

### Clean Old JTIs

```bash
# Delete JTIs older than 24 hours
wrangler d1 execute vibe-sso-db --command "
  DELETE FROM jwt_seen
  WHERE seen_at < unixepoch('now', '-1 day')
"
```

## Troubleshooting

### "Invalid JWT signature"
- Verify `FLEXI_JWKS_URL` is accessible
- Check JWT is RS256 algorithm
- Ensure JWT hasn't expired

### "User not allowed"
- Add user to `sso_users` table:
  ```bash
  wrangler d1 execute vibe-sso-db --command "
    INSERT INTO sso_users (email, user_id, status, roles)
    VALUES ('newuser@flexifunnels.com', 'usr_new', 'active', 'viewer')
  "
  ```

### "Cookie not set"
- Check CORS: Origin must be `flexifunnels.com` or `www.flexifunnels.com`
- Verify `credentials: 'include'` in fetch
- Check cookie domain matches your setup

### "Replay detected"
- JWT has already been used (security feature)
- Generate new JWT from Flexi
- Check `jwt_seen` table:
  ```bash
  wrangler d1 execute vibe-sso-db --command "
    SELECT * FROM jwt_seen WHERE jti = 'your-jti-here'
  "
  ```

## Security Checklist

- [x] CORS restricted to Flexi origins
- [x] RS256 JWT signature verification via JWKS
- [x] Replay prevention with JTI tracking
- [x] Short-lived cookies (10 min)
- [x] HttpOnly, Secure, SameSite=Lax cookies
- [x] Email claim validation
- [x] User status check (suspended users blocked)
- [x] iss, aud, exp, nbf claim validation

## Directory Structure

```
worker/sso/
├── index.ts           # Main worker entry
├── types.ts           # TypeScript types
├── jose.ts            # JWT verification/signing
├── cookies.ts         # Cookie utilities
├── db.ts              # D1 database helpers
├── wrangler.toml      # Worker configuration
└── README.md          # Detailed API docs
```

## Related Documentation

- Full API documentation: [worker/sso/README.md](worker/sso/README.md)
- Main Vibe app: [README.md](../../README.md)
- External OAuth integration: [EXTERNAL_AUTH_INTEGRATION.md](../../EXTERNAL_AUTH_INTEGRATION.md)
