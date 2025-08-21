import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColoredProgress } from "@/components/ui/colored-progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Clock, User, Filter, Search, RefreshCw, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface VerificationSession {
  id: string;
  submission_id: string;
  status: string;
  progress_percentage: number;
  total_fields: number;
  verified_fields: number;
  started_at: string;
  buffer_agent_id?: string;
  licensed_agent_id?: string;
  buffer_agent_profile?: {
    display_name: string;
  };
  licensed_agent_profile?: {
    display_name: string;
  };
  leads?: {
    customer_full_name: string;
    phone_number: string;
  };
}

export const VerificationDashboard = () => {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchVerificationSessions();
    
    // Set up auto-refresh every 5 seconds
    const autoRefreshInterval = setInterval(() => {
      fetchVerificationSessions();
    }, 5000);
    
    // Set up real-time subscription for verification sessions
    const subscription = supabase
      .channel('verification_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_sessions',
        },
        () => {
          fetchVerificationSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(autoRefreshInterval);
      subscription.unsubscribe();
    };
  }, []);

  const fetchVerificationSessions = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }
      
      const { data, error } = await supabase
        .from('verification_sessions')
        .select(`
          *,
          leads!inner(customer_full_name, phone_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for buffer and licensed agents separately
      const bufferAgentIds = data?.map(session => session.buffer_agent_id).filter(Boolean) || [];
      const licensedAgentIds = data?.map(session => session.licensed_agent_id).filter(Boolean) || [];
      const allAgentIds = [...new Set([...bufferAgentIds, ...licensedAgentIds])];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', allAgentIds);

      // Combine the data
      const sessionsWithProfiles = data?.map(session => ({
        ...session,
        buffer_agent_profile: profiles?.find(p => p.user_id === session.buffer_agent_id),
        licensed_agent_profile: profiles?.find(p => p.user_id === session.licensed_agent_id)
      })) || [];

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error fetching verification sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load verification sessions",
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
    fetchVerificationSessions(true);
  };

  const claimTransfer = async (sessionId: string, submissionId: string) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Error",
          description: "Unable to get current user information",
          variant: "destructive",
        });
        return;
      }

      // Update the verification session with the current user as licensed agent
      const { error: updateError } = await supabase
        .from('verification_sessions')
        .update({ 
          licensed_agent_id: user.id,
          status: 'in_progress' // Change status to in_progress when claimed
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Transfer Claimed",
        description: "You have successfully claimed this transfer. Opening verification panel...",
      });

      // Refresh the dashboard to show updated data
      fetchVerificationSessions();

      // Navigate to the call result update page to open verification panel
      navigate(`/call-result-update?submissionId=${submissionId}`);

    } catch (error) {
      console.error('Error claiming transfer:', error);
      toast({
        title: "Error",
        description: "Failed to claim transfer",
        variant: "destructive",
      });
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.leads?.customer_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.submission_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready_for_transfer': return 'bg-green-100 text-green-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'call_dropped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressLabel = (percentage: number) => {
    if (percentage >= 76) return "Ready for Transfer";
    if (percentage >= 51) return "Nearly Complete";
    if (percentage >= 26) return "In Progress";
    return "Just Started";
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 76) return "text-green-600";
    if (percentage >= 51) return "text-yellow-600";
    if (percentage >= 26) return "text-orange-600";
    return "text-red-600";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const viewSession = (submissionId: string) => {
    navigate(`/call-result-update?submissionId=${submissionId}`);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Verification Dashboard</h1>
          <p className="text-muted-foreground">Monitor real-time verification progress (Auto-refreshes every 5 seconds)</p>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name or submission ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready_for_transfer">Ready for Transfer</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="call_dropped">Call Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Sessions ({filteredSessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Buffer Agent</TableHead>
                <TableHead>LA Agent</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.leads?.customer_full_name}</div>
                      <div className="text-sm text-muted-foreground">{session.leads?.phone_number}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{session.buffer_agent_profile?.display_name || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{session.licensed_agent_profile?.display_name || 'Not Assigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={`font-semibold ${getProgressTextColor(session.progress_percentage)}`}>
                          {session.progress_percentage}%
                        </span>
                        <span className="text-muted-foreground">
                          {session.verified_fields}/{session.total_fields}
                        </span>
                      </div>
                      <ColoredProgress 
                        value={session.progress_percentage} 
                        className="h-3 transition-all duration-500"
                      />
                      <div className={`text-xs font-medium px-2 py-1 rounded-full text-center ${
                        session.progress_percentage >= 76 ? 'bg-green-100 text-green-800' :
                        session.progress_percentage >= 51 ? 'bg-yellow-100 text-yellow-800' :
                        session.progress_percentage >= 26 ? 'bg-orange-100 text-orange-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {getProgressLabel(session.progress_percentage)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status === 'call_dropped' ? 'Call Dropped' : session.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatTimeAgo(session.started_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {session.status === 'call_dropped' ? (
                        <Button
                          variant="outline"
                          onClick={() => claimTransfer(session.id, session.submission_id)}
                          className="text-red-600 border-red-600"
                        >
                          Claim Dropped Call
                        </Button>
                      ) : session.status === 'transferred' && !session.licensed_agent_id ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => claimTransfer(session.id, session.submission_id)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <UserCheck className="h-4 w-4" />
                          Claim Transfer
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => viewSession(session.submission_id)}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No verification sessions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
