import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Phone, UserCheck, Clock, Activity, Users, Target, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AgentSession {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_type: 'buffer' | 'licensed';
  status: 'online' | 'in_call' | 'available' | 'offline';
  customer_name?: string;
  submission_id?: string;
  call_started_at?: string;
  verification_status?: string;
  progress_percentage?: number;
}

interface DashboardStats {
  total_buffer_agents: number;
  total_licensed_agents: number;
  agents_in_call: number;
  active_verifications: number;
  transferred_today: number;
  completed_today: number;
}

export const AgentActivityDashboard = () => {
  const [bufferAgents, setBufferAgents] = useState<AgentSession[]>([]);
  const [licensedAgents, setLicensedAgents] = useState<AgentSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_buffer_agents: 0,
    total_licensed_agents: 0,
    agents_in_call: 0,
    active_verifications: 0,
    transferred_today: 0,
    completed_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentActivity();
    
    // Auto-refresh every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAgentActivity();
    }, 3000);

    // Set up real-time subscriptions
    const subscription = supabase
      .channel('agent_activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_sessions',
        },
        () => {
          fetchAgentActivity();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const fetchAgentActivity = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }

      // Fetch all verification sessions with agent and lead data
      const { data: sessions, error: sessionsError } = await supabase
        .from('verification_sessions')
        .select(`
          *,
          leads!inner(customer_full_name, phone_number)
        `)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      if (profilesError) throw profilesError;

      // Process buffer agents activity
      const bufferAgentMap = new Map<string, AgentSession>();
      const licensedAgentMap = new Map<string, AgentSession>();

      sessions?.forEach(session => {
        // Process buffer agents
        if (session.buffer_agent_id) {
          const bufferProfile = profiles?.find(p => p.user_id === session.buffer_agent_id);
          if (bufferProfile) {
            const isActive = ['pending', 'in_progress'].includes(session.status);
            
            bufferAgentMap.set(session.buffer_agent_id, {
              id: session.buffer_agent_id,
              agent_id: session.buffer_agent_id,
              agent_name: bufferProfile.display_name || 'Unknown',
              agent_type: 'buffer',
              status: isActive ? 'in_call' : 'available',
              customer_name: isActive ? session.leads?.customer_full_name : undefined,
              submission_id: isActive ? session.submission_id : undefined,
              call_started_at: isActive ? session.started_at : undefined,
              verification_status: session.status,
              progress_percentage: session.progress_percentage
            });
          }
        }

        // Process licensed agents
        if (session.licensed_agent_id && ['transferred', 'in_progress', 'completed'].includes(session.status)) {
          const licensedProfile = profiles?.find(p => p.user_id === session.licensed_agent_id);
          if (licensedProfile) {
            const isActive = session.status === 'in_progress';
            
            licensedAgentMap.set(session.licensed_agent_id, {
              id: session.licensed_agent_id,
              agent_id: session.licensed_agent_id,
              agent_name: licensedProfile.display_name || 'Unknown',
              agent_type: 'licensed',
              status: isActive ? 'in_call' : 'available',
              customer_name: session.leads?.customer_full_name,
              submission_id: session.submission_id,
              call_started_at: session.started_at,
              verification_status: session.status,
              progress_percentage: session.progress_percentage
            });
          }
        }
      });

      setBufferAgents(Array.from(bufferAgentMap.values()));
      setLicensedAgents(Array.from(licensedAgentMap.values()));

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const transferredToday = sessions?.filter(s => 
        s.status === 'transferred' && s.transferred_at?.startsWith(today)
      ).length || 0;
      
      const completedToday = sessions?.filter(s => 
        s.status === 'completed' && s.completed_at?.startsWith(today)
      ).length || 0;

      setStats({
        total_buffer_agents: bufferAgentMap.size,
        total_licensed_agents: licensedAgentMap.size,
        agents_in_call: Array.from(bufferAgentMap.values()).filter(a => a.status === 'in_call').length +
                       Array.from(licensedAgentMap.values()).filter(a => a.status === 'in_call').length,
        active_verifications: sessions?.filter(s => ['pending', 'in_progress', 'transferred'].includes(s.status)).length || 0,
        transferred_today: transferredToday,
        completed_today: completedToday
      });

    } catch (error) {
      console.error('Error fetching agent activity:', error);
      toast({
        title: "Error",
        description: "Failed to load agent activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchAgentActivity(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_call': return 'bg-green-500';
      case 'available': return 'bg-blue-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'in_call': return 'bg-green-100 text-green-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startTime?: string) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just started';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Activity Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring of agent activities (Updates every 3 seconds)</p>
        </div>
        <Button 
          onClick={handleManualRefresh}
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Buffer Agents</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total_buffer_agents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Licensed Agents</p>
                <p className="text-2xl font-bold text-purple-700">{stats.total_licensed_agents}</p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Agents in Call</p>
                <p className="text-2xl font-bold text-green-700">{stats.agents_in_call}</p>
              </div>
              <Phone className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Active Verifications</p>
                <p className="text-2xl font-bold text-orange-700">{stats.active_verifications}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Transferred Today</p>
                <p className="text-2xl font-bold text-indigo-700">{stats.transferred_today}</p>
              </div>
              <Target className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Completed Today</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.completed_today}</p>
              </div>
              <Clock className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buffer Agents */}
        <Card className="bg-gradient-to-b from-blue-50 to-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Buffer Agents ({bufferAgents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {bufferAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No buffer agents currently active
                </div>
              ) : (
                bufferAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {agent.agent_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(agent.status)}`} />
                      </div>
                      <div>
                        <p className="font-medium">{agent.agent_name}</p>
                        <Badge className={getStatusBadgeColor(agent.status)}>
                          {agent.status === 'in_call' ? 'In Call' : 'Available'}
                        </Badge>
                      </div>
                    </div>
                    
                    {agent.status === 'in_call' && (
                      <div className="text-right">
                        <p className="font-medium text-sm">{agent.customer_name}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={getVerificationStatusColor(agent.verification_status || '')}>
                            {agent.verification_status?.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(agent.call_started_at)}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {agent.progress_percentage}% verified
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Licensed Agents */}
        <Card className="bg-gradient-to-b from-purple-50 to-white">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Licensed Agents ({licensedAgents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {licensedAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No licensed agents currently handling cases
                </div>
              ) : (
                licensedAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {agent.agent_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(agent.status)}`} />
                      </div>
                      <div>
                        <p className="font-medium">{agent.agent_name}</p>
                        <Badge className={getStatusBadgeColor(agent.status)}>
                          {agent.status === 'in_call' ? 'Working on Case' : 'Available'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-sm">{agent.customer_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getVerificationStatusColor(agent.verification_status || '')}>
                          {agent.verification_status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(agent.call_started_at)}
                        </span>
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {agent.progress_percentage}% verified
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
