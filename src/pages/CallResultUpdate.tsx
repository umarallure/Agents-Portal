import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LeadInfoCard } from "@/components/LeadInfoCard";
import { DetailedLeadInfoCard } from "@/components/DetailedLeadInfoCard";
import { CallResultForm } from "@/components/CallResultForm";
import { Loader2, ArrowLeft } from "lucide-react";

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

const CallResultUpdate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");
  const formId = searchParams.get("formId");
  const fromCallback = searchParams.get("fromCallback");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!submissionId) {
      toast({
        title: "Error",
        description: "No submission ID provided",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    fetchLead();
  }, [submissionId]);

  const processLeadFromJotForm = async () => {
    setProcessing(true);
    try {
      const response = await supabase.functions.invoke('process-lead', {
        body: { submissionId, formId }
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: "Lead data fetched from JotForm and saved to database",
      });

      return response.data;
    } catch (error) {
      console.error("Error processing lead from JotForm:", error);
      toast({
        title: "Error",
        description: "Failed to fetch lead data from JotForm",
        variant: "destructive",
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const fetchLead = async () => {
    try {
      // First check if we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Auth session:", { session, error: sessionError });

      // Test database connection with a simpler query
      const { data: testData, error: testError } = await supabase
        .from("leads")
        .select("id")
        .limit(1);
      
      console.log("Database connection test:", { testData, testError });

      if (testError) {
        console.error("Database access error:", testError);
        toast({
          title: "Database Error",
          description: "Unable to access the database. Please check your permissions.",
          variant: "destructive",
        });
        return;
      }

      // Log all leads for debugging
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*");
      
      console.log("Leads query:", { data: leads, error: leadsError });
      
      if (leadsError) {
        console.error("Error fetching leads:", leadsError);
        toast({
          title: "Error",
          description: "Failed to fetch leads from database",
          variant: "destructive",
        });
        return;
      }

      if (leads && leads.length > 0) {
        console.log("Total leads found:", leads.length);
        leads.forEach((row, idx) => {
          console.log(`Row ${idx}:`, {
            id: row.id,
            submission_id: row.submission_id,
            type: typeof row.submission_id,
            length: String(row.submission_id).length,
            customer_name: row.customer_full_name
          });
        });
      } else {
        console.log("No leads found in database");
      }

      // Debug: log the submissionId being searched
      const trimmedSubmissionId = submissionId ? submissionId.trim() : "";
      console.log("Searching for:", {
        submissionId: trimmedSubmissionId,
        length: trimmedSubmissionId.length,
        type: typeof trimmedSubmissionId
      });
      
      // Try direct query with the submission ID
      const { data: directLead, error: directError } = await supabase
        .from("leads")
        .select("*")
        .eq("submission_id", trimmedSubmissionId)
        .single();
      
      console.log("Direct query result:", { directLead, directError });

      if (directLead) {
        console.log("Lead found directly:", directLead);
        setLead(directLead);
        setLoading(false);
        return;
      }

      // If no lead found, try to fetch from JotForm API
      const jotformResult = await processLeadFromJotForm();
      console.log("JotForm fetch result:", jotformResult);

      if (jotformResult?.success) {
        // Try to fetch the newly created lead using the leadId from JotForm result
        const { data: newLead, error: newLeadError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", jotformResult.leadId)
          .single();
          
        console.log("Query by leadId result:", { newLead, newLeadError });
        
        if (newLead) {
          console.log("Lead found by ID:", newLead);
          setLead(newLead);
          setLoading(false);
          return;
        }
      }

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading lead information...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Lead Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              The submission ID "{submissionId}" was not found in our records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {fromCallback ? "Update Callback Result" : "Update Call Result"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {fromCallback 
                ? "Update the status and details for this callback" 
                : "Update the status and details for this lead"
              }
            </p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Lead Details */}
          <div className="space-y-6">
            <LeadInfoCard lead={lead} />
            <DetailedLeadInfoCard lead={lead} />
          </div>
          
          {/* Call Result Form */}
          <div>
            <CallResultForm 
              submissionId={submissionId!} 
              customerName={lead.customer_full_name}
              onSuccess={() => navigate(`/call-result-journey?submissionId=${submissionId}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallResultUpdate;