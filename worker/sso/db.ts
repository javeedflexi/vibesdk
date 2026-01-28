/**
 * Database helpers for SSO
 */

import type { UserRow } from './types';

/**
 * Database migration SQL statements
 */
export const MIGRATION_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS sso_users (
		email TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'active',
		roles TEXT NOT NULL DEFAULT 'viewer',
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,
	`CREATE INDEX IF NOT EXISTS idx_sso_users_user_id ON sso_users(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_sso_users_status ON sso_users(status)`,
	`CREATE TABLE IF NOT EXISTS jwt_seen (
		jti TEXT PRIMARY KEY,
		seen_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,
	`CREATE INDEX IF NOT EXISTS idx_jwt_seen_at ON jwt_seen(seen_at)`,
];

export const MIGRATIONS_SQL = MIGRATION_STATEMENTS.join(';\n');

/**
 * Get user by email
 */
export async function getUserByEmail(
	db: D1Database,
	email: string
): Promise<UserRow | null> {
	const result = await db
		.prepare(
			`SELECT user_id, email, status, roles, updated_at
       FROM sso_users
       WHERE email = ?`
		)
		.bind(email)
		.first<UserRow>();

	return result || null;
}

/**
 * Mark JTI as seen (replay prevention)
 * Returns false if JTI was already seen (replay attack)
 */
export async function markJtiSeen(
	db: D1Database,
	jti: string
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				`INSERT INTO jwt_seen (jti, seen_at)
         VALUES (?, unixepoch())
         ON CONFLICT(jti) DO NOTHING`
			)
			.bind(jti)
			.run();

		// If no rows were inserted, JTI was already seen
		return (result.meta.changes || 0) > 0;
	} catch (error) {
		// Handle unique constraint violation in older D1 versions
		if (
			error instanceof Error &&
			error.message.includes('UNIQUE constraint')
		) {
			return false;
		}
		throw error;
	}
}

/**
 * Create or update user
 */
export async function upsertUser(
	db: D1Database,
	email: string,
	userId: string,
	status: string = 'active',
	roles: string = 'viewer'
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO sso_users (email, user_id, status, roles, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(email) DO UPDATE SET
         user_id = excluded.user_id,
         status = excluded.status,
         roles = excluded.roles,
         updated_at = excluded.updated_at`
		)
		.bind(email, userId, status, roles)
		.run();
}

/**
 * Clean up old JTI entries (optional, call periodically)
 */
export async function cleanupOldJtis(
	db: D1Database,
	olderThanSeconds: number = 86400
): Promise<number> {
	const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;

	const result = await db
		.prepare(`DELETE FROM jwt_seen WHERE seen_at < ?`)
		.bind(cutoff)
		.run();

	return result.meta.changes || 0;
}
