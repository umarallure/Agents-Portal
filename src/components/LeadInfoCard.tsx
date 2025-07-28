import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Phone, Mail, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
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
  carrier: string;
  product_type: string;
  coverage_amount: number;
  monthly_premium: number;
  draft_date: string;
  additional_notes: string;
  beneficiary_information: string;
}

interface LeadInfoCardProps {
  lead: Lead;
}

export const LeadInfoCard = ({ lead }: LeadInfoCardProps) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    const leadInfo = `
Lead Information:
Name: ${lead.customer_full_name}
Phone: ${lead.phone_number}
Email: ${lead.email}
Address: ${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
Date of Birth: ${lead.date_of_birth}
Age: ${lead.age}
Carrier: ${lead.carrier}
Product Type: ${lead.product_type}
Coverage Amount: $${lead.coverage_amount?.toLocaleString()}
Monthly Premium: $${lead.monthly_premium}
Draft Date: ${lead.draft_date}
Notes: ${lead.additional_notes}
Submission ID: ${lead.submission_id}
    `.trim();

    navigator.clipboard.writeText(leadInfo);
    toast({
      title: "Copied!",
      description: "Lead information copied to clipboard",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Lead Information
          <span className="text-sm font-normal text-muted-foreground">
            #{lead.submission_id}
          </span>
        </CardTitle>
        <Button onClick={copyToClipboard} variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy Basic Info
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{lead.customer_full_name}</h3>
              <p className="text-sm text-muted-foreground">Age: {lead.age}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{lead.phone_number}</span>
            </div>
            
            
            
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1" />
              <div>
                <div>{lead.street_address}</div>
                <div>{lead.city}, {lead.state} {lead.zip_code}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{lead.beneficiary_information}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Product Details</h4>
              <p className="text-sm">Carrier: {lead.carrier}</p>
              <p className="text-sm">Product Type: {lead.product_type}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <div>
                <div className="font-medium">
                  Coverage: {lead.coverage_amount ? formatCurrency(lead.coverage_amount) : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Premium: {lead.monthly_premium ? formatCurrency(lead.monthly_premium) : 'N/A'}/month
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm"><strong>DOB:</strong> {lead.date_of_birth}</p>
              <p className="text-sm"><strong>Draft Date:</strong> {lead.draft_date}</p>
            </div>
          </div>
        </div>
        
        {lead.additional_notes && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Additional Notes:</h4>
            <p className="text-sm">{lead.additional_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};