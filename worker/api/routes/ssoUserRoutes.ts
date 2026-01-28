/**
 * SSO User Routes
 * Routes for fetching user details from SSO database
 */

import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';
import { SSOUserController } from '../controllers/ssoUser/controller';

/**
 * Setup SSO user routes
 */
export function setupSSOUserRoutes(app: Hono<AppEnv>): void {
	const ssoUserRouter = new Hono<AppEnv>();

	// Get current authenticated user's SSO details
	ssoUserRouter.get(
		'/me',
		setAuthLevel(AuthConfig.authenticated),
		adaptController(SSOUserController, SSOUserController.getCurrentUserSSODetails)
	);

	// Get user by email from SSO database
	ssoUserRouter.post(
		'/by-email',
		setAuthLevel(AuthConfig.authenticated),
		adaptController(SSOUserController, SSOUserController.getUserByEmail)
	);

	// Get user by user_id from SSO database
	ssoUserRouter.get(
		'/by-user-id/:userId',
		setAuthLevel(AuthConfig.authenticated),
		adaptController(SSOUserController, SSOUserController.getUserByUserId)
	);

	// Get all active users from SSO database
	ssoUserRouter.get(
		'/active',
		setAuthLevel(AuthConfig.authenticated),
		adaptController(SSOUserController, SSOUserController.getAllActiveUsers)
	);

	// Check if email exists in SSO database
	ssoUserRouter.get(
		'/check-email/:email',
		setAuthLevel(AuthConfig.authenticated),
		adaptController(SSOUserController, SSOUserController.checkEmailExists)
	);

	// Mount the SSO user router under /api/sso-users
	app.route('/api/sso-users', ssoUserRouter);
}
