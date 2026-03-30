export const LOCK_POLICIES_USER_ID = '5c2822bb-225d-4fbc-8d3f-92f9c2562eac';
export const LOCK_POLICIES_MANAGER_USER_ID = '424f4ea8-1b8c-4c0f-bc13-3ea699900c79';
export const LOCK_POLICIES_ADDITIONAL_USERS = ['9d7d26ce-f840-420b-ad27-dea3747cccbd'];
export const LOCK_POLICIES_ONLY_USER_ID = '9d7d26ce-f840-420b-ad27-dea3747cccbd';

export const RESTRICTED_USER_IDS = ['adda1255-2a0b-41da-9df0-3100d01b8649', 'eceb7ac0-0e4a-44ad-bb70-ba66010d0baa'];

export const canAccessLockPolicies = (userId: string | undefined): boolean => {
  return userId === LOCK_POLICIES_USER_ID || LOCK_POLICIES_ADDITIONAL_USERS.includes(userId || '');
};

export const canAccessLockPoliciesManager = (userId: string | undefined): boolean => {
  return userId === LOCK_POLICIES_MANAGER_USER_ID;
};

export const isLockPoliciesOnlyUser = (userId: string | undefined): boolean => {
  return userId === LOCK_POLICIES_ONLY_USER_ID;
};

/**
 * Check if the current user has restricted access (read-only view)
 * @param userId - The current user's ID
 * @returns boolean indicating if user has restricted access
 */
export const isRestrictedUser = (userId: string | undefined): boolean => {
  return userId ? RESTRICTED_USER_IDS.includes(userId) : false;
};

/**
 * Check if the current user can perform write operations (create, edit, delete)
 * @param userId - The current user's ID
 * @returns boolean indicating if user can perform write operations
 */
export const canPerformWriteOperations = (userId: string | undefined): boolean => {
  return !isRestrictedUser(userId);
};

/**
 * Check if the current user can access navigation menu
 * @param userId - The current user's ID
 * @returns boolean indicating if user can access navigation menu
 */
export const canAccessNavigation = (userId: string | undefined): boolean => {
  return !isRestrictedUser(userId);
};

/**
 * Check if the current user is a center user (lead vendor)
 * @param userId - The current user's ID
 * @returns boolean indicating if user is a center user
 */
export const isCenterUser = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('centers')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking center user:', error);
    return false;
  }
};

/**
 * Check if the current user is a buffer agent
 * @param userId - The current user's ID
 * @returns boolean indicating if user is a buffer agent
 */
export const isBufferAgent = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    // Buffer agent names list
    const bufferAgentNames = [
      'Ira', 'Kyla', 'Syed Kazmi',"Muhammad Ahmed", 'Justine',"Catarina", 'Kaye', 'Viez', 
      'Lourd', 'Mary', 'Nicole Mejia', 'Angelica', 'Laiza Batain',"Andrea Munoz"
    ];

    return bufferAgentNames.includes(data.display_name);
  } catch (error) {
    console.error('Error checking buffer agent:', error);
    return false;
  }
};