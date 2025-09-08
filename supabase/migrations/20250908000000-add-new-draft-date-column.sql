-- Add new_draft_date column to call_results table
ALTER TABLE "public"."call_results" 
ADD COLUMN "new_draft_date" DATE;

-- Add comment to describe the column purpose
COMMENT ON COLUMN "public"."call_results"."new_draft_date" IS 'New draft date for Updated Banking/draft date status';
