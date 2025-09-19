-- Create Transfer Portal view for tracking daily lead transfers
CREATE VIEW transfer_portal AS
SELECT
    id,
    submission_id,
    date,
    insured_name,
    lead_vendor,
    client_phone_number,
    buffer_agent,
    agent,
    licensed_agent_account,
    status,
    call_result,
    carrier,
    product_type,
    draft_date,
    monthly_premium,
    face_amount,
    from_callback,
    notes,
    policy_number,
    carrier_audit,
    product_type_carrier,
    level_or_gi,
    created_at,
    updated_at,
    CASE
        WHEN from_callback = true THEN 'callback'
        ELSE 'zapier'
    END as source_type
FROM daily_deal_flow
ORDER BY date DESC, created_at DESC;

-- Create Submission Portal view for tracking submitted applications
CREATE VIEW submission_portal AS
SELECT
    ddf.id,
    ddf.submission_id,
    ddf.date,
    ddf.insured_name,
    ddf.lead_vendor,
    ddf.client_phone_number,
    ddf.buffer_agent,
    ddf.agent,
    ddf.licensed_agent_account,
    ddf.status,
    ddf.call_result,
    ddf.carrier,
    ddf.product_type,
    ddf.draft_date,
    ddf.monthly_premium,
    ddf.face_amount,
    ddf.from_callback,
    ddf.notes,
    ddf.policy_number,
    ddf.carrier_audit,
    ddf.product_type_carrier,
    ddf.level_or_gi,
    ddf.created_at,
    ddf.updated_at,
    cr.application_submitted,
    cr.sent_to_underwriting,
    cr.submission_date,
    cr.dq_reason,
    cr.call_source,
    CASE
        WHEN ddf.from_callback = true THEN 'callback'
        ELSE 'call_update_form'
    END as submission_source
FROM daily_deal_flow ddf
LEFT JOIN call_results cr ON ddf.submission_id = cr.submission_id
WHERE ddf.call_result IN ('Submitted', 'Underwriting')
   OR ddf.status = 'Pending Approval'
ORDER BY ddf.date DESC, ddf.created_at DESC;

-- Grant permissions for the views
GRANT SELECT ON transfer_portal TO authenticated;
GRANT SELECT ON submission_portal TO authenticated;