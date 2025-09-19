const fs = require('fs');

// The duplicate data from the SQL query (full dataset)
const duplicateData = [
  {"submission_id":"IMPORT_1758132810843_kyzp7zfd0","insured_name":"Agatha L Watkins","client_phone_number":"(213) 733-4548","lead_vendor":"Corebiz","date":"2025-07-17","status":"Pending Approval","call_result":"Underwriting","agent":"Claudia","buffer_agent":null,"licensed_agent_account":"Claudia","carrier":"ANAM","product_type":"Immediate","draft_date":"2025-08-03","monthly_premium":"60.47","face_amount":"14150.00","from_callback":false,"notes":"Licensed agent account: Claudia\nCarrier: ANAM\nCarrier product name and level: Immediate\nDraft date: 8/3/2025\n\nSent to Underwriting","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.843+00","updated_at":"2025-09-17 18:13:30.843+00"},
{"submission_id":"IMPORT_1758132828506_3j6z90l39","insured_name":"Agatha L Watkins","client_phone_number":"(213) 733-4548","lead_vendor":"Corebiz","date":"2025-07-30","status":"Incomplete Transfer","call_result":"Not Submitted","agent":null,"buffer_agent":"Ira","licensed_agent_account":null,"carrier":null,"product_type":null,"draft_date":null,"monthly_premium":null,"face_amount":null,"from_callback":false,"notes":"Call dropped and never able to get back on the line","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.837+00","updated_at":"2025-09-17 18:13:30.837+00"},
{"submission_id":"IMPORT_1758132827410_qa5oepg9o","insured_name":"Agatha L Watkins","client_phone_number":"(213) 733-4548","lead_vendor":"Corebiz","date":"2025-08-01","status":"Incomplete Transfer","call_result":"Not Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":null,"carrier":null,"product_type":null,"draft_date":null,"monthly_premium":null,"face_amount":null,"from_callback":false,"notes":"The call dropped - we also need a new method of payment - corebridge does not accept her account with wells fargo","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.836+00","updated_at":"2025-09-17 18:13:30.836+00"},
{"submission_id":"IMPORT_1758132823020_0hlinqejc","insured_name":"Alan Leon Lyvers","client_phone_number":"(319) 325-2929","lead_vendor":"Corebiz","date":"2025-08-16","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":"Claudia","carrier":"Corebridge","product_type":"GI","draft_date":"2025-09-04","monthly_premium":"69.17","face_amount":"5000.00","from_callback":false,"notes":"Licensed agent account: Claudia\nCarrier: Corebridge\nCarrier product name and level: GI\nPremium amount: $69.17\nCoverage amount: $5000.00\nDraft date: 2025-09-04","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.815+00","updated_at":"2025-09-17 18:13:30.815+00"},
{"submission_id":"IMPORT_1758132813557_5lait8rnl","insured_name":"Alan Leon Lyvers","client_phone_number":"(319) 325-2929","lead_vendor":"Corebiz","date":"2025-09-09","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":"Kyla","licensed_agent_account":"Lydia","carrier":"CICA","product_type":"GI","draft_date":"2025-10-03","monthly_premium":"61.37","face_amount":"3500.00","from_callback":true,"notes":"Licensed agent account: Lydia\nCarrier: CICA\nCarrier product name and level: GI\nPremium amount: $61.37\nCoverage amount: $3500.00\nDraft date: 2025-10-03\n2. Commissions from this carrier are paid 10-14 days after first successful draft","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.765+00","updated_at":"2025-09-17 18:13:30.765+00"},
{"submission_id":"IMPORT_1758132830623_cf45nqgpw","insured_name":"Alfred Ellis","client_phone_number":"(270) 339-0226","lead_vendor":"Plexi","date":"2025-07-23","status":"Pending Approval","call_result":"Submitted","agent":"Claudia","buffer_agent":"Ira","licensed_agent_account":"Benjamin","carrier":"ANAM","product_type":"Immediate","draft_date":"2025-08-27","monthly_premium":"32.15","face_amount":"3000.00","from_callback":false,"notes":"Call dropped and Alfred didn't pick up our calls afterwards","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.841+00","updated_at":"2025-09-17 18:13:30.841+00"},
{"submission_id":"IMPORT_1758132823020_h0ttgxynx","insured_name":"Alfred Ellis","client_phone_number":"(270) 339-0226","lead_vendor":"Plexi","date":"2025-08-16","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":"Lydia","carrier":"Aetna","product_type":"Preferred","draft_date":"2025-08-27","monthly_premium":"31.22","face_amount":"3000.00","from_callback":true,"notes":"Licensed agent account: Lydia\nCarrier: Aetna\nCarrier product name and level: Preferred\nPremium amount: $31.22\nCoverage amount: $3000.00\nDraft date: 2025-08-27","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.815+00","updated_at":"2025-09-17 18:13:30.815+00"},
{"submission_id":"IMPORT_1758132829662_wln37a7tr","insured_name":"Alia Schurman","client_phone_number":"(269) 858-5436","lead_vendor":"Plexi","date":"2025-07-28","status":"Pending Approval","call_result":"Submitted","agent":"Claudia","buffer_agent":null,"licensed_agent_account":"Claudia","carrier":"ANAM","product_type":"Immediate","draft_date":"2025-08-01","monthly_premium":"52.00","face_amount":"3021.00","from_callback":false,"notes":"Licensed agent account: Claudia\nCarrier: ANAM\nCarrier product name and level: Immediate\nPremium amount: $52.00\nCoverage amount: $3021.00\nDraft date: 2025-08-01","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.839+00","updated_at":"2025-09-17 18:13:30.839+00"},
{"submission_id":"IMPORT_1758132826213_szbcafw24","insured_name":"Alia Schurman","client_phone_number":"(269) 858-5436","lead_vendor":"Ambition","date":"2025-08-06","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":"Ira","licensed_agent_account":"Lydia","carrier":"ANAM","product_type":"Immediate","draft_date":"2025-09-03","monthly_premium":"51.66","face_amount":"3000.00","from_callback":true,"notes":"Licensed agent account: Lydia\nCarrier: ANAM\nCarrier product name and level: Immediate\nPremium amount: $51.66\nCoverage amount: $3000.00\nDraft date: 2025-09-03","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.83+00","updated_at":"2025-09-17 18:13:30.83+00"},
{"submission_id":"IMPORT_1758132820199_reo8qi6tw","insured_name":"Alia Schurman","client_phone_number":"(269) 858-5436","lead_vendor":"Ambition","date":"2025-08-20","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":"Lydia","carrier":"CICA","product_type":"GI","draft_date":"2025-09-03","monthly_premium":"66.28","face_amount":"2000.00","from_callback":true,"notes":"Licensed agent account: Lydia\nCarrier: CICA\nCarrier product name and level: GI\nPremium amount: $66.28\nCoverage amount: $2000.00\nDraft date: 2025-09-03","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.807+00","updated_at":"2025-09-17 18:13:30.807+00"},
{"submission_id":"IMPORT_1758132810848_gqg91b8dr","insured_name":"Alice Marie Curtiss","client_phone_number":"(540) 580-7234","lead_vendor":"Vize BPO","date":"2025-07-09","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":"Lydia","carrier":"ANAM","product_type":"Immediate","draft_date":"2025-08-03","monthly_premium":"78.78","face_amount":"8000.00","from_callback":false,"notes":"Licensed agent account: Lydia\nCarrier: ANAM\nCarrier product name and level: Immediate\nDraft date: 8/3/2025","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.848+00","updated_at":"2025-09-17 18:13:30.848+00"},
{"submission_id":"IMPORT_1758132824089_a1g1cv05e","insured_name":"Alice Marie Curtiss","client_phone_number":"(540) 580-7234","lead_vendor":"Vize BPO","date":"2025-08-14","status":"Needs BPO Callback","call_result":null,"agent":"Lydia","buffer_agent":"Bryan","licensed_agent_account":null,"carrier":null,"product_type":null,"draft_date":null,"monthly_premium":null,"face_amount":null,"from_callback":true,"notes":"Updated banking and reoccurring draft date for 09/04","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.823+00","updated_at":"2025-09-17 18:13:30.823+00"},
{"submission_id":"IMPORT_1758132825169_ajuwg5q2x","insured_name":"Alice S Kalmuwe","client_phone_number":"(763) 657-9166","lead_vendor":"Vize BPO","date":"2025-08-07","status":"Pending Approval","call_result":"Submitted","agent":"Erica","buffer_agent":null,"licensed_agent_account":"Lydia","carrier":"CICA","product_type":"GI","draft_date":"2025-09-05","monthly_premium":"40.10","face_amount":"2000.00","from_callback":true,"notes":"She had to leave and requested a callback for tomorrow","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.83+00","updated_at":"2025-09-17 18:13:30.83+00"},
{"submission_id":"IMPORT_1758132825168_sps00x6mt","insured_name":"Alice S Kalmuwe","client_phone_number":"(763) 657-9166","lead_vendor":"Vize BPO","date":"2025-08-08","status":"Pending Approval","call_result":"Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":"Lydia","carrier":"CICA","product_type":"GI","draft_date":"2001-09-04","monthly_premium":"40.10","face_amount":"2000.00","from_callback":null,"notes":"Licensed agent account: Lydia\nCarrier: CICA\nCarrier product name and level: GI\nPremium amount: $40.10\nCoverage amount: $2000.00\nDraft date: 9/5","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.829+00","updated_at":"2025-09-17 18:13:30.829+00"},
{"submission_id":"IMPORT_1758132819009_28srxbwxh","insured_name":"Alice S Kalmuwe","client_phone_number":"(763) 657-9166","lead_vendor":"Vize BPO","date":"2025-08-22","status":"Needs BPO Callback","call_result":"Not Submitted","agent":"Lydia","buffer_agent":null,"licensed_agent_account":null,"carrier":null,"product_type":null,"draft_date":null,"monthly_premium":null,"face_amount":null,"from_callback":null,"notes":"Alice S Kalmuwe has an existing policy with an initial draft date that hasn't passed. We can call them 09/06 to submit a second policy for her. She will need to be requoted GI - her existing policy is with CICA","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.797+00","updated_at":"2025-09-17 18:13:30.797+00"},
{"submission_id":"IMPORT_1758132813557_yyh51p5c4","insured_name":"Alice S Kalmuwe","client_phone_number":"(763) 657-9166","lead_vendor":"Vize BPO","date":"2025-09-09","status":"Needs BPO Callback","call_result":"Not Submitted","agent":"Juan","buffer_agent":"Juan","licensed_agent_account":null,"carrier":null,"product_type":null,"draft_date":null,"monthly_premium":null,"face_amount":null,"from_callback":null,"notes":"First policy payment never went thru, but bank info has bee confirmed with checkbook","policy_number":null,"carrier_audit":null,"product_type_carrier":null,"level_or_gi":null,"created_at":"2025-09-17 18:13:30.763+00","updated_at":"2025-09-17 18:13:30.763+00"}
];

const headers = [
  'Submission ID',
  'Insured Name',
  'Client Phone Number',
  'Lead Vendor',
  'Date',
  'Status',
  'Call Result',
  'Agent',
  'Buffer Agent',
  'Licensed Agent Account',
  'Carrier',
  'Product Type',
  'Draft Date',
  'Monthly Premium',
  'Face Amount',
  'From Callback',
  'Notes',
  'Policy Number',
  'Carrier Audit',
  'Product Type Carrier',
  'Level or GI',
  'Created At',
  'Updated At'
];

const csvContent = [
  headers.join(','),
  ...duplicateData.map(row => [
    `"${row.submission_id || ''}"`,
    `"${row.insured_name || ''}"`,
    `"${row.client_phone_number || ''}"`,
    `"${row.lead_vendor || ''}"`,
    `"${row.date || ''}"`,
    `"${row.status || ''}"`,
    `"${row.call_result || ''}"`,
    `"${row.agent || ''}"`,
    `"${row.buffer_agent || ''}"`,
    `"${row.licensed_agent_account || ''}"`,
    `"${row.carrier || ''}"`,
    `"${row.product_type || ''}"`,
    `"${row.draft_date || ''}"`,
    `"${row.monthly_premium || ''}"`,
    `"${row.face_amount || ''}"`,
    `"${row.from_callback || ''}"`,
    `"${(row.notes || '').replace(/"/g, '""')}"`,
    `"${row.policy_number || ''}"`,
    `"${row.carrier_audit || ''}"`,
    `"${row.product_type_carrier || ''}"`,
    `"${row.level_or_gi || ''}"`,
    `"${row.created_at || ''}"`,
    `"${row.updated_at || ''}"`
  ].join(','))
].join('\n');

const filename = `duplicate_leads_with_pending_approval_${new Date().toISOString().split('T')[0]}.csv`;
fs.writeFileSync(filename, csvContent);
console.log(`CSV file '${filename}' created successfully with ${duplicateData.length} records.`);