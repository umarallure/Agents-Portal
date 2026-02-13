import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, AlertCircle, Shield, Package, DollarSign, Truck, CreditCard, Landmark, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCenterUser } from '@/hooks/useCenterUser';

const PRODUCT_INFO = {
  companyName: 'Bay Alarm Alert',
  productName: 'SOS All-In-One 2',
  deviceCost: 149.00,
  discountedDeviceCost: 89.40,
  monthlySubscription: 34.95,
  protectionPlan: 4.95,
  shipping: 15.00
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR'
];

// List of lead vendors allowed to use Medalert features
const ALLOWED_MEDALERT_VENDORS = [
  "AJ BPO",
  "WinBPO",
  "Argon Comm",
  "Test"
];

const MedalertQuoteForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { leadVendor, loading: centerLoading } = useCenterUser();

  // Client Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Primary User
  const [primaryUserSameAsClient, setPrimaryUserSameAsClient] = useState(true);
  const [primaryUserFirstName, setPrimaryUserFirstName] = useState('');
  const [primaryUserLastName, setPrimaryUserLastName] = useState('');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'ach'>('credit_card');
  const [includeProtectionPlan, setIncludeProtectionPlan] = useState(false);

  // Credit Card
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // ACH
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountHolderName, setAccountHolderName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // DNC Check
  const [dncChecked, setDncChecked] = useState(false);
  const [dncChecking, setDncChecking] = useState(false);
  const [dncResult, setDncResult] = useState<{isDnc: boolean; isTcpa: boolean; message: string; rawData?: any} | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const calculateTotal = () => {
    const deviceCost = PRODUCT_INFO.discountedDeviceCost;
    const shipping = PRODUCT_INFO.shipping;
    const protectionPlan = includeProtectionPlan ? PRODUCT_INFO.protectionPlan : 0;
    return deviceCost + shipping + protectionPlan;
  };

  const calculateMonthlyTotal = () => {
    let total = PRODUCT_INFO.monthlySubscription;
    if (includeProtectionPlan) {
      total += PRODUCT_INFO.protectionPlan;
    }
    return total;
  };

  // DNC Check Function
  const checkDnc = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid phone number before checking DNC.',
        variant: 'destructive',
      });
      return;
    }

    setDncChecking(true);
    setDncResult(null);

    try {
      // Clean the phone number - remove non-digits
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      const response = await fetch('https://akdryqadcxhzqcqhssok.supabase.co/functions/v1/dnc-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZHJ5cWFkY3hoenFjcWhzc29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Mjg5MDQsImV4cCI6MjA2OTMwNDkwNH0.36poCyc_PGl2EnGM3283Hj5_yxRYQU2IetYl8aUA3r4',
        },
        body: JSON.stringify({ mobileNumber: cleanPhone }),
      });

      if (!response.ok) {
        throw new Error('DNC check failed');
      }

      const result = await response.json();
      
      // Debug: Log the full response to see the structure
      console.log('DNC API Response:', JSON.stringify(result, null, 2));
      
      // Parse the RealValidito response
      // The API returns: { status: "success", data: { tcpa_litigator: ["8608907018"], cleaned_number: [], invalid: [] } }
      const apiData = result?.data || result;
      
      // Check if phone number is in tcpa_litigator array
      const tcpaLitigatorList = apiData?.tcpa_litigator || [];
      const isTcpa = Array.isArray(tcpaLitigatorList) && tcpaLitigatorList.includes(cleanPhone);
      
      // Check DNC - for now RealValidito doesn't return DNC, only TCPA litigator
      // If you have DNC data, it would likely be in a similar array structure
      const dncList = apiData?.dnc || apiData?.do_not_call || [];
      const isDnc = Array.isArray(dncList) && dncList.includes(cleanPhone);
      
      // Also check if it's in any restricted list
      const isRestricted = false; // No restricted field in this API response
      
      setDncResult({
        isDnc: isDnc || isRestricted,
        isTcpa: isTcpa,
        message: isTcpa 
          ? 'WARNING: This number is flagged as TCPA/Litigator. Cannot proceed with submission.'
          : isDnc 
            ? 'This number is on the DNC list. Proceed with caution.'
            : isRestricted
              ? 'This number is restricted. Proceed with caution.'
              : 'This number is clear. Safe to proceed.',
        rawData: result // Store raw data for debugging
      });

      if (isTcpa) {
        toast({
          title: 'TCPA Alert',
          description: 'This phone number is flagged as TCPA/Litigator. Form submission is blocked.',
          variant: 'destructive',
        });
      } else if (isDnc || isRestricted) {
        toast({
          title: 'DNC Warning',
          description: 'This number is on the Do Not Call list. Please verify before proceeding.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'DNC Check Complete',
          description: 'This number is clear and safe to contact.',
        });
      }
    } catch (error) {
      console.error('DNC check error:', error);
      toast({
        title: 'DNC Check Failed',
        description: 'Unable to check DNC status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDncChecking(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    if (!address) newErrors.address = 'Address is required';
    if (!city) newErrors.city = 'City is required';
    if (!state) newErrors.state = 'State is required';
    if (!zipCode) newErrors.zipCode = 'ZIP code is required';

    if (!primaryUserSameAsClient) {
      if (!primaryUserFirstName) newErrors.primaryUserFirstName = 'Primary user first name is required';
      if (!primaryUserLastName) newErrors.primaryUserLastName = 'Primary user last name is required';
    }

    if (paymentMethod === 'credit_card') {
      if (!cardNumber) newErrors.cardNumber = 'Card number is required';
      if (!expiryDate) newErrors.expiryDate = 'Expiry date is required';
      if (!cvv) newErrors.cvv = 'CVV is required';
      if (!cardholderName) newErrors.cardholderName = 'Cardholder name is required';
    } else {
      if (!routingNumber) newErrors.routingNumber = 'Routing number is required';
      if (!accountNumber) newErrors.accountNumber = 'Account number is required';
      if (!accountHolderName) newErrors.accountHolderName = 'Account holder name is required';
    }

    // DNC Check Validation
    if (!dncChecked) {
      newErrors.dnc = 'You must check DNC/TCPA status before submitting';
    }

    // Block submission if TCPA is detected
    if (dncResult?.isTcpa) {
      newErrors.dnc = 'Cannot submit: This number is flagged as TCPA/Litigator';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if DNC has been checked
    if (!dncChecked) {
      toast({
        title: 'DNC Check Required',
        description: 'Please check the DNC/TCPA status before submitting the form.',
        variant: 'destructive',
      });
      return;
    }

    // Block submission if TCPA is detected
    if (dncResult?.isTcpa) {
      toast({
        title: 'Submission Blocked',
        description: 'Cannot submit: This phone number is flagged as TCPA/Litigator.',
        variant: 'destructive',
      });
      return;
    }

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
      // Prepare payload for the create-lead edge function
      const primaryUserFirst = primaryUserSameAsClient ? firstName : primaryUserFirstName;
      const primaryUserLast = primaryUserSameAsClient ? lastName : primaryUserLastName;
      const customerFullName = `${primaryUserFirst} ${primaryUserLast}`;

      const totalUpfront = calculateTotal();
      const totalMonthly = calculateMonthlyTotal();

      const leadPayload = {
        // Basic lead info (required by edge function)
        first_name: firstName,
        last_name: lastName,
        customer_full_name: customerFullName,
        phone_number: phoneNumber,
        address: address,
        city: city,
        state: state,
        zip_code: zipCode,
        
        // Generate submission_id
        submission_id: `MEDALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        
        // SOURCE & VERSION
        source: 'medalert_quote_form',
        form_version: '1.0',
        
        // PRODUCT INFO - All mapped to direct columns
        carrier: PRODUCT_INFO.companyName,                    // Bay Alarm Alert
        product_type: 'Medalert Device',                      // Product category
        quoted_product: PRODUCT_INFO.productName,             // SOS All-In-One 2
        company_name: PRODUCT_INFO.companyName,               // Company name
        device_cost: PRODUCT_INFO.discountedDeviceCost,       // Device cost (discounted)
        original_device_cost: PRODUCT_INFO.deviceCost,        // Original device cost
        discounted_device_cost: PRODUCT_INFO.discountedDeviceCost, // Discounted device cost
        shipping_cost: PRODUCT_INFO.shipping,                 // Shipping cost
        monthly_subscription: PRODUCT_INFO.monthlySubscription, // Monthly subscription
        protection_plan_cost: includeProtectionPlan ? PRODUCT_INFO.protectionPlan : 0, // Protection plan cost
        protection_plan_included: includeProtectionPlan,      // Whether protection plan is included
        total_upfront_cost: totalUpfront,                     // Total upfront cost
        total_monthly_cost: totalMonthly,                     // Total monthly cost
        
        // LEAD VENDOR & CENTER INFO
        lead_vendor: leadVendor,                              // Lead vendor name
        center_user_name: leadVendor,                         // Center user name
        
        // PRIMARY USER INFO
        primary_user_same_as_client: primaryUserSameAsClient, // Whether primary user is same as client
        primary_user_first_name: primaryUserFirst,            // Primary user first name
        primary_user_last_name: primaryUserLast,              // Primary user last name
        
        // PAYMENT INFO
        payment_method: paymentMethod,                        // Payment method: credit_card or ach
        
        // CREDIT CARD INFO (if applicable)
        ...(paymentMethod === 'credit_card' ? {
          card_number_last_four: cardNumber.slice(-4),        // Last 4 digits of card
          card_expiry: expiryDate,                            // Card expiry date
          cardholder_name: cardholderName,                    // Cardholder name
        } : {
          // ACH INFO (if applicable)
          account_holder_name: accountHolderName,             // Account holder name
          account_number_last_four: accountNumber.slice(-4),  // Last 4 digits of account
          routing_number: routingNumber,                      // Routing number
          account_number: accountNumber,                      // Full account number
          account_type: accountType,                          // Account type (checking/savings)
        }),
        
        // Keep minimal data in beneficiary_info for reference
        beneficiary_info: {
          raw_source: 'medalert_quote_form',
          center_user: leadVendor,
        },
      };

      // Call the create-lead edge function from different Supabase project
      const response = await fetch('https://desmolljguqzgadwkfkq.supabase.co/functions/v1/create-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc21vbGxqZ3VxemdhZHdrZmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDIyNzEsImV4cCI6MjA4MDE3ODI3MX0.bdnyuoYX0cI4d_xf6Vhlwa-RX-5LpH-RQf1GkhmaXy0',
        },
        body: JSON.stringify(leadPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        throw new Error(`Failed to create lead: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Also save to local medalert_leads table for user's reference
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const localLeadData = {
          submission_id: leadPayload.submission_id,
          submitted_by: user?.id,
          lead_vendor: leadVendor,
          center_user_name: leadVendor,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          address: address,
          city: city,
          state: state,
          zip_code: zipCode,
          primary_user_same_as_client: primaryUserSameAsClient,
          primary_user_first_name: primaryUserSameAsClient ? firstName : primaryUserFirstName,
          primary_user_last_name: primaryUserSameAsClient ? lastName : primaryUserLastName,
          company_name: PRODUCT_INFO.companyName,
          quoted_product: PRODUCT_INFO.productName,
          device_cost: PRODUCT_INFO.discountedDeviceCost,
          original_device_cost: PRODUCT_INFO.deviceCost,
          discounted_device_cost: PRODUCT_INFO.discountedDeviceCost,
          shipping_cost: PRODUCT_INFO.shipping,
          monthly_subscription: PRODUCT_INFO.monthlySubscription,
          protection_plan_included: includeProtectionPlan,
          protection_plan_cost: includeProtectionPlan ? PRODUCT_INFO.protectionPlan : 0,
          total_upfront_cost: totalUpfront,
          total_monthly_cost: totalMonthly,
          payment_method: paymentMethod,
          ...(paymentMethod === 'credit_card' ? {
            card_number_last_four: cardNumber.slice(-4),
            card_expiry: expiryDate,
            cardholder_name: cardholderName,
          } : {
            account_holder_name: accountHolderName,
            account_number_last_four: accountNumber.slice(-4),
            routing_number: routingNumber,
            account_number: accountNumber,
            account_type: accountType,
          }),
        };

        const { error: localError } = await supabase
          .from('medalert_leads' as any)
          .insert(localLeadData);

        if (localError) {
          console.error('Error saving to local medalert_leads:', localError);
          // Don't throw here - we still want to show success for the external lead creation
        }

        // Send Slack notification to the center's channel
        try {
          console.log('Sending Slack notification with leadData:', localLeadData);
          
          // Get the current session token for authentication
          const { data: { session } } = await supabase.auth.getSession();
          
          const slackResponse = await fetch('https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/medalert-slack-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`,
            },
            body: JSON.stringify({
              leadData: localLeadData
            }),
          });

          console.log('Slack response status:', slackResponse.status);
          
          if (!slackResponse.ok) {
            const slackError = await slackResponse.text();
            console.error('Slack notification error:', slackError);
            toast({
              title: 'Slack Notification Failed',
              description: `Error: ${slackError}`,
              variant: 'destructive',
            });
          } else {
            const slackResult = await slackResponse.json();
            console.log('Slack notification result:', slackResult);
            
            if (slackResult.success) {
              toast({
                title: 'Slack Notification Sent',
                description: `Notification sent to ${slackResult.channel}`,
              });
            } else {
              toast({
                title: 'Slack Notification Warning',
                description: slackResult.message || 'Could not send notification',
                variant: 'default',
              });
            }
          }
        } catch (slackError) {
          console.error('Error sending Slack notification:', slackError);
          toast({
            title: 'Slack Notification Error',
            description: slackError instanceof Error ? slackError.message : 'Failed to send Slack notification',
            variant: 'destructive',
          });
          // Don't throw - we don't want to block the form submission if Slack fails
        }
      } catch (localError) {
        console.error('Error saving to local table:', localError);
        // Don't throw - the external lead was still created successfully
      }

      toast({
        title: 'Lead Created Successfully',
        description: `The Medalert lead has been created with submission ID: ${leadPayload.submission_id}`,
      });

      // Navigate back to portal
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

  // Check if user is authorized to use Medalert features
  const isAuthorized = leadVendor && ALLOWED_MEDALERT_VENDORS.includes(leadVendor);

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

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center py-16">
              <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-2">
                Your center ({leadVendor || 'Unknown'}) does not have access to Medalert features.
              </p>
              <p className="text-sm text-muted-foreground">
                Please contact your administrator if you believe this is an error.
              </p>
              <Button 
                onClick={() => navigate('/center-lead-portal')}
                className="mt-6"
              >
                Return to Portal
              </Button>
            </CardContent>
          </Card>
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
          <h1 className="text-2xl font-bold text-foreground">Medalert Quote Form</h1>
          <p className="text-muted-foreground">Complete the form below to submit a Medalert device quote</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Product Information</span>
              </CardTitle>
              <CardDescription>Product details and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={PRODUCT_INFO.companyName} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input value={PRODUCT_INFO.productName} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Device Cost</Label>
                  <p className="text-lg font-semibold text-green-600">
                    ${PRODUCT_INFO.discountedDeviceCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground line-through">
                    ${PRODUCT_INFO.deviceCost.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Monthly Subscription</Label>
                  <p className="text-lg font-semibold">${PRODUCT_INFO.monthlySubscription.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Shipping</Label>
                  <p className="text-lg font-semibold">${PRODUCT_INFO.shipping.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Protection Plan (Optional)
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="protection-plan"
                      checked={includeProtectionPlan}
                      onCheckedChange={(checked) => setIncludeProtectionPlan(checked as boolean)}
                    />
                    <Label htmlFor="protection-plan" className="text-sm font-normal cursor-pointer">
                      Add ${PRODUCT_INFO.protectionPlan.toFixed(2)}/mo
                    </Label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Upfront Cost</p>
                    <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold">${calculateMonthlyTotal().toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Client Information</span>
              </CardTitle>
              <CardDescription>Account and contact details for the client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
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
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    // Reset DNC check when phone number changes
                    setDncChecked(false);
                    setDncResult(null);
                  }}
                  className={errors.phoneNumber ? 'border-red-500' : ''}
                />
                {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber}</p>}
              </div>

              {/* DNC Check Section */}
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">DNC/TCPA Check <span className="text-red-500">*</span></h4>
                    <p className="text-xs text-muted-foreground">Required before submission</p>
                  </div>
                  <Button
                    type="button"
                    onClick={checkDnc}
                    disabled={dncChecking || !phoneNumber}
                    variant={dncResult?.isTcpa ? "destructive" : "default"}
                    className={dncResult?.isDnc && !dncResult?.isTcpa ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                    size="sm"
                  >
                    {dncChecking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : dncChecked ? (
                      'Check Again'
                    ) : (
                      'Check DNC/TCPA'
                    )}
                  </Button>
                </div>

                {dncResult && (
                  <div className={`p-3 rounded text-sm ${
                    dncResult.isTcpa 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : dncResult.isDnc 
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {dncResult.isTcpa ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : dncResult.isDnc ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {dncResult.isTcpa 
                            ? 'TCPA/Litigator Detected' 
                            : dncResult.isDnc 
                              ? 'DNC Listed' 
                              : 'Clear - Safe to Contact'}
                        </p>
                        <p className="text-xs mt-1">{dncResult.message}</p>
                        
                        {/* Debug Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowDebugInfo(!showDebugInfo)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                        >
                          {showDebugInfo ? 'Hide' : 'Show'} API Debug Info
                        </button>
                        
                        {showDebugInfo && dncResult.rawData && (
                          <div className="mt-2 p-2 bg-gray-800 text-green-400 text-xs rounded overflow-auto max-h-40">
                            <pre>{JSON.stringify(dncResult.rawData, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="dnc-confirm"
                    checked={dncChecked}
                    onCheckedChange={(checked) => setDncChecked(checked as boolean)}
                    disabled={!dncResult || dncResult.isTcpa}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="dnc-confirm"
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${dncResult?.isTcpa ? 'text-red-500' : ''}`}
                    >
                      I confirm the DNC/TCPA check has been completed
                      {dncResult?.isTcpa && ' (BLOCKED - Cannot proceed)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      You must check DNC/TCPA status and confirm before submitting
                    </p>
                  </div>
                </div>
                {errors.dnc && (
                  <p className="text-sm text-red-500">{errors.dnc}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
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
                  <Select value={state} onValueChange={(value) => setState(value)}>
                    <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select state" />
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
                    ZIP Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="zipCode"
                    placeholder="12345"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className={errors.zipCode ? 'border-red-500' : ''}
                  />
                  {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary User Card */}
          <Card>
            <CardHeader>
              <CardTitle>Primary User Information</CardTitle>
              <CardDescription>The person who will be wearing/using the device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="same-as-client"
                  checked={primaryUserSameAsClient}
                  onCheckedChange={(checked) => setPrimaryUserSameAsClient(checked as boolean)}
                />
                <Label htmlFor="same-as-client" className="font-normal cursor-pointer">
                  Primary user is the same as the client
                </Label>
              </div>

              {!primaryUserSameAsClient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="primaryUserFirstName">
                      Primary User First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="primaryUserFirstName"
                      placeholder="First name"
                      value={primaryUserFirstName}
                      onChange={(e) => setPrimaryUserFirstName(e.target.value)}
                      className={errors.primaryUserFirstName ? 'border-red-500' : ''}
                    />
                    {errors.primaryUserFirstName && (
                      <p className="text-sm text-red-500">{errors.primaryUserFirstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryUserLastName">
                      Primary User Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="primaryUserLastName"
                      placeholder="Last name"
                      value={primaryUserLastName}
                      onChange={(e) => setPrimaryUserLastName(e.target.value)}
                      className={errors.primaryUserLastName ? 'border-red-500' : ''}
                    />
                    {errors.primaryUserLastName && (
                      <p className="text-sm text-red-500">{errors.primaryUserLastName}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Payment Information</span>
              </CardTitle>
              <CardDescription>Select payment method and enter details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'credit_card'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPaymentMethod('credit_card')}
                  >
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Credit Card</p>
                        <p className="text-xs text-muted-foreground">Pay with credit or debit card</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'ach'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPaymentMethod('ach')}
                  >
                    <div className="flex items-center space-x-3">
                      <Landmark className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">ACH/Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Pay directly from bank account</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'credit_card' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">
                      Card Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className={errors.cardNumber ? 'border-red-500' : ''}
                    />
                    {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">
                        Expiry Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className={errors.expiryDate ? 'border-red-500' : ''}
                      />
                      {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">
                        CVV <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className={errors.cvv ? 'border-red-500' : ''}
                      />
                      {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">
                      Cardholder Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cardholderName"
                      placeholder="Name as it appears on card"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className={errors.cardholderName ? 'border-red-500' : ''}
                    />
                    {errors.cardholderName && <p className="text-sm text-red-500">{errors.cardholderName}</p>}
                  </div>
                </div>
              )}

              {/* ACH Form */}
              {paymentMethod === 'ach' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">
                      Account Holder Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountHolderName"
                      placeholder="Full name on account"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className={errors.accountHolderName ? 'border-red-500' : ''}
                    />
                    {errors.accountHolderName && (
                      <p className="text-sm text-red-500">{errors.accountHolderName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">
                      Routing Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="routingNumber"
                      placeholder="9-digit routing number"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className={errors.routingNumber ? 'border-red-500' : ''}
                    />
                    {errors.routingNumber && <p className="text-sm text-red-500">{errors.routingNumber}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">
                      Account Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountNumber"
                      placeholder="Account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className={errors.accountNumber ? 'border-red-500' : ''}
                    />
                    {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={accountType} onValueChange={(value: 'checking' | 'savings') => setAccountType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
            <Button
              type="submit"
              disabled={isSubmitting || dncResult?.isTcpa || !dncChecked}
              className={`min-w-[200px] ${dncResult?.isTcpa ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : dncResult?.isTcpa ? (
                'TCPA - Cannot Submit'
              ) : !dncChecked ? (
                'Check DNC Required'
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

export default MedalertQuoteForm;
