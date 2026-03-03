import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, Shield, ShieldCheck, AlertTriangle, User, FileText, Calendar, Hash, KeyRound, ChevronRight, MapPin, Phone } from 'lucide-react';
import { canAccessLockPolicies, LOCK_POLICIES_USER_ID } from '@/lib/userPermissions';
import { useAuth } from '@/hooks/useAuth';

const LOCK_POLICIES_URL = 'https://www.americanamicable.com/cgi/pd/PolManage.cgi';

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
}

interface LeadInfo {
  date_of_birth: string | null;
  social_security: string | null;
  state: string | null;
  customer_full_name: string | null;
  street_address: string | null;
  city: string | null;
  zip_code: string | null;
  phone_number: string | null;
}

const getBusinessDateDaysAgo = (days: number): Date => {
  const date = new Date();
  let daysCounted = 0;
  while (daysCounted < days) {
    date.setDate(date.getDate() - 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysCounted++;
    }
  }
  return date;
};

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

const formatSSN = (ssn: string | null): string => {
  if (!ssn) return 'N/A';
  const cleaned = ssn.replace(/[^0-9]/g, '');
  if (cleaned.length >= 4) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(-4)}`;
  }
  return ssn;
};

const extractFirstLastName = (fullName: string | null): { firstName: string; lastName: string } => {
  if (!fullName) return { firstName: 'N/A', lastName: 'N/A' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const LockPolicies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPolicies, setCurrentPolicies] = useState<Policy[]>([]);
  const [retroactivePolicies, setRetroactivePolicies] = useState<Policy[]>([]);
  const [leadInfoMap, setLeadInfoMap] = useState<Record<string, LeadInfo>>({});
  const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'current' | 'retroactive'>('current');
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  
  const [dispositionType, setDispositionType] = useState<'locked_successfully' | 'already_locked' | 'unable_to_lock' | ''>('');
  const [lockReason, setLockReason] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [savingDisposition, setSavingDisposition] = useState(false);
  
  const hasPassword = typeof window !== 'undefined' && !!localStorage.getItem('lock_policy_password');

  const currentPoliciesList = activeTab === 'current' ? currentPolicies : retroactivePolicies;
  const selectedPolicy = currentPoliciesList[selectedPolicyIndex] || null;
  const selectedLeadInfo = selectedPolicy ? (leadInfoMap[selectedPolicy.ghl_name?.toLowerCase().trim() || ''] || null) : null;

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const fiveBusinessDaysAgo = getBusinessDateDaysAgo(5);
      const fiveDaysAgoStr = fiveBusinessDaysAgo.toISOString().split('T')[0];
      
      const { data: policies, error, count } = await supabase
        .from('monday_com_deals')
        .select('*', { count: 'exact' })
        .eq('carrier', 'ANAM')
        .in('policy_status', ['Issued Paid', 'Issued Not Paid', 'Pending', 'Pending Lapse'])
        .eq('is_active', true)
        .or('lock_status.is.null,lock_status.not.eq.locked_successfully')
        .order('deal_creation_date', { ascending: false });

      if (error) {
        console.error('Error fetching policies:', error);
        throw error;
      }

      setTotalCount(count || 0);

      const current: Policy[] = [];
      const retroactive: Policy[] = [];
      
      const fiveDaysAgoDate = new Date(fiveDaysAgoStr);
      
      (policies || []).forEach((policy: any) => {
        const p: Policy = {
          id: policy.id,
          deal_name: policy.deal_name,
          ghl_name: policy.ghl_name,
          policy_number: policy.policy_number,
          policy_status: policy.policy_status,
          carrier: policy.carrier,
          deal_creation_date: policy.deal_creation_date,
          phone_number: policy.phone_number,
          sales_agent: policy.sales_agent,
          lock_status: policy.lock_status
        };
        
        const creationDate = p.deal_creation_date ? new Date(p.deal_creation_date) : null;
        if (creationDate && creationDate >= fiveDaysAgoDate) {
          current.push(p);
        } else {
          retroactive.push(p);
        }
      });
      
      setCurrentPolicies(current);
      setRetroactivePolicies(retroactive);
      
      const policiesToLookup = activeTab === 'current' ? current : retroactive;
      const policyToLookup = policiesToLookup[selectedPolicyIndex];
      
      if (policyToLookup && policyToLookup.ghl_name) {
        const normalizedGhlName = policyToLookup.ghl_name.toLowerCase().trim();
        
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('customer_full_name, date_of_birth, social_security, state, street_address, city, zip_code, phone_number')
          .ilike('customer_full_name', normalizedGhlName)
          .limit(1);
        
        console.log('Searching for:', normalizedGhlName);
        console.log('Leads found:', leads);
        console.log('Leads error:', leadsError);
        
        const infoMap: Record<string, LeadInfo> = {};
        if (leads && leads.length > 0) {
          const lead = leads[0];
          infoMap[normalizedGhlName] = {
            date_of_birth: lead.date_of_birth,
            social_security: lead.social_security,
            state: lead.state,
            customer_full_name: lead.customer_full_name,
            street_address: lead.street_address,
            city: lead.city,
            zip_code: lead.zip_code,
            phone_number: lead.phone_number
          };
        }
        setLeadInfoMap(infoMap);
      } else {
        setLeadInfoMap({});
      }
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
  }, [toast, selectedPolicyIndex, activeTab]);

  useEffect(() => {
    if (!canAccessLockPolicies(user?.id)) {
      navigate('/dashboard');
      return;
    }
    fetchPolicies();
  }, [user, navigate, fetchPolicies]);

  const handleSaveDisposition = async () => {
    if (!selectedPolicy || !dispositionType) {
      toast({
        title: "Required",
        description: "Please select a disposition option",
        variant: "destructive",
      });
      return;
    }

    if (dispositionType === 'unable_to_lock' && lockReason.length === 0) {
      toast({
        title: "Required",
        description: "Please select at least one reason",
        variant: "destructive",
      });
      return;
    }

    if (dispositionType !== 'unable_to_lock' && !password.trim()) {
      toast({
        title: "Required",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    if (dispositionType !== 'unable_to_lock' && password !== localStorage.getItem('lock_policy_password')) {
      toast({
        title: "Incorrect Password",
        description: "The password you entered is incorrect.",
        variant: "destructive",
      });
      return;
    }
    
    setSavingDisposition(true);
    try {
      let lockStatusValue: string;
      let lockReasonValue: string | null = null;
      
      if (dispositionType === 'locked_successfully') {
        lockStatusValue = 'locked_successfully';
      } else if (dispositionType === 'already_locked') {
        lockStatusValue = 'already_locked';
      } else if (dispositionType === 'unable_to_lock') {
        lockStatusValue = 'unable_to_lock';
        lockReasonValue = lockReason.join(', ');
      } else {
        lockStatusValue = dispositionType;
      }
      
      const { error } = await supabase
        .from('monday_com_deals')
        .update({ 
          lock_status: lockStatusValue,
          locked_at: new Date().toISOString(),
          locked_by: LOCK_POLICIES_USER_ID,
          locked_by_name: 'Justine',
          lock_password: dispositionType === 'locked_successfully' ? password : null,
          lock_reason: lockReasonValue
        })
        .eq('id', selectedPolicy.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Policy disposition saved successfully.",
      });
      
      setShowPolicyDialog(false);
      setDispositionType('');
      setLockReason([]);
      setPassword('');
      
      fetchPolicies();
    } catch (error) {
      console.error('Error saving disposition:', error);
      toast({
        title: "Error",
        description: "Failed to save disposition",
        variant: "destructive",
      });
    } finally {
      setSavingDisposition(false);
    }
  };

  const handleNextPolicy = () => {
    if (selectedPolicyIndex < currentPoliciesList.length - 1) {
      setSelectedPolicyIndex(selectedPolicyIndex + 1);
    } else {
      setSelectedPolicyIndex(0);
    }
  };

  const handleOpenPolicyDetails = () => {
    if (!selectedPolicy) return;
    setShowPolicyDialog(true);
    setDispositionType('');
    setLockReason([]);
    setPassword('');
  };

  const renderPolicyCard = () => {
    if (!selectedPolicy) return null;
    
    const leadInfo = selectedLeadInfo || {
      date_of_birth: null,
      social_security: null,
      state: null,
      customer_full_name: selectedPolicy.ghl_name,
      street_address: null,
      city: null,
      zip_code: null,
      phone_number: selectedPolicy.phone_number
    };
    
    const { firstName, lastName } = extractFirstLastName(leadInfo.customer_full_name);
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{leadInfo.customer_full_name || 'Unknown'}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2 text-lg">
                <FileText className="h-5 w-5" />
                <span className="font-semibold text-foreground">{selectedPolicy.policy_number || 'N/A'}</span>
              </CardDescription>
            </div>
            <Badge variant={selectedPolicy.policy_status === 'Issued Paid' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
              {selectedPolicy.policy_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" /> State
              </span>
              <span className="font-medium text-lg">{leadInfo.state || 'N/A'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date of Birth
              </span>
              <span className="font-medium text-lg">{formatDateToEST(leadInfo.date_of_birth)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Hash className="h-3 w-3" /> SSN
              </span>
              <span className="font-medium text-lg">{formatSSN(leadInfo.social_security)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <User className="h-3 w-3" /> First Name
              </span>
              <span className="font-medium text-lg">{firstName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <User className="h-3 w-3" /> Last Name
              </span>
              <span className="font-medium text-lg">{lastName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </span>
              <span className="font-medium text-lg">{leadInfo.phone_number || 'N/A'}</span>
            </div>
          </div>
          
          {(leadInfo.street_address || leadInfo.city || leadInfo.zip_code) && (
            <div className="pt-4 border-t">
              <span className="text-muted-foreground text-sm flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" /> Address
              </span>
              <p className="font-medium">
                {[leadInfo.street_address, leadInfo.city, leadInfo.state, leadInfo.zip_code].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <span className="text-muted-foreground text-sm">Created: {formatDateToEST(selectedPolicy.deal_creation_date)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {currentPoliciesList.length > 0 ? `Policy ${selectedPolicyIndex + 1} of ${currentPoliciesList.length}` : 'No policies'}
          </div>
          <Button onClick={handleOpenPolicyDetails}>
            <Lock className="h-4 w-4 mr-2" />
            Lock This Policy
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Lock Policies" />
      
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>Only accessible to Justine</span>
          </div>
          <div className="flex items-center gap-2">
            {hasPassword ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <KeyRound className="h-3 w-3 mr-1" /> Password Set
              </Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => {
                const newPassword = prompt("Set your lock policy password:");
                if (newPassword && newPassword.trim()) {
                  localStorage.setItem('lock_policy_password', newPassword.trim());
                  window.location.reload();
                }
              }}>
                <KeyRound className="h-4 w-4 mr-2" />
                Set Password
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : currentPoliciesList.length === 0 ? (
          <Card className="p-8 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium text-green-600">All caught up!</p>
            <p className="text-muted-foreground mt-2">
              {activeTab === 'current' 
                ? 'No current policies to lock (policies sold in the last 5 business days).'
                : 'No retroactive policies to lock (policies 6+ days old).'}
            </p>
          </Card>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as 'current' | 'retroactive'); setSelectedPolicyIndex(0); }} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Current (5 Business Days)
                  <Badge variant="outline" className="ml-1">{currentPolicies.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="retroactive" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Retroactive Locking
                  <Badge variant="outline" className="ml-1">{retroactivePolicies.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {renderPolicyCard()}
            
            {currentPoliciesList.length > 1 && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={handleNextPolicy} className="flex items-center gap-2">
                  Next Policy
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lock Policy</DialogTitle>
            <DialogDescription>
              Enter your password and select the disposition result.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPolicy && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">VPN Reminder</h4>
                    <p className="text-sm text-yellow-700">
                      Make sure your VPN is set to <strong>{selectedLeadInfo?.state || 'the client state'}</strong> before locking.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="disposition">Disposition</Label>
                <RadioGroup value={dispositionType} onValueChange={(val) => { setDispositionType(val as any); setLockReason([]); }} className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="locked_successfully" id="locked_successfully" />
                    <Label htmlFor="locked_successfully" className="cursor-pointer flex-1">
                      Locked Successfully
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="already_locked" id="already_locked" />
                    <Label htmlFor="already_locked" className="cursor-pointer flex-1">
                      Already Locked
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="unable_to_lock" id="unable_to_lock" />
                    <Label htmlFor="unable_to_lock" className="cursor-pointer flex-1">
                      Unable to lock (Client's Information incorrect)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {dispositionType === 'unable_to_lock' && (
                <div className="space-y-2 pt-2">
                  <Label>Reason (select all that apply)</Label>
                  <div className="space-y-2 border rounded p-3">
                    {['First Name', 'Last Name', 'SSN', 'DOB'].map((reason) => (
                      <div key={reason} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`reason-${reason}`}
                          checked={lockReason.includes(reason)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setLockReason([...lockReason, reason]);
                            } else {
                              setLockReason(lockReason.filter(r => r !== reason));
                            }
                          }}
                        />
                        <Label htmlFor={`reason-${reason}`} className="cursor-pointer">
                          {reason}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {dispositionType !== 'unable_to_lock' && (
                <div className="space-y-2">
                  <Label htmlFor="lock-password">Your Password</Label>
                  <Input 
                    id="lock-password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPolicyDialog(false); setDispositionType(''); setLockReason([]); setPassword(''); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDisposition} 
              disabled={
                !dispositionType || 
                (dispositionType === 'unable_to_lock' ? lockReason.length === 0 : !password) || 
                savingDisposition
              }
            >
              {savingDisposition ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Save & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LockPolicies;
