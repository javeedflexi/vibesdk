/**
 * Cookie utilities
 */

export interface CookieOptions {
	domain?: string;
	maxAge?: number;
	path?: string;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Set a cookie in response headers
 */
export function setCookie(
	headers: Headers,
	name: string,
	value: string,
	options: CookieOptions = {}
): void {
	const {
		domain,
		maxAge,
		path = '/',
		httpOnly = true,
		secure = true,
		sameSite = 'Lax',
	} = options;

	let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

	if (domain) {
		cookie += `; Domain=${domain}`;
	}

	if (maxAge !== undefined) {
		cookie += `; Max-Age=${maxAge}`;
	}

	cookie += `; Path=${path}`;

	if (httpOnly) {
		cookie += '; HttpOnly';
	}

	if (secure) {
		cookie += '; Secure';
	}

	if (sameSite) {
		cookie += `; SameSite=${sameSite}`;
	}

	headers.append('Set-Cookie', cookie);
}

/**
 * Parse cookies from request headers
 */
export function parseCookies(headers: Headers): Record<string, string> {
	const cookies: Record<string, string> = {};
	const cookieHeader = headers.get('Cookie');

	if (!cookieHeader) {
		return cookies;
	}

	// Split by semicolon and trim
	const pairs = cookieHeader.split(';').map((pair) => pair.trim());

	for (const pair of pairs) {
		const [name, ...valueParts] = pair.split('=');
		if (name && valueParts.length > 0) {
			const value = valueParts.join('='); // Handle = in value
			try {
				cookies[decodeURIComponent(name.trim())] = decodeURIComponent(
					value.trim()
				);
			} catch {
				// Skip malformed cookies
				continue;
			}
		}
	}

	return cookies;
}

/**
 * Clear a cookie by setting Max-Age=0
 */
export function clearCookie(
	headers: Headers,
	name: string,
	options: Pick<CookieOptions, 'domain' | 'path'> = {}
): void {
	setCookie(headers, name, '', {
		...options,
		maxAge: 0,
		httpOnly: true,
		secure: true,
		sameSite: 'Lax',
	});
}
