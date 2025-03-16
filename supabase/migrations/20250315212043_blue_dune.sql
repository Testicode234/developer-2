/*
  # Add admin settings and payment tracking tables

  1. New Tables
    - `platform_settings`: Stores global platform configuration
    - `payment_tracking`: Tracks payment statistics and metrics
  
  2. Changes
    - Add new columns to existing payment-related tables
    - Add indexes for performance optimization
*/

-- Create platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id integer PRIMARY KEY DEFAULT 1,
  platform_fee numeric NOT NULL DEFAULT 5.0,
  min_project_budget numeric NOT NULL DEFAULT 100.0,
  max_project_budget numeric NOT NULL DEFAULT 100000.0,
  allowed_payment_methods jsonb DEFAULT '["card", "bank_transfer"]'::jsonb,
  email_notifications jsonb DEFAULT '{
    "user_registration": true,
    "project_creation": true,
    "payment_received": true,
    "dispute_filed": true
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create payment tracking table
CREATE TABLE IF NOT EXISTS payment_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_revenue numeric NOT NULL DEFAULT 0,
  platform_fees numeric NOT NULL DEFAULT 0,
  successful_transactions integer NOT NULL DEFAULT 0,
  failed_transactions integer NOT NULL DEFAULT 0,
  refunded_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_tracking_date ON payment_tracking(date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add constraints
ALTER TABLE platform_settings
  ADD CONSTRAINT platform_settings_single_row
  CHECK (id = 1);

ALTER TABLE platform_settings
  ADD CONSTRAINT platform_fee_range
  CHECK (platform_fee >= 0 AND platform_fee <= 100);

ALTER TABLE platform_settings
  ADD CONSTRAINT project_budget_range
  CHECK (min_project_budget > 0 AND max_project_budget > min_project_budget);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for platform settings
CREATE POLICY "Developers can view platform settings"
  ON platform_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'developer'
  ));

CREATE POLICY "Clients can view platform settings"
  ON platform_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'client'
  ));

-- Only allow developers to manage platform settings
CREATE POLICY "Developers can manage platform settings"
  ON platform_settings
  USING (auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'developer'
  ));

-- Create policies for payment tracking
CREATE POLICY "Developers can view payment tracking"
  ON payment_tracking
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'developer'
  ));

CREATE POLICY "Developers can manage payment tracking"
  ON payment_tracking
  USING (auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'developer'
  ));