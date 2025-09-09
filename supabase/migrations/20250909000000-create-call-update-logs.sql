-- Create call_update_logs table for comprehensive tracking
CREATE TABLE call_update_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id TEXT NOT NULL,
    agent_id UUID REFERENCES auth.users(id),
    agent_type TEXT CHECK (agent_type IN ('buffer', 'licensed')) NOT NULL,
    agent_name TEXT,
    event_type TEXT CHECK (event_type IN (
        'verification_started',
        'call_picked_up',
        'call_claimed',
        'call_dropped',
        'call_disconnected', 
        'transferred_to_la',
        'application_submitted',
        'application_not_submitted'
    )) NOT NULL,
    event_details JSONB,
    session_id UUID,
    verification_session_id UUID REFERENCES verification_sessions(id),
    call_result_id UUID,
    customer_name TEXT,
    lead_vendor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_call_update_logs_submission_id ON call_update_logs(submission_id);
CREATE INDEX idx_call_update_logs_agent_id ON call_update_logs(agent_id);
CREATE INDEX idx_call_update_logs_agent_type ON call_update_logs(agent_type);
CREATE INDEX idx_call_update_logs_event_type ON call_update_logs(event_type);
CREATE INDEX idx_call_update_logs_created_at ON call_update_logs(created_at);
CREATE INDEX idx_call_update_logs_date ON call_update_logs(DATE(created_at));

-- Enable RLS
ALTER TABLE call_update_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own logs" ON call_update_logs
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Authenticated users can view all logs" ON call_update_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert logs" ON call_update_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own logs" ON call_update_logs
    FOR UPDATE USING (agent_id = auth.uid());

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_call_update_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_update_logs_updated_at
    BEFORE UPDATE ON call_update_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_call_update_logs_updated_at();

-- Create function to log call updates
CREATE OR REPLACE FUNCTION log_call_update(
    p_submission_id TEXT,
    p_agent_id UUID,
    p_agent_type TEXT,
    p_agent_name TEXT,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT '{}',
    p_session_id UUID DEFAULT NULL,
    p_verification_session_id UUID DEFAULT NULL,
    p_call_result_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_lead_vendor TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO call_update_logs (
        submission_id,
        agent_id,
        agent_type,
        agent_name,
        event_type,
        event_details,
        session_id,
        verification_session_id,
        call_result_id,
        customer_name,
        lead_vendor
    ) VALUES (
        p_submission_id,
        p_agent_id,
        p_agent_type,
        p_agent_name,
        p_event_type,
        p_event_details,
        p_session_id,
        p_verification_session_id,
        p_call_result_id,
        p_customer_name,
        p_lead_vendor
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for daily agent statistics
CREATE VIEW daily_agent_stats AS
WITH daily_logs AS (
    SELECT 
        DATE(created_at) as log_date,
        agent_id,
        agent_name,
        agent_type,
        event_type,
        submission_id,
        customer_name,
        lead_vendor
    FROM call_update_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
),
la_stats AS (
    SELECT 
        log_date,
        agent_id,
        agent_name,
        COUNT(CASE WHEN event_type IN ('verification_started', 'call_claimed') THEN 1 END) as picked_up_calls,
        COUNT(CASE WHEN event_type = 'call_dropped' THEN 1 END) as dropped_calls,
        COUNT(CASE WHEN event_type = 'application_not_submitted' THEN 1 END) as not_submitted,
        COUNT(CASE WHEN event_type = 'application_submitted' THEN 1 END) as submitted_sales
    FROM daily_logs
    WHERE agent_type = 'licensed'
    GROUP BY log_date, agent_id, agent_name
),
buffer_stats AS (
    SELECT 
        log_date,
        agent_id,
        agent_name,
        COUNT(CASE WHEN event_type = 'call_picked_up' THEN 1 END) as picked_up_calls,
        COUNT(CASE WHEN event_type = 'call_disconnected' THEN 1 END) as disconnected_calls,
        COUNT(CASE WHEN event_type = 'transferred_to_la' THEN 1 END) as transferred_to_agent_calls,
        COUNT(CASE WHEN event_type = 'application_not_submitted' AND EXISTS (
            SELECT 1 FROM daily_logs dl2 
            WHERE dl2.submission_id = daily_logs.submission_id 
            AND dl2.event_type = 'transferred_to_la'
        ) THEN 1 END) as not_submitted_transfers,
        COUNT(CASE WHEN event_type = 'application_submitted' AND EXISTS (
            SELECT 1 FROM daily_logs dl2 
            WHERE dl2.submission_id = daily_logs.submission_id 
            AND dl2.event_type = 'transferred_to_la'
        ) THEN 1 END) as submitted_transfers_sales
    FROM daily_logs
    WHERE agent_type = 'buffer'
    GROUP BY log_date, agent_id, agent_name
)
SELECT 
    log_date,
    agent_id,
    agent_name,
    'licensed' as agent_type,
    picked_up_calls,
    dropped_calls,
    not_submitted,
    submitted_sales,
    0 as disconnected_calls,
    0 as transferred_to_agent_calls,
    0 as not_submitted_transfers,
    0 as submitted_transfers_sales
FROM la_stats
UNION ALL
SELECT 
    log_date,
    agent_id,
    agent_name,
    'buffer' as agent_type,
    picked_up_calls,
    0 as dropped_calls,
    0 as not_submitted,
    0 as submitted_sales,
    disconnected_calls,
    transferred_to_agent_calls,
    not_submitted_transfers,
    submitted_transfers_sales
FROM buffer_stats
ORDER BY log_date DESC, agent_name;

-- Grant permissions
GRANT SELECT ON daily_agent_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_call_update TO authenticated;
