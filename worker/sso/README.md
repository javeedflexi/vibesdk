# SSO Handoff Worker

Minimal SSO implementation for Flexi → Vibe handoff using JWT verification and session cookies.

## Architecture

```
flexifunnels.com (user logged in)
     ↓
POST /auth/vibe-access { jwt, email }
     ↓
Verify Flexi JWT (RS256 via JWKS)
     ↓
Create Vibe session cookie (HS256)
     ↓
Redirect to /app/* (protected routes)
```

## Setup

### 1. Create D1 Database

```bash
# Create database
wrangler d1 create vibe-sso-db

# Copy the database ID to wrangler.toml
# Update: database_id = "your-database-id-here"
```

### 2. Set Secrets

```bash
# Generate a secure random secret
openssl rand -base64 32

# Set the secret
wrangler secret put VIBE_ACCESS_SECRET
# Paste the generated secret
```

### 3. Run Migrations

```bash
# Development
wrangler dev

# Run migration endpoint
curl http://localhost:8787/migrate

# Production (after setting ALLOW_MIGRATE=true)
curl https://proxyserverless.flexifunnels.com/migrate
# Then set ALLOW_MIGRATE=false again
```

### 4. Add Test User

```bash
wrangler d1 execute vibe-sso-db --command "
  INSERT INTO sso_users (email, user_id, status, roles)
  VALUES ('user@flexifunnels.com', 'usr_123', 'active', 'admin,viewer')
"
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FLEXI_JWKS_URL` | Flexi JWKS endpoint | `https://api.flexifunnels.com/.well-known/jwks.json` |
| `FLEXI_ISS` | Expected issuer | `flexi` |
| `FLEXI_AUD` | Expected audience | `vibe-handoff` |
| `VIBE_ISS` | Vibe token issuer | `vibe-edge` |
| `VIBE_AUD` | Vibe token audience | `vibe-app` |
| `VIBE_ACCESS_SECRET` | Secret for signing Vibe tokens (secret) | Use `wrangler secret put` |
| `VIBE_COOKIE_NAME` | Cookie name | `vibe_access` |
| `VIBE_COOKIE_DOMAIN` | Cookie domain | `.proxyserverless.flexifunnels.com` |
| `PROTECTED_PREFIX` | Protected route prefix | `/app/` |
| `VIBE_ORIGIN` | Origin for proxying | `https://proxyserverless.flexifunnels.com` |
| `ALLOW_MIGRATE` | Enable migrations | `false` (set `true` only when migrating) |

## API Endpoints

### POST /auth/vibe-access

**Request:**
```bash
curl -X POST https://proxyserverless.flexifunnels.com/auth/vibe-access \
  -H 'Origin: https://flexifunnels.com' \
  -H 'Content-Type: application/json' \
  -d '{
    "jwt": "eyJhbGc...",
    "email": "user@flexifunnels.com"
  }' \
  -i
```

**Success (204):**
```
HTTP/1.1 204 No Content
Set-Cookie: vibe_access=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Domain=.proxyserverless.flexifunnels.com; Path=/; Max-Age=600
```

**Errors:**
- `400 INVALID_BODY` - Missing jwt or email
- `401 JWT_INVALID` - Invalid JWT signature or claims
- `401 EMAIL_MISMATCH` - Email doesn't match JWT
- `403 USER_NOT_ALLOWED` - User not in database
- `403 USER_SUSPENDED` - User account suspended
- `409 REPLAYED_JTI` - JWT already used (replay attack)

### GET /auth/me

Get current user info from session cookie.

**Request:**
```bash
curl https://proxyserverless.flexifunnels.com/auth/me \
  --cookie "vibe_access=eyJhbGc..."
```

**Response:**
```json
{
  "user_id": "usr_123",
  "email": "user@flexifunnels.com",
  "roles": "admin,viewer"
}
```

### POST /auth/logout

Clear session cookie.

**Request:**
```bash
curl -X POST https://proxyserverless.flexifunnels.com/auth/logout \
  --cookie "vibe_access=eyJhbGc..."
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out"
}
```

### GET /auth/health

Health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

### GET /migrate

Run database migrations (requires `ALLOW_MIGRATE=true`).

## Protected Routes

All routes under `/app/*` require authentication. The worker:

1. Verifies the `vibe_access` cookie
2. Adds user context headers:
   - `X-User-Id`: User ID
   - `X-User-Email`: User email
   - `X-User-Roles`: User roles
3. Proxies the request to `VIBE_ORIGIN`

**Example:**
```bash
# Authenticated request
curl https://proxyserverless.flexifunnels.com/app/dashboard \
  --cookie "vibe_access=eyJhbGc..."

# Gets proxied to:
# https://proxyserverless.flexifunnels.com/app/dashboard
# With headers:
#   X-User-Id: usr_123
#   X-User-Email: user@flexifunnels.com
#   X-User-Roles: admin,viewer
```

## Frontend Integration

### TypeScript/JavaScript Example

```typescript
// On flexifunnels.com - user clicks "Access Vibe"
async function accessVibe(userJwt: string, email: string) {
  try {
    const response = await fetch(
      'https://proxyserverless.flexifunnels.com/auth/vibe-access',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ jwt: userJwt, email }),
      }
    );

    if (response.status === 204) {
      // Success - cookie is set, redirect to app
      window.location.href = 'https://proxyserverless.flexifunnels.com/app/';
    } else {
      const error = await response.json();
      console.error('SSO failed:', error);
      alert(`Authentication failed: ${error.error}`);
    }
  } catch (error) {
    console.error('SSO request failed:', error);
  }
}

// React example
function AccessVibeButton({ userJwt, email }: { userJwt: string; email: string }) {
  const handleClick = async () => {
    await accessVibe(userJwt, email);
  };

  return <button onClick={handleClick}>Access Vibe Now</button>;
}
```

## Security Features

1. **CORS Protection**: Only allows requests from `flexifunnels.com` and `www.flexifunnels.com`
2. **JWT Verification**: RS256 signature verification using JWKS
3. **Replay Prevention**: JTI tracking in database
4. **Short-lived Cookies**: 10-minute TTL (600 seconds)
5. **Secure Cookies**: HttpOnly, Secure, SameSite=Lax
6. **Claim Validation**: iss, aud, exp, nbf, email
7. **User Status Check**: Suspended users rejected

## Development

### Run Locally

```bash
wrangler dev --local
```

### Test with cURL

```bash
# 1. Get a test JWT from Flexi (or create a mock one)
JWT="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Test SSO handoff
curl -X POST http://localhost:8787/auth/vibe-access \
  -H 'Origin: https://flexifunnels.com' \
  -H 'Content-Type: application/json' \
  -d "{\"jwt\":\"$JWT\",\"email\":\"user@flexifunnels.com\"}" \
  -i

# 3. Extract cookie and test /auth/me
COOKIE="vibe_access=eyJhbGc..."
curl http://localhost:8787/auth/me \
  --cookie "$COOKIE"

# 4. Test protected route
curl http://localhost:8787/app/dashboard \
  --cookie "$COOKIE" \
  -v
```

## Deployment

```bash
# Deploy to production
wrangler deploy

# Deploy to specific environment
wrangler deploy --env production
```

## Troubleshooting

### "Invalid JWT signature"
- Verify JWKS URL is correct and accessible
- Check JWT algorithm is RS256
- Ensure JWT hasn't expired

### "User not allowed"
- Add user to `sso_users` table
- Verify email matches exactly

### "Cookie not set"
- Check CORS headers in response
- Verify `credentials: 'include'` in fetch
- Check cookie domain matches

### "Replay detected"
- JWT has been used before
- Check JTI in `jwt_seen` table
- Generate a new JWT from Flexi

## Database Schema

```sql
-- Users table
CREATE TABLE sso_users (
  email TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  roles TEXT NOT NULL DEFAULT 'viewer',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Replay prevention
CREATE TABLE jwt_seen (
  jti TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

## License

Internal use only - Flexifunnels/Vibe SSO integration.
