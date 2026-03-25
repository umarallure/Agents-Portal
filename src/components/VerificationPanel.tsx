import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logCallUpdate, getLeadInfo } from "@/lib/callLogging";
// Custom field order for display - matches DetailedLeadInfoCard sequence
const customFieldOrder = [
  "lead_vendor", // Lead Vendor: William G Moore
  "customer_full_name", // Customer full name (combined with lead_vendor in display)
  "street_address",
  "beneficiary_information",
  "phone_number",
  "billing_and_mailing_address_is_the_same",
  "date_of_birth", // Address: 8700 NE 16th St
  "age",
  "social_security",
  "driver_license",
  "exp", // Exp
  "existing_coverage", // Existing coverage
  "applied_to_life_insurance_last_two_years", // Applied to life insurance last two years
  "height", // Height: 5.2
  "weight", // Weight: 160
  "doctors_name", // Doctors Name: Dr. Daniel Pham, MD
  "tobacco_use", // Tobacco Use: NO
  "health_conditions", // Health Conditions
  "medications", // Medications
  "insurance_application_details", // Insurance Application Details
  "carrier", // Carrier: AMAM
  "monthly_premium", // Monthly Premium: $63.37
  "coverage_amount", // Coverage Amount: $5,000
  "draft_date", // Draft Date: 8th of aug
  "first_draft", // First Draft
  "institution_name", // Bank Name: Bank of Oklahoma
  "beneficiary_routing", // Routing Number: 103900036
  "beneficiary_account", // Account Number: 103900036
  "account_type",
   // Beneficiary Information
   // Billing and mailing address is the same: (Y/N)
   // Date of Birth: 1948-05-26
  "birth_state", // Birth State: NE
   // Age: 77
   // Number: (405) 423-4272
  "call_phone_landline", // Call phone/landline
   // Social: 447489617
    // Driver License Number
    // Checking/savings account
];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredProgress } from "@/components/ui/colored-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, User, CheckCircle, XCircle, ArrowRight, Loader2, Copy, Phone } from "lucide-react";

import { TagInput } from "@/components/ui/tag-input";

const calculateAge = (dob: string): string => {
  if (!dob) return '';
  
  let year: number, month: number, day: number;
  
  // Handle both YYYY-MM-DD and MM/DD/YYYY formats
  if (dob.includes('/')) {
    // MM/DD/YYYY format
    const parts = dob.split('/');
    if (parts.length !== 3) return '';
    month = parseInt(parts[0], 10) - 1;
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // YYYY-MM-DD format
    const parts = dob.split('-');
    if (parts.length !== 3) return '';
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  }
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
  
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
};


import { useRealtimeVerification, VerificationItem } from "@/hooks/useRealtimeVerification";

interface VerificationPanelProps {
  sessionId: string;
  onTransferReady?: () => void;
}

export const VerificationPanel = ({ sessionId, onTransferReady }: VerificationPanelProps) => {
  // Helper to get lead data from verificationItems
  const getLeadData = () => {
    const leadData: Record<string, string> = {};
    if (verificationItems) {
      verificationItems.forEach(item => {
        if (['lead_vendor', 'customer_full_name', 'phone_number', 'email'].includes(item.field_name)) {
          leadData[item.field_name] = inputValues[item.id] || item.original_value || '';
        }
      });
    }
    return leadData;
  };
  const { toast } = useToast();

  // Copy notes logic - matches DetailedLeadInfoCard format
  const copyNotesToClipboard = () => {
    if (!verificationItems) return;

    // Create a map of field values for easy lookup
    const fieldValues: Record<string, string> = {};
    verificationItems.forEach(item => {
      fieldValues[item.field_name] = inputValues[item.id] || item.original_value || 'N/A';
    });

    // Format notes in the exact sequence from DetailedLeadInfoCard
    const notesText = [
      `lead_vendor:${fieldValues.lead_vendor || 'N/A'}`,
      `customer_full_name:${fieldValues.customer_full_name || 'N/A'}`,
      `Address: ${fieldValues.street_address || ''}`,
      `Beneficiary Information: ${fieldValues.beneficiary_information || 'N/A'}`,
      `Billing and mailing address is the same: (Y/N)`,
      `Date of Birth: ${fieldValues.date_of_birth || 'N/A'}`,
      `Birth State: ${fieldValues.birth_state || 'N/A'}`,
      `Age: ${fieldValues.age || 'N/A'}`,
      `Number: ${fieldValues.phone_number || 'N/A'}`,
      `Call phone/landline: ${fieldValues.call_phone_landline || ''}`,
      `Social: ${fieldValues.social_security || 'N/A'}`,
      `Driver License Number: ${fieldValues.driver_license || ''}`,
      `Exp: ${fieldValues.exp || ''}`,
      `Existing coverage: ${fieldValues.existing_coverage || 'N/A'}`,
      `Applied to life insurance last two years: ${fieldValues.applied_to_life_insurance_last_two_years || 'N/A'}`,
      `Height: ${fieldValues.height || 'N/A'}`,
      `Weight: ${fieldValues.weight || 'N/A'}`,
      `Doctors Name: ${fieldValues.doctors_name || 'N/A'}`,
      `Tobacco Use: ${fieldValues.tobacco_use || 'N/A'}`,
      `Health Conditions:`,
      `${fieldValues.health_conditions || 'N/A'}`,
      `Medications:`,
      `${fieldValues.medications || 'N/A'}`,
      `Insurance Application Details:`,
      `Carrier: ${fieldValues.carrier || 'N/A'}`,
      `Monthly Premium: $${fieldValues.monthly_premium || 'N/A'}`,
      `Coverage Amount: $${fieldValues.coverage_amount || 'N/A'}`,
      `Draft Date: ${fieldValues.draft_date || 'N/A'}`,
      `First Draft: ${fieldValues.first_draft || 'N/A'}`,
      `Bank Name: ${fieldValues.institution_name || 'N/A'}`,
      `Routing Number: ${fieldValues.beneficiary_routing || 'N/A'}`,
      `Account Number: ${fieldValues.beneficiary_account || 'N/A'}`,
      `Checking/savings account: ${fieldValues.account_type || ''}`,
      `ADDITIONAL NOTES:`,
      `${fieldValues.additional_notes || 'N/A'}`
    ].join('\n');

    navigator.clipboard.writeText(notesText);
    toast({
      title: "Copied!",
      description: "Lead information copied to clipboard in standard format",
    });
  };
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [notes, setNotes] = useState("");
  const [laNotes, setLaNotes] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validatedAddress, setValidatedAddress] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // DNC Check states
  const [dncChecking, setDncChecking] = useState(false);
  const [dncResult, setDncResult] = useState<{isDnc: boolean; isTcpa: boolean; message: string} | null>(null);
  const [showDncModal, setShowDncModal] = useState(false);
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState<string | null>(null);
  const [phoneDncStatus, setPhoneDncStatus] = useState<{itemId: string; status: 'clear' | 'dnc' | 'tcpa'} | null>(null);
  
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
    monthlyPremium: '',
    state: '',
    dateOfBirth: ''
  });
  
  // Underwriting checkbox selections for conditions from questions
  const [underwritingCheckboxes, setUnderwritingCheckboxes] = useState<Record<string, boolean>>({});

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

  const getValueByFieldName = (name: string) => {
    const item = verificationItems?.find(i => i.field_name === name);
    if (!item) return '';
    return inputValues[item.id] !== undefined ? inputValues[item.id] : (item.verified_value || item.original_value || '');
  };

  const handleValidateAddress = async () => {
    setIsValidating(true);
    setValidatedAddress(null);
    setValidationError(null);
    try {
      const streetAddress = getValueByFieldName('street_address');
      const city = getValueByFieldName('city') || '';
      const state = getValueByFieldName('state') || '';
      const zipCode = getValueByFieldName('zip_code') || '';

      const { data, error } = await supabase.functions.invoke('validate-usps-address', {
        body: {
          street_address: streetAddress,
          city: city || undefined,
          state: state || undefined,
          zip_code: zipCode || undefined
        }
      });

      // Check for errors in response
      if (error) {
        // If error object exists, try to extract message from it
        console.error('Supabase function error:', error);
        throw new Error(error.message || "Could not connect to validation service");
      }

      // Check if data contains an error (our Edge Function returns {error: "message"} on errors)
      if (data && data.error) {
        throw new Error(data.error);
      }

      // If no data at all, something went wrong
      if (!data) {
        throw new Error("No response from validation service");
      }

      // Success - clear error and set validated address
      setValidationError(null);
      setValidatedAddress(data);
      
      // Auto-check the street_address checkbox on successful validation
      if (verificationItems) {
        const streetAddressItem = verificationItems.find(i => i.field_name === 'street_address');
        if (streetAddressItem && !streetAddressItem.is_verified) {
          toggleVerification(streetAddressItem.id, true);
        }
      }
      
      toast({
        title: "Address Validated",
        description: "USPS address verification successful",
      });
    } catch (error: any) {
      console.error('Address validation error:', error);
      
      // Extract user-friendly error message from various possible error formats
      let errorMessage = "The address is not verified from USPS. Please ask the correct address from lead.";
      
      if (error.message) {
        // Customize error message based on the type
        if (error.message.includes("Address not found") || error.message.includes("not verified")) {
          errorMessage = "The address is not verified from USPS. Please ask the correct address from lead.";
        } else if (error.message.includes("Invalid")) {
          errorMessage = "The address format is invalid. Please ask the correct address from lead.";
        } else {
          errorMessage = "The address is not verified from USPS. Please ask the correct address from lead.";
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.error) {
        errorMessage = error.error;
      }
      
      // Set error state instead of showing toast
      setValidatedAddress(null);
      setValidationError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const copyValidatedAddress = () => {
    if (!validatedAddress) return;
    
    // Format the complete address for copying
    const streetParts = [validatedAddress.address2, validatedAddress.address1].filter(Boolean);
    const fullStreet = streetParts.join(' ');
    const zipCode = validatedAddress.zip4 
      ? `${validatedAddress.zip5}-${validatedAddress.zip4}`
      : validatedAddress.zip5;
    
    const formattedAddress = `${fullStreet}, ${validatedAddress.city}, ${validatedAddress.state} ${zipCode}`;
    
    navigator.clipboard.writeText(formattedAddress).then(() => {
      toast({
        title: "Address Copied!",
        description: "Validated address copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    });
  };

  const copyAddressField = (fieldName: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    });
  };

  // DNC Check Function
  const checkDnc = async (phoneNumber: string, itemId: string) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number before checking DNC.",
        variant: "destructive"
      });
      return null;
    }

    setDncChecking(true);
    setDncResult(null);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      console.log(`[DNC Check] Checking number: ${cleanPhone}`);
      
      const response = await fetch('https://akdryqadcxhzqcqhssok.supabase.co/functions/v1/dnc-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZHJ5cWFkY3hoenFjcWhzc29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Mjg5MDQsImV4cCI6MjA2OTMwNDkwNH0.36poCyc_PGl2EnGM3283Hj5_yxRYQU2IetYl8aUA3r4',
        },
        body: JSON.stringify({ mobileNumber: cleanPhone }),
      });

      if (!response.ok) {
        throw new Error(`DNC check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[DNC Check] API Response:', result);
      
      let isTcpa = false;
      let isDnc = false;
      
      if (result && result.data) {
        const data = result.data;
        
        if (data.federal_dnc && Array.isArray(data.federal_dnc)) {
          isDnc = data.federal_dnc.includes(cleanPhone);
        }
        
        if (!isDnc && data.dnc && Array.isArray(data.dnc)) {
          isDnc = data.dnc.includes(cleanPhone);
        }
        
        if (data.tcpa_litigator && Array.isArray(data.tcpa_litigator)) {
          isTcpa = data.tcpa_litigator.includes(cleanPhone);
        }
      }
      
      console.log(`[DNC Check] Parsed results - isTcpa: ${isTcpa}, isDnc: ${isDnc}`);
      
      const resultData = {
        isDnc: isDnc,
        isTcpa: isTcpa,
        message: isTcpa 
          ? 'WARNING: This number is flagged as TCPA/Litigator. Cannot proceed with submission.'
          : isDnc 
            ? 'This number is on the DNC list. Proceed with caution.'
            : 'This number is clear. Safe to proceed.',
      };

      setDncResult(resultData);

      if (isTcpa) {
        setPhoneDncStatus({ itemId, status: 'tcpa' });
        setPendingPhoneVerification(itemId);
        setShowDncModal(true);
        toast({
          title: "TCPA Warning",
          description: "This phone number is flagged as TCPA/Litigator.",
          variant: "destructive"
        });
      } else {
        // Always show the DNC script modal - even for clear numbers
        setPhoneDncStatus({ itemId, status: isDnc ? 'dnc' : 'clear' });
        setPendingPhoneVerification(itemId);
        setShowDncModal(true);
        if (isDnc) {
          toast({
            title: "DNC Warning",
            description: "This number is on the Do Not Call list.",
          });
        } else {
          toast({
            title: "Phone Check Complete",
            description: "Please verify consent with the customer.",
          });
        }
      }

      return resultData;
    } catch (error) {
      console.error('[DNC Check] Error:', error);
      toast({
        title: "DNC Check Failed",
        description: "Unable to check DNC status. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setDncChecking(false);
    }
  };

  const handleDncModalConfirm = () => {
    if (pendingPhoneVerification) {
      toggleVerification(pendingPhoneVerification, true);
      toast({
        title: "Consent Verified",
        description: "Phone number verified with customer consent.",
      });
      setPendingPhoneVerification(null);
    }
    setShowDncModal(false);
  };

  const handleDncModalCancel = () => {
    setPendingPhoneVerification(null);
    setShowDncModal(false);
  };
  
  const {
    session,
    verificationItems,
    loading,
    error,
    toggleVerification,
    updateVerifiedValue,
    updateVerificationNotes,
    updateSessionStatus,
    refetch,
  } = useRealtimeVerification(sessionId);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      if (session?.started_at) {
        const start = new Date(session.started_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.started_at]);

  // Initialize input values when verification items change
  useEffect(() => {
    if (verificationItems) {
      const newInputValues: Record<string, string> = {};
      verificationItems.forEach(item => {
        if (!(item.id in inputValues)) {
          newInputValues[item.id] = item.verified_value || item.original_value || '';
        }
      });
      setInputValues(prev => ({ ...prev, ...newInputValues }));
    }
  }, [verificationItems]);

  // Pre-fill underwriting data when modal opens
  useEffect(() => {
    if (showUnderwritingModal && verificationItems) {
      const tobaccoItem = verificationItems.find(i => i.field_name === 'tobacco_use');
      const healthItem = verificationItems.find(i => i.field_name === 'health_conditions');
      const medsItem = verificationItems.find(i => i.field_name === 'medications');
      const heightItem = verificationItems.find(i => i.field_name === 'height');
      const weightItem = verificationItems.find(i => i.field_name === 'weight');
      const carrierItem = verificationItems.find(i => i.field_name === 'carrier');
      const coverageItem = verificationItems.find(i => i.field_name === 'coverage_amount');
      const premiumItem = verificationItems.find(i => i.field_name === 'monthly_premium');
      const stateItem = verificationItems.find(i => i.field_name === 'state');
      const dobItem = verificationItems.find(i => i.field_name === 'date_of_birth');
      
      const getValue = (item: any) => item ? (inputValues[item.id] || item.verified_value || item.original_value || '') : '';
      
      const healthValue = getValue(healthItem) ? getValue(healthItem).split(',').map((s: string) => s.trim()) : [];
      const medsValue = getValue(medsItem) ? getValue(medsItem).split(',').map((s: string) => s.trim()) : [];
      
      setUnderwritingData({
        tobaccoLast12Months: getValue(tobaccoItem).toLowerCase().includes('yes') ? 'yes' : getValue(tobaccoItem).toLowerCase().includes('no') ? 'no' : '',
        healthConditions: healthValue,
        medications: medsValue,
        height: getValue(heightItem),
        weight: getValue(weightItem),
        carrier: getValue(carrierItem),
        productLevel: '',
        coverageAmount: getValue(coverageItem),
        monthlyPremium: getValue(premiumItem),
        state: getValue(stateItem),
        dateOfBirth: getValue(dobItem)
      });
      
      // Pre-fill checkboxes based on existing health conditions
      const allConditions = [...question1Conditions, ...question2Conditions, ...question3Conditions];
      const checkboxes: Record<string, boolean> = {};
      allConditions.forEach(condition => {
        checkboxes[condition] = healthValue.some((m: string) => m.toLowerCase().includes(condition.toLowerCase()));
      });
      setUnderwritingCheckboxes(checkboxes);
    }
  }, [showUnderwritingModal]);

  // Add early returns for loading and error states AFTER all hooks
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading verification data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-500">
            No verification session found
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFieldValueChange = (itemId: string, newValue: string, fieldName?: string) => {
    // Update local state immediately for smooth UI
    setInputValues(prev => ({
      ...prev,
      [itemId]: newValue
    }));
    
    // If street_address field is changed, reset validation state
    if (fieldName === 'street_address') {
      setValidatedAddress(null);
      setValidationError(null);
    }
    
    // Auto-calculate age when DOB changes
    if (fieldName === 'date_of_birth') {
      const calculatedAge = calculateAge(newValue);
      if (calculatedAge) {
        const ageItem = verificationItems?.find(i => i.field_name === 'age');
        if (ageItem) {
          setTimeout(() => {
            updateVerifiedValue(ageItem.id, calculatedAge);
          }, 500);
        }
      }
    }
    
    // Debounce the database update
    setTimeout(() => {
      updateVerifiedValue(itemId, newValue);
    }, 500);
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    toggleVerification(itemId, checked);
  };

  const handleTransferToLA = async () => {
    await updateSessionStatus('transferred');
    
    // Log the transfer event for buffer agents
    if (session?.buffer_agent_id) {
      const { customerName, leadVendor } = await getLeadInfo(session.submission_id);
      const { data: bufferAgentProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', session.buffer_agent_id)
        .single();

      await logCallUpdate({
        submissionId: session.submission_id,
        agentId: session.buffer_agent_id,
        agentType: 'buffer',
        agentName: bufferAgentProfile?.display_name || 'Buffer Agent',
        eventType: 'transferred_to_la',
        eventDetails: {
          verification_session_id: session.id,
          transferred_at: new Date().toISOString()
        },
        verificationSessionId: session.id,
        customerName,
        leadVendor
      });
    }
    
    onTransferReady?.();
  };

  // Calculate real-time progress percentage
  const calculateProgress = () => {
    if (!verificationItems || verificationItems.length === 0) return 0;
    const verifiedCount = verificationItems.filter(item => item.is_verified).length;
    return Math.round((verifiedCount / verificationItems.length) * 100);
  };

  const currentProgress = calculateProgress();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'claimed': return 'bg-purple-500';
      case 'ready_for_transfer': return 'bg-green-500';
      case 'transferred': return 'bg-orange-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getFieldIcon = (item: VerificationItem) => {
    if (!item.is_verified) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (item.is_modified) return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  // Filter out excluded fields
  const excludedFields = ['city', 'state', 'zip_code', 'additional_notes'];
  
  // Sort items by custom order, then group by category for display
  const sortedItems = (verificationItems || [])
    .filter(item => !excludedFields.includes(item.field_name))
    .slice()
    .sort((a, b) => {
    const aIdx = customFieldOrder.indexOf(a.field_name);
    const bIdx = customFieldOrder.indexOf(b.field_name);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const formatFieldName = (fieldName: string) => {
    return fieldName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading verification panel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Verification session not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Verification Panel</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusBadgeColor(session.status)}>
              {session.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {/* Copy Notes Button */}
            <Button onClick={copyNotesToClipboard} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Edited Notes
            </Button>
          </div>
        </div>
        {/* Session Info */}
        <div className="space-y-2 text-sm mt-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Agent: {session.buffer_agent_id || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Time: {elapsedTime}</span>
          </div>
        </div>
        {/* Small Progress Bar (original) */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className={`font-semibold ${
              currentProgress >= 76 ? 'text-green-600' :
              currentProgress >= 51 ? 'text-yellow-600' :
              currentProgress >= 26 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {currentProgress}%
            </span>
          </div>
          <div className="relative">
            <ColoredProgress 
              value={currentProgress} 
              className="h-3 transition-all duration-500"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {verificationItems.filter(item => item.is_verified).length} of {verificationItems.length} fields verified
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              currentProgress >= 76 ? 'bg-green-100 text-green-800' :
              currentProgress >= 51 ? 'bg-yellow-100 text-yellow-800' :
              currentProgress >= 26 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
            }`}>
              {currentProgress >= 76 ? 'Ready for Transfer' :
               currentProgress >= 51 ? 'Nearly Complete' :
               currentProgress >= 26 ? 'In Progress' : 'Just Started'}
            </span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {sortedItems.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {getFieldIcon(item)}
              <Label className="text-xs font-medium">
                {formatFieldName(item.field_name)}
                {(item.field_name === 'date_of_birth' || item.field_name === 'dob') && (
                  <span className="ml-2 text-blue-600 font-normal">
                    (Age: {calculateAge(inputValues[item.id] || item.original_value || item.verified_value || '')})
                  </span>
                )}
              </Label>
              {item.field_name === 'street_address' && (
                 <Button 
                   size="sm" 
                   className="h-6 text-xs px-3 bg-green-600 hover:bg-green-700 text-white ml-auto"
                   onClick={handleValidateAddress}
                   disabled={isValidating}
                 >
                   {isValidating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                   Validate
                 </Button>
              )}
              {item.field_name === 'phone_number' && (
                 <Button 
                   size="sm" 
                   className="h-6 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white ml-auto"
                   onClick={() => checkDnc(inputValues[item.id] || item.original_value || item.verified_value || '', item.id)}
                   disabled={dncChecking}
                 >
                   {dncChecking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Phone className="h-3 w-3 mr-1" />}
                   Check
                 </Button>
              )}
              <Checkbox
                checked={item.is_verified}
                onCheckedChange={(checked) => 
                  handleCheckboxChange(item.id, checked as boolean)
                }
                className={item.field_name === 'street_address' || item.field_name === 'phone_number' ? '' : 'ml-auto'}
              />
            </div>
            {(item.field_name === 'date_of_birth' || item.field_name === 'dob') ? (
              <div className="flex gap-2">
                <Input
                  value={inputValues[item.id] || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Auto-format to MM/DD/YYYY as user types
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length >= 4) {
                      value = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
                    } else if (cleaned.length >= 2) {
                      value = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                    } else {
                      value = cleaned;
                    }
                    handleFieldValueChange(item.id, value, item.field_name);
                  }}
                  onBlur={(e) => {
                    // Convert MM/DD/YYYY to YYYY-MM-DD on blur for storage
                    const value = e.target.value;
                    const parts = value.split('/');
                    if (parts.length === 3) {
                      const month = parts[0].padStart(2, '0');
                      const day = parts[1].padStart(2, '0');
                      const year = parts[2];
                      if (year.length === 4) {
                        const formatted = `${year}-${month}-${day}`;
                        handleFieldValueChange(item.id, formatted, item.field_name);
                      }
                    }
                  }}
                  placeholder="MM/DD/YYYY"
                  className="text-xs"
                  maxLength={10}
                />
              </div>
            ) : (
              <Input
                value={inputValues[item.id] || ''}
                onChange={(e) => handleFieldValueChange(item.id, e.target.value, item.field_name)}
                placeholder={`Enter ${formatFieldName(item.field_name).toLowerCase()}`}
                className="text-xs"
              />
            )}
            {item.field_name === 'age' && (
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                onClick={() => setShowUnderwritingModal(true)}
              >
                Underwriting
              </Button>
            )}
            {item.field_name === 'street_address' && (
              <div className={`mt-2 p-3 border rounded-md text-xs ${
                validationError 
                  ? 'bg-red-50 border-red-200' 
                  : validatedAddress 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
              }`}>
                {validationError ? (
                  /* Error State - Red Box */
                  <>
                    <p className="font-semibold text-red-800 mb-2">❌ Address Validation Failed</p>
                    <p className="text-red-900">{validationError}</p>
                  </>
                ) : validatedAddress ? (
                  /* Success State - Green Box */
                  <>
                    <p className="font-semibold text-green-800 mb-2">✅ Validated Address (USPS):</p>
                    <div className="text-green-900 bg-white p-3 rounded border border-green-100 mb-3 space-y-2">
                      {/* Street Address Row */}
                      <div className="flex items-center justify-between group">
                        <div className="flex-1">
                          <span className="text-gray-600 text-[10px] uppercase">Street: </span>
                          <span className="font-medium">
                            {[validatedAddress.address2, validatedAddress.address1].filter(Boolean).join(' ')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyAddressField('Street', [validatedAddress.address2, validatedAddress.address1].filter(Boolean).join(' '))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* City, State, ZIP in one row with labels */}
                      <div className="flex items-center justify-between group">
                        <div className="flex-1 flex items-center gap-3">
                          <div>
                            <span className="text-gray-600 text-[10px] uppercase">City: </span>
                            <span className="font-medium">{validatedAddress.city}</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <div>
                            <span className="text-gray-600 text-[10px] uppercase">State: </span>
                            <span className="font-medium">{validatedAddress.state}</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <div>
                            <span className="text-gray-600 text-[10px] uppercase">ZIP: </span>
                            <span className="font-medium">
                              {validatedAddress.zip5}{validatedAddress.zip4 ? `-${validatedAddress.zip4}` : ''}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyAddressField('City, State, ZIP', `${validatedAddress.city}, ${validatedAddress.state} ${validatedAddress.zip5}${validatedAddress.zip4 ? `-${validatedAddress.zip4}` : ''}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Separator */}
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      {/* Full Address Display */}
                      <div className="flex items-start justify-between group">
                        <div className="flex-1">
                          <span className="text-gray-600 text-[10px] uppercase">Full Address: </span>
                          <div className="font-medium text-green-800 mt-1">
                            {[validatedAddress.address2, validatedAddress.address1].filter(Boolean).join(' ')}, {validatedAddress.city}, {validatedAddress.state} {validatedAddress.zip5}{validatedAddress.zip4 ? `-${validatedAddress.zip4}` : ''}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={copyValidatedAddress}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-xs px-3 text-green-700 hover:text-green-800 hover:bg-green-50 border border-green-300"
                        onClick={copyValidatedAddress}
                      >
                        <Copy className="h-3 w-3 mr-1.5" />
                        Copy Full
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Default State - Gray Box with Instructions */
                  <>
                    <p className="font-semibold text-gray-700 mb-2">📍 Address Validation</p>
                    <p className="text-gray-600">
                      Press the <span className="font-medium text-gray-800">Validate</span> button to verify the address from USPS.
                    </p>
                  </>
                )}
              </div>
            )}
            <Separator className="mt-4" />
          </div>
        ))}

        {/* BPO Closer Notes - Read Only */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">BPO Closer Notes</Label>
          <div className="bg-gray-50 p-2 rounded-md border text-xs min-h-[40px] whitespace-pre-wrap">
            {getValueByFieldName('additional_notes') || 'No BPO closer notes available'}
          </div>
        </div>

        {/* LA Notes - Editable */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">LA Notes</Label>
          <Textarea
            value={laNotes}
            onChange={(e) => setLaNotes(e.target.value)}
            placeholder="Add LA notes here..."
            className="text-xs"
            rows={2}
          />
        </div>


      </CardContent>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex justify-end gap-3">
            {/* Buffer Agent Buttons */}
            {session.buffer_agent_id && !session.licensed_agent_id && (
              <>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await updateSessionStatus('call_dropped');
                    const leadData = getLeadData();
                    
                    // Get agent profile information
                    let agentProfile = null;
                    let agentType = 'buffer';
                    
                    if (session?.buffer_agent_id) {
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name')
                        .eq('user_id', session.buffer_agent_id)
                        .single();
                      agentProfile = profile;
                      agentType = 'buffer';
                    } else if (session?.licensed_agent_id) {
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name')
                        .eq('user_id', session.licensed_agent_id)
                        .single();
                      agentProfile = profile;
                      agentType = 'licensed';
                    }
                    
                    // Log the call dropped event
                    if (session?.buffer_agent_id) {
                      const { customerName, leadVendor } = await getLeadInfo(session.submission_id);

                      await logCallUpdate({
                        submissionId: session.submission_id,
                        agentId: session.buffer_agent_id,
                        agentType: 'buffer',
                        agentName: agentProfile?.display_name || 'Buffer Agent',
                        eventType: 'call_dropped',
                        eventDetails: {
                          verification_session_id: session.id,
                          dropped_at: new Date().toISOString()
                        },
                        verificationSessionId: session.id,
                        customerName,
                        leadVendor
                      });
                    } else if (session?.licensed_agent_id) {
                      const { customerName, leadVendor } = await getLeadInfo(session.submission_id);

                      await logCallUpdate({
                        submissionId: session.submission_id,
                        agentId: session.licensed_agent_id,
                        agentType: 'licensed',
                        agentName: agentProfile?.display_name || 'Licensed Agent',
                        eventType: 'call_dropped',
                        eventDetails: {
                          verification_session_id: session.id,
                          dropped_at: new Date().toISOString()
                        },
                        verificationSessionId: session.id,
                        customerName,
                        leadVendor
                      });
                    }
                    
                    // Send notification to center
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'call_dropped',
                        submissionId: session.submission_id,
                        leadData
                      }
                    });

                    // Send disconnected call notification
                    const agentInfo = agentType === 'buffer' ? 
                      { buffer_agent: agentProfile?.display_name || 'Buffer Agent' } : 
                      { agent_who_took_call: agentProfile?.display_name || 'Licensed Agent' };

                    await supabase.functions.invoke('disconnected-call-notification', {
                      body: {
                        submissionId: session.submission_id,
                        leadData: {
                          customer_full_name: leadData.customer_full_name,
                          phone_number: leadData.phone_number,
                          email: leadData.email,
                          lead_vendor: leadData.lead_vendor
                        },
                        callResult: {
                          status: "Call Dropped",
                          notes: `Call dropped during verification session. Agent: ${agentProfile?.display_name || (agentType === 'buffer' ? 'Buffer Agent' : 'Licensed Agent')}`,
                          call_source: "Verification Session",
                          ...agentInfo
                        }
                      }
                    });

                    alert(`Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`);
                    toast({
                      title: 'Call Dropped',
                      description: `Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`
                    });
                    refetch();
                  }}
                >
                  Call Dropped
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateSessionStatus('buffer_done');
                    toast({
                      title: 'Call Done',
                      description: 'Buffer agent is now free from the call.'
                    });
                    refetch();
                  }}
                >
                  Call Done
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    await updateSessionStatus('transferred');
                    // Send notification to center when LA claims the call
                    const leadData = getLeadData();
                    // You may need to pass bufferAgentName and licensedAgentName from props/context
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'transfer_to_la',
                        submissionId: session.submission_id,
                        leadData,
                        bufferAgentName: 'Buffer Agent',
                        licensedAgentName: 'Licensed Agent'
                      }
                    });
                    onTransferReady?.();
                    refetch();
                  }}
                >
                  Transfer to LA
                </Button>
              </>
            )}
            {/* Licensed Agent Buttons */}
            {session.licensed_agent_id && (
              <>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await updateSessionStatus('call_dropped');
                    const leadData = getLeadData();
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'call_dropped',
                        submissionId: session.submission_id,
                        leadData
                      }
                    });

                    // Send disconnected call notification
                    const { data: licensedAgentProfile } = await supabase
                      .from('profiles')
                      .select('display_name')
                      .eq('user_id', session.licensed_agent_id)
                      .single();

                    await supabase.functions.invoke('disconnected-call-notification', {
                      body: {
                        submissionId: session.submission_id,
                        leadData: {
                          customer_full_name: leadData.customer_full_name,
                          phone_number: leadData.phone_number,
                          email: leadData.email,
                          lead_vendor: leadData.lead_vendor
                        },
                        callResult: {
                          status: "Call Dropped",
                          notes: `Call dropped during verification session. Agent: ${licensedAgentProfile?.display_name || 'Licensed Agent'}`,
                          call_source: "Verification Session",
                          agent_who_took_call: licensedAgentProfile?.display_name || 'Licensed Agent'
                        }
                      }
                    });

                    alert(`Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`);
                    toast({
                      title: 'Call Dropped',
                      description: `Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`
                    });
                    refetch();
                  }}
                >
                  Call Dropped
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateSessionStatus('la_done');
                    toast({
                      title: 'Call Done',
                      description: 'Licensed agent is now free from the call.'
                    });
                    refetch();
                  }}
                >
                  Call Done
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    await updateSessionStatus('ready_for_transfer');
                    toast({
                      title: 'Transfer',
                      description: 'Session is now available for other licensed agents to claim.'
                    });
                    refetch();
                  }}
                >
                  Transfer to Other Licensed Agent
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Underwriting Modal */}
        <Dialog open={showUnderwritingModal} onOpenChange={() => {}}>
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
            
            {/* Client Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-8 text-lg">
                <div>
                  <span className="font-semibold">State:</span>
                  <span className="ml-2">{underwritingData.state || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold">Date of Birth:</span>
                  <span className="ml-2">{underwritingData.dateOfBirth || 'N/A'}</span>
                </div>
              </div>
            </div>
            
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
                          const iframe = document.getElementById('healthKitIframe') as HTMLIFrameElement;
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
                          const iframe = document.getElementById('healthKitIframe') as HTMLIFrameElement;
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
                      id="healthKitIframe"
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
              <div className="text-sm text-gray-600 text-center">
                Clicking "Save & Verify All" will save all fields below to the verification panel and mark them as verified ✓
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    // Save underwriting data to verification fields - Also update local state for immediate UI update
                    
                    // Update tobacco use
                    const tobaccoItem = verificationItems?.find(i => i.field_name === 'tobacco_use');
                    if (tobaccoItem && underwritingData.tobaccoLast12Months) {
                      const tobaccoValue = underwritingData.tobaccoLast12Months === 'yes' ? 'Yes' : 'No';
                      updateVerifiedValue(tobaccoItem.id, tobaccoValue);
                      setInputValues(prev => ({ ...prev, [tobaccoItem.id]: tobaccoValue }));
                      toggleVerification(tobaccoItem.id, true);
                    }
                    
                    // Update health conditions
                    const healthConditionsItem = verificationItems?.find(i => i.field_name === 'health_conditions');
                    if (healthConditionsItem && underwritingData.healthConditions.length > 0) {
                      const healthValue = underwritingData.healthConditions.join(', ');
                      updateVerifiedValue(healthConditionsItem.id, healthValue);
                      setInputValues(prev => ({ ...prev, [healthConditionsItem.id]: healthValue }));
                      toggleVerification(healthConditionsItem.id, true);
                    }
                    
                    // Update medications
                    const medicationsItem = verificationItems?.find(i => i.field_name === 'medications');
                    if (medicationsItem && underwritingData.medications.length > 0) {
                      const medsValue = underwritingData.medications.join(', ');
                      updateVerifiedValue(medicationsItem.id, medsValue);
                      setInputValues(prev => ({ ...prev, [medicationsItem.id]: medsValue }));
                      toggleVerification(medicationsItem.id, true);
                    }
                    
                    // Update height
                    const heightItem = verificationItems?.find(i => i.field_name === 'height');
                    if (heightItem && underwritingData.height) {
                      updateVerifiedValue(heightItem.id, underwritingData.height);
                      setInputValues(prev => ({ ...prev, [heightItem.id]: underwritingData.height }));
                      toggleVerification(heightItem.id, true);
                    }
                    
                    // Update weight
                    const weightItem = verificationItems?.find(i => i.field_name === 'weight');
                    if (weightItem && underwritingData.weight) {
                      updateVerifiedValue(weightItem.id, underwritingData.weight);
                      setInputValues(prev => ({ ...prev, [weightItem.id]: underwritingData.weight }));
                      toggleVerification(weightItem.id, true);
                    }
                    
                    // Update carrier
                    const carrierItem = verificationItems?.find(i => i.field_name === 'carrier');
                    if (carrierItem && underwritingData.carrier) {
                      updateVerifiedValue(carrierItem.id, underwritingData.carrier);
                      setInputValues(prev => ({ ...prev, [carrierItem.id]: underwritingData.carrier }));
                      toggleVerification(carrierItem.id, true);
                    }
                    
                    // Update coverage amount
                    const coverageItem = verificationItems?.find(i => i.field_name === 'coverage_amount');
                    if (coverageItem && underwritingData.coverageAmount) {
                      const coverageValue = underwritingData.coverageAmount.replace('$', '').replace(',', '');
                      updateVerifiedValue(coverageItem.id, coverageValue);
                      setInputValues(prev => ({ ...prev, [coverageItem.id]: coverageValue }));
                      toggleVerification(coverageItem.id, true);
                    }
                    
                    // Update monthly premium
                    const premiumItem = verificationItems?.find(i => i.field_name === 'monthly_premium');
                    if (premiumItem && underwritingData.monthlyPremium) {
                      const premiumValue = underwritingData.monthlyPremium.replace('$', '').replace(',', '');
                      updateVerifiedValue(premiumItem.id, premiumValue);
                      setInputValues(prev => ({ ...prev, [premiumItem.id]: premiumValue }));
                      toggleVerification(premiumItem.id, true);
                    }
                    
                    // Update doctor's name
                    const doctorsItem = verificationItems?.find(i => i.field_name === 'doctors_name');
                    if (doctorsItem) {
                      const doctorsValue = inputValues[doctorsItem.id] || doctorsItem.verified_value || doctorsItem.original_value || '';
                      if (doctorsValue) {
                        updateVerifiedValue(doctorsItem.id, doctorsValue);
                        setInputValues(prev => ({ ...prev, [doctorsItem.id]: doctorsValue }));
                        toggleVerification(doctorsItem.id, true);
                      }
                    }
                    
                    // Update existing coverage
                    const existingCoverageItem = verificationItems?.find(i => i.field_name === 'existing_coverage');
                    if (existingCoverageItem) {
                      const existingCoverageValue = inputValues[existingCoverageItem.id] || existingCoverageItem.verified_value || existingCoverageItem.original_value || '';
                      if (existingCoverageValue) {
                        updateVerifiedValue(existingCoverageItem.id, existingCoverageValue);
                        setInputValues(prev => ({ ...prev, [existingCoverageItem.id]: existingCoverageValue }));
                        toggleVerification(existingCoverageItem.id, true);
                      }
                    }
                    
                    // Update product level (insurance_application_details)
                    const productLevelItem = verificationItems?.find(i => i.field_name === 'insurance_application_details');
                    if (productLevelItem && underwritingData.productLevel) {
                      updateVerifiedValue(productLevelItem.id, underwritingData.productLevel);
                      setInputValues(prev => ({ ...prev, [productLevelItem.id]: underwritingData.productLevel }));
                      toggleVerification(productLevelItem.id, true);
                    }
                    
                    toast({
                      title: "Underwriting Complete",
                      description: "All verified fields have been updated with checkmarks."
                    });
                    setShowUnderwritingModal(false);
                    refetch();
                  }} 
                  className="text-lg px-6 bg-green-600 hover:bg-green-700 flex-1"
                >
                  Save & Verify All
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DNC Modal */}
        <Dialog open={showDncModal} onOpenChange={setShowDncModal}>
          <DialogContent className={phoneDncStatus?.status === 'tcpa' ? 'border-red-500 max-w-2xl' : 'max-w-2xl'}>
            <DialogHeader>
              <DialogTitle className={phoneDncStatus?.status === 'tcpa' ? 'text-red-600 text-2xl' : phoneDncStatus?.status === 'dnc' ? 'text-orange-600 text-2xl' : 'text-blue-600 text-2xl'}>
                {phoneDncStatus?.status === 'tcpa' ? '⚠️ TCPA LITIGATOR WARNING' : phoneDncStatus?.status === 'dnc' ? '📞 Do Not Call List' : '📞 Phone Verification'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {phoneDncStatus?.status === 'tcpa' 
                  ? 'This number is flagged as a TCPA Litigator. Proceeding may result in legal issues.'
                  : 'Please read the following script to the customer to obtain verbal consent.'}
              </DialogDescription>
            </DialogHeader>
            
            {phoneDncStatus?.status === 'tcpa' && (
              <div className="py-4">
                <p className="text-red-600 font-bold text-center text-2xl">
                  ⚠️ WARNING: This number is a TCPA LITIGATOR
                </p>
                <p className="text-lg text-gray-600 text-center mt-3">
                  This number has been flagged as a TCPA litigator. It is recommended to NOT proceed with this lead.
                </p>
              </div>
            )}
            
            {(phoneDncStatus?.status === 'clear' || phoneDncStatus?.status === 'dnc') && (
              <div className="py-4">
                {phoneDncStatus?.status === 'dnc' && (
                  <p className="text-orange-600 text-lg font-bold mb-3">⚠️ This number is on the Do Not Call list</p>
                )}
                <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                  <p className="text-lg mb-4 font-medium">
                    Is your phone number <span className="text-blue-600 font-bold">{inputValues[pendingPhoneVerification || ''] || ''}</span> on the Federal, National or State Do Not Call List?
                  </p>
                  <p className="text-gray-500 text-sm mb-2">(if a customer says no and we see it's on the DNC list we still have to take the verbal consent)</p>
                  <p className="text-lg mb-4 font-medium">
                    Sir/Ma'am, even if your phone number is on the Federal National or State Do not call list do we still have your permission to call you and submit your application for insurance to <span className="text-blue-600 font-bold">{getValueByFieldName('carrier')}</span> - {new Date().toLocaleDateString()} via your phone number <span className="text-blue-600 font-bold">{inputValues[pendingPhoneVerification || ''] || ''}</span>? And do we have your permission to call you on the same phone number in the future if needed?
                  </p>
                  <p className="text-base text-gray-600 mt-3 font-semibold">Make sure you get a clear YES on it.</p>
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleDncModalCancel} className="text-lg px-6 py-3">
                Cancel
              </Button>
              {phoneDncStatus?.status !== 'tcpa' && (
                <Button onClick={handleDncModalConfirm} className="text-lg px-6 py-3 bg-green-600 hover:bg-green-700">
                  I Got Verbal Consent - Proceed
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Card>
  );
};
