import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, CreditCard, Loader2, Shield, FileText, Heart, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCenterUser } from '@/hooks/useCenterUser';
import { format } from 'date-fns';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia', 'Puerto Rico'
];

const STATE_NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR'
};

const TOBACCO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

const CARRIER_OPTIONS = [
  'Liberty',
  'SBLI',
  'Corebridge',
  'MOH',
  'Transamerica',
  'RNA',
  'AMAM',
  'GTL',
  'Aetna',
  'Americo',
  'CICA',
  'American Home Life',
  'Other'
];

const PRODUCT_TYPE_OPTIONS = [
  'Final Expense',
  'Term Life',
  'Whole Life',
  'Universal Life',
  'Accidental Death',
  'Other'
];

const FEQuoteForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { leadVendor, loading: centerLoading } = useCenterUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Customer Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Address Information
  const [streetAddress, setStreetAddress] = useState('');
  const [streetAddressLine2, setStreetAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Personal Information
  const [birthState, setBirthState] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [socialSecurity, setSocialSecurity] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  // Coverage History
  const [existingCoverage, setExistingCoverage] = useState('');
  const [previousApplications, setPreviousApplications] = useState('');

  // Health Information
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [doctorsName, setDoctorsName] = useState('');
  const [tobaccoUse, setTobaccoUse] = useState('');
  const [healthConditions, setHealthConditions] = useState('');
  const [medications, setMedications] = useState('');

  // Policy Information
  const [monthlyPremium, setMonthlyPremium] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [carrier, setCarrier] = useState('');
  const [productType, setProductType] = useState('');
  const [draftDate, setDraftDate] = useState('');

  // Beneficiary Information
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [beneficiaryInformation, setBeneficiaryInformation] = useState('');

  // Payment Information
  const [accountType, setAccountType] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [futureDraftDate, setFutureDraftDate] = useState('');

  // Additional Information
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customerBuyingMotives, setCustomerBuyingMotives] = useState('');
  const [isCallback, setIsCallback] = useState(false);
  const [isRetentionCall, setIsRetentionCall] = useState(false);

  // Transfer Check
  const [transferCheckLoading, setTransferCheckLoading] = useState(false);
  const [transferCheckData, setTransferCheckData] = useState<any>(null);
  const [transferCheckError, setTransferCheckError] = useState<string | null>(null);

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDateOfBirthChange = (value: string) => {
    setDateOfBirth(value);
    const calculatedAge = calculateAge(value);
    if (calculatedAge) {
      setAge(calculatedAge);
    }
  };

  const handleCheckPhoneNumber = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a phone number to check',
        variant: 'destructive',
      });
      return;
    }

    setTransferCheckLoading(true);
    setTransferCheckError(null);
    setTransferCheckData(null);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const response = await fetch('http://localhost:3000/api/transfer-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTransferCheckData(data);
        if (data.warnings?.policy) {
          toast({
            title: 'Policy Warning',
            description: data.warningMessage || 'Customer has existing policies',
          });
        }
      } else {
        setTransferCheckError(data.message || 'Failed to check phone number');
      }
    } catch (error) {
      console.error('Transfer check error:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setTransferCheckError('Cannot connect to transfer check service. Please ensure the backend server is running on localhost:3000 and has CORS configured.');
      } else {
        setTransferCheckError('Failed to connect to transfer check service');
      }
    } finally {
      setTransferCheckLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    if (!streetAddress) newErrors.streetAddress = 'Street address is required';
    if (!city) newErrors.city = 'City is required';
    if (!state) newErrors.state = 'State is required';
    if (!zipCode) newErrors.zipCode = 'ZIP code is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate submission_id
      const submissionId = `FE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const fullName = `${firstName} ${lastName}`;

      const leadData = {
        submission_id: submissionId,
        submission_date: new Date().toISOString(),
        customer_full_name: fullName,
        street_address: streetAddress,
        city: city,
        state: state,
        zip_code: zipCode,
        phone_number: phoneNumber,
        email: email || null,
        date_of_birth: dateOfBirth,
        age: age ? parseInt(age) : null,
        social_security: socialSecurity || null,
        birth_state: birthState || null,
        driver_license: driverLicense || null,
        health_conditions: healthConditions || null,
        carrier: carrier || null,
        product_type: productType || null,
        coverage_amount: coverageAmount ? parseFloat(coverageAmount) : null,
        monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
        draft_date: draftDate || null,
        future_draft_date: futureDraftDate || null,
        beneficiary_routing: routingNumber || null,
        beneficiary_account: beneficiaryAccount || null,
        additional_notes: additionalNotes || null,
        lead_vendor: leadVendor,
        buffer_agent: null,
        agent: null,
        existing_coverage: existingCoverage || null,
        previous_applications: previousApplications || null,
        height: height || null,
        weight: weight || null,
        doctors_name: doctorsName || null,
        tobacco_use: tobaccoUse || null,
        medications: medications || null,
        beneficiary_information: beneficiaryInformation || null,
        beneficiary_phone: beneficiaryPhone || null,
        institution_name: institutionName || null,
        account_type: accountType || null,
        is_callback: isCallback,
        is_retention_call: isRetentionCall,
        customer_buying_motives: customerBuyingMotives || null,
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select();

      if (error) {
        console.error('Error inserting lead:', error);
        throw new Error(error.message);
      }

      // Send Slack notifications after successful lead creation
      if (leadVendor) {
        try {
          // Fetch center config to get slack_channel
          const { data: centerData } = await (supabase as any)
            .from('centers')
            .select('center_name, slack_channel')
            .eq('lead_vendor', leadVendor)
            .maybeSingle();

          const centerName = centerData?.center_name || leadVendor;
          const centerSlackChannel = centerData?.slack_channel || null;

          // Format date/time in EST
          const now = new Date();
          const estDateTime = new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString();

          // Send notification to #transfer-portal
          const transferPortalMessage = {
            text: `A new Application Submission :\nCall Center Name: ${centerName}\nCustomer Name: ${fullName}\nCustomer Number: ${phoneNumber}\nDate & Time (EST) : ${estDateTime}`
          };

          await fetch('https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/fe-slack-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: '#transfer-portal',
              message: transferPortalMessage.text
            })
          });

          // Send notification to center's slack channel if configured
          if (centerSlackChannel) {
            const agentPortalUrl = `https://agents-portal-zeta.vercel.app/call-result-update?submissionId=${submissionId}&center=${encodeURIComponent(centerName)}`;
            const centerMessage = `New Application Submission:\n\nCall Center Name: ${centerName}\nCustomer Name: ${fullName}\nCustomer State: ${state}\nQuoted Carrier: ${carrier || 'N/A'}\nDate & Time (EST): ${format(new Date(estDateTime), 'yyyy-MM-dd HH:mm:ss')}`;

            const centerBlocks = [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*New Application Submission:*\n\n*Call Center Name:* ${centerName}\n*Customer Name:* ${fullName}\n*Customer State:* ${state}\n*Quoted Carrier:* ${carrier || 'N/A'}\n*Date & Time (EST):* ${format(new Date(estDateTime), 'yyyy-MM-dd HH:mm:ss')}`
                }
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "View Application"
                    },
                    url: agentPortalUrl,
                    style: "primary"
                  }
                ]
              }
            ];

            await fetch('https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/fe-slack-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: centerSlackChannel,
                message: centerMessage,
                blocks: centerBlocks
              })
            });

            // Trigger notify-eligible-agents to alert agents about this new lead
            if (carrier && state && leadVendor) {
              try {
                await fetch('https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA'
                  },
                  body: JSON.stringify({
                    carrier: carrier,
                    state: state,
                    lead_vendor: leadVendor,
                    language: 'English'
                  })
                });
              } catch (notifyError) {
                console.error('Error triggering notify-eligible-agents:', notifyError);
              }
            }

            // Create contact in GHL
            if (leadVendor && phoneNumber) {
              try {
                await fetch('https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/fe-ghl-create-contact', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA'
                  },
                  body: JSON.stringify({
                    lead_vendor: leadVendor,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber,
                    email: email || null,
                    date_of_birth: dateOfBirth || null,
                    state: state || null,
                    city: city || null,
                    street_address: streetAddress || null,
                    zip_code: zipCode || null,
                    carrier: carrier || null,
                    product_type: productType || null,
                    monthly_premium: monthlyPremium || null,
                    coverage_amount: coverageAmount || null,
                    submission_id: submissionId
                  })
                });

                // Create entry in daily_deal_flow
                await supabase.from('daily_deal_flow').insert({
                  submission_id: submissionId,
                  client_phone_number: phoneNumber,
                  lead_vendor: leadVendor,
                  date: format(new Date(), 'yyyy-MM-dd'),
                  insured_name: `${firstName} ${lastName}`.trim()
                });
              } catch (ghlError) {
                console.error('Error creating GHL contact:', ghlError);
              }
            }
          }
        } catch (slackError) {
          console.error('Error sending Slack notifications:', slackError);
          // Don't fail the submission if Slack fails
        }
      }

      toast({
        title: 'Lead Created Successfully',
        description: `The FE lead has been created with submission ID: ${submissionId}`,
      });

      navigate('/center-lead-portal');
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/center-lead-portal');
  };

  if (centerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <h1 className="text-2xl font-bold text-foreground">FE Quote Form</h1>
          <p className="text-muted-foreground">Complete the form below to submit a Final Expense lead</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Date of Submission</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {format(new Date(), 'MM-dd-yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* Customer Name & Phone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Name & Phone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="(000) 000-0000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={errors.phoneNumber ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCheckPhoneNumber}
                      disabled={transferCheckLoading || !phoneNumber}
                    >
                      {transferCheckLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                    </Button>
                  </div>
                  {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber}</p>}
                  <p className="text-xs text-muted-foreground">Format: (000) 000-0000</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Check Results */}
          {(transferCheckData || transferCheckError) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Transfer Check Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transferCheckError ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">{transferCheckError}</p>
                  </div>
                ) : transferCheckData ? (
                  <div className="space-y-4">
                    {/* DNC Status */}
                    <div className={`p-3 rounded-md border ${
                      transferCheckData.dnc?.allowed === false 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          transferCheckData.dnc?.allowed === false ? 'text-red-800' : 'text-green-800'
                        }`}>
                          DNC Status: {transferCheckData.dnc?.allowed === false ? 'Blocked' : 'Clear'}
                        </span>
                      </div>
                      {transferCheckData.dnc?.message && (
                        <p className="text-sm mt-1">{transferCheckData.dnc.message}</p>
                      )}
                    </div>

                    {/* Customer Info */}
                    {transferCheckData.data && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Customer Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <span className="ml-2 font-medium">{transferCheckData.data.Name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mobile:</span>
                            <span className="ml-2 font-medium">{transferCheckData.data.Mobile || 'N/A'}</span>
                          </div>
                          {transferCheckData.data['Policy Status'] && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Policy Status:</span>
                              <span className="ml-2 font-medium">{transferCheckData.data['Policy Status']}</span>
                            </div>
                          )}
                          {transferCheckData.data['GHL Pipeline Stage'] && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">GHL Stage:</span>
                              <span className="ml-2 font-medium">{transferCheckData.data['GHL Pipeline Stage']}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {transferCheckData.warnings?.policy && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Policy Warning</h4>
                        <p className="text-sm text-yellow-800">{transferCheckData.warningMessage}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="streetAddress"
                  placeholder="Street Address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className={errors.streetAddress ? 'border-red-500' : ''}
                />
                {errors.streetAddress && <p className="text-sm text-red-500">{errors.streetAddress}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddressLine2">Street Address Line 2</Label>
                <Input
                  id="streetAddressLine2"
                  placeholder="Street Address Line 2"
                  value={streetAddressLine2}
                  onChange={(e) => setStreetAddressLine2(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((stateCode) => (
                        <SelectItem key={stateCode} value={stateCode}>
                          {stateCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">
                    Zip Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="zipCode"
                    placeholder="Zip Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className={errors.zipCode ? 'border-red-500' : ''}
                  />
                  {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthState">Birth State</Label>
                  <Select value={birthState} onValueChange={setBirthState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((stateCode) => (
                        <SelectItem key={stateCode} value={stateCode}>
                          {stateCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className={errors.dateOfBirth ? 'border-red-500' : ''}
                  />
                  {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g., 23"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialSecurity">Social</Label>
                  <Input
                    id="socialSecurity"
                    placeholder="XXX-XX-XXXX"
                    value={socialSecurity}
                    onChange={(e) => setSocialSecurity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverLicense">Driver license Number:</Label>
                <Input
                  id="driverLicense"
                  placeholder="Driver license Number"
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Coverage History */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="existingCoverage">Any existing / previous coverage in last 2 years?</Label>
                <Textarea
                  id="existingCoverage"
                  placeholder="Any existing / previous coverage in last 2 years?"
                  value={existingCoverage}
                  onChange={(e) => setExistingCoverage(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousApplications">Any previous applications in 2 years?</Label>
                <Textarea
                  id="previousApplications"
                  placeholder="Any previous applications in 2 years?"
                  value={previousApplications}
                  onChange={(e) => setPreviousApplications(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Health Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    placeholder="Height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorsName">Doctors Name</Label>
                  <Input
                    id="doctorsName"
                    placeholder="Doctors Name"
                    value={doctorsName}
                    onChange={(e) => setDoctorsName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tabacco Use</Label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tobaccoYes"
                      checked={tobaccoUse === 'yes'}
                      onCheckedChange={() => setTobaccoUse('yes')}
                    />
                    <Label htmlFor="tobaccoYes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tobaccoNo"
                      checked={tobaccoUse === 'no'}
                      onCheckedChange={() => setTobaccoUse('no')}
                    />
                    <Label htmlFor="tobaccoNo" className="font-normal cursor-pointer">No</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="healthConditions">Health Conditions</Label>
                <Textarea
                  id="healthConditions"
                  placeholder="Health Conditions"
                  value={healthConditions}
                  onChange={(e) => setHealthConditions(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  placeholder="Medications"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Policy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Policy Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPremium">Monthly Premium</Label>
                  <Input
                    id="monthlyPremium"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 23"
                    value={monthlyPremium}
                    onChange={(e) => setMonthlyPremium(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverageAmount">Coverage Amount</Label>
                  <Input
                    id="coverageAmount"
                    type="number"
                    placeholder="e.g., 23"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productType">Product Type</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="draftDate">Draft Date</Label>
                <Input
                  id="draftDate"
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Health Kit - Rate Quote Tool */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Health Kit - Rate Quote Tool</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://insurancetoolkits.com/login', '_blank')}
                >
                  Open in New Tab ↗
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Log in below to access the rate quote tool. Your session will stay active in this panel.</p>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-blue-300 rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                <iframe
                  style={{ border: 'none', height: '100%', width: '100%' }}
                  src="https://insurancetoolkits.com/login"
                  title="Health Kit Login"
                  className="health-kit-frame"
                  id="healthKitIframePage"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const iframe = document.getElementById('healthKitIframePage') as HTMLIFrameElement;
                    if (iframe) iframe.src = 'https://insurancetoolkits.com/fex/quoter';
                  }}
                >
                  Go to Quote Tool
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const iframe = document.getElementById('healthKitIframePage') as HTMLIFrameElement;
                    if (iframe) iframe.src = 'https://insurancetoolkits.com/login';
                  }}
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Beneficiary Information */}
          <Card>
            <CardHeader>
              <CardTitle>Beneficiary Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
                  <Input
                    id="beneficiaryName"
                    placeholder="Beneficiary Name"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryPhone">Beneficiary Phone</Label>
                  <Input
                    id="beneficiaryPhone"
                    type="tel"
                    placeholder="(000) 000-0000"
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficiaryInformation">Beneficiary Information</Label>
                <Textarea
                  id="beneficiaryInformation"
                  placeholder="Beneficiary Information"
                  value={beneficiaryInformation}
                  onChange={(e) => setBeneficiaryInformation(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Bank Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Account Type</Label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accountChecking"
                      checked={accountType === 'Checking'}
                      onCheckedChange={() => setAccountType('Checking')}
                    />
                    <Label htmlFor="accountChecking" className="font-normal cursor-pointer">Checking Account</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accountSavings"
                      checked={accountType === 'Savings'}
                      onCheckedChange={() => setAccountType('Savings')}
                    />
                    <Label htmlFor="accountSavings" className="font-normal cursor-pointer">Saving Account</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institutionName">Institution Name</Label>
                <Input
                  id="institutionName"
                  placeholder="Institution Name"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    placeholder="Routing Number"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryAccount">Account Number</Label>
                  <Input
                    id="beneficiaryAccount"
                    placeholder="Account Number"
                    value={beneficiaryAccount}
                    onChange={(e) => setBeneficiaryAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="futureDraftDate">Future Draft Date</Label>
                <Input
                  id="futureDraftDate"
                  type="date"
                  value={futureDraftDate}
                  onChange={(e) => setFutureDraftDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Additional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Information</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Additional Information"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerBuyingMotives">Customer Dominate Buying Motive</Label>
                <Textarea
                  id="customerBuyingMotives"
                  placeholder="Customer Dominate Buying Motive"
                  value={customerBuyingMotives}
                  onChange={(e) => setCustomerBuyingMotives(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCallback"
                    checked={isCallback}
                    onCheckedChange={(checked) => setIsCallback(checked as boolean)}
                  />
                  <Label htmlFor="isCallback" className="font-normal cursor-pointer">
                    Is Callback
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRetentionCall"
                    checked={isRetentionCall}
                    onCheckedChange={(checked) => setIsRetentionCall(checked as boolean)}
                  />
                  <Label htmlFor="isRetentionCall" className="font-normal cursor-pointer">
                    Retention Call
                  </Label>
                </div>
              </div>

              <div className="text-sm text-muted-foreground pt-2">
                <strong>Lead Vendor:</strong> {leadVendor || 'Not set'}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Quote'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FEQuoteForm;
