import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, User } from "lucide-react";
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
    const leadInfo = `${lead.lead_vendor || 'Lead Vendor'}: ${lead.customer_full_name}
Address: ${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
Billing and mailing address is the same: (Y/N)
Date of Birth: ${lead.date_of_birth}
Birth State: ${lead.birth_state || ''}
Age: ${lead.age}
Number: ${lead.phone_number}
Call phone/landline:
Social: ${lead.social_security}
Driver License Number: ${lead.driver_license || ''}
Exp:
Existing coverage: ${lead.existing_coverage || ''}
Applied to life insurance last two years: ${lead.previous_applications || ''}
Height: ${lead.height || ''}
Weight: ${lead.weight || ''}
Doctors Name: ${lead.doctors_name || ''}
Tobacco Use: ${lead.tobacco_use || ''}
Health Conditions:
${lead.health_conditions || ''}
Medications:
${lead.medications || ''}
Insurance Application Details:
Carrier: ${lead.carrier}
Monthly Premium: $${lead.monthly_premium}
Coverage Amount: $${lead.coverage_amount?.toLocaleString()}
Draft Date: ${lead.draft_date}
First Draft: ${lead.future_draft_date || ''}
Beneficiary Information: ${lead.beneficiary_information || ''}
Bank Name: ${lead.institution_name || ''}
Routing Number: ${lead.beneficiary_routing}
Account Number: ${lead.beneficiary_account}
Checking/savings account: ${lead.account_type || ''}
ADDITIONAL NOTES:
${lead.additional_notes}`;

    navigator.clipboard.writeText(leadInfo);
    toast({
      title: "Copied!",
      description: "Lead information copied to clipboard",
    });
  };

  const formatValue = (value: string | number | undefined | null) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Additional Notes
        </CardTitle>
        <Button onClick={copyToClipboard} variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-xl font-normal">
          <div><strong>{lead.lead_vendor || 'Lead Vendor'}:</strong> {lead.customer_full_name}</div>
          <br />
          <div><strong>Address:</strong> {lead.street_address}, {lead.city}, {lead.state} {lead.zip_code}</div>
          <div><strong>Billing and mailing address is the same:</strong> (Y/N)</div>
          <div><strong>Date of Birth:</strong> {lead.date_of_birth}</div>
          <div><strong>Birth State:</strong> {formatValue(lead.birth_state)}</div>
          <div><strong>Age:</strong> {lead.age}</div>
          <div><strong>Number:</strong> {lead.phone_number}</div>
          <div><strong>Call phone/landline:</strong></div>
          <div><strong>Social:</strong> {lead.social_security}</div>
          <div><strong>Driver License Number:</strong> {formatValue(lead.driver_license)}</div>
          <div><strong>Exp:</strong></div>
          <div><strong>Existing coverage:</strong> {formatValue(lead.existing_coverage)}</div>
          <div><strong>Applied to life insurance last two years:</strong> {formatValue(lead.previous_applications)}</div>
          <div><strong>Height:</strong> {formatValue(lead.height)}</div>
          <div><strong>Weight:</strong> {formatValue(lead.weight)}</div>
          <div><strong>Doctors Name:</strong> {formatValue(lead.doctors_name)}</div>
          <div><strong>Tobacco Use:</strong> {formatValue(lead.tobacco_use)}</div>
          <div><strong>Health Conditions:</strong></div>
          <div className="ml-4">{formatValue(lead.health_conditions)}</div>
          <div><strong>Medications:</strong></div>
          <div className="ml-4">{formatValue(lead.medications)}</div>
          <div><strong>Insurance Application Details:</strong></div>
          <div><strong>Carrier:</strong> {lead.carrier}</div>
          <div><strong>Monthly Premium:</strong> ${lead.monthly_premium}</div>
          <div><strong>Coverage Amount:</strong> ${lead.coverage_amount?.toLocaleString()}</div>
          <div><strong>Draft Date:</strong> {lead.draft_date}</div>
          <div><strong>First Draft:</strong> {formatValue(lead.future_draft_date)}</div>
          <div><strong>Beneficiary Information:</strong> {formatValue(lead.beneficiary_information)}</div>
          <div><strong>Bank Name:</strong> {formatValue(lead.institution_name)}</div>
          <div><strong>Routing Number:</strong> {lead.beneficiary_routing}</div>
          <div><strong>Account Number:</strong> {lead.beneficiary_account}</div>
          <div><strong>Checking/savings account:</strong> {formatValue(lead.account_type)}</div>
          <div><strong>ADDITIONAL NOTES:</strong></div>
          <div className="ml-4 whitespace-pre-wrap">{lead.additional_notes}</div>
        </div>
      </CardContent>
    </Card>
  );
};
