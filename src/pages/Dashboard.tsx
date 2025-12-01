import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Phone, User, DollarSign, CheckCircle, BarChart3, Eye, Clock, Grid3X3, Search, UserPlus, AlertCircle, Database as DatabaseIcon } from 'lucide-react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isRestrictedUser } from '@/lib/userPermissions';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { VerificationDashboard } from '@/components/VerificationDashboard';
import { ClaimDroppedCallModal } from '@/components/ClaimDroppedCallModal';
import { ClaimLicensedAgentModal } from '@/components/ClaimLicensedAgentModal';
import { logCallUpdate, getLeadInfo } from '@/lib/callLogging';
import { getTodayDateEST } from '@/lib/dateUtils';

type Lead = Database['public']['Tables']['leads']['Row'];
type CallResult = Database['public']['Tables']['call_results']['Row'];
type VerificationSession = Database['public']['Tables']['verification_sessions']['Row'];

interface LeadWithCallResult extends Lead {
  call_results: CallResult[];
  verification_sessions?: VerificationSession[];
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadWithCallResult[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadWithCallResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalLeads: 0,
    submittedLeads: 0,
    pendingLeads: 0,
    leadsThisWeek: 0,
  });
  
  // Commission stats for licensed agents
  const [commissionStats, setCommissionStats] = useState({
    totalSales: 0,
    thisWeekSales: 0,
    thisWeekPremium: 0,
    todaySales: 0,
    levelProducts: 0,
    giProducts: 0,
    levelPremium: 0,
    giPremium: 0,
  });
  
  const [isLicensedAgent, setIsLicensedAgent] = useState(false);
  const [licensedAgentName, setLicensedAgentName] = useState<string>('');
  
  const isBen = user?.id === '424f4ea8-1b8c-4c0f-bc13-3ea699900c79';
  const isAuthorizedUser = user?.id === '424f4ea8-1b8c-4c0f-bc13-3ea699900c79' || user?.id === '9c004d97-b5fb-4ed6-805e-e2c383fe8b6f' || user?.id === 'c2f07638-d3d2-4fe9-9a65-f57395745695' || user?.id === '30b23a3f-df6b-40af-85d1-84d3e6f0b8b4' || user?.id === 'd68d18e4-9deb-4282-b4d0-1e6e6a0789e9';

  // Claim call modal state
  const [modalType, setModalType] = useState<'dropped' | 'licensed' | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimSessionId, setClaimSessionId] = useState<string | null>(null);
  const [claimSubmissionId, setClaimSubmissionId] = useState<string | null>(null);
  const [claimAgentType, setClaimAgentType] = useState<'buffer' | 'licensed'>('buffer');
  const [claimBufferAgent, setClaimBufferAgent] = useState<string>("");
  const [claimLicensedAgent, setClaimLicensedAgent] = useState<string>("");
  const [claimIsRetentionCall, setClaimIsRetentionCall] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimLead, setClaimLead] = useState<any>(null);
  const [bufferAgents, setBufferAgents] = useState<any[]>([]);
  const [licensedAgents, setLicensedAgents] = useState<any[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // Redirect restricted users to daily-deal-flow
    if (!loading && user && isRestrictedUser(user.id)) {
      navigate('/daily-deal-flow');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkIfLicensedAgent();
      // Optimization 3: Run data fetches in parallel instead of sequential
      Promise.all([
        fetchLeads(), // Load recent leads initially
        fetchAnalytics()
      ]);
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [leads, dateFilter, statusFilter]);

  // Separate effect for name filter to trigger search (debounced, min 4 chars)
  useEffect(() => {
    const trimmed = nameFilter.trim();
    
    // Only search if user typed at least 4 characters, or cleared the field
    if (trimmed.length >= 4) {
      const timeoutId = setTimeout(() => {
        setIsSearching(true);
        fetchLeads(trimmed).finally(() => setIsSearching(false));
        setCurrentPage(1);
      }, 400); // 400ms debounce
      return () => clearTimeout(timeoutId);
    } else if (trimmed.length === 0) {
      // When clearing search, fetch all recent leads
      setIsSearching(true);
      fetchLeads().finally(() => setIsSearching(false));
      setCurrentPage(1);
    }
    // If 1-3 chars, do nothing (wait for more input)
  }, [nameFilter]);

  const fetchLeads = async (searchTerm?: string) => {
    try {
      // Optimization 1: Use single query with joins instead of multiple queries
      // Load all leads for better search functionality
      let query = supabase
        .from('leads')
        .select(`
          *,
          call_results!left(
            id,
            application_submitted,
            status,
            carrier,
            product_type,
            buffer_agent,
            agent_who_took_call,
            licensed_agent_account,
            call_source,
            draft_date,
            monthly_premium,
            coverage_amount,
            submission_date,
            sent_to_underwriting,
            notes,
            created_at
          ),
          verification_sessions!left(
            id,
            status,
            progress_percentage,
            created_at
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // If searching, apply server-side search instead of loading all records
      if (searchTerm && searchTerm.trim()) {
        const searchValue = `%${searchTerm.trim()}%`;

        // Use a more complex query that searches across leads and joined call_results
        // We'll need to do this in a way that Supabase can handle
        query = query.or(`customer_full_name.ilike.${searchValue},submission_id.ilike.${searchValue},phone_number.ilike.${searchValue},email.ilike.${searchValue}`);

        // For call_results fields, we'll need to filter after fetching since Supabase
        // doesn't support complex OR across joined tables easily
        // Remove range limit when searching to get all matches
        // No range() call here - let it return all matches
      } else {
        // For non-search loads, limit to recent records
        query = query.range(0, 4999);
      }

      const { data: leadsData, error: leadsError } = await query;

      if (leadsError) throw leadsError;

      if (!leadsData) {
        setLeads([]);
        setIsLoading(false);
        return;
      }

      // Data is already joined, just need to format for compatibility
      const leadsWithData = leadsData.map(lead => {
        const { call_results, verification_sessions, ...leadData } = lead;
        return {
          ...leadData,
          call_results: Array.isArray(call_results) ? call_results : (call_results ? [call_results] : []),
          verification_sessions: Array.isArray(verification_sessions) ? verification_sessions : (verification_sessions ? [verification_sessions] : [])
        } as LeadWithCallResult;
      });

      setLeads(leadsWithData || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error fetching leads",
        description: "Unable to load your leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Use the database function for accurate analytics
      const { data, error } = await supabase.rpc('get_dashboard_analytics');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const stats = data[0];
        setAnalytics({
          totalLeads: Number(stats.total_leads),
          submittedLeads: Number(stats.submitted_leads),
          pendingLeads: Number(stats.pending_leads),
          leadsThisWeek: Number(stats.leads_this_week),
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Fallback: keep default analytics on error
    }
  };

  const checkIfLicensedAgent = async () => {
    if (!user) return;
    
    try {
      // Check if user has a profile with display_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.display_name) {
        setLicensedAgentName(profile.display_name);
        setIsLicensedAgent(true);
        // Fetch commission stats for this licensed agent
        fetchCommissionStats(profile.display_name);
      }
    } catch (error) {
      console.error('Error checking licensed agent status:', error);
    }
  };

  const fetchCommissionStats = async (displayName: string) => {
    try {
      // Get current date in YYYY-MM-DD format (EST timezone)
      const todayDateString = getTodayDateEST();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoDateString = weekAgo.toISOString().split('T')[0]; // This is for comparison, keep as UTC for relative calculation
      
      // Fetch ALL submissions with "Pending Approval" status for total sales count
      const { data: allSubmissions, error: allError } = await supabase
        .from('daily_deal_flow')
        .select('id, date')
        .eq('licensed_agent_account', displayName)
        .eq('status', 'Pending Approval');
      
      if (allError) throw allError;
      const totalSales = allSubmissions?.length || 0;
      
      // Fetch TODAY's submissions with "Pending Approval" status
      const { data: todayData, error: todayError } = await supabase
        .from('daily_deal_flow')
        .select('monthly_premium, product_type, carrier, date')
        .eq('licensed_agent_account', displayName)
        .eq('status', 'Pending Approval')
        .eq('date', todayDateString);
      
      if (todayError) throw todayError;
      const todaySales = todayData?.length || 0;
      
      // Fetch THIS WEEK's submissions with "Pending Approval" status
      const { data: weekData, error: weekError } = await supabase
        .from('daily_deal_flow')
        .select('monthly_premium, product_type, carrier, date')
        .eq('licensed_agent_account', displayName)
        .eq('status', 'Pending Approval')
        .gte('date', weekAgoDateString);
      
      if (weekError) throw weekError;
      
      const thisWeekSales = weekData?.length || 0;
      
      // Calculate This Week Premium
      const thisWeekPremium = weekData?.reduce((sum, item) => sum + (item.monthly_premium || 0), 0) || 0;
      
      // Categorize products for the week: Level vs GI with their premiums
      let levelCount = 0;
      let giCount = 0;
      let levelPremium = 0;
      let giPremium = 0;
      
      weekData?.forEach(item => {
        const productType = item.product_type?.toLowerCase() || '';
        const carrier = item.carrier?.toLowerCase() || '';
        const premium = item.monthly_premium || 0;
        
        // Check if it's GTL Graded (count as GI)
        if (productType.includes('graded') && carrier.includes('gtl')) {
          giCount++;
          giPremium += premium;
        }
        // Level products (including non-GTL Graded)
        else if (productType.includes('level') || productType.includes('graded')) {
          levelCount++;
          levelPremium += premium;
        }
        // GI and related products
        else if (
          productType.includes('gi') ||
          productType.includes('immediate') ||
          productType.includes('rop') ||
          productType.includes('modified') ||
          productType.includes('standard') ||
          productType.includes('preferred')
        ) {
          giCount++;
          giPremium += premium;
        }
        // Default: if unclear, count as Level
        else if (productType) {
          levelCount++;
          levelPremium += premium;
        }
      });
      
      setCommissionStats({
        totalSales,
        thisWeekSales,
        thisWeekPremium,
        todaySales,
        levelProducts: levelCount,
        giProducts: giCount,
        levelPremium,
        giPremium,
      });
    } catch (error) {
      console.error('Error fetching commission stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = leads;

    if (dateFilter) {
      filtered = filtered.filter(lead =>
        lead.created_at && lead.created_at.includes(dateFilter)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (!lead.call_results || lead.call_results.length === 0) {
          return statusFilter === 'no-result';
        }

        const latestResult = lead.call_results[0];
        const isSubmitted = Boolean(latestResult.application_submitted);

        if (statusFilter === 'submitted') {
          return isSubmitted;
        } else if (statusFilter === 'not-submitted') {
          return !isSubmitted;
        } else if (statusFilter === 'no-result') {
          return false; // Already handled above
        }
        return true;
      });
    }

    setFilteredLeads(filtered);
  };  const getLeadStatus = (lead: LeadWithCallResult) => {
    if (!lead.call_results || lead.call_results.length === 0) return 'No Result';
    const latestResult = lead.call_results[0];
    
    // Handle application_submitted being boolean or string
    const isSubmitted = Boolean(latestResult.application_submitted);
    
    if (isSubmitted) {
      return 'Submitted';
    }
    
    return latestResult.status || 'Not Submitted';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-success text-success-foreground';
      case 'No Result': return 'bg-muted text-muted-foreground';
      default: return 'bg-red-500 text-white';
    }
  };

  // Pagination functions
  const getPaginatedLeads = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredLeads.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
  const total = getTotalPages();
  if (page < 1) page = 1;
  if (page > total) page = total;
  setCurrentPage(page);
  };

  // Claim call functions
  const openClaimModal = async (submissionId: string, agentTypeOverride?: 'licensed') => {
    // Look for existing verification session with verification items (total_fields > 0)
    let { data: existingSession } = await supabase
      .from('verification_sessions')
      .select('id, status, total_fields')
      .eq('submission_id', submissionId)
      .gt('total_fields', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to avoid error if no records found

    let sessionId = existingSession?.id;

    // If no session with items exists, create one and initialize verification items
    if (!sessionId) {
      // First, get the lead data to create verification items
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

      if (leadError || !leadData) {
        toast({
          title: "Error",
          description: "Failed to fetch lead data",
          variant: "destructive",
        });
        return;
      }

      // Create the verification session
      const { data: newSession, error } = await supabase
        .from('verification_sessions')
        .insert({
          submission_id: submissionId,
          status: 'pending',
          progress_percentage: 0,
          total_fields: 0,
          verified_fields: 0
        })
        .select('id')
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create verification session",
          variant: "destructive",
        });
        return;
      }
      sessionId = newSession.id;

      // Create verification items from lead data
      const verificationItems = [];
      const leadFields = [
        'lead_vendor', 'customer_full_name', 'street_address', 'beneficiary_information',
        'billing_and_mailing_address_is_the_same', 'date_of_birth', 'age', 'phone_number',
        'social_security', 'driver_license', 'exp', 'existing_coverage',
        'applied_to_life_insurance_last_two_years', 'height', 'weight', 'doctors_name',
        'tobacco_use', 'health_conditions', 'medications', 'insurance_application_details',
        'carrier', 'monthly_premium', 'coverage_amount', 'draft_date', 'first_draft',
        'institution_name', 'beneficiary_routing', 'beneficiary_account', 'account_type',
        'city', 'state', 'zip_code', 'birth_state', 'call_phone_landline', 'additional_notes'
      ];

      for (const field of leadFields) {
        const value = leadData[field as keyof typeof leadData];
        if (value !== null && value !== undefined) {
          verificationItems.push({
            session_id: sessionId, // Fixed: use session_id instead of verification_session_id
            field_name: field,
            original_value: String(value),
            verified_value: String(value),
            is_verified: false,
            is_modified: false
          });
        }
      }

      // Insert verification items in batches
      if (verificationItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('verification_items')
          .insert(verificationItems);

        if (itemsError) {
          console.error('Error creating verification items:', itemsError);
        }

        // Update the session with the correct total fields count
        await supabase
          .from('verification_sessions')
          .update({ total_fields: verificationItems.length })
          .eq('id', sessionId);
      }
    }

    setClaimSessionId(sessionId);
    setClaimSubmissionId(submissionId);
    setClaimModalOpen(true);
    
    // Fetch lead info including retention status
    const { data: lead } = await supabase
      .from('leads')
      .select('lead_vendor, customer_full_name, is_retention_call')
      .eq('submission_id', submissionId)
      .single();
    setClaimLead(lead);
    
    // Initialize retention call toggle based on existing lead status
    setClaimIsRetentionCall(lead?.is_retention_call || false);
    
    if (agentTypeOverride === 'licensed') {
      setModalType('licensed');
      setClaimAgentType('licensed');
      setClaimLicensedAgent("");
      fetchAgents('licensed');
    } else {
      setModalType('dropped');
      setClaimAgentType('buffer');
      setClaimBufferAgent("");
      setClaimLicensedAgent("");
      fetchAgents('buffer');
    }
  };

  // Fetch agents for dropdowns
  const fetchAgents = async (type: 'buffer' | 'licensed') => {
    setFetchingAgents(true);
    try {
      const { data: agentStatus } = await supabase
        .from('agent_status')
        .select('user_id')
        .eq('agent_type', type);
      const ids = agentStatus?.map(a => a.user_id) || [];
      let profiles = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', ids);
        profiles = data || [];
      }
      if (type === 'buffer') setBufferAgents(profiles);
      else setLicensedAgents(profiles);
    } catch (error) {
      // Optionally handle error
    } finally {
      setFetchingAgents(false);
    }
  };

  // Handle workflow type change
  const handleAgentTypeChange = (type: 'buffer' | 'licensed') => {
    setClaimAgentType(type);
    setClaimBufferAgent("");
    setClaimLicensedAgent("");
    fetchAgents(type);
  };

  const handleClaimCall = async () => {
    setClaimLoading(true);
    try {
      let agentId = claimAgentType === 'buffer' ? claimBufferAgent : claimLicensedAgent;
      if (!agentId) {
        toast({
          title: "Error",
          description: "Please select an agent",
          variant: "destructive",
        });
        return;
      }

      // Update verification session
      const updateFields: any = {
        status: 'in_progress',
        is_retention_call: claimIsRetentionCall
      };
      if (claimAgentType === 'buffer') {
        updateFields.buffer_agent_id = agentId;
      } else {
        updateFields.licensed_agent_id = agentId;
      }

      await supabase
        .from('verification_sessions')
        .update(updateFields)
        .eq('id', claimSessionId);

      // Update the lead with retention flag
      await supabase
        .from('leads')
        .update({ is_retention_call: claimIsRetentionCall } as any)
        .eq('submission_id', claimSubmissionId);

      // Log the call claim event
      const agentName = claimAgentType === 'buffer'
        ? bufferAgents.find(a => a.user_id === agentId)?.display_name || 'Buffer Agent'
        : licensedAgents.find(a => a.user_id === agentId)?.display_name || 'Licensed Agent';

      const { customerName, leadVendor } = await getLeadInfo(claimSubmissionId!);
      
      await logCallUpdate({
        submissionId: claimSubmissionId!,
        agentId: agentId,
        agentType: claimAgentType,
        agentName: agentName,
        eventType: 'call_claimed',
        eventDetails: {
          verification_session_id: claimSessionId,
          claimed_at: new Date().toISOString(),
          claimed_from_dashboard: true,
          claim_type: 'manual_claim'
        },
        verificationSessionId: claimSessionId!,
        customerName,
        leadVendor,
        isRetentionCall: claimIsRetentionCall
      });

      // Update daily_deal_flow if entry exists for today's date (buffer workflow only)
      if (claimAgentType === 'buffer') {
        const bufferAgentName = bufferAgents.find(a => a.user_id === agentId)?.display_name || 'N/A';
        const todayDateString = getTodayDateEST();
        
        // Check if daily_deal_flow entry exists with matching submission_id and today's date
        const { data: existingDailyDealEntry } = await supabase
          .from('daily_deal_flow')
          .select('id, date, submission_id')
          .eq('submission_id', claimSubmissionId)
          .eq('date', todayDateString)
          .maybeSingle();

        if (existingDailyDealEntry) {
          // Update the buffer_agent field only if entry exists AND date matches today
          await supabase
            .from('daily_deal_flow')
            .update({ 
              buffer_agent: bufferAgentName,
              is_retention_call: claimIsRetentionCall
            } as any)
            .eq('id', existingDailyDealEntry.id);
        }
      }

      // Send notification
      await supabase.functions.invoke('center-transfer-notification', {
        body: {
          type: 'reconnected',
          submissionId: claimSubmissionId,
          agentType: claimAgentType,
          agentName: agentName,
          leadData: claimLead
        }
      });

      // Store submissionId before clearing state for redirect
      const submissionIdForRedirect = claimSubmissionId;

      setClaimModalOpen(false);
      setClaimSessionId(null);
      setClaimSubmissionId(null);
      setClaimLead(null);
      setClaimBufferAgent("");
      setClaimLicensedAgent("");
      setClaimIsRetentionCall(false);
      
      toast({
        title: "Success",
        description: `Call claimed by ${agentName}`,
      });
      
      // Refresh leads data and analytics
      fetchLeads();
      fetchAnalytics();
      
      // Auto-redirect to the detailed session page - this will open existing session or create new one
      navigate(`/call-result-update?submissionId=${submissionIdForRedirect}`);
      
    } catch (error) {
      console.error('Error claiming call:', error);
      toast({
        title: "Error",
        description: "Failed to claim call",
        variant: "destructive",
      });
    } finally {
      setClaimLoading(false);
    }
  };

  const paginatedLeads = getPaginatedLeads();
  const totalPages = getTotalPages();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <NavigationHeader title="Agent Dashboard" />

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 ${isLicensedAgent ? 'grid-rows-2' : ''}`}>
          {/* Row 1 - Always shown */}
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Total Leads</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{analytics.totalLeads.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Submitted</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{analytics.submittedLeads.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{analytics.pendingLeads.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700 font-medium">This Week</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{analytics.leadsThisWeek.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          {/* Row 2 - Commission Stats (Only for Licensed Agents) */}
          {isLicensedAgent && (
            <>
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">Your Total Sales</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{commissionStats.totalSales.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">All-time submissions</p>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 border-cyan-100">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm text-cyan-700 font-medium">This Week Sales</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-900">{commissionStats.thisWeekSales.toLocaleString()}</p>
                  <p className="text-xs text-cyan-600 mt-1">Last 7 days</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700 font-medium">Today's Submissions</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{commissionStats.todaySales.toLocaleString()}</p>
                  <p className="text-xs text-orange-600 mt-1">So far today</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-filter">Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="not-submitted">Not Submitted</SelectItem>
                    <SelectItem value="no-result">No Result</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-filter">Search Leads</Label>
                <div className="relative">
                  <Input
                    id="name-filter"
                    type="text"
                    placeholder="Search by name, phone, submission ID, email, carrier, or agent..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className={isSearching ? 'pr-10' : ''}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Create new callbacks or manage leads</p>
              </div>
              <Button 
                onClick={() => navigate('/new-callback')}
                className="flex items-center space-x-2"
              >
                <Phone className="h-4 w-4" />
                <span>New Callback</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leads">Your Leads</TabsTrigger>
            <TabsTrigger value="verification">Verification Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            {/* Leads List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Total Leads</h2>
                {totalPages > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>

              {filteredLeads.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No leads found matching your filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedLeads.map((lead) => (
                    <Card key={lead.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold">{lead.customer_full_name}</h3>
                              <Badge className={getStatusColor(getLeadStatus(lead))}>
                                {getLeadStatus(lead)}
                              </Badge>
                            </div>
                            
                            {/* Basic Lead Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Phone:</span> {lead.phone_number || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Lead Source:</span> {lead.call_results[0]?.call_source || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Coverage:</span> ${lead.coverage_amount?.toLocaleString() || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Premium:</span> ${lead.monthly_premium?.toLocaleString() || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Date:</span>{' '}
                                {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Draft Date:</span>{' '}
                                {lead.call_results[0]?.draft_date ? format(new Date(lead.call_results[0].draft_date), 'MMM dd, yyyy') : 'N/A'}
                              </div>
                            </div>

                            {/* Call Result Details */}
                            {lead.call_results.length > 0 && (
                              <div className="border-t pt-3">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-1 text-sm">
                                  {lead.call_results[0].carrier && (
                                    <div>
                                      <span className="font-medium">Carrier:</span> {lead.call_results[0].carrier}
                                    </div>
                                  )}
                                  {lead.call_results[0].product_type && (
                                    <div>
                                      <span className="font-medium">Product:</span> {lead.call_results[0].product_type}
                                    </div>
                                  )}
                                  {lead.call_results[0].buffer_agent && (
                                    <div>
                                      <span className="font-medium">Buffer Agent:</span> {lead.call_results[0].buffer_agent}
                                    </div>
                                  )}
                                  {lead.call_results[0].agent_who_took_call && (
                                    <div>
                                      <span className="font-medium">Agent:</span> {lead.call_results[0].agent_who_took_call}
                                    </div>
                                  )}
                                  {lead.call_results[0].licensed_agent_account && (
                                    <div>
                                      <span className="font-medium">Licensed Agent:</span> {lead.call_results[0].licensed_agent_account}
                                    </div>
                                  )}
                                  {lead.call_results[0].status && (
                                    <div>
                                      <span className="font-medium">Status:</span> {lead.call_results[0].status}
                                    </div>
                                  )}
                                  {lead.call_results[0].submission_date && (
                                    <div>
                                      <span className="font-medium">Submitted:</span> {format(new Date(lead.call_results[0].submission_date), 'MMM dd, yyyy')}
                                    </div>
                                  )}
                                  {lead.call_results[0].sent_to_underwriting !== null && (
                                    <div>
                                      <span className="font-medium">Underwriting:</span> {lead.call_results[0].sent_to_underwriting ? 'Yes' : 'No'}
                                    </div>
                                  )}
                                </div>
                                {lead.call_results[0].notes && (
                                  <div className="mt-2">
                                    <span className="font-medium text-sm">Notes:</span>{' '}
                                    <span className="text-sm text-muted-foreground">{lead.call_results[0].notes}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Verification Session Info */}
                            {lead.verification_sessions && lead.verification_sessions.length > 0 && (
                              <div className="border-t pt-3">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Verification Session:
                                </h4>
                                <div className="flex items-center gap-4 text-sm">
                                  <Badge 
                                    className={`${
                                      lead.verification_sessions[0].status === 'completed' ? 'bg-green-100 text-green-800' :
                                      lead.verification_sessions[0].status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                      lead.verification_sessions[0].status === 'ready_for_transfer' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {lead.verification_sessions[0].status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  {lead.verification_sessions[0].progress_percentage !== null && (
                                    <span className="text-muted-foreground">
                                      {lead.verification_sessions[0].progress_percentage}% Complete
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openClaimModal(lead.submission_id)}
                              className="flex items-center gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              Claim Call
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/call-result-update?submissionId=${lead.submission_id}`)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Lead
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {/* Compact page list: show first, last, current +/- neighbors with ellipses */}
                          {(() => {
                            const maxButtons = 7;
                            const total = totalPages;
                            const current = currentPage;
                            const pages: Array<number | string> = [];

                            if (total <= maxButtons) {
                              for (let i = 1; i <= total; i++) pages.push(i);
                            } else {
                              const side = 1;
                              const left = Math.max(2, current - side);
                              const right = Math.min(total - 1, current + side);

                              pages.push(1);
                              if (left > 2) pages.push('left-ellipsis');

                              for (let p = left; p <= right; p++) pages.push(p);

                              if (right < total - 1) pages.push('right-ellipsis');
                              pages.push(total);
                            }

                            return pages.map((p, idx) => {
                              if (typeof p === 'string') {
                                return (
                                  <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                                );
                              }

                              return (
                                <Button
                                  key={`page-${p}`}
                                  variant={current === p ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handlePageChange(Number(p))}
                                  className="w-8 h-8 p-0"
                                >
                                  {p}
                                </Button>
                              );
                            });
                          })()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <VerificationDashboard />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Claim Call Modals */}
      <ClaimDroppedCallModal
        open={claimModalOpen && modalType === 'dropped'}
        loading={claimLoading}
        agentType={claimAgentType}
        bufferAgents={bufferAgents}
        licensedAgents={licensedAgents}
        fetchingAgents={fetchingAgents}
        claimBufferAgent={claimBufferAgent}
        claimLicensedAgent={claimLicensedAgent}
        isRetentionCall={claimIsRetentionCall}
        onAgentTypeChange={handleAgentTypeChange}
        onBufferAgentChange={setClaimBufferAgent}
        onLicensedAgentChange={setClaimLicensedAgent}
        onRetentionCallChange={setClaimIsRetentionCall}
        onCancel={() => setClaimModalOpen(false)}
        onClaim={handleClaimCall}
      />
      
      <ClaimLicensedAgentModal
        open={claimModalOpen && modalType === 'licensed'}
        loading={claimLoading}
        licensedAgents={licensedAgents}
        fetchingAgents={fetchingAgents}
        claimLicensedAgent={claimLicensedAgent}
        isRetentionCall={claimIsRetentionCall}
        onLicensedAgentChange={setClaimLicensedAgent}
        onRetentionCallChange={setClaimIsRetentionCall}
        onCancel={() => setClaimModalOpen(false)}
        onClaim={handleClaimCall}
      />
    </div>
  );
};

export default Dashboard;
