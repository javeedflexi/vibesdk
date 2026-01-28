/**
 * SSO User Service
 * Service for querying user details from the SSO database
 */

import { BaseService } from './BaseService';
import { createLogger } from '../../logger';

const logger = createLogger('SSOUserService');

export interface SSOUser {
	email: string;
	user_id: string;
	status: string;
	roles: string;
	updated_at: number;
}

export class SSOUserService extends BaseService {
	constructor(env: Env) {
		super(env);
	}

	/**
	 * Get SSO database connection
	 */
	private getSSODB(): D1Database {
		const ssoDb = this.env.devvibe_sso_db;
		if (!ssoDb) {
			throw new Error('SSO database binding not found');
		}
		return ssoDb;
	}

	/**
	 * Get user details from SSO database by email
	 */
	async getUserByEmail(email: string): Promise<SSOUser | null> {
		try {
			const db = this.getSSODB();

			const result = await db
				.prepare(
					`SELECT email, user_id, status, roles, updated_at
					FROM sso_users
					WHERE email = ?`
				)
				.bind(email)
				.first<SSOUser>();

			if (!result) {
				logger.info('User not found in SSO database', { email });
				return null;
			}

			logger.info('User retrieved from SSO database', { email, userId: result.user_id });
			return result;
		} catch (error) {
			logger.error('Failed to fetch user from SSO database', { email, error });
			throw new Error(`Failed to fetch user from SSO database: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get user details from SSO database by user_id
	 */
	async getUserByUserId(userId: string): Promise<SSOUser | null> {
		try {
			const db = this.getSSODB();

			const result = await db
				.prepare(
					`SELECT email, user_id, status, roles, updated_at
					FROM sso_users
					WHERE user_id = ?`
				)
				.bind(userId)
				.first<SSOUser>();

			if (!result) {
				logger.info('User not found in SSO database', { userId });
				return null;
			}

			logger.info('User retrieved from SSO database', { email: result.email, userId: result.user_id });
			return result;
		} catch (error) {
			logger.error('Failed to fetch user from SSO database', { userId, error });
			throw new Error(`Failed to fetch user from SSO database: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get all active users from SSO database
	 */
	async getAllActiveUsers(limit: number = 100, offset: number = 0): Promise<SSOUser[]> {
		try {
			const db = this.getSSODB();

			const result = await db
				.prepare(
					`SELECT email, user_id, status, roles, updated_at
					FROM sso_users
					WHERE status = 'active'
					ORDER BY updated_at DESC
					LIMIT ? OFFSET ?`
				)
				.bind(limit, offset)
				.all<SSOUser>();

			logger.info('Retrieved active users from SSO database', { count: result.results.length });
			return result.results;
		} catch (error) {
			logger.error('Failed to fetch active users from SSO database', { error });
			throw new Error(`Failed to fetch active users from SSO database: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Check if email exists in SSO database
	 */
	async emailExists(email: string): Promise<boolean> {
		try {
			const db = this.getSSODB();

			const result = await db
				.prepare(
					`SELECT 1 FROM sso_users WHERE email = ? LIMIT 1`
				)
				.bind(email)
				.first();

			return result !== null;
		} catch (error) {
			logger.error('Failed to check email existence in SSO database', { email, error });
			throw new Error(`Failed to check email existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
