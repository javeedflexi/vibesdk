/**
 * Minimal JOSE implementation for JWT verification and signing
 * No external dependencies - uses Web Crypto API
 */

import type { JWKS, JWK, FlexiJWTPayload, VibeAccessPayload } from './types';

// In-memory cache for JWKS (10 minute TTL)
let jwksCache: { data: JWKS; expires: number } | null = null;

/**
 * Fetch and cache JWKS from Flexi
 */
export async function getFlexiJWKS(jwksUrl: string): Promise<JWKS> {
	const now = Date.now();

	if (jwksCache && jwksCache.expires > now) {
		return jwksCache.data;
	}

	const response = await fetch(jwksUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch JWKS: ${response.status}`);
	}

	const jwks = (await response.json()) as JWKS;
	jwksCache = {
		data: jwks,
		expires: now + 10 * 60 * 1000, // 10 minutes
	};

	return jwks;
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
	// Replace URL-safe chars and add padding
	const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Base64URL encode
 */
function base64UrlEncode(data: Uint8Array): string {
	const binary = String.fromCharCode(...data);
	const base64 = btoa(binary);
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Import RSA public key from JWK
 */
async function importRSAKey(jwk: JWK): Promise<CryptoKey> {
	const keyData = {
		kty: jwk.kty,
		n: jwk.n,
		e: jwk.e,
		alg: jwk.alg || 'RS256',
		ext: true,
	};

	return await crypto.subtle.importKey(
		'jwk',
		keyData,
		{
			name: 'RSASSA-PKCS1-v1_5',
			hash: 'SHA-256',
		},
		false,
		['verify']
	);
}

/**
 * Verify Flexi JWT (RS256) using JWKS
 */
export async function verifyFlexiJWT_RS256(
	token: string,
	jwksUrl: string,
	expectedIss: string,
	expectedAud: string
): Promise<FlexiJWTPayload> {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const [headerB64, payloadB64, signatureB64] = parts;

	// Decode header
	const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
	const header = JSON.parse(headerJson) as { alg: string; kid?: string };

	if (header.alg !== 'RS256') {
		throw new Error(`Unsupported algorithm: ${header.alg}`);
	}

	// Decode payload
	const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
	const payload = JSON.parse(payloadJson) as FlexiJWTPayload;

	// Verify claims
	const now = Math.floor(Date.now() / 1000);

	if (payload.iss !== expectedIss) {
		throw new Error(`Invalid issuer: ${payload.iss}`);
	}

	if (payload.aud !== expectedAud) {
		throw new Error(`Invalid audience: ${payload.aud}`);
	}

	if (payload.exp && payload.exp < now) {
		throw new Error('Token expired');
	}

	if (payload.nbf && payload.nbf > now) {
		throw new Error('Token not yet valid');
	}

	if (!payload.email) {
		throw new Error('Missing email claim');
	}

	// Get JWKS and find matching key
	const jwks = await getFlexiJWKS(jwksUrl);
	const jwk = header.kid
		? jwks.keys.find((k) => k.kid === header.kid)
		: jwks.keys[0];

	if (!jwk) {
		throw new Error('No matching key found in JWKS');
	}

	// Import public key
	const publicKey = await importRSAKey(jwk);

	// Verify signature
	const signatureData = base64UrlDecode(signatureB64);
	const messageData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

	const isValid = await crypto.subtle.verify(
		'RSASSA-PKCS1-v1_5',
		publicKey,
		signatureData,
		messageData
	);

	if (!isValid) {
		throw new Error('Invalid signature');
	}

	return payload;
}

/**
 * Sign Vibe access JWT (HS256)
 */
export async function signVibeAccessHS256(
	payload: Omit<VibeAccessPayload, 'exp' | 'iat'>,
	secret: string,
	ttlSeconds: number
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const fullPayload: VibeAccessPayload = {
		...payload,
		iat: now,
		exp: now + ttlSeconds,
	};

	const header = { alg: 'HS256', typ: 'JWT' };

	const headerB64 = base64UrlEncode(
		new TextEncoder().encode(JSON.stringify(header))
	);
	const payloadB64 = base64UrlEncode(
		new TextEncoder().encode(JSON.stringify(fullPayload))
	);

	const message = `${headerB64}.${payloadB64}`;

	// Import secret key
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	// Sign
	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(message)
	);

	const signatureB64 = base64UrlEncode(new Uint8Array(signature));

	return `${message}.${signatureB64}`;
}

/**
 * Verify Vibe access JWT (HS256)
 */
export async function verifyVibeAccessHS256(
	token: string,
	secret: string
): Promise<VibeAccessPayload> {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const [headerB64, payloadB64, signatureB64] = parts;

	// Decode and verify header
	const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
	const header = JSON.parse(headerJson) as { alg: string };

	if (header.alg !== 'HS256') {
		throw new Error(`Unsupported algorithm: ${header.alg}`);
	}

	// Import secret key
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify']
	);

	// Verify signature
	const signatureData = base64UrlDecode(signatureB64);
	const message = `${headerB64}.${payloadB64}`;

	const isValid = await crypto.subtle.verify(
		'HMAC',
		key,
		signatureData,
		new TextEncoder().encode(message)
	);

	if (!isValid) {
		throw new Error('Invalid signature');
	}

	// Decode payload
	const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
	const payload = JSON.parse(payloadJson) as VibeAccessPayload;

	// Verify expiration
	const now = Math.floor(Date.now() / 1000);
	if (payload.exp < now) {
		throw new Error('Token expired');
	}

	return payload;
}
