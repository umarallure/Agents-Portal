import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Phone, FileText, User, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPoliciesByGhlName } from '@/lib/mondayRetentionApi';
import { AppFixTaskTypeSelector } from '@/components/AppFixTaskTypeSelector';

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

const RetentionFlow = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const submissionId = searchParams.get('submissionId');

  // State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Step 1 State
  const [retentionAgent, setRetentionAgent] = useState<string>('');
  const [retentionType, setRetentionType] = useState<RetentionType | ''>('');

  // New Sale Quote Details
  const [quoteCarrier, setQuoteCarrier] = useState('');
  const [quoteProduct, setQuoteProduct] = useState('');
  const [quoteCoverage, setQuoteCoverage] = useState('');
  const [quotePremium, setQuotePremium] = useState('');

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
      // Create notification in callback portal in slack
      try {
        setLoading(true);
        await supabase.functions.invoke('center-transfer-notification', {
          body: {
            type: 'retention_new_sale',
            submissionId,
            agentName: retentionAgent,
            leadData: lead,
            quoteDetails: {
              carrier: quoteCarrier,
              product: quoteProduct,
              coverage: quoteCoverage,
              premium: quotePremium
            }
          }
        });
        toast({
          title: "Notification Sent",
          description: "Slack notification sent for New Sale.",
        });
        // End flow or redirect? Prompt doesn't specify, but implies action is done.
        // I'll just show a success message and maybe redirect back.
        navigate('/dashboard');
      } catch (error) {
        console.error('Error sending notification:', error);
        toast({
          title: "Error",
          description: "Failed to send notification",
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
    
    if (retentionType === 'fixed_payment') {
      setStep(3);
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
    <Card className="w-full max-w-2xl mx-auto">
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
                <Input placeholder="e.g., SBLI" value={quoteCarrier} onChange={e => setQuoteCarrier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Product Level</Label>
                <Input placeholder="e.g., Level" value={quoteProduct} onChange={e => setQuoteProduct(e.target.value)} />
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
    <Card className="w-full max-w-4xl mx-auto">
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
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${selectedPolicy?.submission_id === policy.submission_id ? 'border-primary bg-accent' : ''}`}
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

  const renderStep3 = () => (
    <Card className="w-full max-w-2xl mx-auto">
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
        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        <Button onClick={handleBankingSubmit}>Next</Button>
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
    
    // Check time for RNA (After 6 PM EST) and Aetna (After 5 PM EST)
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const isAfter6PM = estTime.getHours() >= 18;
    const isAfter5PM = estTime.getHours() >= 17;

    let content = null;

    if (isCorebridge) {
      if (retentionType === 'fixed_payment') {
        content = renderTaskCreation("Corebridge policy requires an App Fix Task for banking updates.");
      } else if (retentionType === 'carrier_requirements') {
        content = renderTaskCreation("Corebridge policy requires an App Fix Task for carrier requirements.");
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
        } else if (retentionType === 'carrier_requirements') {
          content = renderCallInstructions(
            `I'm the assistant to ${agentInfo.name}, I have ${lead?.customer_full_name || 'the client'} on the line. There is an additional requirement on their pending application we'd like to fulfill. Can you please direct us to the correct department`,
            "866-272-6630",
            "Press Option 3, then Option 3"
          );
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
      } else if (policyStatus === 'pending' && routingMatch) {
        content = renderCallInstructions(
          "I need to give new banking information for a policy that has not been issued yet. Can you please direct me to the correct department"
        );
      } else {
        // Fallback if logic doesn't match (e.g. routing number empty or something)
        content = renderTaskCreation("Unable to determine automated flow. Please create a task.");
      }
    } else if (retentionType === 'carrier_requirements') {
      content = renderCallInstructions(
        "There is a pending requirement on a pending application I need to fulfill for an applicant. Can you please direct me to the correct department"
      );
    }

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(retentionType === 'fixed_payment' ? 3 : 2)}>Back</Button>
          <Button onClick={() => navigate('/dashboard')}>Done</Button>
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
        policyStatus: policyStatus
      };

      return (
        <div className="max-w-2xl mx-auto">
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

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Retention Flow" />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Lead Info */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead ? (
                  <>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Customer Name</Label>
                      <div className="font-medium text-lg">{lead.customer_full_name || 'N/A'}</div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Phone Number</Label>
                      <div className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {lead.phone_number || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
                      <div className="font-medium">{lead.email || 'N/A'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">State</Label>
                        <div className="font-medium">{lead.state || 'N/A'}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Vendor</Label>
                        <div className="font-medium">{lead.lead_vendor || 'N/A'}</div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date of Birth</Label>
                      <div className="font-medium">{lead.date_of_birth || 'N/A'}</div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Banking Info (On File)</Label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Routing:</span>
                          <span className="font-mono">{lead.beneficiary_routing || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono">•••• {lead.beneficiary_account ? lead.beneficiary_account.slice(-4) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
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
          <div className="lg:col-span-2">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetentionFlow;
