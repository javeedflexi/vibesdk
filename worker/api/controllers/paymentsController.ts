/**
 * Payments Controller - API endpoints for payment data access
 * Provides endpoints that AI-generated apps can call to fetch payment/sales data
 */

import { Context } from 'hono';
import { PaymentsService } from '../../database/services/PaymentsService';

/**
 * Get today's sales statistics
 * GET /api/payments/today-sales
 * Query params: userId (optional)
 */
export async function getTodaySales(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');

        const paymentsService = new PaymentsService(c.env);

        const stats = await paymentsService.getTodaySales(userId);

        return c.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching today\'s sales:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch today\'s sales',
                },
            },
            500
        );
    }
}

/**
 * Get daily sales data for a date range
 * GET /api/payments/daily-sales
 * Query params: userId, startDate, endDate, days (default: 7)
 */
export async function getDailySales(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');
        const days = parseInt(c.req.query('days') || '7');
        const startDateParam = c.req.query('startDate');
        const endDateParam = c.req.query('endDate');

        let startDate: Date;
        let endDate: Date;

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
        } else {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        const paymentsService = new PaymentsService(c.env);

        const salesData = await paymentsService.getDailySales(userId, startDate, endDate);

        return c.json({
            success: true,
            data: salesData,
        });
    } catch (error) {
        console.error('Error fetching daily sales:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch daily sales',
                },
            },
            500
        );
    }
}

/**
 * Get payment statistics for a date range
 * GET /api/payments/stats
 * Query params: userId, startDate, endDate
 */
export async function getPaymentStats(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');
        const startDateParam = c.req.query('startDate');
        const endDateParam = c.req.query('endDate');

        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const paymentsService = new PaymentsService(c.env);

        const stats = await paymentsService.getPaymentStats(userId, startDate, endDate);

        return c.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch payment stats',
                },
            },
            500
        );
    }
}

/**
 * Get revenue by product
 * GET /api/payments/revenue-by-product
 * Query params: userId, startDate, endDate
 */
export async function getRevenueByProduct(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');
        const startDateParam = c.req.query('startDate');
        const endDateParam = c.req.query('endDate');

        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const paymentsService = new PaymentsService(c.env);

        const productRevenue = await paymentsService.getRevenueByProduct(userId, startDate, endDate);

        return c.json({
            success: true,
            data: productRevenue,
        });
    } catch (error) {
        console.error('Error fetching revenue by product:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch revenue by product',
                },
            },
            500
        );
    }
}

/**
 * Query payments with filters
 * GET /api/payments/query
 * Query params: userId, status, paymentProvider, customerEmail, startDate, endDate, limit, offset
 */
export async function queryPayments(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');
        const statusParam = c.req.query('status');
        const paymentProvider = c.req.query('paymentProvider');
        const customerEmail = c.req.query('customerEmail');
        const startDateParam = c.req.query('startDate');
        const endDateParam = c.req.query('endDate');
        const limit = parseInt(c.req.query('limit') || '100');
        const offset = parseInt(c.req.query('offset') || '0');

        const status = statusParam ? statusParam.split(',') : undefined;
        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const paymentsService = new PaymentsService(c.env);

        const payments = await paymentsService.queryPayments({
            userId,
            status,
            paymentProvider,
            customerEmail,
            startDate,
            endDate,
            limit,
            offset,
        });

        return c.json({
            success: true,
            data: {
                payments,
                count: payments.length,
                limit,
                offset,
            },
        });
    } catch (error) {
        console.error('Error querying payments:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to query payments',
                },
            },
            500
        );
    }
}

/**
 * Get recent payments for a user
 * GET /api/payments/recent
 * Query params: userId (required), limit (default: 20)
 */
export async function getRecentPayments(c: Context<{ Bindings: Env }>) {
    try {
        const userId = c.req.query('userId');
        const limit = parseInt(c.req.query('limit') || '20');

        if (!userId) {
            return c.json(
                {
                    success: false,
                    error: {
                        message: 'userId is required',
                    },
                },
                400
            );
        }

        const paymentsService = new PaymentsService(c.env);

        const payments = await paymentsService.getRecentPayments(userId, limit);

        return c.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        console.error('Error fetching recent payments:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch recent payments',
                },
            },
            500
        );
    }
}

/**
 * Get customer payment history
 * GET /api/payments/customer/:email
 * Path params: email
 * Query params: limit (default: 50)
 */
export async function getCustomerPayments(c: Context<{ Bindings: Env }>) {
    try {
        const customerEmail = c.req.param('email');
        const limit = parseInt(c.req.query('limit') || '50');

        if (!customerEmail) {
            return c.json(
                {
                    success: false,
                    error: {
                        message: 'Customer email is required',
                    },
                },
                400
            );
        }

        const paymentsService = new PaymentsService(c.env);

        const payments = await paymentsService.getCustomerPayments(customerEmail, limit);

        return c.json({
            success: true,
            data: {
                customerEmail,
                payments,
                count: payments.length,
            },
        });
    } catch (error) {
        console.error('Error fetching customer payments:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to fetch customer payments',
                },
            },
            500
        );
    }
}

/**
 * Create a new payment record
 * POST /api/payments
 * Body: payment data
 */
export async function createPayment(c: Context<{ Bindings: Env }>) {
    try {
        const paymentData = await c.req.json();

        // Basic validation
        if (!paymentData.amount || !paymentData.currency) {
            return c.json(
                {
                    success: false,
                    error: {
                        message: 'amount and currency are required',
                    },
                },
                400
            );
        }

        const paymentsService = new PaymentsService(c.env);

        const payment = await paymentsService.createPayment(paymentData);

        return c.json({
            success: true,
            data: payment,
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        return c.json(
            {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to create payment',
                },
            },
            500
        );
    }
}
