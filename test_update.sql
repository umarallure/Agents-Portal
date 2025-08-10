-- Test verification item update directly in database
-- This will help us verify the RLS fix worked

-- Test updating the specific verification item from your screenshot
UPDATE public.verification_items 
SET 
    is_verified = true,
    verified_at = now(),
    updated_at = now()
WHERE id = '1313b808-6698-4b65-84c1-63bccc9421c7';

-- Check if the update worked
SELECT 
    id,
    field_name,
    is_verified,
    verified_at,
    updated_at
FROM public.verification_items 
WHERE id = '1313b808-6698-4b65-84c1-63bccc9421c7';

-- Also check the session progress
SELECT 
    vs.id as session_id,
    vs.progress_percentage,
    vs.verified_fields,
    vs.total_fields,
    COUNT(vi.id) as actual_total_items,
    COUNT(vi.id) FILTER (WHERE vi.is_verified = true) as actual_verified_items
FROM public.verification_sessions vs
LEFT JOIN public.verification_items vi ON vi.session_id = vs.id
WHERE vs.id = 'b18e15d1-76ba-40d2-9ed3-6b484bca8de0'
GROUP BY vs.id, vs.progress_percentage, vs.verified_fields, vs.total_fields;
