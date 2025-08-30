
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, LogOut, Phone, User, DollarSign, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { VerificationDashboard } from '@/components/VerificationDashboard';

type Lead = Database['public']['Tables']['leads']['Row'];
type CallResult = Database['public']['Tables']['call_results']['Row'];

interface LeadWithCallResult extends Lead {
  call_results: CallResult[];
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadWithCallResult[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadWithCallResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [leads, dateFilter, statusFilter, nameFilter]);

  const fetchLeads = async () => {
    try {
      // First, get all leads with their call results
      const { data: allLeads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          call_results (*)
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      if (!allLeads) {
        setLeads([]);
        setIsLoading(false);
        return;
      }

      // Filter leads to show:
      // 1. Leads that have call results from the current user
      // 2. Leads that don't have any call results yet (available for all users)
      const userRelevantLeads = allLeads.filter(lead => {
        const hasCallResults = lead.call_results && lead.call_results.length > 0;
        
        if (!hasCallResults) {
          // Show leads without call results to all users
          return true;
        }
        
        // Show leads that have call results from the current user
        return lead.call_results.some(result => result.agent_id === user?.id);
      });

      console.log('Filtered leads for user:', userRelevantLeads);
      setLeads(userRelevantLeads || []);
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

  const applyFilters = () => {
    let filtered = leads;

    if (dateFilter) {
      filtered = filtered.filter(lead => 
        lead.created_at && lead.created_at.includes(dateFilter)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (statusFilter === 'submitted') {
          return lead.call_results.some(result => result.application_submitted);
        } else if (statusFilter === 'not-submitted') {
          return lead.call_results.some(result => !result.application_submitted);
        } else if (statusFilter === 'no-result') {
          return lead.call_results.length === 0;
        }
        return true;
      });
    }

    if (nameFilter) {
      filtered = filtered.filter(lead =>
        lead.customer_full_name?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    setFilteredLeads(filtered);
  };

  const getLeadStatus = (lead: LeadWithCallResult) => {
    if (lead.call_results.length === 0) return 'No Result';
    const latestResult = lead.call_results[0];
    return latestResult.application_submitted ? 'Submitted' : latestResult.status || 'Not Submitted';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-success text-success-foreground';
      case 'No Result': return 'bg-muted text-muted-foreground';
      default: return 'bg-warning text-warning-foreground';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground">Agent Dashboard</h1>
            <Badge variant="outline" className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{user?.email}</span>
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics Dashboard
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                <Label htmlFor="name-filter">Customer Name</Label>
                <Input
                  id="name-filter"
                  type="text"
                  placeholder="Search by name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total Leads</span>
              </div>
              <p className="text-2xl font-bold">{leads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Submitted</span>
              </div>
              <p className="text-2xl font-bold">
                {leads.filter(l => l.call_results.some(r => r.application_submitted)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold">
                {leads.filter(l => l.call_results.length === 0 || l.call_results.some(r => !r.application_submitted)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">This Week</span>
              </div>
              <p className="text-2xl font-bold">
                {leads.filter(l => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return l.created_at && new Date(l.created_at) > weekAgo;
                }).length}
              </p>
            </CardContent>
          </Card>
        </div>

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
                <h2 className="text-xl font-semibold">Your Submissions ({filteredLeads.length})</h2>
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
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold">{lead.customer_full_name}</h3>
                              <Badge className={getStatusColor(getLeadStatus(lead))}>
                                {getLeadStatus(lead)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Phone:</span> {lead.phone_number || 'N/A'}
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
                            </div>
                            {lead.call_results.length > 0 && lead.call_results[0].notes && (
                              <div className="mt-2">
                                <span className="font-medium text-sm">Notes:</span>{' '}
                                <span className="text-sm text-muted-foreground">{lead.call_results[0].notes}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/call-result-update?submissionId=${lead.submission_id}`)}
                          >
                            {lead.call_results.length > 0 ? 'View/Edit' : 'Update Result'}
                          </Button>
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
                            const maxButtons = 7; // total buttons to show including first/last
                            const total = totalPages;
                            const current = currentPage;
                            const pages: Array<number | string> = [];

                            if (total <= maxButtons) {
                              for (let i = 1; i <= total; i++) pages.push(i);
                            } else {
                              const side = 1; // neighbors on each side of current
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
                                  <span key={p + idx} className="px-2 text-sm text-muted-foreground">…</span>
                                );
                              }

                              return (
                                <Button
                                  key={p}
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
    </div>
  );
};

export default Dashboard;
