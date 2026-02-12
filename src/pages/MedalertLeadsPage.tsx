import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Package, CreditCard, Landmark, Loader2, Eye, Clock, List } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { NavigationHeader } from '@/components/NavigationHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type MedalertLead = {
  id: string;
  submission_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  quoted_product: string;
  company_name: string;
  total_upfront_cost: number;
  total_monthly_cost: number;
  payment_method: 'credit_card' | 'ach';
  status: string;
  created_at: string;
  protection_plan_included: boolean;
  card_number_last_four: string | null;
  cardholder_name: string | null;
  account_holder_name: string | null;
  account_number_last_four: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
};

const MedalertLeadsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<MedalertLead[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<MedalertLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/center-auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('medalert_leads' as any)
        .select('*')
        .eq('submitted_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads((data as unknown as MedalertLead[]) || []);
    } catch (error) {
      console.error('Error fetching medalert leads:', error);
      toast({
        title: "Error fetching leads",
        description: "Unable to load your Medalert leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = (leadsList: MedalertLead[]) => {
    let filtered = leadsList;

    // Filter by search
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.first_name?.toLowerCase().includes(search) ||
        lead.last_name?.toLowerCase().includes(search) ||
        lead.phone_number?.includes(search) ||
        lead.submission_id?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const allLeads = filterLeads(leads);
  const pendingLeads = filterLeads(leads.filter(l => l.status === 'pending'));

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleViewDetails = (lead: MedalertLead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const renderLeadCard = (lead: MedalertLead) => (
    <Card key={lead.id} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left side - Client Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">
                {lead.first_name} {lead.last_name}
              </h3>
              <Badge className={getStatusBadge(lead.status)}>
                {lead.status}
              </Badge>
              {lead.protection_plan_included && (
                <Badge variant="outline" className="text-blue-600">
                  Protection Plan
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {lead.phone_number}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {lead.submission_id} • Submitted {format(new Date(lead.created_at), 'MMM dd, yyyy')}
            </p>
          </div>

          {/* Middle - Product Info */}
          <div className="flex-1 md:text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{lead.quoted_product}</span>
            </div>
            <p className="text-sm text-muted-foreground">{lead.company_name}</p>
          </div>

          {/* Right side - Payment & Cost */}
          <div className="flex-1 md:text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              {lead.payment_method === 'credit_card' ? (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Landmark className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(lead.total_upfront_cost)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(lead.total_monthly_cost)}/month
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewDetails(lead)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (isActiveQueue: boolean) => (
    <Card>
      <CardContent className="pt-6 text-center py-12">
        {isActiveQueue ? (
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        ) : (
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        )}
        <h3 className="text-lg font-medium">
          {isActiveQueue ? "No Active Queue leads" : "No Medalert leads found"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {searchFilter 
            ? "Try adjusting your search filters"
            : isActiveQueue 
              ? "No pending leads in the active queue"
              : "You haven't submitted any Medalert device quotes yet"}
        </p>
        <Button 
          onClick={() => navigate('/medalert-quote')}
          className="mt-4"
        >
          Submit New Quote
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader title="My Medalert Leads" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading your Medalert leads...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="My Medalert Leads" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/center-lead-portal')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <h1 className="text-3xl font-bold text-foreground">My Medalert Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Medalert device quotes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {leads.filter(l => l.status === 'pending').length}
              </div>
              <p className="text-sm text-muted-foreground">Active Queue (Pending)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.status === 'completed').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(leads.reduce((sum, l) => sum + (l.total_upfront_cost || 0), 0))}
              </div>
              <p className="text-sm text-muted-foreground">Total Upfront Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, phone, or submission ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Leads
              <Badge variant="secondary" className="ml-1">{allLeads.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Queue
              <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                {pendingLeads.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {allLeads.length === 0 ? (
              renderEmptyState(false)
            ) : (
              <div className="space-y-4">
                {allLeads.map(renderLeadCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-0">
            {pendingLeads.length === 0 ? (
              renderEmptyState(true)
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Active Queue</h3>
                      <p className="text-sm text-yellow-700">
                        These {pendingLeads.length} lead{pendingLeads.length !== 1 ? 's are' : ' is'} pending and waiting to be processed. 
                        Total value: {formatCurrency(pendingLeads.reduce((sum, l) => sum + (l.total_upfront_cost || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
                {pendingLeads.map(renderLeadCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Submission ID: {selectedLead?.submission_id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6 mt-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={getStatusBadge(selectedLead.status)}>
                  {selectedLead.status}
                </Badge>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Client Information</h4>
                  <p className="text-sm"><span className="text-muted-foreground">Name:</span> {selectedLead.first_name} {selectedLead.last_name}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {selectedLead.phone_number}</p>
                  {selectedLead.email && (
                    <p className="text-sm"><span className="text-muted-foreground">Email:</span> {selectedLead.email}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Address</h4>
                  <p className="text-sm">{selectedLead.address}</p>
                  <p className="text-sm">{selectedLead.city}, {selectedLead.state} {selectedLead.zip_code}</p>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <h4 className="font-medium mb-2">Product Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><span className="text-muted-foreground">Company:</span> {selectedLead.company_name}</p>
                  <p><span className="text-muted-foreground">Product:</span> {selectedLead.quoted_product}</p>
                  <p><span className="text-muted-foreground">Device Cost:</span> {formatCurrency(selectedLead.total_upfront_cost)}</p>
                  <p><span className="text-muted-foreground">Monthly:</span> {formatCurrency(selectedLead.total_monthly_cost)}</p>
                  {selectedLead.protection_plan_included && (
                    <p className="col-span-2 text-blue-600">✓ Protection Plan Included</p>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="font-medium mb-2">Payment Information</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Method:</span> {selectedLead.payment_method === 'credit_card' ? 'Credit Card' : 'ACH/Bank Transfer'}</p>
                  {selectedLead.payment_method === 'credit_card' ? (
                    <>
                      <p><span className="text-muted-foreground">Card ending in:</span> **** {selectedLead.card_number_last_four}</p>
                      <p><span className="text-muted-foreground">Cardholder:</span> {selectedLead.cardholder_name}</p>
                    </>
                  ) : (
                    <>
                      <p><span className="text-muted-foreground">Account ending in:</span> **** {selectedLead.account_number_last_four}</p>
                      <p><span className="text-muted-foreground">Account Holder:</span> {selectedLead.account_holder_name}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Submission Date */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Submitted on {format(new Date(selectedLead.created_at), 'MMMM dd, yyyy')} at {format(new Date(selectedLead.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedalertLeadsPage;
