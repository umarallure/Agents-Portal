import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

type ScrubUpdate = {
  submission_id: string;
  status?: string;
  call_result?: string;
  notes?: string;
  carrier_audit?: string;
};

type ReportRow = {
  submission_id: string;
  outcome: 'updated' | 'skipped' | 'not_found' | 'error';
  reason: string;
  applied_status: string;
  applied_call_result: string;
  applied_notes: string;
};

const DEFAULT_TABLE = 'daily_deal_flow';

const SUBMISSION_ID_COLUMNS = [
  'submission_id',
  'SubmissionId',
  'Submission ID',
  'submissionId',
  'Submission_ID',
  'submission id'
];

const STATUS_COLUMNS = ['status', 'Status', 'deal_status', 'Deal Status'];
const CALL_RESULT_COLUMNS = ['call_result', 'Call Result', 'call result'];
const NOTES_COLUMNS = ['notes', 'Notes', 'comment', 'comments', 'Remarks', 'remark'];
const CARRIER_AUDIT_COLUMNS = ['carrier_audit', 'Carrier Audit'];
const TCPA_COLUMNS = ['tcpa', 'tcpa_litigator', 'TCPA', 'TCPA Litigator', 'litigator'];
const DNC_COLUMNS = ['dnc', 'federal_dnc', 'DNC', 'Do Not Call'];
const SCRUB_RESULT_COLUMNS = ['scrub_result', 'scrub status', 'scrub_status', 'Scrub Result'];

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getFirstExistingColumn(columns: string[], row: Record<string, unknown>): string | undefined {
  return columns.find((c) => Object.prototype.hasOwnProperty.call(row, c));
}

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isTruthy(value: string): boolean {
  const v = value.toLowerCase();
  return ['yes', 'y', 'true', '1', 'flagged', 'match', 'matched'].includes(v);
}

function isFalsy(value: string): boolean {
  const v = value.toLowerCase();
  return ['no', 'n', 'false', '0', 'clear', 'clean', 'not matched', 'none'].includes(v);
}

function toCsvLine(fields: string[]): string {
  return fields
    .map((field) => {
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

function writeReportCsv(reportRows: ReportRow[], reportPath: string): void {
  const headers = [
    'submission_id',
    'outcome',
    'reason',
    'applied_status',
    'applied_call_result',
    'applied_notes'
  ];

  const lines = [toCsvLine(headers)];
  for (const row of reportRows) {
    lines.push(
      toCsvLine([
        row.submission_id,
        row.outcome,
        row.reason,
        row.applied_status,
        row.applied_call_result,
        row.applied_notes
      ])
    );
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf-8');
}

function buildUpdateFromRow(
  row: Record<string, unknown>,
  statusColumn?: string,
  callResultColumn?: string,
  notesColumn?: string,
  carrierAuditColumn?: string
): ScrubUpdate | null {
  const submissionCol = getFirstExistingColumn(SUBMISSION_ID_COLUMNS, row);
  if (!submissionCol) return null;

  const submissionId = clean(row[submissionCol]);
  if (!submissionId) return null;

  const status = statusColumn ? clean(row[statusColumn]) : '';
  const callResult = callResultColumn ? clean(row[callResultColumn]) : '';
  const notes = notesColumn ? clean(row[notesColumn]) : '';
  const carrierAudit = carrierAuditColumn ? clean(row[carrierAuditColumn]) : '';

  // Infer high-risk scrub result if explicit columns indicate TCPA/DNC/litigator matches.
  const tcpaCol = getFirstExistingColumn(TCPA_COLUMNS, row);
  const dncCol = getFirstExistingColumn(DNC_COLUMNS, row);
  const scrubResultCol = getFirstExistingColumn(SCRUB_RESULT_COLUMNS, row);

  const tcpaValue = tcpaCol ? clean(row[tcpaCol]) : '';
  const dncValue = dncCol ? clean(row[dncCol]) : '';
  const scrubValue = scrubResultCol ? clean(row[scrubResultCol]) : '';

  const tcpaMatched = tcpaValue ? isTruthy(tcpaValue) || /tcpa|litigator/i.test(tcpaValue) : false;
  const dncMatched = dncValue ? isTruthy(dncValue) || /dnc|do not call/i.test(dncValue) : false;
  const scrubDenied = scrubValue ? /reject|inactive|deny|blocked|remove|do not contact/i.test(scrubValue) : false;
  const scrubCleared = scrubValue ? isFalsy(scrubValue) || /clear|approved|ok/i.test(scrubValue) : false;

  const update: ScrubUpdate = { submission_id: submissionId };

  if (status) {
    update.status = status;
  } else if (tcpaMatched || scrubDenied) {
    update.status = 'Inactive';
  } else if (dncMatched && !scrubCleared) {
    update.status = 'Needs Consent';
  }

  if (callResult) {
    update.call_result = callResult;
  } else if (tcpaMatched) {
    update.call_result = 'TCPA Litigator';
  } else if (dncMatched && !scrubCleared) {
    update.call_result = 'DNC Match';
  }

  const autoNotes: string[] = [];
  if (tcpaMatched) autoNotes.push('Scrub result: TCPA/Litigator match.');
  if (dncMatched && !scrubCleared) autoNotes.push('Scrub result: DNC match. Verbal consent required.');
  if (scrubDenied) autoNotes.push('Scrub result indicates this record should be inactive/not contactable.');

  const combinedNotes = [notes, ...autoNotes].filter(Boolean).join(' | ');
  if (combinedNotes) {
    update.notes = combinedNotes;
  }

  if (carrierAudit) {
    update.carrier_audit = carrierAudit;
  }

  const hasPayload =
    update.status !== undefined ||
    update.call_result !== undefined ||
    update.notes !== undefined ||
    update.carrier_audit !== undefined;

  return hasPayload ? update : null;
}

async function main() {
  const csvPath = process.argv[2];
  const dryRun = hasFlag('--dry-run');
  const table = getArgValue('--table') || DEFAULT_TABLE;
  const reportFileArg = getArgValue('--report');

  if (!csvPath) {
    console.error('Usage: npm run import-scrub -- <path-to-scrubbed-csv> [--dry-run] [--table daily_deal_flow] [--report ./path/report.csv]');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log('CSV has no rows. Nothing to do.');
    return;
  }

  const statusColumn = getFirstExistingColumn(STATUS_COLUMNS, rows[0]);
  const callResultColumn = getFirstExistingColumn(CALL_RESULT_COLUMNS, rows[0]);
  const notesColumn = getFirstExistingColumn(NOTES_COLUMNS, rows[0]);
  const carrierAuditColumn = getFirstExistingColumn(CARRIER_AUDIT_COLUMNS, rows[0]);

  const reportRows: ReportRow[] = [];
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  console.log(`Processing ${rows.length} scrubbed rows against table '${table}'${dryRun ? ' (dry-run)' : ''}...`);

  for (const row of rows) {
    const update = buildUpdateFromRow(row, statusColumn, callResultColumn, notesColumn, carrierAuditColumn);

    const submissionCol = getFirstExistingColumn(SUBMISSION_ID_COLUMNS, row);
    const submissionId = submissionCol ? clean(row[submissionCol]) : '';

    if (!submissionId) {
      skipped += 1;
      reportRows.push({
        submission_id: '',
        outcome: 'skipped',
        reason: 'Missing submission_id column/value',
        applied_status: '',
        applied_call_result: '',
        applied_notes: ''
      });
      continue;
    }

    if (!update) {
      skipped += 1;
      reportRows.push({
        submission_id: submissionId,
        outcome: 'skipped',
        reason: 'No updatable scrub fields found in row',
        applied_status: '',
        applied_call_result: '',
        applied_notes: ''
      });
      continue;
    }

    const payload: Record<string, string> = {};
    if (update.status) payload.status = update.status;
    if (update.call_result) payload.call_result = update.call_result;
    if (update.notes) payload.notes = update.notes;
    if (update.carrier_audit) payload.carrier_audit = update.carrier_audit;

    if (dryRun) {
      updated += 1;
      reportRows.push({
        submission_id: submissionId,
        outcome: 'updated',
        reason: 'dry-run',
        applied_status: payload.status || '',
        applied_call_result: payload.call_result || '',
        applied_notes: payload.notes || ''
      });
      continue;
    }

    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('submission_id', submissionId)
      .select('submission_id')
      .limit(1);

    if (error) {
      errors += 1;
      reportRows.push({
        submission_id: submissionId,
        outcome: 'error',
        reason: error.message,
        applied_status: payload.status || '',
        applied_call_result: payload.call_result || '',
        applied_notes: payload.notes || ''
      });
      continue;
    }

    if (!data || data.length === 0) {
      notFound += 1;
      reportRows.push({
        submission_id: submissionId,
        outcome: 'not_found',
        reason: 'No record matched this submission_id',
        applied_status: payload.status || '',
        applied_call_result: payload.call_result || '',
        applied_notes: payload.notes || ''
      });
      continue;
    }

    updated += 1;
    reportRows.push({
      submission_id: submissionId,
      outcome: 'updated',
      reason: 'Applied',
      applied_status: payload.status || '',
      applied_call_result: payload.call_result || '',
      applied_notes: payload.notes || ''
    });
  }

  const reportPath =
    reportFileArg ||
    path.join(
      process.cwd(),
      `scrub-import-report-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    );

  writeReportCsv(reportRows, reportPath);

  console.log('');
  console.log('Scrub import completed:');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error('Failed to import scrubbed CSV:', err);
  process.exit(1);
});
