import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, User, MapPin, Phone, Calendar, DollarSign, Heart, Building, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetailedLead {
  id: string;
  submission_id: string;
  customer_full_name: string;
  phone_number: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number;
  birth_state?: string;
  social_security: string;
  driver_license?: string;
  existing_coverage?: string;
  previous_applications?: string;
  height?: string;
  weight?: string;
  doctors_name?: string;
  tobacco_use?: string;
  health_conditions: string;
  medications?: string;
  carrier: string;
  product_type: string;
  coverage_amount: number;
  monthly_premium: number;
  draft_date: string;
  future_draft_date?: string;
  beneficiary_information?: string;
  institution_name?: string;
  beneficiary_routing: string;
  beneficiary_account: string;
  account_type?: string;
  additional_notes: string;
  lead_vendor?: string;
}

interface DetailedLeadInfoCardProps {
  lead: DetailedLead;
}

export const DetailedLeadInfoCard = ({ lead }: DetailedLeadInfoCardProps) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    const leadInfo = `
Call Center Information:

PERSONAL INFORMATION:
Name: ${lead.customer_full_name}
Address: ${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
Birth State: ${lead.birth_state || 'N/A'}
Date of Birth: ${lead.date_of_birth}
Age: ${lead.age}
Number: ${lead.phone_number}
Social: ${lead.social_security}
Driver License Number: ${lead.driver_license || 'N/A'}

COVERAGE HISTORY:
Any existing/previous coverage in last 2 years: ${lead.existing_coverage || 'N/A'}
Any previous applications: ${lead.previous_applications || 'N/A'}

HEALTH INFORMATION:
Height: ${lead.height || 'N/A'}
Weight: ${lead.weight || 'N/A'}
Doctors Name: ${lead.doctors_name || 'N/A'}
Tobacco Use: ${lead.tobacco_use || 'N/A'}
Health Conditions: ${lead.health_conditions || 'N/A'}
Medications: ${lead.medications || 'N/A'}

INSURANCE DETAILS:
Carrier: ${lead.carrier}
Monthly Premium: $${lead.monthly_premium}
Coverage Amount: $${lead.coverage_amount?.toLocaleString()}
Draft Date: ${lead.draft_date}
First Draft: ${lead.future_draft_date || 'N/A'}

BENEFICIARY & BANKING:
Beneficiary Information: ${lead.beneficiary_information || 'N/A'}
Institution Name: ${lead.institution_name || 'N/A'}
Routing Number: ${lead.beneficiary_routing}
Account Number: ${lead.beneficiary_account}
Account Type: ${lead.account_type || 'N/A'}

ADDITIONAL NOTES:
${lead.additional_notes}

Submission ID: ${lead.submission_id}
Lead Vendor: ${lead.lead_vendor || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(leadInfo);
    toast({
      title: "Copied!",
      description: "Complete lead information copied to clipboard",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const InfoRow = ({ label, value, icon }: { label: string; value: string | number | undefined | null; icon?: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1">
      {icon && <div className="mt-0.5">{icon}</div>}
      <div className="flex-1">
        <span className="font-medium text-sm">{label}:</span>
        <span className="ml-2 text-sm">{value || 'N/A'}</span>
      </div>
    </div>
  );

  // Check if this lead has detailed information (from JotForm) or basic info only
  const hasDetailedInfo = lead.birth_state || lead.height || lead.weight || lead.tobacco_use || lead.medications;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Additional Info
          
        </CardTitle>
        <Button onClick={copyToClipboard} variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy Notes Template
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notice for limited data */}
        {!hasDetailedInfo && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This lead has basic information only. Detailed call center information is available for leads processed from JotForm.
            </p>
          </div>
        )}

        {/* Personal Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="space-y-2">
              <InfoRow label="Name" value={lead.customer_full_name} />
              <InfoRow label="Birth State" value={lead.birth_state} />
              <InfoRow label="Date of Birth" value={lead.date_of_birth} icon={<Calendar className="h-4 w-4" />} />
              <InfoRow label="Age" value={lead.age} />
              <InfoRow label="Social Security" value={lead.social_security} />
              <InfoRow label="Driver License Number" value={lead.driver_license} />
            </div>
            <div className="space-y-2">
              <InfoRow label="Number" value={lead.phone_number} icon={<Phone className="h-4 w-4" />} />
              <InfoRow 
                label="Address" 
                value={`${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}`}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        {/* Coverage History - Only show if detailed info available */}
        {hasDetailedInfo && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Coverage History</h3>
            <div className="p-4 bg-yellow-50 rounded-lg space-y-2">
              <InfoRow label="Any existing/previous coverage in last 2 years" value={lead.existing_coverage} />
              <InfoRow label="Any previous applications" value={lead.previous_applications} />
            </div>
          </div>
        )}

        {/* Health Information - Only show if detailed info available */}
        {hasDetailedInfo && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Health Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
              <div className="space-y-2">
                <InfoRow label="Height" value={lead.height} />
                <InfoRow label="Weight" value={lead.weight} />
                <InfoRow label="Doctors Name" value={lead.doctors_name} />
                <InfoRow label="Tobacco Use" value={lead.tobacco_use} />
              </div>
              <div className="space-y-2">
                <InfoRow label="Health Conditions" value={lead.health_conditions} />
                <InfoRow label="Medications" value={lead.medications} />
              </div>
            </div>
          </div>
        )}

        {/* Insurance Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Insurance Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
            <div className="space-y-2">
              <InfoRow label="Carrier" value={lead.carrier} />
              <InfoRow label="Monthly Premium" value={formatCurrency(lead.monthly_premium)} />
              <InfoRow label="Coverage Amount" value={formatCurrency(lead.coverage_amount)} />
            </div>
            <div className="space-y-2">
              <InfoRow label="Draft Date" value={lead.draft_date} />
              <InfoRow label="First Draft" value={lead.future_draft_date} />
            </div>
          </div>
        </div>

        {/* Beneficiary & Banking - Only show if detailed info available */}
        {hasDetailedInfo && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Building className="h-4 w-4" />
              Beneficiary & Banking Information
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <InfoRow label="Beneficiary Information" value={lead.beneficiary_information} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <InfoRow label="Institution Name" value={lead.institution_name} icon={<Building className="h-4 w-4" />} />
                  <InfoRow label="Routing Number" value={lead.beneficiary_routing} />
                </div>
                <div className="space-y-2">
                  <InfoRow label="Account Number" value={lead.beneficiary_account} icon={<CreditCard className="h-4 w-4" />} />
                  <InfoRow label="Account Type" value={lead.account_type} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        {lead.additional_notes && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Additional Information</h3>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{lead.additional_notes}</p>
            </div>
          </div>
        )}

        {/* Lead Source */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Lead Vendor: {lead.lead_vendor || 'N/A'}</span>
            <span>Submission ID: {lead.submission_id}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
