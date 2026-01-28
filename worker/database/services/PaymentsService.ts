/**
 * Payments Service - Database operations for payment transactions
 * Provides comprehensive payment and sales data access for AI agents and reporting
 */

import { BaseService } from './BaseService';
import * as schema from '../schema';
import { eq, and, desc, asc, sql, between, gte, lte, inArray } from 'drizzle-orm';
import { generateId } from '../../utils/idGenerator';

export interface PaymentQueryOptions {
    userId?: string;
    status?: string[];
    paymentProvider?: string;
    customerEmail?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'amount' | 'paidAt';
    sortOrder?: 'asc' | 'desc';
}

export interface PaymentStats {
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    averageTransactionValue: number;
}

export interface DailySalesData {
    date: string;
    revenue: number;
    transactions: number;
}

export class PaymentsService extends BaseService {
    /**
     * Create a new payment record
     */
    async createPayment(paymentData: Omit<schema.NewPayment, 'id'>): Promise<schema.Payment> {
        const [payment] = await this.database
            .insert(schema.payments)
            .values({
                id: generateId(),
                ...paymentData,
            })
            .returning();
        return payment;
    }

    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId: string): Promise<schema.Payment | null> {
        const readDb = this.getReadDb('fast');
        const [payment] = await readDb
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.id, paymentId))
            .limit(1);
        return payment || null;
    }

    /**
     * Get payment by transaction ID
     */
    async getPaymentByTransactionId(transactionId: string): Promise<schema.Payment | null> {
        const readDb = this.getReadDb('fast');
        const [payment] = await readDb
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.transactionId, transactionId))
            .limit(1);
        return payment || null;
    }

    /**
     * Query payments with flexible filtering
     */
    async queryPayments(options: PaymentQueryOptions = {}): Promise<schema.Payment[]> {
        const {
            userId,
            status,
            paymentProvider,
            customerEmail,
            startDate,
            endDate,
            limit = 100,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const readDb = this.getReadDb('fast');
        const conditions = [];

        if (userId) {
            conditions.push(eq(schema.payments.userId, userId));
        }

        if (status && status.length > 0) {
            conditions.push(inArray(schema.payments.status, status as ('pending' | 'completed' | 'failed' | 'refunded' | 'cancelled')[]));
        }

        if (paymentProvider) {
            conditions.push(eq(schema.payments.paymentProvider, paymentProvider));
        }

        if (customerEmail) {
            conditions.push(eq(schema.payments.customerEmail, customerEmail));
        }

        if (startDate && endDate) {
            conditions.push(between(schema.payments.createdAt, startDate, endDate));
        } else if (startDate) {
            conditions.push(gte(schema.payments.createdAt, startDate));
        } else if (endDate) {
            conditions.push(lte(schema.payments.createdAt, endDate));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const orderByColumn = schema.payments[sortBy];
        const orderFn = sortOrder === 'asc' ? asc : desc;

        return await readDb
            .select()
            .from(schema.payments)
            .where(whereClause)
            .orderBy(orderFn(orderByColumn))
            .limit(limit)
            .offset(offset);
    }

    /**
     * Get payment statistics for a date range
     */
    async getPaymentStats(
        userId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<PaymentStats> {
        const readDb = this.getReadDb('fast');
        const conditions = [];

        if (userId) {
            conditions.push(eq(schema.payments.userId, userId));
        }

        if (startDate && endDate) {
            conditions.push(between(schema.payments.createdAt, startDate, endDate));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [stats] = await readDb
            .select({
                totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${schema.payments.status} = 'completed' THEN ${schema.payments.amount} ELSE 0 END), 0)`,
                totalTransactions: sql<number>`COUNT(*)`,
                successfulPayments: sql<number>`SUM(CASE WHEN ${schema.payments.status} = 'completed' THEN 1 ELSE 0 END)`,
                failedPayments: sql<number>`SUM(CASE WHEN ${schema.payments.status} = 'failed' THEN 1 ELSE 0 END)`,
                refundedAmount: sql<number>`COALESCE(SUM(${schema.payments.refundedAmount}), 0)`,
            })
            .from(schema.payments)
            .where(whereClause);

        return {
            totalRevenue: Number(stats.totalRevenue) || 0,
            totalTransactions: Number(stats.totalTransactions) || 0,
            successfulPayments: Number(stats.successfulPayments) || 0,
            failedPayments: Number(stats.failedPayments) || 0,
            refundedAmount: Number(stats.refundedAmount) || 0,
            averageTransactionValue:
                stats.successfulPayments > 0
                    ? Number(stats.totalRevenue) / Number(stats.successfulPayments)
                    : 0,
        };
    }

    /**
     * Get daily sales data for a date range
     */
    async getDailySales(
        userId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<DailySalesData[]> {
        const readDb = this.getReadDb('fast');
        const conditions = [eq(schema.payments.status, 'completed')];

        if (userId) {
            conditions.push(eq(schema.payments.userId, userId));
        }

        if (startDate && endDate) {
            conditions.push(between(schema.payments.paidAt, startDate, endDate));
        }

        const whereClause = and(...conditions);

        const results = await readDb
            .select({
                date: sql<string>`DATE(${schema.payments.paidAt}, 'unixepoch')`,
                revenue: sql<number>`SUM(${schema.payments.amount})`,
                transactions: sql<number>`COUNT(*)`,
            })
            .from(schema.payments)
            .where(whereClause)
            .groupBy(sql`DATE(${schema.payments.paidAt}, 'unixepoch')`)
            .orderBy(asc(sql`DATE(${schema.payments.paidAt}, 'unixepoch')`));

        return results.map((row) => ({
            date: row.date,
            revenue: Number(row.revenue) || 0,
            transactions: Number(row.transactions) || 0,
        }));
    }

    /**
     * Get today's sales data
     */
    async getTodaySales(userId?: string): Promise<PaymentStats> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        return await this.getPaymentStats(userId, startOfDay, endOfDay);
    }

    /**
     * Get revenue by product
     */
    async getRevenueByProduct(
        userId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<Array<{ productName: string; productId: string | null; revenue: number; sales: number }>> {
        const readDb = this.getReadDb('fast');
        const conditions = [eq(schema.payments.status, 'completed')];

        if (userId) {
            conditions.push(eq(schema.payments.userId, userId));
        }

        if (startDate && endDate) {
            conditions.push(between(schema.payments.paidAt, startDate, endDate));
        }

        const whereClause = and(...conditions);

        const results = await readDb
            .select({
                productName: schema.payments.productName,
                productId: schema.payments.productId,
                revenue: sql<number>`SUM(${schema.payments.amount})`,
                sales: sql<number>`SUM(${schema.payments.quantity})`,
            })
            .from(schema.payments)
            .where(whereClause)
            .groupBy(schema.payments.productName, schema.payments.productId)
            .orderBy(desc(sql`SUM(${schema.payments.amount})`));

        return results.map((row) => ({
            productName: row.productName || 'Unknown',
            productId: row.productId,
            revenue: Number(row.revenue) || 0,
            sales: Number(row.sales) || 0,
        }));
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(
        paymentId: string,
        status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled',
        paidAt?: Date
    ): Promise<schema.Payment> {
        const updateData: Partial<schema.Payment> = {
            status,
            updatedAt: new Date(),
        };

        if (status === 'completed' && paidAt) {
            updateData.paidAt = paidAt;
        }

        const [payment] = await this.database
            .update(schema.payments)
            .set(updateData)
            .where(eq(schema.payments.id, paymentId))
            .returning();

        return payment;
    }

    /**
     * Record a refund
     */
    async recordRefund(
        paymentId: string,
        refundAmount: number,
        refundReason?: string
    ): Promise<schema.Payment> {
        const now = new Date();
        const [payment] = await this.database
            .update(schema.payments)
            .set({
                status: 'refunded',
                refundedAmount: refundAmount,
                refundedAt: now,
                refundReason,
                updatedAt: now,
            })
            .where(eq(schema.payments.id, paymentId))
            .returning();

        return payment;
    }

    /**
     * Get customer payment history
     */
    async getCustomerPayments(customerEmail: string, limit = 50): Promise<schema.Payment[]> {
        const readDb = this.getReadDb('fast');
        return await readDb
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.customerEmail, customerEmail))
            .orderBy(desc(schema.payments.createdAt))
            .limit(limit);
    }

    /**
     * Get recent payments for a user
     */
    async getRecentPayments(userId: string, limit = 20): Promise<schema.Payment[]> {
        const readDb = this.getReadDb('fast');
        return await readDb
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.userId, userId))
            .orderBy(desc(schema.payments.createdAt))
            .limit(limit);
    }
}
