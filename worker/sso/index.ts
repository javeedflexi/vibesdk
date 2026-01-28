/**
 * SSO Handoff Worker
 * Minimal SSO implementation for Flexi → Vibe handoff
 */

import type { SSOEnv, ErrorResponse } from './types';
import {
	verifyFlexiJWT_RS256,
	signVibeAccessHS256,
	verifyVibeAccessHS256,
} from './jose';
import {
	getUserByEmail,
	markJtiSeen,
	MIGRATION_STATEMENTS,
} from './db';
import { setCookie, parseCookies, clearCookie } from './cookies';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
	'https://flexifunnels.com',
	'https://www.flexifunnels.com',
	'https://dev-app.flexifunnels.com',
	'https://app.flexifunnels.com',
	'http://flexifunnels.local.com',
];

/**
 * Create error response
 */
function errorResponse(
	code: string,
	error: string,
	status: number,
	message?: string,
	origin?: string
): Response {
	const body: ErrorResponse = { error, code, message };
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	// Add CORS headers if origin is allowed
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	return new Response(JSON.stringify(body), {
		status,
		headers,
	});
}

/**
 * Handle CORS preflight
 */
function handleCORS(request: Request): Response | null {
	const origin = request.headers.get('Origin');

	// For browser navigations (no Origin header), skip CORS check
	if (!origin) {
		return null;
	}

	// For AJAX requests with Origin header, verify it's allowed
	if (!ALLOWED_ORIGINS.includes(origin)) {
		return errorResponse('FORBIDDEN', 'Invalid origin', 403);
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': origin,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Authorization',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	return null;
}

/**
 * POST /auth/vibe-access
 * Main SSO handoff endpoint
 */
async function handleVibeAccess(
	request: Request,
	env: SSOEnv
): Promise<Response> {
	const origin = request.headers.get('Origin') || undefined;

	try {
		// Parse request body
		let body: { jwt?: string; email?: string };
		try {
			body = await request.json();
		} catch {
			return errorResponse(
				'INVALID_BODY',
				'Invalid JSON body',
				400,
				'Request body must be valid JSON',
				origin
			);
		}

		const { jwt, email } = body;

		if (!jwt || !email) {
			return errorResponse(
				'INVALID_BODY',
				'Missing jwt or email',
				400,
				'Both jwt and email fields are required',
				origin
			);
		}

		// Verify Flexi JWT
		let payload;
		try {
			payload = await verifyFlexiJWT_RS256(
				jwt,
				env.FLEXI_JWKS_URL,
				env.FLEXI_ISS,
				env.FLEXI_AUD
			);
		} catch (error) {
			return errorResponse(
				'JWT_INVALID',
				'Invalid JWT',
				401,
				error instanceof Error ? error.message : 'JWT verification failed',
				origin
			);
		}

		// Verify email matches JWT claim
		if (payload.email.toLowerCase() !== email.toLowerCase()) {
			return errorResponse(
				'EMAIL_MISMATCH',
				'Email mismatch',
				401,
				'Email in body does not match JWT email claim',
				origin
			);
		}

		// Replay prevention
		if (payload.jti) {
			const isNew = await markJtiSeen(env.VIBE_DB, payload.jti);
			if (!isNew) {
				return errorResponse(
					'REPLAYED_JTI',
					'JWT replay detected',
					409,
					'This JWT has already been used',
					origin
				);
			}
		}

		// Get user from database
		const user = await getUserByEmail(env.VIBE_DB, email);

		if (!user) {
			return errorResponse(
				'USER_NOT_ALLOWED',
				'User not allowed',
				403,
				'User not found in allowed users list',
				origin
			);
		}

		if (user.status === 'suspended') {
			return errorResponse(
				'USER_SUSPENDED',
				'User suspended',
				403,
				'User account is suspended',
				origin
			);
		}

		// Create Vibe access token
		const vibeToken = await signVibeAccessHS256(
			{
				iss: env.VIBE_ISS,
				aud: env.VIBE_AUD,
				sub: user.user_id,
				email: user.email,
				roles: user.roles,
			},
			env.VIBE_ACCESS_SECRET,
			600 // 10 minutes
		);

		// Set cookie
		const headers = new Headers();
		if (origin && ALLOWED_ORIGINS.includes(origin)) {
			headers.set('Access-Control-Allow-Origin', origin);
			headers.set('Access-Control-Allow-Credentials', 'true');
		}

		setCookie(headers, env.VIBE_COOKIE_NAME, vibeToken, {
			domain: env.VIBE_COOKIE_DOMAIN,
			maxAge: 600,
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'None',  // Changed from 'Lax' to 'None' for cross-site cookies
		});

		return new Response(null, {
			status: 204,
			headers,
		});
	} catch (error) {
		console.error('Vibe access error:', error);
		return errorResponse(
			'INTERNAL_ERROR',
			'Internal server error',
			500,
			error instanceof Error ? error.message : undefined,
			origin
		);
	}
}

/**
 * GET /auth/me
 * Get current user info
 */
async function handleMe(request: Request, env: SSOEnv): Promise<Response> {
	try {
		const cookies = parseCookies(request.headers);
		const token = cookies[env.VIBE_COOKIE_NAME];

		if (!token) {
			return errorResponse(
				'NO_SESSION',
				'No session found',
				401,
				'Vibe access cookie not found'
			);
		}

		const payload = await verifyVibeAccessHS256(token, env.VIBE_ACCESS_SECRET);

		return new Response(
			JSON.stringify({
				user_id: payload.sub,
				email: payload.email,
				roles: payload.roles,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		return errorResponse(
			'NO_SESSION',
			'Invalid session',
			401,
			error instanceof Error ? error.message : 'Session verification failed'
		);
	}
}

/**
 * POST /auth/logout
 * Clear session cookie
 */
function handleLogout(_request: Request, env: SSOEnv): Response {
	const headers = new Headers();

	clearCookie(headers, env.VIBE_COOKIE_NAME, {
		domain: env.VIBE_COOKIE_DOMAIN,
		path: '/',
	});

	return new Response(
		JSON.stringify({ success: true, message: 'Logged out' }),
		{
			status: 200,
			headers,
		}
	);
}

/**
 * GET /auth/health
 * Health check
 */
function handleHealth(): Response {
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * GET /migrate
 * Run database migrations (protected)
 */
async function handleMigrate(env: SSOEnv): Promise<Response> {
	if (env.ALLOW_MIGRATE !== 'true') {
		return errorResponse(
			'FORBIDDEN',
			'Migrations disabled',
			403,
			'Set ALLOW_MIGRATE=true to enable'
		);
	}

	try {
		const statements = MIGRATION_STATEMENTS.map((sql) =>
			env.VIBE_DB.prepare(sql)
		);
		await env.VIBE_DB.batch(statements);

		return new Response(
			JSON.stringify({ success: true, message: 'Migrations applied' }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		return errorResponse(
			'MIGRATION_FAILED',
			'Migration failed',
			500,
			error instanceof Error ? error.message : undefined
		);
	}
}

/**
 * Protected route middleware
 */
async function handleProtected(
	request: Request,
	env: SSOEnv
): Promise<Response> {
	const cookies = parseCookies(request.headers);
	const token = cookies[env.VIBE_COOKIE_NAME];

	if (!token) {
		return errorResponse(
			'NO_SESSION',
			'Unauthorized',
			401,
			'No session cookie found'
		);
	}

	try {
		const payload = await verifyVibeAccessHS256(token, env.VIBE_ACCESS_SECRET);

		// For initial /apps request, call SSO handoff to create main app session
		const url = new URL(request.url);
		const isInitialAppsRequest = url.pathname === env.PROTECTED_PREFIX || url.pathname === env.PROTECTED_PREFIX + '/';

		if (isInitialAppsRequest && request.method === 'GET') {
			// Call SSO handoff endpoint to create session in main app
			const handoffUrl = new URL(env.VIBE_ORIGIN + '/api/auth/sso-handoff');
			const handoffResponse = await fetch(handoffUrl, {
				method: 'POST',
				headers: {
					'X-User-Id': payload.sub,
					'X-User-Email': payload.email,
					'X-User-Roles': payload.roles,
					'Content-Type': 'application/json',
				},
			});

			if (handoffResponse.ok) {
				// Get the session data and access token from handoff response
				const handoffData = await handoffResponse.json() as {
					success: boolean;
					data?: {
						user: { id: string };
						sessionId: string;
						accessToken: string;
					}
				};

				if (!handoffData.success || !handoffData.data || !handoffData.data.accessToken) {
					return errorResponse(
						'SSO_HANDOFF_FAILED',
						'Invalid handoff response',
						500,
						'Handoff succeeded but returned invalid data'
					);
				}

				// Redirect to SSO complete endpoint which will set cookies on the main app domain
				const completeUrl = new URL(env.VIBE_ORIGIN + '/api/auth/sso-complete');
				completeUrl.searchParams.set('token', handoffData.data.accessToken);
				completeUrl.searchParams.set('redirect', url.pathname);

				console.log(`SSO: Redirecting to sso-complete endpoint`);

				// Redirect to main app's sso-complete endpoint which will set cookies
				return new Response(null, {
					status: 302,
					headers: {
						'Location': completeUrl.toString(),
					},
				});
			} else {
				return errorResponse(
					'SSO_HANDOFF_FAILED',
					'Authentication handoff failed',
					500,
					'Failed to create session in main application'
				);
			}
		}

		// For other requests, proxy with user context headers
		const proxyUrl = new URL(env.VIBE_ORIGIN + url.pathname + url.search);
		const proxyHeaders = new Headers(request.headers);
		proxyHeaders.set('X-User-Id', payload.sub);
		proxyHeaders.set('X-User-Email', payload.email);
		proxyHeaders.set('X-User-Roles', payload.roles);

		// Proxy request
		const proxyRequest = new Request(proxyUrl, {
			method: request.method,
			headers: proxyHeaders,
			body: request.body,
		});

		return await fetch(proxyRequest);
	} catch (error) {
		return errorResponse(
			'NO_SESSION',
			'Unauthorized',
			401,
			error instanceof Error ? error.message : 'Invalid session'
		);
	}
}

/**
 * Main worker entry point
 */
export default {
	async fetch(
		request: Request,
		env: SSOEnv,
		_ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Skip CORS for /migrate and /auth/health endpoints
		if (path !== '/migrate' && path !== '/auth/health') {
			const corsResponse = handleCORS(request);
			if (corsResponse) return corsResponse;
		}

		// Auth routes
		if (path === '/auth/vibe-access' && request.method === 'POST') {
			// Verify Content-Type
			const contentType = request.headers.get('Content-Type');
			if (!contentType?.includes('application/json')) {
				return errorResponse(
					'INVALID_CONTENT_TYPE',
					'Invalid Content-Type',
					400,
					'Content-Type must be application/json'
				);
			}

			return handleVibeAccess(request, env);
		}

		if (path === '/auth/me' && request.method === 'GET') {
			return handleMe(request, env);
		}

		if (path === '/auth/logout' && request.method === 'POST') {
			return handleLogout(request, env);
		}

		if (path === '/auth/health' && request.method === 'GET') {
			return handleHealth();
		}

		if (path === '/migrate' && request.method === 'GET') {
			return handleMigrate(env);
		}

		// Protected routes
		const protectedPrefix = env.PROTECTED_PREFIX || '/app/';
		if (path.startsWith(protectedPrefix)) {
			return handleProtected(request, env);
		}

		// Pass through other requests
		return new Response('Not Found', { status: 404 });
	},
};
