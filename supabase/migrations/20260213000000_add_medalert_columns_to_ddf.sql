-- Add med alert columns to daily_deal_flow table
ALTER TABLE daily_deal_flow 
ADD COLUMN IF NOT EXISTS med_alert_pitched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS med_alert_pitched_at TIMESTAMP WITH TIME ZONE;
