-- Migration: Add payments table for transaction and sales tracking
-- This table stores all payment transactions and can be queried by AI agents for reports

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

    -- Transaction Details
    transaction_id TEXT UNIQUE,
    order_id TEXT,

    -- Payment Information
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT,
    payment_provider TEXT,

    -- Customer Information
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,

    -- Product/Service Details
    product_name TEXT,
    product_id TEXT,
    quantity INTEGER DEFAULT 1,

    -- Additional Metadata
    description TEXT,
    metadata TEXT DEFAULT '{}',

    -- Refund Information
    refunded_amount REAL DEFAULT 0,
    refunded_at INTEGER,
    refund_reason TEXT,

    -- Timestamps
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    paid_at INTEGER
);

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_idx ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_customer_email_idx ON payments(customer_email);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at);
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON payments(paid_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS payments_user_status_idx ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments(status, created_at);
