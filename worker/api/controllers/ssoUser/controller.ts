/**
 * SSO User Controller
 * Controller for fetching user details from SSO database
 */

import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { SSOUserService } from '../../../database/services/SSOUserService';
import { createLogger } from '../../../logger';

const logger = createLogger('SSOUserController');

export class SSOUserController extends BaseController {
	/**
	 * Get user details by email from SSO database
	 * GET /api/sso-users/by-email/:email
	 */
	static async getUserByEmail(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
		_routeContext: RouteContext,
	): Promise<Response> {
		try {
			const body = (await request.json()) as { email?: string };
			const email = body.email;

			if (!email) {
				return SSOUserController.createErrorResponse(
					'Email parameter is required',
					400,
				);
			}

			const ssoUserService = new SSOUserService(env);
			const user = await ssoUserService.getUserByEmail(email);

			if (!user) {
				return SSOUserController.createErrorResponse(
					'User not found in SSO database',
					404,
				);
			}

			return SSOUserController.createSuccessResponse({
				user: {
					email: user.email,
					userId: user.user_id,
					status: user.status,
					roles: user.roles,
					updatedAt: user.updated_at,
				},
			});
		} catch (error) {
			logger.error('Failed to get user by email', { error });
			return SSOUserController.handleError(
				error,
				'get user by email from SSO database',
			);
		}
	}

	/**
	 * Get user details by user_id from SSO database
	 * GET /api/sso-users/by-user-id/:userId
	 */
	static async getUserByUserId(
		_request: Request,
		env: Env,
		_ctx: ExecutionContext,
		routeContext: RouteContext,
	): Promise<Response> {
		try {
			const userId = routeContext.pathParams.userId;

			if (!userId) {
				return SSOUserController.createErrorResponse(
					'User ID parameter is required',
					400,
				);
			}

			const ssoUserService = new SSOUserService(env);
			const user = await ssoUserService.getUserByUserId(userId);

			if (!user) {
				return SSOUserController.createErrorResponse(
					'User not found in SSO database',
					404,
				);
			}

			return SSOUserController.createSuccessResponse({
				user: {
					email: user.email,
					userId: user.user_id,
					status: user.status,
					roles: user.roles,
					updatedAt: user.updated_at,
				},
			});
		} catch (error) {
			logger.error('Failed to get user by userId', { error });
			return SSOUserController.handleError(
				error,
				'get user by userId from SSO database',
			);
		}
	}

	/**
	 * Get current authenticated user's SSO details
	 * GET /api/sso-users/me
	 */
	static async getCurrentUserSSODetails(
		_request: Request,
		env: Env,
		_ctx: ExecutionContext,
		routeContext: RouteContext,
	): Promise<Response> {
		try {
			if (!routeContext.user) {
				return SSOUserController.createErrorResponse(
					'Unauthorized',
					401,
				);
			}

			const email = routeContext.user.email;
			const ssoUserService = new SSOUserService(env);
			const user = await ssoUserService.getUserByEmail(email);

			if (!user) {
				return SSOUserController.createErrorResponse(
					'User not found in SSO database',
					404,
				);
			}

			return SSOUserController.createSuccessResponse({
				user: {
					email: user.email,
					userId: user.user_id,
					status: user.status,
					roles: user.roles,
					updatedAt: user.updated_at,
				},
			});
		} catch (error) {
			logger.error('Failed to get current user SSO details', { error });
			return SSOUserController.handleError(
				error,
				'get current user SSO details',
			);
		}
	}

	/**
	 * Get all active users from SSO database
	 * GET /api/sso-users/active
	 */
	static async getAllActiveUsers(
		_request: Request,
		env: Env,
		_ctx: ExecutionContext,
		routeContext: RouteContext,
	): Promise<Response> {
		try {
			const limit = parseInt(
				routeContext.queryParams.get('limit') || '100',
				10,
			);
			const offset = parseInt(
				routeContext.queryParams.get('offset') || '0',
				10,
			);

			if (limit < 1 || limit > 500) {
				return SSOUserController.createErrorResponse(
					'Limit must be between 1 and 500',
					400,
				);
			}

			if (offset < 0) {
				return SSOUserController.createErrorResponse(
					'Offset must be non-negative',
					400,
				);
			}

			const ssoUserService = new SSOUserService(env);
			const users = await ssoUserService.getAllActiveUsers(limit, offset);

			return SSOUserController.createSuccessResponse({
				users: users.map((user) => ({
					email: user.email,
					userId: user.user_id,
					status: user.status,
					roles: user.roles,
					updatedAt: user.updated_at,
				})),
				pagination: {
					limit,
					offset,
					count: users.length,
				},
			});
		} catch (error) {
			logger.error('Failed to get all active users', { error });
			return SSOUserController.handleError(
				error,
				'get all active users from SSO database',
			);
		}
	}

	/**
	 * Check if email exists in SSO database
	 * GET /api/sso-users/check-email/:email
	 */
	static async checkEmailExists(
		_request: Request,
		env: Env,
		_ctx: ExecutionContext,
		routeContext: RouteContext,
	): Promise<Response> {
		try {
			const email = routeContext.pathParams.email;

			if (!email) {
				return SSOUserController.createErrorResponse(
					'Email parameter is required',
					400,
				);
			}

			const ssoUserService = new SSOUserService(env);
			const exists = await ssoUserService.emailExists(email);

			return SSOUserController.createSuccessResponse({
				email,
				exists,
			});
		} catch (error) {
			logger.error('Failed to check email existence', { error });
			return SSOUserController.handleError(
				error,
				'check email existence in SSO database',
			);
		}
	}
}
