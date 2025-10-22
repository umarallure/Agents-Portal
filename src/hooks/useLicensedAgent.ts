import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LicensedAgentInfo {
  id: string;
  user_id: string;
  status: string;
  agent_type: string;
  current_session_id?: string;
  last_activity?: string;
  display_name?: string;
}

export const useLicensedAgent = () => {
  const { user } = useAuth();
  const [licensedAgentInfo, setLicensedAgentInfo] = useState<LicensedAgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLicensedAgent, setIsLicensedAgent] = useState(false);

  useEffect(() => {
    const checkLicensedAgent = async () => {
      if (!user) {
        console.log('[useLicensedAgent] No user found');
        setLicensedAgentInfo(null);
        setIsLicensedAgent(false);
        setLoading(false);
        return;
      }

      console.log('[useLicensedAgent] Checking licensed agent status for user:', user.id, user.email);

      try {
        // First get agent status
        const { data: agentStatus, error: agentError } = await supabase
          .from('agent_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('agent_type', 'licensed')
          .maybeSingle();

        console.log('[useLicensedAgent] Agent status query result:', {
          data: agentStatus,
          error: agentError
        });

        if (agentError || !agentStatus) {
          console.log('[useLicensedAgent] User is NOT a licensed agent');
          setLicensedAgentInfo(null);
          setIsLicensedAgent(false);
          setLoading(false);
          return;
        }

        // Then get display name from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[useLicensedAgent] Profile query result:', {
          data: profile,
          error: profileError
        });

        const displayName = profileError ? null : profile?.display_name;

        const fullInfo: LicensedAgentInfo = {
          ...agentStatus,
          display_name: displayName
        };

        console.log('[useLicensedAgent] User IS a licensed agent:', {
          display_name: displayName,
          agent_type: agentStatus.agent_type
        });

        setLicensedAgentInfo(fullInfo);
        setIsLicensedAgent(true);
      } catch (error) {
        console.error('[useLicensedAgent] Error checking licensed agent:', error);
        setLicensedAgentInfo(null);
        setIsLicensedAgent(false);
      } finally {
        setLoading(false);
      }
    };

    checkLicensedAgent();
  }, [user]);

  return {
    licensedAgentInfo,
    isLicensedAgent,
    loading,
    displayName: licensedAgentInfo?.display_name || null
  };
};