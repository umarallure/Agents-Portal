import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, Phone, User, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { useAuth } from '@/hooks/useAuth';
import { useLicensedAgent } from '@/hooks/useLicensedAgent';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

type CommissionLead = {
  id: string;
  submission_id: string;
  insured_name: string | null;
  client_phone_number: string | null;
  carrier: string | null;
  monthly_premium: number | null;
  face_amount: number | null;
  status: string;
  licensed_agent_account: string;
  buffer_agent: string | null;
  agent: string | null;
  product_type: string | null;
  draft_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const CommissionPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { licensedAgentInfo, displayName, loading: licensedLoading } = useLicensedAgent();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<CommissionLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<CommissionLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (!authLoading && !licensedLoading && (!user || !licensedAgentInfo)) {
      navigate('/auth');
    }
  }, [user, licensedAgentInfo, authLoading, licensedLoading, navigate]);

  useEffect(() => {
    if (licensedAgentInfo && displayName) {
      fetchLeads();
    }
  }, [licensedAgentInfo, displayName]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [leads, startDateFilter, endDateFilter, nameFilter, carrierFilter, productFilter]);

  const fetchLeads = async () => {
    if (!displayName) return;

    try {
      // Get leads from daily_deal_flow where licensed_agent_account matches display name and status is 'Pending Approval'
      const { data: leadsData, error: leadsError } = await supabase
        .from('daily_deal_flow')
        .select('*')
        .eq('licensed_agent_account', displayName)
        .eq('status', 'Pending Approval')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      setLeads(leadsData || []);
    } catch (error) {
      console.error('Error fetching commission leads:', error);
      toast({
        title: "Error fetching leads",
        description: "Unable to load your commission leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = leads;

    // Date range filter
    if (startDateFilter) {
      filtered = filtered.filter(lead => {
        if (!lead.created_at) return false;
        const leadDate = new Date(lead.created_at);
        const startDate = new Date(startDateFilter);
        return leadDate >= startDate;
      });
    }

    if (endDateFilter) {
      filtered = filtered.filter(lead => {
        if (!lead.created_at) return false;
        const leadDate = new Date(lead.created_at);
        const endDate = new Date(endDateFilter);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        return leadDate <= endDate;
      });
    }

    // Name filter
    if (nameFilter) {
      filtered = filtered.filter(lead =>
        lead.insured_name?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Carrier filter
    if (carrierFilter && carrierFilter !== 'all') {
      filtered = filtered.filter(lead => lead.carrier === carrierFilter);
    }

    // Product type filter
    if (productFilter && productFilter !== 'all') {
      filtered = filtered.filter(lead => lead.product_type === productFilter);
    }

    setFilteredLeads(filtered);
  };

  const getLeadStatus = (lead: CommissionLead) => {
    return lead.status || 'Available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Approval': return 'bg-yellow-500 text-white';
      case 'Approved': return 'bg-green-500 text-white';
      default: return 'bg-blue-500 text-white';
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

  const paginatedLeads = getPaginatedLeads();
  const totalPages = getTotalPages();

  if (authLoading || licensedLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your commission portal...</p>
        </div>
      </div>
    );
  }

  if (!licensedAgentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Access denied. Licensed agent authentication required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <NavigationHeader title="Commission Portal" />

      <div className="container mx-auto px-4 py-8">
        {/* Display Name Badge */}
        <div className="mb-6">
          <Badge variant="outline" className="flex items-center space-x-1 w-fit">
            <User className="h-3 w-3" />
            <span>{displayName}</span>
          </Badge>
        </div>
        
        {/* Stats - 8 Cards in 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Row 1 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">All Time Sales</span>
              </div>
              <p className="text-2xl font-bold">{leads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Premium</span>
              </div>
              <p className="text-2xl font-bold">
                ${leads.reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Avg Premium</span>
              </div>
              <p className="text-2xl font-bold">
                ${leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0) / leads.length).toLocaleString() : '0'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Total Face Amount</span>
              </div>
              <p className="text-2xl font-bold">
                ${leads.reduce((sum, lead) => sum + (lead.face_amount || 0), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          {/* Row 2 - Time-based Analytics */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                <span className="text-sm text-muted-foreground">This Month Sales</span>
              </div>
              <p className="text-2xl font-bold">
                {leads.filter(l => {
                  if (!l.created_at) return false;
                  const leadDate = new Date(l.created_at);
                  const now = new Date();
                  return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">This Week Sales</span>
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Today Sales</span>
              </div>
              <p className="text-2xl font-bold">
                {leads.filter(l => {
                  if (!l.created_at) return false;
                  const leadDate = new Date(l.created_at);
                  const today = new Date();
                  return leadDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-indigo-500" />
                <span className="text-sm text-muted-foreground">Daily Avg Sales This Week</span>
              </div>
              <p className="text-2xl font-bold">
                {(() => {
                  const weekLeads = leads.filter(l => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return l.created_at && new Date(l.created_at) > weekAgo;
                  });
                  return (weekLeads.length / 7).toFixed(1);
                })()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Product Mix Stats - Level vs GI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                  <h3 className="text-lg font-semibold text-blue-900">All Time Level Products Sales</h3>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-100">
                  {(() => {
                    const levelCount = leads.filter(lead => {
                      const productType = lead.product_type?.toLowerCase() || '';
                      const carrier = lead.carrier?.toLowerCase() || '';
                      if (productType.includes('graded') && carrier.includes('gtl')) return false;
                      return productType.includes('level') || productType.includes('graded');
                    }).length;
                    return levelCount;
                  })()} sales
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total Count:</span>
                  <span className="font-semibold text-blue-900">
                    {(() => {
                      const levelCount = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return false;
                        return productType.includes('level') || productType.includes('graded');
                      }).length;
                      return levelCount.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total Premium:</span>
                  <span className="font-semibold text-blue-900">
                    ${(() => {
                      const levelPremium = leads
                        .filter(lead => {
                          const productType = lead.product_type?.toLowerCase() || '';
                          const carrier = lead.carrier?.toLowerCase() || '';
                          if (productType.includes('graded') && carrier.includes('gtl')) return false;
                          return productType.includes('level') || productType.includes('graded');
                        })
                        .reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0);
                      return levelPremium.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Percentage:</span>
                  <span className="font-semibold text-blue-900">
                    {(() => {
                      const levelCount = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return false;
                        return productType.includes('level') || productType.includes('graded');
                      }).length;
                      return leads.length > 0 ? Math.round((levelCount / leads.length) * 100) : 0;
                    })()}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Avg Premium:</span>
                  <span className="font-semibold text-blue-900">
                    ${(() => {
                      const levelLeads = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return false;
                        return productType.includes('level') || productType.includes('graded');
                      });
                      const levelPremium = levelLeads.reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0);
                      return levelLeads.length > 0 ? Math.round(levelPremium / levelLeads.length).toLocaleString() : 0;
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-orange-700" />
                  <h3 className="text-lg font-semibold text-orange-900">All Time GI Products Sales</h3>
                </div>
                <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-100">
                  {(() => {
                    const giCount = leads.filter(lead => {
                      const productType = lead.product_type?.toLowerCase() || '';
                      const carrier = lead.carrier?.toLowerCase() || '';
                      if (productType.includes('graded') && carrier.includes('gtl')) return true;
                      if (productType.includes('level') || productType.includes('graded')) return false;
                      return productType.includes('gi') || 
                             productType.includes('immediate') || 
                             productType.includes('rop') || 
                             productType.includes('modified') || 
                             productType.includes('standard') || 
                             productType.includes('preferred') ||
                             productType.length > 0;
                    }).length;
                    return giCount;
                  })()} sales
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">Total Count:</span>
                  <span className="font-semibold text-orange-900">
                    {(() => {
                      const giCount = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return true;
                        if (productType.includes('level') || productType.includes('graded')) return false;
                        return productType.includes('gi') || 
                               productType.includes('immediate') || 
                               productType.includes('rop') || 
                               productType.includes('modified') || 
                               productType.includes('standard') || 
                               productType.includes('preferred') ||
                               productType.length > 0;
                      }).length;
                      return giCount.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">Total Premium:</span>
                  <span className="font-semibold text-orange-900">
                    ${(() => {
                      const giPremium = leads
                        .filter(lead => {
                          const productType = lead.product_type?.toLowerCase() || '';
                          const carrier = lead.carrier?.toLowerCase() || '';
                          if (productType.includes('graded') && carrier.includes('gtl')) return true;
                          if (productType.includes('level') || productType.includes('graded')) return false;
                          return productType.includes('gi') || 
                                 productType.includes('immediate') || 
                                 productType.includes('rop') || 
                                 productType.includes('modified') || 
                                 productType.includes('standard') || 
                                 productType.includes('preferred') ||
                                 productType.length > 0;
                        })
                        .reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0);
                      return giPremium.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">Percentage:</span>
                  <span className="font-semibold text-orange-900">
                    {(() => {
                      const giCount = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return true;
                        if (productType.includes('level') || productType.includes('graded')) return false;
                        return productType.includes('gi') || 
                               productType.includes('immediate') || 
                               productType.includes('rop') || 
                               productType.includes('modified') || 
                               productType.includes('standard') || 
                               productType.includes('preferred') ||
                               productType.length > 0;
                      }).length;
                      return leads.length > 0 ? Math.round((giCount / leads.length) * 100) : 0;
                    })()}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">Avg Premium:</span>
                  <span className="font-semibold text-orange-900">
                    ${(() => {
                      const giLeads = leads.filter(lead => {
                        const productType = lead.product_type?.toLowerCase() || '';
                        const carrier = lead.carrier?.toLowerCase() || '';
                        if (productType.includes('graded') && carrier.includes('gtl')) return true;
                        if (productType.includes('level') || productType.includes('graded')) return false;
                        return productType.includes('gi') || 
                               productType.includes('immediate') || 
                               productType.includes('rop') || 
                               productType.includes('modified') || 
                               productType.includes('standard') || 
                               productType.includes('preferred') ||
                               productType.length > 0;
                      });
                      const giPremium = giLeads.reduce((sum, lead) => sum + (lead.monthly_premium || 0), 0);
                      return giLeads.length > 0 ? Math.round(giPremium / giLeads.length).toLocaleString() : 0;
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphs - 2 Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Graph 1: Premium Distribution by Carrier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Premium by Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const carrierData = leads.reduce((acc, lead) => {
                    const carrier = lead.carrier || 'Unknown';
                    if (!acc[carrier]) {
                      acc[carrier] = { count: 0, premium: 0 };
                    }
                    acc[carrier].count++;
                    acc[carrier].premium += lead.monthly_premium || 0;
                    return acc;
                  }, {} as Record<string, { count: number; premium: number }>);

                  const sortedCarriers = Object.entries(carrierData)
                    .sort((a, b) => b[1].premium - a[1].premium)
                    .slice(0, 5);

                  const maxPremium = sortedCarriers[0]?.[1].premium || 1;

                  return sortedCarriers.map(([carrier, data]) => (
                    <div key={carrier} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{carrier}</span>
                        <span className="text-muted-foreground">${data.premium.toLocaleString()} ({data.count})</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${(data.premium / maxPremium) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
                {leads.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graph 2: Submissions Over Time with Targets - Line Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Submissions (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Get daily data for last 7 days
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  date.setHours(0, 0, 0, 0);
                  return date;
                });

                const dailyData = last7Days.map(date => {
                  const count = leads.filter(l => {
                    if (!l.created_at) return false;
                    const leadDate = new Date(l.created_at);
                    leadDate.setHours(0, 0, 0, 0);
                    return leadDate.getTime() === date.getTime();
                  }).length;

                  return {
                    date: format(date, 'MMM d'),
                    fullDate: format(date, 'MMM dd, yyyy'),
                    count,
                    dailyTarget: 10,
                    weeklyAvg: 8
                  };
                });

                if (leads.length === 0) {
                  return (
                    <div className="flex items-center justify-center" style={{ height: 300 }}>
                      <p className="text-center text-muted-foreground">No data available</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={dailyData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          interval="preserveStartEnd"
                          minTickGap={30}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'count') return [value, 'Submissions'];
                            if (name === 'dailyTarget') return [value, 'Daily Target'];
                            if (name === 'weeklyAvg') return [value, 'Weekly Avg'];
                            return [value, name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          formatter={(value: string) => {
                            if (value === 'count') return 'Actual';
                            if (value === 'dailyTarget') return 'Daily Target (10)';
                            if (value === 'weeklyAvg') return 'Weekly Avg (8)';
                            return value;
                          }}
                        />
                        
                        {/* Target lines */}
                        <ReferenceLine 
                          y={10} 
                          stroke="#22c55e" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ value: '', position: 'insideTopRight' }}
                        />
                        <ReferenceLine 
                          y={8} 
                          stroke="#f97316" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ value: '', position: 'insideTopRight' }}
                        />
                        
                        {/* Data line */}
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          name="count"
                        />
                        
                        {/* Hidden lines for legend */}
                        <Line 
                          type="monotone" 
                          dataKey="dailyTarget" 
                          stroke="#22c55e" 
                          strokeWidth={0}
                          dot={false}
                          legendType="line"
                          strokeDasharray="5 5"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="weeklyAvg" 
                          stroke="#f97316" 
                          strokeWidth={0}
                          dot={false}
                          legendType="line"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Stats below graph */}
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Daily</p>
                        <p className="text-lg font-bold">
                          {dailyData.length > 0 ? (dailyData.reduce((sum, d) => sum + d.count, 0) / 7).toFixed(1) : '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Days Above Target</p>
                        <p className="text-lg font-bold text-green-600">
                          {dailyData.filter(d => d.count >= 10).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target Achievement</p>
                        <p className="text-lg font-bold text-blue-600">
                          {dailyData.length > 0 ? Math.round((dailyData.reduce((sum, d) => sum + d.count, 0) / (7 * 10)) * 100) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range Filters */}
              <div className="space-y-2">
                <Label htmlFor="start-date-filter">Start Date</Label>
                <Input
                  id="start-date-filter"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date-filter">End Date</Label>
                <Input
                  id="end-date-filter"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
              
              {/* Name Filter */}
              <div className="space-y-2">
                <Label htmlFor="name-filter">Insured Name</Label>
                <Input
                  id="name-filter"
                  type="text"
                  placeholder="Search by name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
              
              {/* Carrier Filter */}
              <div className="space-y-2">
                <Label htmlFor="carrier-filter">Carrier</Label>
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger id="carrier-filter">
                    <SelectValue placeholder="All Carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {(() => {
                      const carriers = Array.from(new Set(leads.map(l => l.carrier).filter(Boolean)));
                      return carriers.sort().map(carrier => (
                        <SelectItem key={carrier} value={carrier!}>
                          {carrier}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Product Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="product-filter">Product Type</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger id="product-filter">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {(() => {
                      const products = Array.from(new Set(leads.map(l => l.product_type).filter(Boolean)));
                      return products.sort().map(product => (
                        <SelectItem key={product} value={product!}>
                          {product}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Clear Filters Button */}
            {(startDateFilter || endDateFilter || nameFilter || carrierFilter !== 'all' || productFilter !== 'all') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setNameFilter('');
                    setCarrierFilter('all');
                    setProductFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Pending Commission Approvals ({filteredLeads.length})</h2>
            {totalPages > 1 && (
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>

          {filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No pending commission approvals found matching your filters.</p>
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
                          <h3 className="text-lg font-semibold">{lead.insured_name}</h3>
                          <Badge className={getStatusColor(getLeadStatus(lead))}>
                            {getLeadStatus(lead)}
                          </Badge>
                        </div>

                        {/* Basic Lead Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Phone:</span> {lead.client_phone_number || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Face Amount:</span> ${lead.face_amount?.toLocaleString() || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Monthly Premium:</span> ${lead.monthly_premium?.toLocaleString() || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </div>

                        {/* Additional Lead Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Carrier:</span> {lead.carrier || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Product:</span> {lead.product_type || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Buffer Agent:</span> {lead.buffer_agent || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Agent:</span> {lead.agent || 'N/A'}
                          </div>
                        </div>

                        {/* Draft Date */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Draft Date:</span>{' '}
                            {lead.draft_date ? format(new Date(lead.draft_date), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </div>
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
      </div>
    </div>
  );
};

export default CommissionPortal;