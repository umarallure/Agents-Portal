import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck, Search, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { canAccessLockPoliciesManager } from '@/lib/userPermissions';
import { useAuth } from '@/hooks/useAuth';

interface Policy {
  id: number;
  deal_name: string | null;
  ghl_name: string | null;
  policy_number: string | null;
  policy_status: string | null;
  carrier: string | null;
  deal_creation_date: string | null;
  phone_number: string | null;
  sales_agent: string | null;
  lock_status: string | null;
  locked_at: string | null;
  locked_by_name: string | null;
  lock_reason: string | null;
}

const ITEMS_PER_PAGE = 25;

const formatDateToEST = (dateString: string | Date | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    const year = estDate.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return 'N/A';
  }
};

const LockPoliciesManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lockFilter, setLockFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('monday_com_deals')
        .select('*')
        .eq('carrier', 'ANAM')
        .in('policy_status', ['Issued Paid', 'Issued Not Paid', 'Pending', 'Pending Lapse'])
        .order('deal_creation_date', { ascending: false });

      if (error) throw error;

      const mappedPolicies: Policy[] = (data || []).map((policy: any) => ({
        id: policy.id,
        deal_name: policy.deal_name,
        ghl_name: policy.ghl_name,
        policy_number: policy.policy_number,
        policy_status: policy.policy_status,
        carrier: policy.carrier,
        deal_creation_date: policy.deal_creation_date,
        phone_number: policy.phone_number,
        sales_agent: policy.sales_agent,
        lock_status: policy.lock_status,
        locked_at: policy.locked_at,
        locked_by_name: policy.locked_by_name,
        lock_reason: policy.lock_reason
      }));

      setPolicies(mappedPolicies);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!canAccessLockPoliciesManager(user?.id)) {
      navigate('/dashboard');
      return;
    }
    fetchPolicies();
  }, [user, navigate, fetchPolicies]);

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = !searchTerm || 
      (policy.ghl_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (policy.policy_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (policy.sales_agent?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || policy.policy_status === statusFilter;
    
    const matchesLock = lockFilter === 'all' || 
      (lockFilter === 'locked' && (policy.lock_status === 'locked_successfully' || policy.lock_status === 'already_locked' || policy.lock_status === 'unable_to_lock')) ||
      (lockFilter === 'pending' && (!policy.lock_status || policy.lock_status === 'pending'));
    
    return matchesSearch && matchesStatus && matchesLock;
  });

  const totalPages = Math.ceil(filteredPolicies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPolicies = filteredPolicies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, lockFilter]);

  const getLockStatusBadge = (status: string | null) => {
    if (status === 'locked_successfully') {
      return <Badge className="bg-green-100 text-green-800"><Lock className="h-3 w-3 mr-1" /> Locked Successfully</Badge>;
    }
    if (status === 'already_locked') {
      return <Badge className="bg-yellow-100 text-yellow-800"><Lock className="h-3 w-3 mr-1" /> Already Locked</Badge>;
    }
    if (status === 'unable_to_lock') {
      return <Badge className="bg-red-100 text-red-800"><Lock className="h-3 w-3 mr-1" /> Unable to Lock</Badge>;
    }
    return <Badge variant="secondary"><Unlock className="h-3 w-3 mr-1" /> Pending</Badge>;
  };

  const getPolicyStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Issued Paid':
        return <Badge className="bg-green-100 text-green-800">Issued Paid</Badge>;
      case 'Issued Not Paid':
        return <Badge className="bg-blue-100 text-blue-800">Issued Not Paid</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Pending Lapse':
        return <Badge className="bg-red-100 text-red-800">Pending Lapse</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Lock Policies Manager" />
      
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Manager View - All ANAM Policies</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{filteredPolicies.length}</span> policies
            </div>
            <Button variant="outline" size="sm" onClick={fetchPolicies}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="search"
                placeholder="Search by name, policy #, or agent..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-[180px]">
            <Label>Policy Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Issued Paid">Issued Paid</SelectItem>
                <SelectItem value="Issued Not Paid">Issued Not Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Pending Lapse">Pending Lapse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Label>Lock Status</Label>
            <Select value={lockFilter} onValueChange={setLockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <Card className="p-8 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No policies found matching your filters.</p>
          </Card>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Policy Status</TableHead>
                    <TableHead>Lock Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Locked By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.ghl_name || 'N/A'}</TableCell>
                      <TableCell>{policy.policy_number || 'N/A'}</TableCell>
                      <TableCell>{getPolicyStatusBadge(policy.policy_status)}</TableCell>
                      <TableCell>{getLockStatusBadge(policy.lock_status)}</TableCell>
                      <TableCell>
                        {policy.lock_reason ? (
                          <span className="text-sm text-red-600">{policy.lock_reason}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateToEST(policy.deal_creation_date)}</TableCell>
                      <TableCell>{policy.sales_agent || 'N/A'}</TableCell>
                      <TableCell>
                        {policy.locked_by_name ? (
                          <span className="text-sm">{policy.locked_by_name} on {formatDateToEST(policy.locked_at)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredPolicies.length)} of {filteredPolicies.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LockPoliciesManager;
