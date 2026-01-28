/**
 * Payments Routes - API endpoints for payment/sales data access
 * These endpoints can be called by AI-generated applications to fetch payment analytics
 */

import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';
import * as PaymentsController from '../controllers/paymentsController';

/**
 * Setup payments routes
 */
export function setupPaymentsRoutes(app: Hono<AppEnv>): void {
    // Get today's sales statistics
    app.get(
        '/api/payments/today-sales',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getTodaySales
    );

    // Get daily sales data for a date range
    app.get(
        '/api/payments/daily-sales',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getDailySales
    );

    // Get payment statistics for a date range
    app.get(
        '/api/payments/stats',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getPaymentStats
    );

    // Get revenue by product
    app.get(
        '/api/payments/revenue-by-product',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getRevenueByProduct
    );

    // Query payments with filters
    app.get(
        '/api/payments/query',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.queryPayments
    );

    // Get recent payments for a user
    app.get(
        '/api/payments/recent',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getRecentPayments
    );

    // Get customer payment history
    app.get(
        '/api/payments/customer/:email',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.getCustomerPayments
    );

    // Create a new payment record
    app.post(
        '/api/payments',
        setAuthLevel(AuthConfig.authenticated),
        PaymentsController.createPayment
    );
}
