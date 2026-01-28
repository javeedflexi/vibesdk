/**
 * SSO Type Definitions
 */

export interface FlexiJWTPayload {
	iss: string;
	aud: string;
	sub: string;
	email: string;
	exp: number;
	nbf?: number;
	iat?: number;
	jti?: string;
}

export interface VibeAccessPayload {
	iss: string;
	aud: string;
	sub: string; // user_id
	email: string;
	roles: string;
	exp: number;
	iat: number;
}

export interface UserRow {
	user_id: string;
	email: string;
	status: string;
	roles: string;
	updated_at: number;
}

export interface SSOEnv {
	VIBE_DB: D1Database;

	// Flexi JWT verification
	FLEXI_JWKS_URL: string;
	FLEXI_ISS: string;
	FLEXI_AUD: string;

	// Vibe access token
	VIBE_ISS: string;
	VIBE_AUD: string;
	VIBE_ACCESS_SECRET: string;

	// Cookie & routing
	VIBE_COOKIE_NAME: string;
	VIBE_COOKIE_DOMAIN: string;
	PROTECTED_PREFIX: string;
	VIBE_ORIGIN: string;

	// Optional
	ALLOW_MIGRATE?: string;
}

export interface JWK {
	kty: string;
	use?: string;
	kid?: string;
	alg?: string;
	n: string;
	e: string;
}

export interface JWKS {
	keys: JWK[];
}

export interface ErrorResponse {
	error: string;
	code: string;
	message?: string;
}
