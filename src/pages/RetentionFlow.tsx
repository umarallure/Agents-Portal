import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Phone, FileText, User, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPoliciesByGhlName } from '@/lib/mondayRetentionApi';
import { AppFixTaskTypeSelector } from '@/components/AppFixTaskTypeSelector';
import { CallResultForm } from '@/components/CallResultForm';

// Agent Mappings
const ANAM_WRITING_NUMBERS: Record<string, string> = {
  "Lydia Sutton": "1127061",
  "Claudia Tradardi": "1127270",
  "Benjamin Wunder": "1126348",
  "Noah Brock": "1155892",
  "Erica Hicks": "1155893",
  "Abdul Ibrahim": "1140774",
  "Trinity Queen": "1155894",
  "Isaac Reed": "1155890"
};

const AGENT_SSN_MAPPING: Record<string, string> = {
  "Trinity Queen": "7901",
  "Noah Brock": "6729",
  "Abdul Rahman Ibrahim": "1058",
  "Abdul Ibrahim": "1058", // Alias matching writing number list
  "Isaac Reed": "1163",
  "Lydia Sutton": "1730",
  "Claudia Tradardi": "5863"
};

// Retention Agent Options
const retentionAgentOptions = [
  "Aqib Afridi",
  "Qasim Raja",
  "Hussain Khan",
  "Ayan Ali",
  "Ayan Khan",
  "N/A"
];

const carrierOptions = [
  "Liberty",
  "SBLI",
  "Corebridge",
  "MOH",
  "Transamerica",
  "RNA",
  "AMAM",
  "GTL",
  "Aetna",
  "Americo",
  "CICA",
  "N/A"
];

const productTypeOptions = [
  "Preferred",
  "Standard",
  "Graded",
  "Modified",
  "GI",
  "Immediate",
  "Level",
  "ROP",
  "N/A"
];

// EST timezone utility functions
const getTodayDateEST = () => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());
  
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
};

type RetentionType = 'new_sale' | 'fixed_payment' | 'carrier_requirements';

interface Lead {
  submission_id: string;
  customer_full_name: string | null;
  beneficiary_routing: string | null;
  beneficiary_account: string | null;
  phone_number: string | null;
  lead_vendor: string | null;
  state: string | null;
  street_address: string | null;
  city: string | null;
  zip_code: string | null;
  email: string | null;
  date_of_birth: string | null;
  social_security: string | null;
  carrier: string | null;
  product_type: string | null;
  monthly_premium: number | null;
  agent: string | null;
  policy_number?: string | null;
  status?: string | null;
  writing_number?: string | null;
}

// Helper for string distance
const levenshteinDistance = (a: string, b: string) => {
  if (!a) return b ? b.length : 0;
  if (!b) return a ? a.length : 0;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const RetentionFlow = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const submissionId = searchParams.get('submissionId');

  // State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [lead, setLead] = useState<Lead | null>(null);
  const [validationError, setValidationError] = useState<{
    title: string;
    message: string;
    type: 'error' | 'warning';
    actions: 'back' | 'switch_workflow';
  } | null>(null);
  
  // Step 1 State
  const [retentionAgent, setRetentionAgent] = useState<string>('');
  const [retentionType, setRetentionType] = useState<RetentionType | ''>('');

  // New Sale Quote Details
  const [quoteCarrier, setQuoteCarrier] = useState('');
  const [quoteProduct, setQuoteProduct] = useState('');
  const [quoteCoverage, setQuoteCoverage] = useState('');
  const [quotePremium, setQuotePremium] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  // Step 2 State (Policy Selection)
  const [policies, setPolicies] = useState<Lead[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Lead | null>(null);
  const [fetchingPolicies, setFetchingPolicies] = useState(false);

  // Step 3 State (Banking Details)
  const [policyStatus, setPolicyStatus] = useState<'issued' | 'pending'>('pending');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [bankName, setBankName] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [rnaRequirementType, setRnaRequirementType] = useState<'banking' | 'other' | ''>('');
  const [mohFixType, setMohFixType] = useState<'incorrect_banking' | 'insufficient_funds' | 'pending_manual' | 'pending_lapse' | ''>('');

  // Short Form State
  const [shortFormStatus, setShortFormStatus] = useState<string>('');
  const [shortFormNotes, setShortFormNotes] = useState<string>('');
  const [submittingShortForm, setSubmittingShortForm] = useState(false);

  // Agent Info (Mocked for now as not in DB)
  const [agentInfo, setAgentInfo] = useState({
    name: '',
    writingNumber: 'N/A', // Placeholder
    ssnLast4: 'N/A' // Placeholder
  });

  useEffect(() => {
    if (submissionId) {
      fetchLeadData();
    }
  }, [submissionId]);

  const fetchLeadData = async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('submission_id, customer_full_name, beneficiary_routing, beneficiary_account, phone_number, lead_vendor, state, street_address, city, zip_code, email, date_of_birth, social_security, carrier, product_type, monthly_premium, agent')
        .eq('submission_id', submissionId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lead data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    if (!lead) return;
    setFetchingPolicies(true);
    try {
      // 1. Get names of leads with same SSN
      let names: string[] = [];
      
      if (lead.social_security) {
        const { data: leadsWithSameSsn, error } = await supabase
          .from('leads')
          .select('customer_full_name')
          .eq('social_security', lead.social_security);

        if (error) throw error;
        names = Array.from(new Set(leadsWithSameSsn?.map(l => l.customer_full_name).filter(Boolean) as string[]));
      } else {
        // Fallback to current name if no SSN
        if (lead.customer_full_name) {
          names = [lead.customer_full_name];
        }
      }

      if (names.length === 0) {
        setPolicies([]);
        return;
      }

      // 2. Fetch from Monday.com using these names
      const mondayItems = await fetchPoliciesByGhlName(names);

      // 3. Map Monday items to Lead interface for display
      const mappedPolicies = mondayItems.map(item => ({
        submission_id: item.id, // Use Monday ID as unique key
        customer_full_name: item.ghl_name || item.name,
        carrier: item.carrier || 'N/A',
        product_type: item.product_type || 'N/A',
        monthly_premium: item.premium ? parseFloat(item.premium.replace(/[^0-9.]/g, '')) : null,
        agent: item.agent || 'N/A',
        lead_vendor: item.vendor || 'N/A',
        policy_number: item.policy_number || 'N/A',
        status: item.status || 'N/A',
        writing_number: item.writing_number || 'N/A',
        date_of_birth: 'N/A', // Not available in Monday mapping
        email: null,
        state: null,
        social_security: null,
        beneficiary_routing: null,
        beneficiary_account: null,
        phone_number: item.phone || null
      }));

      setPolicies(mappedPolicies as Lead[]);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policies from Monday.com",
        variant: "destructive",
      });
    } finally {
      setFetchingPolicies(false);
    }
  };

  const handleStep1Next = async () => {
    if (!retentionAgent || !retentionType) {
      toast({
        title: "Required",
        description: "Please select an agent and retention type",
        variant: "destructive",
      });
      return;
    }

    if (retentionType === 'new_sale') {
      // Create notification and daily deal flow entry
      try {
        setLoading(true);
        
        // Send notification to retention team
        await supabase.functions.invoke('retention-team-notification', {
          body: {
            type: 'buffer_connected',
            submissionId,
            agentName: retentionAgent,
            customerName: lead?.customer_full_name,
            leadVendor: lead?.lead_vendor,
            retentionType: 'new_sale',
            retentionNotes: quoteNotes,
            quoteDetails: {
              carrier: quoteCarrier,
              product: quoteProduct,
              coverage: quoteCoverage,
              premium: quotePremium
            }
          }
        });
        
        // Create daily deal flow entry directly
        const { error: insertError } = await supabase
          .from('daily_deal_flow')
          .insert({
            submission_id: submissionId,
            lead_vendor: lead?.lead_vendor,
            insured_name: lead?.customer_full_name,
            client_phone_number: lead?.phone_number,
            date: getTodayDateEST(), // YYYY-MM-DD in EST
            retention_agent: retentionAgent,
            is_retention_call: true,
            from_callback: true
          });

        if (insertError) throw insertError;
        
        toast({
          title: "New Sale Submitted",
          description: "Notification sent and daily deal flow entry created.",
        });
        
        navigate('/dashboard');
      } catch (error) {
        console.error('Error processing new sale:', error);
        toast({
          title: "Error",
          description: "Failed to process new sale",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Fetch policies and go to step 2
      await fetchPolicies();
      setStep(2);
    }
  };

  const handlePolicySelect = (policy: Lead) => {
    setSelectedPolicy(policy);
    
    const agentName = policy.agent || 'Unknown';
    const carrier = policy.carrier || '';
    
    // Lookup details or fallback
    let writingNumber = policy.writing_number || 'N/A';

    // Apply ANAM specific writing numbers if carrier matches
    if (carrier.toUpperCase().includes('ANAM') && ANAM_WRITING_NUMBERS[agentName]) {
      writingNumber = ANAM_WRITING_NUMBERS[agentName];
    }

    const ssnLast4 = AGENT_SSN_MAPPING[agentName] || 'N/A';

    // Set agent info based on selected policy's agent
    setAgentInfo({
      name: agentName,
      writingNumber: writingNumber,
      ssnLast4: ssnLast4
    });

    // Validation Logic
    const status = policy.status || '';
    
    if (retentionType === 'fixed_payment') {
      if (status === 'Charge Back') {
        setValidationError({
          title: 'Policy Status Alert',
          message: 'This policy has charged back and needs a new application',
          type: 'error',
          actions: 'back'
        });
        return;
      }
      if (status === 'Withdrawn' || status === 'Closed as Incomplete') {
        setValidationError({
          title: 'Policy Status Alert',
          message: 'The selected policy has been withdrawn. A new carrier application is required.',
          type: 'error',
          actions: 'back'
        });
        return;
      }
    } else if (retentionType === 'carrier_requirements') {
      if (status !== 'Pending') {
         setValidationError({
          title: 'Policy Status Alert',
          message: 'This is not a pending policy. Either select a new workflow, or different policy',
          type: 'error',
          actions: 'switch_workflow'
        });
        return;
      }
    }
    
    const isMOH = carrier.toUpperCase().includes('MOH') || carrier.toUpperCase().includes('MUTUAL OF OMAHA');

    if (retentionType === 'fixed_payment') {
      if (isMOH) {
        setStep(5); // Go to MOH Selection
      } else {
        setStep(3);
      }
    } else if (retentionType === 'carrier_requirements') {
      setStep(4); // Skip banking form for carrier requirements
    }
  };

  const handleBankingSubmit = () => {
    if (!accountHolderName || !routingNumber || !accountNumber || !bankName || !draftDate || !accountType) {
      toast({
        title: "Required",
        description: "Please fill in all banking details",
        variant: "destructive",
      });
      return;
    }
    setStep(4);
  };

  const renderStep1 = () => (
    <Card className="w-full max-w-2xl mx-auto border-[#2AB7CA] shadow-sm bg-[#2AB7CA]/5">
      <CardHeader>
        <CardTitle>Retention Workflow</CardTitle>
        <CardDescription>Select agent and workflow type to proceed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Retention Agent</Label>
          <Select value={retentionAgent} onValueChange={setRetentionAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {retentionAgentOptions.map(agent => (
                <SelectItem key={agent} value={agent}>{agent}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Retention Call Type</Label>
          <Select value={retentionType} onValueChange={(val) => setRetentionType(val as RetentionType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_sale">New Sale</SelectItem>
              <SelectItem value="fixed_payment">Fixed Failed Payment</SelectItem>
              <SelectItem value="carrier_requirements">Fulfilling Carrier Requirements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {retentionType === 'new_sale' && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Quote Details (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select value={quoteCarrier} onValueChange={setQuoteCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carrierOptions.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product Level</Label>
                <Select value={quoteProduct} onValueChange={setQuoteProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypeOptions.map(product => (
                      <SelectItem key={product} value={product}>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coverage Amount</Label>
                <Input placeholder="e.g., $100,000" value={quoteCoverage} onChange={e => setQuoteCoverage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Monthly Premium</Label>
                <Input placeholder="e.g., $50.00" value={quotePremium} onChange={e => setQuotePremium(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={quoteNotes} 
                onChange={(e) => setQuoteNotes(e.target.value)} 
                placeholder="Enter any additional notes for the quote..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleStep1Next} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-4xl mx-auto border-[#2AB7CA] shadow-sm bg-[#2AB7CA]/5">
      <CardHeader>
        <CardTitle>Select Policy</CardTitle>
        <CardDescription>Select the policy you are fixing (Leads with matching SSN)</CardDescription>
      </CardHeader>
      <CardContent>
        {fetchingPolicies ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map(policy => (
                <div 
                  key={policy.submission_id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${selectedPolicy?.submission_id === policy.submission_id ? 'border-primary bg-accent' : 'border-gray-200 bg-white hover:border-[#2AB7CA]/50'}`}
                  onClick={() => handlePolicySelect(policy)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{policy.customer_full_name}</div>
                      <div className="text-xs text-muted-foreground">ID: {policy.submission_id}</div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${policy.status === 'Issued Paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {policy.status}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Policy #:</span>
                      <span className="font-medium">{policy.policy_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Carrier:</span>
                      <span className="font-medium">{policy.carrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Product:</span>
                      <span className="font-medium">{policy.product_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Premium:</span>
                      <span className="font-medium">${policy.monthly_premium}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Agent:</span>
                      <span className="font-medium">{policy.agent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Vendor:</span>
                      <span className="font-medium">{policy.lead_vendor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {policies.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No related leads found.</div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
      </CardFooter>
    </Card>
  );

  const renderStep3 = () => {
    const isMOH = selectedPolicy?.carrier?.toUpperCase().includes('MOH') || selectedPolicy?.carrier?.toUpperCase().includes('MUTUAL OF OMAHA');
    
    return (
    <Card className="w-full max-w-2xl mx-auto border-[#2AB7CA] shadow-sm bg-[#2AB7CA]/5">
      <CardHeader>
        <CardTitle>Banking Information</CardTitle>
        <CardDescription>Enter the new banking details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Policy Status</Label>
          <RadioGroup value={policyStatus} onValueChange={(val) => setPolicyStatus(val as 'issued' | 'pending')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="issued" id="issued" />
              <Label htmlFor="issued">Policy has been issued</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pending" id="pending" />
              <Label htmlFor="pending">Policy is pending (lead is in pending manual action on GHL)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Account Holder Name</Label>
            <Input value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Routing Number</Label>
            <Input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Checking">Checking</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Draft Date</Label>
            <Input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(isMOH ? 5 : 2)}>Back</Button>
        <Button onClick={handleBankingSubmit}>Next</Button>
      </CardFooter>
    </Card>
  );
  };

  const renderMOHSelection = () => (
    <Card className="w-full max-w-2xl mx-auto border-[#FFD289] shadow-sm bg-[#FFD289]/5">
      <CardHeader>
        <CardTitle>Mutual of Omaha Fix Type</CardTitle>
        <CardDescription>Select the type of fix required</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mohFixType} onValueChange={(val) => setMohFixType(val as any)}>
          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
            <RadioGroupItem value="incorrect_banking" id="incorrect_banking" />
            <Label htmlFor="incorrect_banking" className="cursor-pointer flex-1">Providing new banking information (FDPF Incorrect Banking Information)</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
            <RadioGroupItem value="insufficient_funds" id="insufficient_funds" />
            <Label htmlFor="insufficient_funds" className="cursor-pointer flex-1">Redating/Redrafting w/ Same Banking (FDPF Insufficient Funds)</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
            <RadioGroupItem value="pending_manual" id="pending_manual" />
            <Label htmlFor="pending_manual" className="cursor-pointer flex-1">Providing new banking information (For Pending Manual Action/Non Issued Policy)</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border rounded hover:bg-accent cursor-pointer">
            <RadioGroupItem value="pending_lapse" id="pending_lapse" />
            <Label htmlFor="pending_lapse" className="cursor-pointer flex-1">Fixing Pending Lapse Policy</Label>
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        <Button 
          onClick={() => {
            if (!mohFixType) {
              toast({ title: "Required", description: "Please select a fix type", variant: "destructive" });
              return;
            }
            if (mohFixType === 'insufficient_funds') {
              setStep(4); // Skip banking
            } else {
              setStep(3); // Go to banking
            }
          }}
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStep4 = () => {
    // Logic Implementation
    const dashboardRouting = lead?.beneficiary_routing;
    const routingMatch = routingNumber === dashboardRouting;
    const isCorebridge = selectedPolicy?.carrier?.toLowerCase().includes('corebridge');
    const isRoyalNeighbors = selectedPolicy?.carrier?.toLowerCase().includes('royal neighbors');
    const isAetna = selectedPolicy?.carrier?.toLowerCase().includes('aetna');
    const isMOH = selectedPolicy?.carrier?.toUpperCase().includes('MOH') || selectedPolicy?.carrier?.toUpperCase().includes('MUTUAL OF OMAHA');
    
    // Check time for RNA (After 6 PM EST) and Aetna (After 5 PM EST)
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const isAfter6PM = estTime.getHours() >= 18;
    const isAfter5PM = estTime.getHours() >= 17;

    let content = null;
    let isInstructionFlow = false;

    if (isCorebridge) {
      if (retentionType === 'fixed_payment') {
        content = renderTaskCreation("Corebridge policy requires an App Fix Task for banking updates.");
      } else if (retentionType === 'carrier_requirements') {
        content = renderTaskCreation("Corebridge policy requires an App Fix Task for carrier requirements.");
      }
    } else if (isMOH) {
      if (retentionType === 'carrier_requirements') {
        content = renderTaskCreation(
          "Email to: liferequirements@mutualofomaha.com\nPut Policy number in the subject line\nDocusign with completion form is required (do not need voided check)"
        );
      } else if (retentionType === 'fixed_payment') {
        if (mohFixType === 'insufficient_funds') {
          content = renderCallInstructions(
            `I am the assistant to ${agentInfo.name}. I have ${lead?.customer_full_name || 'the client'} on the line to redate their policy for their active policy. Can you please direct me to the correct department`,
            "800-775-7896",
            "Press Option 1"
          );
          isInstructionFlow = true;
        } else {
          // Check banking info differences
          const portalRouting = lead?.beneficiary_routing || '';
          const portalAccount = lead?.beneficiary_account || '';
          
          const routingDiffers = routingNumber !== portalRouting;
          const accountDiff = levenshteinDistance(accountNumber, portalAccount);
          
          if (routingDiffers) {
            content = renderTaskCreation(
              "Routing Number differs from portal. Email to: liferequirements@mutualofomaha.com\nPut Policy number in the subject line\nDocusign with completion form is required (do not need voided check)"
            );
          } else if (accountDiff > 2) {
            content = renderTaskCreation(
              "Account Number is more than 2 digits off. Email to: liferequirements@mutualofomaha.com\nPut Policy number in the subject line\nDocusign with completion form is required (do not need voided check)"
            );
          } else {
            // Account diff <= 2
            const phoneNumber = mohFixType === 'pending_lapse' ? "800-775-6000" : "800-775-7896";
            content = renderCallInstructions(
              `I am the assistant to ${agentInfo.name}. I have ${lead?.customer_full_name || 'the client'} on the line to provide new banking information for their active policy. Can you please direct me to the correct department`,
              phoneNumber,
              "Press Option 1"
            );
            isInstructionFlow = true;
          }
        }
      }
    } else if (isAetna) {
      if (isAfter5PM) {
        content = renderTaskCreation(`Aetna is only able to fix deals over the phone. It is after 5pm, so their customer service line is closed. Please schedule a callback for ${lead?.customer_full_name || 'the client'} for tomorrow during normal business hours.`);
      } else {
        if (retentionType === 'fixed_payment') {
          content = renderCallInstructions(
            `I'm the assistant to ${agentInfo.name}, I need to update billing information and draft date for an active policy, can you direct me to the correct department`,
            "800-264-4000",
            "Press Option 1, then Option 3, then Option 1"
          );
          isInstructionFlow = true;
        } else if (retentionType === 'carrier_requirements') {
          content = renderCallInstructions(
            `I'm the assistant to ${agentInfo.name}, I have ${lead?.customer_full_name || 'the client'} on the line. There is an additional requirement on their pending application we'd like to fulfill. Can you please direct us to the correct department`,
            "866-272-6630",
            "Press Option 3, then Option 3"
          );
          isInstructionFlow = true;
        }
      }
    } else if (isRoyalNeighbors) {
      if (isAfter6PM) {
        content = renderTaskCreation("Royal Neighbors is closed (after 6 PM EST). Please create a task.");
      } else {
        if (retentionType === 'fixed_payment') {
          // Fixed payment implies banking update
          content = renderCallInstructions(
            "I need to update banking for a pending application. Can you please direct me to the correct department",
            "800-627-4762",
            "Press Option 1, then Option 4"
          );
          isInstructionFlow = true;
        } else if (retentionType === 'carrier_requirements') {
          if (!rnaRequirementType) {
            content = (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-4">What type of requirement is this?</h3>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-3 bg-white hover:bg-blue-50 border-blue-200 text-blue-900"
                      onClick={() => setRnaRequirementType('banking')}
                    >
                      Update banking information for pending application
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-3 bg-white hover:bg-blue-50 border-blue-200 text-blue-900"
                      onClick={() => setRnaRequirementType('other')}
                    >
                      All other pending manual actions
                    </Button>
                  </div>
                </div>
              </div>
            );
          } else if (rnaRequirementType === 'banking') {
            content = renderCallInstructions(
              "I need to update banking for a pending application. Can you please direct me to the correct department",
              "800-627-4762",
              "Press Option 1, then Option 4"
            );
            isInstructionFlow = true;
          } else {
            content = renderTaskCreation("This request requires a licensed agent task.");
          }
        }
      }
    } else if (retentionType === 'fixed_payment') {
      if (routingNumber && dashboardRouting && routingNumber !== dashboardRouting) {
        content = renderTaskCreation("Routing number is different from dashboard lead. Please create a task for the licensed agent.");
      } else if (policyStatus === 'issued' && routingMatch) {
        content = renderCallInstructions(
          "I need to redate a policy, can you connect me to the correct department"
        );
        isInstructionFlow = true;
      } else if (policyStatus === 'pending' && routingMatch) {
        content = renderCallInstructions(
          "I need to give new banking information for a policy that has not been issued yet. Can you please direct me to the correct department"
        );
        isInstructionFlow = true;
      } else {
        // Fallback if logic doesn't match (e.g. routing number empty or something)
        content = renderTaskCreation("Unable to determine automated flow. Please create a task.");
      }
    } else if (retentionType === 'carrier_requirements') {
      content = renderCallInstructions(
        "There is a pending requirement on a pending application I need to fulfill for an applicant. Can you please direct me to the correct department"
      );
      isInstructionFlow = true;
    }

    return (
      <Card className="w-full max-w-2xl mx-auto border-[#2AB7CA] shadow-sm bg-[#2AB7CA]/5">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(retentionType === 'fixed_payment' ? 3 : 2)}>Back</Button>
          {isInstructionFlow ? (
            <Button onClick={() => setStep(6)}>Complete Call</Button>
          ) : (
            <Button onClick={() => navigate('/dashboard')}>Done</Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderCallInstructions = (script: string, phoneNumber: string = "800-736-7311", optionsInstruction: string = "Press Option 1 three times") => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Phone className="h-5 w-5" /> Call Instructions
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Call <strong>{phoneNumber}</strong> (with or without client)</li>
          {optionsInstruction && <li>{optionsInstruction}</li>}
          <li>When connected, say:</li>
        </ol>
        <div className="mt-3 p-3 bg-white rounded border border-blue-100 italic text-blue-900">
          "{script}"
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> Policy Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Client Name</div>
            <div className="font-medium">{selectedPolicy?.customer_full_name || lead?.customer_full_name}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Policy Number</div>
            <div className="font-medium">{selectedPolicy?.policy_number || 'N/A'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Agent Name</div>
            <div className="font-medium">{agentInfo.name}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Agent Writing Number</div>
            <div className="font-medium">{agentInfo.writingNumber}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Last 4 Agent SSN</div>
            <div className="font-medium">{agentInfo.ssnLast4}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm text-muted-foreground">Date of Birth</div>
            <div className="font-medium">{lead?.date_of_birth || 'N/A'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border md:col-span-2">
            <div className="text-sm text-muted-foreground">Address</div>
            <div className="font-medium">
              {[lead?.street_address, lead?.city, lead?.state, lead?.zip_code].filter(Boolean).join(', ') || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaskCreation = (reason: string) => {
    if (showTaskForm) {
      // Prepare initial data from collected state
      const initialData = {
        fixType: retentionType === 'fixed_payment' ? 'banking_info' : 
                 retentionType === 'carrier_requirements' ? 'carrier_requirement' : undefined,
        bankAccountOwner: accountHolderName,
        bankInstitutionName: bankName,
        routingNumber: routingNumber,
        accountNumber: accountNumber,
        accountType: accountType,
        newDraftDate: draftDate ? new Date(draftDate) : undefined,
        policyStatus: policyStatus,
        notes: reason
      };

      return (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Past Banking Information Card */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Past Banking Information (On File)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Routing Number</span>
                  <span className="font-mono font-medium">{lead?.beneficiary_routing || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Account Number</span>
                  <span className="font-mono font-medium">{lead?.beneficiary_account || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <AppFixTaskTypeSelector
            submissionId={submissionId || ''}
            customerName={lead?.customer_full_name || ''}
            onClose={() => setShowTaskForm(false)}
            onSuccess={() => {
              toast({
                title: "Task Created",
                description: "Task successfully created.",
              });
              navigate('/dashboard');
            }}
            initialData={initialData}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Action Required
          </h3>
          <p className="text-yellow-800">{reason}</p>
        </div>
        
        <Button className="w-full" onClick={() => setShowTaskForm(true)}>
          Create Task for Licensed Agent
        </Button>
      </div>
    );
  };

  const generateAutoNotes = (status: string) => {
    const parts = [];
    
    if (status === 'Updated Banking/draft date') {
      parts.push("ACTION: Fixed Failed Payment");
      parts.push(`POLICY STATUS: ${policyStatus === 'issued' ? 'Issued' : 'Pending'}`);
      
      if (bankName) parts.push(`NEW BANK: ${bankName}`);
      if (draftDate) {
        try {
          const [year, month, day] = draftDate.split('-');
          parts.push(`NEW DRAFT DATE: ${month}/${day}/${year}`);
        } catch (e) {
          parts.push(`NEW DRAFT DATE: ${draftDate}`);
        }
      }
      
      if (mohFixType) {
        const mohFixMap: Record<string, string> = {
          'incorrect_banking': 'Incorrect Banking Information',
          'insufficient_funds': 'Insufficient Funds (Redating)',
          'pending_manual': 'Pending Manual Action Banking',
          'pending_lapse': 'Pending Lapse Fix'
        };
        if (mohFixMap[mohFixType]) {
          parts.push(`MOH FIX TYPE: ${mohFixMap[mohFixType]}`);
        }
      }
      
      parts.push("NOTES: Called carrier and successfully updated banking information/redated policy.");
    } else if (status === 'Fulfilled carrier requirements') {
      parts.push("ACTION: Fulfilling Carrier Requirements");
      
      if (rnaRequirementType) {
        parts.push(`RNA REQUIREMENT: ${rnaRequirementType === 'banking' ? 'Banking Update' : 'Other Manual Action'}`);
      }
      
      parts.push("NOTES: Called carrier and successfully fulfilled pending requirements.");
    }

    return parts.join('\n');
  };

  const handleShortFormSubmit = async () => {
    if (!shortFormStatus) {
      toast({
        title: "Required",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    setSubmittingShortForm(true);
    try {
      // 1. Upsert call_results
      const { error: resultError } = await supabase
        .from('call_results')
        .upsert({
          submission_id: submissionId,
          agent_who_took_call: retentionAgent,
          status: shortFormStatus,
          notes: shortFormNotes,
          is_retention_call: true,
          updated_at: new Date().toISOString()
        });

      if (resultError) throw resultError;

      // 2. Log the action
      await supabase.from('call_update_logs').insert({
        submission_id: submissionId,
        agent_name: retentionAgent,
        status: shortFormStatus,
        notes: shortFormNotes,
        action: 'retention_short_form_update'
      });

      // 3. Create daily deal flow entry
      const { error: ddfError } = await supabase
        .from('daily_deal_flow')
        .insert({
          submission_id: submissionId,
          lead_vendor: lead?.lead_vendor,
          insured_name: lead?.customer_full_name,
          client_phone_number: lead?.phone_number,
          date: getTodayDateEST(),
          retention_agent: retentionAgent,
          is_retention_call: true,
          from_callback: true,
          status: shortFormStatus,
          notes: shortFormNotes
        });

      if (ddfError) throw ddfError;

      toast({
        title: "Success",
        description: "Call result updated successfully",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting short form:', error);
      toast({
        title: "Error",
        description: "Failed to save call result",
        variant: "destructive",
      });
    } finally {
      setSubmittingShortForm(false);
    }
  };

  const renderStep6 = () => (
    <Card className="w-full max-w-2xl mx-auto border-[#2AB7CA] shadow-sm bg-[#2AB7CA]/5">
      <CardHeader>
        <CardTitle>Call Result</CardTitle>
        <CardDescription>Log the outcome of your call</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Retention Agent</Label>
          <Input value={retentionAgent} disabled />
        </div>
        
        <div className="space-y-2">
          <Label>Status / Stage</Label>
          <Select value={shortFormStatus} onValueChange={(val) => {
            setShortFormStatus(val);
            setShortFormNotes(generateAutoNotes(val));
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fulfilled carrier requirements">Fulfilled carrier requirements</SelectItem>
              <SelectItem value="Updated Banking/draft date">Updated Banking/draft date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea 
            value={shortFormNotes} 
            onChange={(e) => setShortFormNotes(e.target.value)} 
            placeholder="Enter call notes..."
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(4)}>Back to Instructions</Button>
        <Button onClick={handleShortFormSubmit} disabled={submittingShortForm}>
          {submittingShortForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit & Finish
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <NavigationHeader title="Retention Flow" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" className="hover:bg-transparent hover:text-primary pl-0" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Side - Lead Info */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-[#FFD289] shadow-sm bg-[#FFD289]/5">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Lead Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {lead ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1 block">Customer Name</Label>
                          <div className="font-semibold text-lg text-gray-900">{lead.customer_full_name || 'N/A'}</div>
                        </div>
                        
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1 block">Contact</Label>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {lead.phone_number || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground pl-5.5 break-all">
                              {lead.email || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1 block">State</Label>
                            <div className="font-medium text-sm">{lead.state || 'N/A'}</div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1 block">Vendor</Label>
                            <div className="font-medium text-sm">{lead.lead_vendor || 'N/A'}</div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1 block">Date of Birth</Label>
                          <div className="font-medium text-sm">{lead.date_of_birth || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block flex items-center gap-2">
                          <CreditCard className="h-3 w-3" /> Banking Info (On File)
                        </Label>
                        <div className="space-y-2 text-sm bg-white p-3 rounded border border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Routing</span>
                            <span className="font-mono font-medium">{lead.beneficiary_routing || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Account</span>
                            <span className="font-mono font-medium">{lead.beneficiary_account || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {selectedPolicy && (
                        <div className="pt-4 border-t border-gray-200">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Selected Policy
                          </Label>
                          <div className="space-y-3 text-sm bg-white p-3 rounded border border-gray-100">
                            <div>
                              <span className="text-muted-foreground text-xs block mb-0.5">Carrier</span>
                              <span className="font-medium text-primary">{selectedPolicy.carrier}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-muted-foreground text-xs block mb-0.5">Policy Number</span>
                                <span className="font-medium">{selectedPolicy.policy_number}</span>
                              </div>
                              <Badge variant="outline" className="text-xs font-normal bg-gray-50">
                                {selectedPolicy.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {step > 3 && retentionType === 'fixed_payment' && accountHolderName && (
                        <div className="pt-4 border-t border-gray-200">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block flex items-center gap-2">
                            <CreditCard className="h-3 w-3" /> New Banking Info
                          </Label>
                          <div className="space-y-2 text-sm bg-blue-50/50 p-3 rounded border border-blue-100">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs">Bank</span>
                              <span className="font-medium">{bankName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs">Routing</span>
                              <span className="font-mono font-medium">{routingNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs">Account</span>
                              <span className="font-mono font-medium">{accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs">Draft</span>
                              <span className="font-medium">{draftDate}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Flow Steps */}
            <div className="lg:col-span-8">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderMOHSelection()}
              {step === 6 && renderStep6()}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!validationError} onOpenChange={(open) => !open && setValidationError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {validationError?.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {validationError?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            {validationError?.actions === 'back' ? (
              <div className="flex flex-col gap-2 w-full">
                <Button variant="secondary" onClick={() => setValidationError(null)} className="w-full">
                  Select Different Policy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/call-result-update?submissionId=${submissionId}`)}
                  className="w-full"
                >
                  Update Call Result
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setValidationError(null)}
                >
                  Select Different Policy
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setRetentionType('fixed_payment');
                      setStep(1);
                      setValidationError(null);
                    }}
                  >
                    Switch to Fixing Failed Payment
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setRetentionType('new_sale');
                      setStep(1);
                      setValidationError(null);
                    }}
                  >
                    Switch to New Sale
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/call-result-update?submissionId=${submissionId}`)}
                  className="w-full"
                >
                  Update Call Result
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetentionFlow;
