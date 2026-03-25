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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagInput } from '@/components/ui/tag-input';

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
  'AMAM',
  'Aetna',
  'Pioneer',
  'American Home Life',
  'Occidental',
  'MOA',
  'Americo',
  'TransAmerica',
  'Aflac',
  'SSL'
];

const CARRIER_PRODUCT_TYPES: Record<string, string[]> = {
  'Aetna': ['Preferred', 'Standard', 'Modified'],
  'MOA': ['Level', 'Graded'],
  'AMAM': ['Immediate', 'Graded', 'ROP'],
  'Pioneer': ['Immediate', 'Graded', 'ROP'],
  'Occidental': ['Immediate', 'Graded', 'ROP'],
  'Aflac': ['Preferred', 'Standard', 'Modified'],
  'American Home Life': ['Preferred', 'Standard', 'Modified'],
  'TransAmerica': ['Preferred', 'Standard', 'Graded'],
  'SSL': ['New Vantage I', 'New Vantage II', 'New Vantage III'],
  'Americo': ['Immediate', 'Graded', 'ROP']
};

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
  const [isCustomerBlocked, setIsCustomerBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [transferCheckCompleted, setTransferCheckCompleted] = useState(false);

  // SSL Confirmation
  const [showSSLConfirmation, setShowSSLConfirmation] = useState(false);
  const [sslConfirmed, setSslConfirmed] = useState(false);

  // Underwriting modal states
  const [showUnderwritingModal, setShowUnderwritingModal] = useState(false);
  const [underwritingData, setUnderwritingData] = useState({
    tobaccoLast12Months: '',
    healthConditions: [] as string[],
    medications: [] as string[],
    height: '',
    weight: '',
    carrier: '',
    productLevel: '',
    coverageAmount: '',
    monthlyPremium: ''
  });

  // Underwriting checkbox selections for conditions
  const [underwritingCheckboxes, setUnderwritingCheckboxes] = useState<Record<string, boolean>>({});

  // Conditions grouped by question
  const question1Conditions = [
    "Alzheimer's Dementia", 'Congestive Heart Failure', 'Organ Transplant', 'HIV', 'AIDS', 'ARC', 'Leukemia', 
    'Tuberculosis', 'Chronic Respiratory Disease', 'Paralyzed', 'Amputation', 'Nursing Home', 'Wheelchair', 'Oxygen'
  ];

  const question2Conditions = [
    'Heart Attack', 'Cancer', 'Stroke', 'Kidney Failure', 'Organ Removal', 'Kidney Disorder', 
    'Lung Disorder', 'Brain Disorder', 'Circulatory System Disorder', 'Liver Disorder', 'Sickle Cell Anemia', 
    'Aneurysm', 'Diabetic Coma', 'Cirrhosis of the Liver', 'Multiple Sclerosis', 'Chronic Pneumonia', 'Hepatitis',
    'Stents', 'Pacemaker', 'Defibrillator', 'Valve Replacement', 'TIA'
  ];

  const question3Conditions = [
    'Neuropathy', 'Retinopathy', 'Diabetic Amputation', 'COPD', 'Bipolar', 'Schizophrenia'
  ];

  // Toggle checkbox and add/remove from health conditions field
  const handleUnderwritingCheckboxChange = (condition: string, checked: boolean) => {
    setUnderwritingCheckboxes(prev => ({ ...prev, [condition]: checked }));
    
    if (checked) {
      if (!underwritingData.healthConditions.includes(condition)) {
        setUnderwritingData(prev => ({
          ...prev,
          healthConditions: [...prev.healthConditions, condition]
        }));
      }
    } else {
      setUnderwritingData(prev => ({
        ...prev,
        healthConditions: prev.healthConditions.filter(m => m !== condition)
      }));
    }
  };

  // Pre-fill underwriting data when modal opens
  const handleOpenUnderwritingModal = () => {
    setUnderwritingData({
      tobaccoLast12Months: tobaccoUse === 'yes' ? 'yes' : tobaccoUse === 'no' ? 'no' : '',
      healthConditions: healthConditions ? healthConditions.split(',').map(s => s.trim()) : [],
      medications: medications ? medications.split(',').map(s => s.trim()) : [],
      height: height,
      weight: weight,
      carrier: carrier,
      productLevel: '',
      coverageAmount: coverageAmount,
      monthlyPremium: monthlyPremium
    });

    // Pre-fill checkboxes based on existing health conditions
    const allConditions = [...question1Conditions, ...question2Conditions, ...question3Conditions];
    const checkboxes: Record<string, boolean> = {};
    const existingConditions = healthConditions ? healthConditions.split(',').map(s => s.trim()) : [];
    allConditions.forEach(condition => {
      checkboxes[condition] = existingConditions.some(m => m.toLowerCase().includes(condition.toLowerCase()));
    });
    setUnderwritingCheckboxes(checkboxes);
    setShowUnderwritingModal(true);
  };

  // Save underwriting data back to form
  const handleSaveUnderwriting = () => {
    setTobaccoUse(underwritingData.tobaccoLast12Months);
    setHealthConditions(underwritingData.healthConditions.join(', '));
    setMedications(underwritingData.medications.join(', '));
    setHeight(underwritingData.height);
    setWeight(underwritingData.weight);
    setCarrier(underwritingData.carrier);
    setCoverageAmount(underwritingData.coverageAmount);
    setMonthlyPremium(underwritingData.monthlyPremium);
    
    toast({
      title: "Underwriting Complete",
      description: "All fields have been saved."
    });
    setShowUnderwritingModal(false);
  };

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

  const handleCarrierChange = (value: string) => {
    setCarrier(value);
    setProductType('');
    setSslConfirmed(false);
    
    if (value === 'SSL') {
      setShowSSLConfirmation(true);
    }
  };

  const handleSSLConfirm = () => {
    setSslConfirmed(true);
    setShowSSLConfirmation(false);
  };

  const handleSSLCancel = () => {
    setCarrier('');
    setProductType('');
    setSslConfirmed(false);
    setShowSSLConfirmation(false);
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
      const response = await fetch('https://livetransferchecker.vercel.app/api/transfer-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();
      
      // Reset blocking state
      setIsCustomerBlocked(false);
      setBlockReason('');
      
      if (response.ok) {
        setTransferCheckData(data);
        setTransferCheckCompleted(true);
        
        // Check for blocking conditions
        const policyStatus = data.data?.['Policy Status'] || '';
        const dncMessage = data.dnc?.message || '';
        
        const isDQ = policyStatus.toLowerCase().includes('dq') || 
                     policyStatus.toLowerCase().includes('disqualified') ||
                     policyStatus.toLowerCase().includes('already been dq');
        
        const isTCPA = dncMessage.toLowerCase().includes('tcpa litigator') ||
                       dncMessage.toLowerCase().includes('no contact permitted');
        
        if (isDQ) {
          setIsCustomerBlocked(true);
          setBlockReason('Customer has already been DQ from our agency');
          toast({
            title: 'Customer Blocked',
            description: 'We cannot accept this customer as they have been DQ from our agency',
            variant: 'destructive',
          });
        } else if (isTCPA) {
          setIsCustomerBlocked(true);
          setBlockReason('TCPA Litigator Detected - No Contact Permitted');
          toast({
            title: 'Customer Blocked',
            description: 'This number is flagged as a TCPA litigator. All transfers and contact attempts are strictly prohibited.',
            variant: 'destructive',
          });
        } else if (data.warnings?.policy) {
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
        setTransferCheckError('Cannot connect to transfer check service. Please try again later.');
      } else {
        setTransferCheckError('Failed to connect to transfer check service');
      }
    } finally {
      setTransferCheckLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!transferCheckCompleted && phoneNumber) {
      newErrors.phoneNumber = 'Please click Check button to verify phone number';
    }
    if (isCustomerBlocked) {
      newErrors.blocked = blockReason;
    }
    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    if (!email) newErrors.email = 'Email is required';
    if (!streetAddress) newErrors.streetAddress = 'Street address is required';
    if (!city) newErrors.city = 'City is required';
    if (!state) newErrors.state = 'State is required';
    if (!zipCode) newErrors.zipCode = 'ZIP code is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!birthState) newErrors.birthState = 'Birth state is required';
    if (!age) newErrors.age = 'Age is required';
    if (!socialSecurity) newErrors.socialSecurity = 'Social Security is required';
    if (!height) newErrors.height = 'Height is required';
    if (!weight) newErrors.weight = 'Weight is required';
    if (!tobaccoUse) newErrors.tobaccoUse = 'Tobacco use is required';
    if (!healthConditions) newErrors.healthConditions = 'Health conditions is required';
    if (!medications) newErrors.medications = 'Medications is required';
    if (!monthlyPremium) newErrors.monthlyPremium = 'Monthly premium is required';
    if (!coverageAmount) newErrors.coverageAmount = 'Coverage amount is required';
    if (!carrier) newErrors.carrier = 'Carrier is required';
    if (!productType) newErrors.productType = 'Product type is required';
    if (!draftDate) newErrors.draftDate = 'Draft date is required';
    if (!beneficiaryName) newErrors.beneficiaryName = 'Beneficiary name is required';
    if (!beneficiaryPhone) newErrors.beneficiaryPhone = 'Beneficiary phone is required';
    if (!beneficiaryInformation) newErrors.beneficiaryInformation = 'Beneficiary information is required';
    if (!accountType) newErrors.accountType = 'Account type is required';
    if (!institutionName) newErrors.institutionName = 'Institution name is required';
    if (!routingNumber) newErrors.routingNumber = 'Routing number is required';
    if (!beneficiaryAccount) newErrors.beneficiaryAccount = 'Account number is required';
    if (!futureDraftDate) newErrors.futureDraftDate = 'Future draft date is required';
    if (carrier === 'SSL' && !sslConfirmed) {
      newErrors.ssl = 'Please confirm SSL is for CHF customer';
    }

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
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setIsCustomerBlocked(false);
                        setBlockReason('');
                        setTransferCheckCompleted(false);
                      }}
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
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
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
                    {/* Blocked Message */}
                    {isCustomerBlocked && (
                      <div className="bg-red-600 border border-red-700 rounded-md p-4">
                        <div className="flex items-center justify-center">
                          <span className="text-white font-bold text-lg text-center">
                            ⚠️ WE CANNOT ACCEPT THIS CUSTOMER
                          </span>
                        </div>
                        <p className="text-white text-center mt-2 font-medium">{blockReason}</p>
                      </div>
                    )}

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
                  <Label htmlFor="birthState">
                    Birth State <span className="text-red-500">*</span>
                  </Label>
                  <Select value={birthState} onValueChange={setBirthState}>
                    <SelectTrigger className={errors.birthState ? 'border-red-500' : ''}>
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
                  {errors.birthState && <p className="text-sm text-red-500">{errors.birthState}</p>}
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
                  <Label htmlFor="age">
                    Age <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g., 23"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className={errors.age ? 'border-red-500' : ''}
                  />
                  {errors.age && <p className="text-sm text-red-500">{errors.age}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialSecurity">
                    Social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="socialSecurity"
                    placeholder="XXX-XX-XXXX"
                    value={socialSecurity}
                    onChange={(e) => setSocialSecurity(e.target.value)}
                    className={errors.socialSecurity ? 'border-red-500' : ''}
                  />
                  {errors.socialSecurity && <p className="text-sm text-red-500">{errors.socialSecurity}</p>}
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
                  <Label htmlFor="height">
                    Height <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="height"
                    placeholder="Height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className={errors.height ? 'border-red-500' : ''}
                  />
                  {errors.height && <p className="text-sm text-red-500">{errors.height}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Weight <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="weight"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={errors.weight ? 'border-red-500' : ''}
                  />
                  {errors.weight && <p className="text-sm text-red-500">{errors.weight}</p>}
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
                <Label>
                  Tobacco Use <span className="text-red-500">*</span>
                </Label>
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
                {errors.tobaccoUse && <p className="text-sm text-red-500">{errors.tobaccoUse}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="healthConditions">
                  Health Conditions <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="healthConditions"
                  placeholder="Health Conditions"
                  value={healthConditions}
                  onChange={(e) => setHealthConditions(e.target.value)}
                  rows={3}
                  className={errors.healthConditions ? 'border-red-500' : ''}
                />
                {errors.healthConditions && <p className="text-sm text-red-500">{errors.healthConditions}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">
                  Medications <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="medications"
                  placeholder="Medications"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  rows={3}
                  className={errors.medications ? 'border-red-500' : ''}
                />
                {errors.medications && <p className="text-sm text-red-500">{errors.medications}</p>}
              </div>

              <Button
                type="button"
                onClick={handleOpenUnderwritingModal}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Underwrite
              </Button>
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
                  <Label htmlFor="monthlyPremium">
                    Monthly Premium <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="monthlyPremium"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 23"
                    value={monthlyPremium}
                    onChange={(e) => setMonthlyPremium(e.target.value)}
                    className={errors.monthlyPremium ? 'border-red-500' : ''}
                  />
                  {errors.monthlyPremium && <p className="text-sm text-red-500">{errors.monthlyPremium}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverageAmount">
                    Coverage Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="coverageAmount"
                    type="number"
                    placeholder="e.g., 23"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                    className={errors.coverageAmount ? 'border-red-500' : ''}
                  />
                  {errors.coverageAmount && <p className="text-sm text-red-500">{errors.coverageAmount}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">
                    Carrier <span className="text-red-500">*</span>
                  </Label>
                  <Select value={carrier} onValueChange={handleCarrierChange}>
                    <SelectTrigger className={errors.carrier ? 'border-red-500' : ''}>
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
                  {errors.carrier && <p className="text-sm text-red-500">{errors.carrier}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productType">
                    Product Type <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={productType} 
                    onValueChange={setProductType}
                    disabled={!carrier || (carrier === 'SSL' && !sslConfirmed)}
                  >
                    <SelectTrigger className={errors.productType ? 'border-red-500' : ''}>
                      <SelectValue placeholder={!carrier ? "Select carrier first" : "Please Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(carrier && CARRIER_PRODUCT_TYPES[carrier] || []).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="draftDate">
                  Draft Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="draftDate"
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className={errors.draftDate ? 'border-red-500' : ''}
                />
                {errors.draftDate && <p className="text-sm text-red-500">{errors.draftDate}</p>}
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
                  <Label htmlFor="beneficiaryName">
                    Beneficiary Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="beneficiaryName"
                    placeholder="Beneficiary Name"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className={errors.beneficiaryName ? 'border-red-500' : ''}
                  />
                  {errors.beneficiaryName && <p className="text-sm text-red-500">{errors.beneficiaryName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryPhone">
                    Beneficiary Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="beneficiaryPhone"
                    type="tel"
                    placeholder="(000) 000-0000"
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    className={errors.beneficiaryPhone ? 'border-red-500' : ''}
                  />
                  {errors.beneficiaryPhone && <p className="text-sm text-red-500">{errors.beneficiaryPhone}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficiaryInformation">
                  Beneficiary Information <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="beneficiaryInformation"
                  placeholder="Beneficiary Information"
                  value={beneficiaryInformation}
                  onChange={(e) => setBeneficiaryInformation(e.target.value)}
                  rows={3}
                  className={errors.beneficiaryInformation ? 'border-red-500' : ''}
                />
                {errors.beneficiaryInformation && <p className="text-sm text-red-500">{errors.beneficiaryInformation}</p>}
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
                <Label>
                  Bank Account Type <span className="text-red-500">*</span>
                </Label>
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
                {errors.accountType && <p className="text-sm text-red-500">{errors.accountType}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="institutionName">
                  Institution Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="institutionName"
                  placeholder="Institution Name"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className={errors.institutionName ? 'border-red-500' : ''}
                />
                {errors.institutionName && <p className="text-sm text-red-500">{errors.institutionName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">
                    Routing Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="routingNumber"
                    placeholder="Routing Number"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className={errors.routingNumber ? 'border-red-500' : ''}
                  />
                  {errors.routingNumber && <p className="text-sm text-red-500">{errors.routingNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryAccount">
                    Account Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="beneficiaryAccount"
                    placeholder="Account Number"
                    value={beneficiaryAccount}
                    onChange={(e) => setBeneficiaryAccount(e.target.value)}
                    className={errors.beneficiaryAccount ? 'border-red-500' : ''}
                  />
                  {errors.beneficiaryAccount && <p className="text-sm text-red-500">{errors.beneficiaryAccount}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="futureDraftDate">
                  Future Draft Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="futureDraftDate"
                  type="date"
                  value={futureDraftDate}
                  onChange={(e) => setFutureDraftDate(e.target.value)}
                  className={errors.futureDraftDate ? 'border-red-500' : ''}
                />
                {errors.futureDraftDate && <p className="text-sm text-red-500">{errors.futureDraftDate}</p>}
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
            <Button type="submit" disabled={isSubmitting || isCustomerBlocked}>
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

        {/* Underwriting Modal */}
        <Dialog open={showUnderwritingModal} onOpenChange={() => setShowUnderwritingModal(false)}>
          <DialogContent 
            className="max-w-[95vw] max-h-[95vh] overflow-y-auto w-full"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            hideCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-700">Underwriting</DialogTitle>
              <DialogDescription className="text-base">
                Please read the following script to the customer and verify all information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4 text-xl">
              {/* Two Column Layout: Questions (Left) and Toolkit (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Underwriting Script */}
                <div className="bg-gray-50 p-4 rounded-lg border h-full overflow-y-auto">
                  <h4 className="font-bold text-2xl mb-3">Underwriting Questions</h4>
                  
                  <div className="space-y-4 text-xl">
                    <p className="font-medium">
                      "I am going to ask you some medical questions and we expect your honesty that is going to save us a lot of time. And, this will help us evaluate which insurance carrier comes back with the maximum benefit at the lowest rates for you."
                    </p>
                    
                    {/* Question 1 */}
                    <div className="space-y-3 p-4 bg-white rounded-lg border">
                      <p className="font-bold text-xl">Question 1:</p>
                      <p className="text-lg">Have you ever been diagnosed or treated for Alzheimer's Dementia, Congestive heart failure, organ transplant, HIV, AIDS, ARC, Leukemia, Tuberculosis, chronic Respiratory disease, currently paralyzed, amputation due to a disease? Are you currently hospitalized in a nursing facility? Due to a disease are you currently confined to a wheelchair? Are you currently on oxygen?</p>
                    </div>
                    
                    {/* Question 2 */}
                    <div className="space-y-3 p-4 bg-white rounded-lg border">
                      <p className="font-bold text-xl">Question 2:</p>
                      <p className="text-lg">In the last 5 years, have you had any heart attacks, cancers, Alzheimer's, dementia, congestive heart failure, kidney failure or an organ removal? Have you ever had any disorders of the kidney, lung, brain, heart, circulatory system or liver? Or In the last 3 years have you been diagnosed and treated for leukemia, sickle cell anemia, brain disorder, Alzheimer's or dementia, aneurysm, diabetic coma, amputation due to any disease, cirrhosis of the liver, Multiple Sclerosis, chronic respiratory disease, tuberculosis, chronic pneumonia, hepatitis? Or In the last 2 years if you had any stents, pacemaker, defibrillator, valve replacement, stroke, TIA or paralysis?</p>
                    </div>
                    
                    {/* Question 3 */}
                    <div className="space-y-3 p-4 bg-white rounded-lg border">
                      <p className="font-bold text-xl">Question 3:</p>
                      <p className="text-lg">Or if you have any complications from diabetes? Like (Neuropathy, amputation due to diabetes, retinopathy, diabetic coma, etc) Have you been treated or diagnosed with COPD, Bipolar, or schizophrenia?</p>
                    </div>

                    {/* Tobacco Question */}
                    <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                      <p className="font-bold mb-2 text-xl">Tobacco Usage:</p>
                      <p className="text-lg">Have you consumed any tobacco or nicotine products in the last 12 months?</p>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-xl">
                          <input 
                            type="radio" 
                            name="tobacco" 
                            checked={underwritingData.tobaccoLast12Months === 'yes'}
                            onChange={() => setUnderwritingData({...underwritingData, tobaccoLast12Months: 'yes'})}
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2 text-xl">
                          <input 
                            type="radio" 
                            name="tobacco" 
                            checked={underwritingData.tobaccoLast12Months === 'no'}
                            onChange={() => setUnderwritingData({...underwritingData, tobaccoLast12Months: 'no'})}
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <p className="font-medium text-xl mt-4">Lastly, do you have any health conditions or take any prescribed medication on a regular basis?</p>
                    
                    {/* Follow Up Questions */}
                    <div className="p-4 bg-white rounded-lg border">
                      <p className="font-bold text-xl">Follow Up:</p>
                      <ul className="list-disc ml-6 text-lg mt-2">
                        <li>How many medications are you taking on a daily basis?</li>
                        <li>Do you know what those medications are for?</li>
                        <li>Do you have your medications, or a list of your medications nearby?</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right Column: Insurance Toolkit iframe */}
                <div className="bg-white border-2 border-purple-200 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-purple-600 text-white px-4 py-2 font-bold text-lg flex justify-between items-center flex-shrink-0">
                    <span>Insurance Toolkit</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const iframe = document.getElementById('healthKitIframeFE') as HTMLIFrameElement;
                          if (iframe) iframe.src = 'https://insurancetoolkits.com/fex/quoter';
                        }}
                      >
                        Quote Tool
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-white border-white hover:bg-purple-700"
                        onClick={() => {
                          const iframe = document.getElementById('healthKitIframeFE') as HTMLIFrameElement;
                          if (iframe) iframe.src = 'https://insurancetoolkits.com/login';
                        }}
                      >
                        Login
                      </Button>
                    </div>
                  </div>
                  <div className="border-2 border-purple-300 rounded-lg overflow-hidden bg-white flex-1" style={{ minHeight: '600px' }}>
                    <iframe
                      style={{ border: 'none', height: '100%', width: '100%' }}
                      src="https://insurancetoolkits.com/login"
                      title="Insurance Toolkit"
                      id="healthKitIframeFE"
                    />
                  </div>
                </div>
              </div>

              {/* Health Conditions */}
              <div className="space-y-2">
                <Label className="text-xl font-bold">Health Conditions:</Label>
                <TagInput
                  tags={underwritingData.healthConditions}
                  onChange={(tags) => setUnderwritingData({...underwritingData, healthConditions: tags})}
                  placeholder="Type and press Enter to add conditions..."
                  className="text-xl"
                />
                <p className="text-sm text-gray-500">Click on conditions above to add them, or type custom conditions.</p>
              </div>

              {/* Medications */}
              <div className="space-y-2">
                <Label className="text-xl font-bold">Medications:</Label>
                <TagInput
                  tags={underwritingData.medications}
                  onChange={(tags) => setUnderwritingData({...underwritingData, medications: tags})}
                  placeholder="Type and press Enter to add medications..."
                  className="text-xl"
                />
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Height:</Label>
                  <Input
                    value={underwritingData.height}
                    onChange={(e) => setUnderwritingData({...underwritingData, height: e.target.value})}
                    placeholder="e.g., 5'10&quot;"
                    className="text-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Weight:</Label>
                  <Input
                    value={underwritingData.weight}
                    onChange={(e) => setUnderwritingData({...underwritingData, weight: e.target.value})}
                    placeholder="e.g., 180 lbs"
                    className="text-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Carrier:</Label>
                  <Input
                    value={underwritingData.carrier}
                    onChange={(e) => setUnderwritingData({...underwritingData, carrier: e.target.value})}
                    placeholder="e.g., AMAM"
                    className="text-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Product Level:</Label>
                  <Input
                    value={underwritingData.productLevel}
                    onChange={(e) => setUnderwritingData({...underwritingData, productLevel: e.target.value})}
                    placeholder="e.g., Preferred"
                    className="text-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Coverage Amount:</Label>
                  <Input
                    value={underwritingData.coverageAmount}
                    onChange={(e) => setUnderwritingData({...underwritingData, coverageAmount: e.target.value})}
                    placeholder="e.g., $10,000"
                    className="text-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xl font-bold">Monthly Premium:</Label>
                  <Input
                    value={underwritingData.monthlyPremium}
                    onChange={(e) => setUnderwritingData({...underwritingData, monthlyPremium: e.target.value})}
                    placeholder="e.g., $50.00"
                    className="text-xl h-12"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 flex-col gap-2">
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={handleSaveUnderwriting} 
                  className="text-lg px-6 bg-green-600 hover:bg-green-700 flex-1"
                >
                  Save & Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowUnderwritingModal(false)} 
                  className="text-lg px-6"
                >
                  Cancel
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SSL Confirmation Dialog */}
        <Dialog open={showSSLConfirmation} onOpenChange={() => {}}>
          <DialogContent 
            className="max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            hideCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">SSL Confirmation Required</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-lg font-medium">
                SSL is only used for people with CHF. Please confirm this is a prospect that needs SSL due to being diagnosed with CHF.
              </p>
            </div>
            <DialogFooter className="flex-col gap-2">
              <Button 
                onClick={handleSSLConfirm} 
                className="w-full bg-green-600 hover:bg-green-700 text-lg"
              >
                Yes - Customer has CHF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSSLCancel}
                className="w-full text-lg"
              >
                No - Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FEQuoteForm;
