-- =====================================================
-- GOOGLE DRIVE TOKEN MANAGEMENT SYSTEM
-- =====================================================
-- This migration creates a table to store Google Drive OAuth tokens
-- for server-side management and automatic rotation
-- =====================================================

CREATE TABLE IF NOT EXISTS public.google_drive_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  last_rotated_at TIMESTAMP WITH TIME ZONE,
  rotation_count INTEGER DEFAULT 0,
  
  -- Ensure only one active token per user
  CONSTRAINT unique_active_token_per_user UNIQUE (user_id, is_active)
);

COMMENT ON TABLE public.google_drive_tokens IS 'Stores Google Drive OAuth tokens for automatic management and rotation';
COMMENT ON COLUMN public.google_drive_tokens.access_token IS 'Current OAuth access token';
COMMENT ON COLUMN public.google_drive_tokens.refresh_token IS 'OAuth refresh token for getting new access tokens';
COMMENT ON COLUMN public.google_drive_tokens.expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.google_drive_tokens.is_active IS 'Whether this token set is currently active';
COMMENT ON COLUMN public.google_drive_tokens.rotation_count IS 'How many times this token has been rotated';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_user_id 
ON public.google_drive_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_expires_at 
ON public.google_drive_tokens(expires_at) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_active 
ON public.google_drive_tokens(user_id, is_active);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tokens" 
ON public.google_drive_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
ON public.google_drive_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.google_drive_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON public.google_drive_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_google_drive_tokens_updated_at
BEFORE UPDATE ON public.google_drive_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- CREATE FUNCTION TO GET VALID TOKEN (with auto-refresh logic)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_valid_google_drive_token(p_user_id UUID)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  needs_refresh BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_needs_refresh BOOLEAN;
BEGIN
  -- Get the active token for this user
  SELECT 
    gdt.access_token,
    gdt.refresh_token,
    gdt.expires_at,
    gdt.is_active
  INTO v_token
  FROM public.google_drive_tokens gdt
  WHERE gdt.user_id = p_user_id
    AND gdt.is_active = true
  ORDER BY gdt.created_at DESC
  LIMIT 1;
  
  -- If no token found, return empty
  IF v_token IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if token needs refresh (expires in less than 5 minutes)
  v_needs_refresh := v_token.expires_at <= (NOW() + INTERVAL '5 minutes');
  
  RETURN QUERY
  SELECT 
    v_token.access_token,
    v_token.refresh_token,
    v_token.expires_at,
    v_needs_refresh;
END;
$$;

COMMENT ON FUNCTION public.get_valid_google_drive_token IS 'Returns the valid Google Drive token for a user, indicating if refresh is needed';

-- =====================================================
-- CREATE FUNCTION TO ROTATE/UPDATE TOKEN
-- =====================================================

CREATE OR REPLACE FUNCTION public.rotate_google_drive_token(
  p_user_id UUID,
  p_new_access_token TEXT,
  p_new_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.google_drive_tokens
  SET 
    access_token = p_new_access_token,
    expires_at = p_new_expires_at,
    updated_at = NOW(),
    last_rotated_at = NOW(),
    rotation_count = rotation_count + 1
  WHERE user_id = p_user_id
    AND is_active = true;
    
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.rotate_google_drive_token IS 'Updates the access token after refresh';

-- =====================================================
-- CREATE FUNCTION TO REVOKE/DEACTIVATE ALL USER TOKENS
-- =====================================================

CREATE OR REPLACE FUNCTION public.revoke_google_drive_tokens(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.google_drive_tokens
  SET is_active = false
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.revoke_google_drive_tokens IS 'Deactivates all Google Drive tokens for a user (logout)';
